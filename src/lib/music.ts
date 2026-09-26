import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useEffect, useState } from 'react';

import { TRACKS } from '@/lib/tracks';
import type { Track } from '@/lib/types';

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

let player: AudioPlayer | null = null;
let playing: Track | null = null;

/** Starts `track` looping, replacing whatever was playing. Placeholders just stop the music. */
export function playTrack(track: Track) {
  if (track === playing && player) {
    player.play();
    return;
  }
  playing = track;
  if (!track.file) {
    player?.pause();
    return;
  }
  if (player) {
    player.replace(track.file);
  } else {
    // Runners often have the ringer off, so play even in silent mode.
    void setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' });
    player = createAudioPlayer(track.file);
  }
  player.loop = true;
  player.play();
  runMusicListeners.forEach((listener) => listener());
}

export function pauseMusic() {
  player?.pause();
}

export function stopMusic() {
  player?.remove();
  player = null;
  playing = null;
}

/**
 * Plays the best track for `targetCadence` while `active`, switching when the
 * target changes (i.e. when the workout segment changes). `nextSong` moves to
 * the next-best match until the target changes. Stops on unmount.
 */
export function useSegmentMusic(targetCadence: number, active: boolean) {
  // Skips only apply to the target they were made for; a new segment starts from the best match.
  const [skips, setSkips] = useState({ targetCadence, count: 0 });
  const skipCount = skips.targetCadence === targetCadence ? skips.count : 0;
  const ranked = rankTracks(targetCadence);
  const pick = ranked.length > 0 ? ranked[skipCount % ranked.length] : null;
  const track = pick?.track;

  useEffect(() => {
    if (active && track) {
      playTrack(track);
    } else {
      pauseMusic();
    }
  }, [active, track]);

  useEffect(() => stopMusic, []);

  return {
    pick,
    nextSong: () => setSkips({ targetCadence, count: skipCount + 1 }),
  };
}
