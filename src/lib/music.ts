import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useEffect } from 'react';

import { TRACKS } from '@/lib/tracks';
import type { Track } from '@/lib/types';

export type TrackPick = {
  track: Track;
  /** The tempo that lines up with the cadence: `bpm`, or `bpm × 2` for a half-time song. */
  matchedBpm: number;
  halfTime: boolean;
};

/**
 * The track whose tempo is closest to `targetCadence`, counting half-time
 * songs at double their BPM. Songs with audio files win over placeholders,
 * and `current` wins ties so the music doesn't change needlessly.
 */
export function pickTrack(targetCadence: number, current?: Track | null, tracks: Track[] = TRACKS): TrackPick | null {
  const playable = tracks.filter((track) => track.file);
  const candidates = playable.length > 0 ? playable : tracks;
  let best: TrackPick | null = null;
  let bestDistance = Infinity;
  for (const track of candidates) {
    for (const halfTime of [false, true]) {
      const matchedBpm = halfTime ? track.bpm * 2 : track.bpm;
      const distance = Math.abs(matchedBpm - targetCadence);
      if (distance < bestDistance || (distance === bestDistance && track === current)) {
        best = { track, matchedBpm, halfTime };
        bestDistance = distance;
      }
    }
  }
  return best;
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
 * target changes (i.e. when the workout segment changes). Stops on unmount.
 */
export function useSegmentMusic(targetCadence: number, active: boolean) {
  const pick = pickTrack(targetCadence);
  const track = pick?.track;

  useEffect(() => {
    if (active && track) {
      playTrack(track);
    } else {
      pauseMusic();
    }
  }, [active, track]);

  useEffect(() => stopMusic, []);

  return pick;
}
