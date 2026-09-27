import { type AudioPlayer, createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync } from 'expo-audio';
import { useEffect, useState } from 'react';

import { getFavoriteSongIds } from '@/lib/favorites';
import { TRACKS } from '@/lib/tracks';
import type { Track } from '@/lib/types';

// Start loading the favourites now, so they're ready by the time a run picks its first song.
void getFavoriteSongIds();

export type TrackPick = {
  track: Track;
  /** The tempo that lines up with the cadence: `bpm`, or `bpm × 2` for a half-time song. */
  matchedBpm: number;
  halfTime: boolean;
};

/**
 * Every track, best tempo match for `targetCadence` first, counting half-time
 * songs at double their BPM. Songs with audio files come before placeholders.
 */
export function rankTracks(targetCadence: number, tracks: Track[] = TRACKS): TrackPick[] {
  const playable = tracks.filter((track) => track.file);
  const candidates = playable.length > 0 ? playable : tracks;
  const distance = (pick: TrackPick) => Math.abs(pick.matchedBpm - targetCadence);
  return candidates
    .map((track) => {
      const full = { track, matchedBpm: track.bpm, halfTime: false };
      const half = { track, matchedBpm: track.bpm * 2, halfTime: true };
      return distance(half) < distance(full) ? half : full;
    })
    .sort((a, b) => distance(a) - distance(b));
}

/**
 * The track whose tempo is closest to `targetCadence`. `current` wins ties so
 * the music doesn't change needlessly.
 */
export function pickTrack(targetCadence: number, current?: Track | null, tracks: Track[] = TRACKS): TrackPick | null {
  const ranked = rankTracks(targetCadence, tracks);
  if (ranked.length === 0) {
    return null;
  }
  const bestDistance = Math.abs(ranked[0].matchedBpm - targetCadence);
  const keep = ranked.find(
    (pick) => pick.track === current && Math.abs(pick.matchedBpm - targetCadence) === bestDistance
  );
  return keep ?? ranked[0];
}

const runMusicListeners = new Set<() => void>();

/**
 * Lets other players (e.g. the Music tab's) pause when run music starts, so two
 * songs never play at once. Returns an unsubscribe function.
 */
export function onRunMusicStart(listener: () => void) {
  runMusicListeners.add(listener);
  return () => {
    runMusicListeners.delete(listener);
  };
}

/** Full music volume, and the level it drops to while a voice cue is speaking. */
const MUSIC_VOLUME = 1;
const DUCKED_VOLUME = 0.3;

let player: AudioPlayer | null = null;
let playing: Track | null = null;
let finishHandler: (() => void) | null = null;

type PlayOptions = {
  /** Repeat the track instead of stopping at its end. */
  loop: boolean;
  /** Called when the track plays to its end (never while looping). */
  onFinish?: () => void;
};

/** Starts `track`, replacing whatever was playing. Placeholders just stop the music. */
export function playTrack(track: Track, { loop, onFinish }: PlayOptions) {
  finishHandler = onFinish ?? null;
  if (track === playing && player) {
    player.loop = loop;
    player.play();
    return;
  }
  playing = track;
  if (!track.file) {
    player?.pause();
    return;
  }
  // Stop the Music tab's player first, so the run's song doesn't start over it.
  runMusicListeners.forEach((listener) => listener());
  // Set on every new track, since the Music tab's player can change the shared session in between.
  void setAudioModeAsync({
    // Runners often have the ringer off, so play even in silent mode.
    playsInSilentMode: true,
    // Keep playing when the screen locks. On iOS the playing audio is also what keeps the
    // app running in the background, so the run clock, voice cues and cadence carry on.
    shouldPlayInBackground: true,
    interruptionMode: 'duckOthers',
  });
  if (player) {
    player.replace(track.file);
  } else {
    // On iOS a player that pauses or finishes switches the audio session off unless something
    // is audibly playing, and the next song is usually still loading at that moment, so it would
    // start into a dead session and stay silent. Keep the session on; `stopMusic` turns it off.
    player = createAudioPlayer(track.file, { keepAudioSessionActive: true });
    player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish && !status.loop) {
        finishHandler?.();
      }
    });
  }
  player.loop = loop;
  player.play();
  // Shows the song on the lock screen. Android also needs this, or it stops
  // background audio after about three minutes.
  player.setActiveForLockScreen(true, { title: track.title, artist: track.artist });
}

