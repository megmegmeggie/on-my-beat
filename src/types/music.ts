/**
 * Anything `expo-audio` accepts as a source: a remote URL string, a local
 * asset id from `require('./track.mp3')`, or an asset object.
 */
export type AudioSource = string | number;

export type Song = {
  /** Stable id, used as the list key and for persisting playback state. */
  id: string;
  title: string;
  artist: string;
  /** Beats per minute — the primary signal for cadence matching. */
  bpm: number;
  /** Track duration in seconds. */
  duration: number;
  /** Remote URL or `require()`d module id. */
  source: AudioSource;
  albumTitle?: string;
  artworkUrl?: string;
  genre?: string;
  /**
   * Optional intensity hint, e.g. 0-1. The recommendation engine can use it to
   * match a track to a target cadence.
   */
  intensity?: number;
};