export function pauseMusic() {
  player?.pause();
}

/**
 * Lowers the music while something else is talking over it. The synthesizers
 * behind the text-to-speech cues don't duck the app's own player, so without
 * this a cue is spoken at full volume over the track.
 */
export function duckMusic(ducked: boolean) {
  if (player) {
    player.volume = ducked ? DUCKED_VOLUME : MUSIC_VOLUME;
  }
}

export function stopMusic() {
  // Clear the lock screen before releasing the player; afterwards it would throw.
  player?.clearLockScreenControls();
  player?.remove();
  if (player) {
    // The run player keeps the session on while it's going; release it so other apps' audio can resume.
    setIsAudioActiveAsync(false).catch(() => {});
  }
  player = null;
  playing = null;
  finishHandler = null;
}

/** Songs within this many BPM of the target (after half-time doubling) count as a match. */
const BPM_TOLERANCE = 3;

/**
 * The play order for one segment: the matches, then every other track by
 * closeness (reachable with "Next song"). `matches` is how many of the first
 * picks rotate when a song ends; with no track in tolerance the best one loops.
 */
type Queue = { targetCadence: number; picks: TrackPick[]; matches: number; index: number };

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * A fresh queue for `targetCadence`, with the matches shuffled so each run
 * sounds different: favourite songs first, then the rest.
 */
function buildQueue(targetCadence: number, tracks: Track[] = TRACKS): Queue {
  const ranked = rankTracks(targetCadence, tracks);
  const inTolerance = ranked.filter((pick) => Math.abs(pick.matchedBpm - targetCadence) <= BPM_TOLERANCE).length;
  // `ranked` is sorted by closeness, so the matches are its first `inTolerance` picks.
  const matches = ranked.slice(0, inTolerance);
  const favorites = getFavoriteSongIds();
  const isFavorite = (pick: TrackPick) => pick.track.id !== undefined && favorites.has(pick.track.id);
  const picks = [
    ...shuffle(matches.filter(isFavorite)),
    ...shuffle(matches.filter((pick) => !isFavorite(pick))),
    ...ranked.slice(inTolerance),
  ];
  return { targetCadence, picks, matches: Math.min(Math.max(inTolerance, 1), picks.length), index: 0 };
}

/**
 * Plays music for `targetCadence` while `active`: a shuffled rotation of the
 * songs within `BPM_TOLERANCE` of it, moving to the next one when a song ends.
 * A new target (i.e. a new workout segment) starts a new shuffle. `nextSong`
 * steps through the matches, then the other songs by closeness. Stops on unmount.
 */
export function useSegmentMusic(targetCadence: number, active: boolean) {
  const [queue, setQueue] = useState(() => buildQueue(targetCadence));
  if (queue.targetCadence !== targetCadence) {
    setQueue(buildQueue(targetCadence));
  }
  const pick = queue.picks[queue.index] ?? null;
  const track = pick?.track;
  const loop = queue.matches === 1 && queue.index === 0;

  useEffect(() => {
    if (!active || !track) {
      pauseMusic();
      return;
    }
    playTrack(track, {
      loop,
      // A finished song hands over to the next match; after a skip past the matches, back to them.
      onFinish: () =>
        setQueue((current) =>
          current.targetCadence === targetCadence
            ? { ...current, index: current.index + 1 < current.matches ? current.index + 1 : 0 }
            : current
        ),
    });
  }, [active, track, loop, targetCadence]);

  useEffect(() => stopMusic, []);

  return {
    pick,
    nextSong: () => setQueue((current) => ({ ...current, index: (current.index + 1) % current.picks.length })),
  };
}
