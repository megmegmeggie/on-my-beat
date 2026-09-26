import { songs } from '@/data/songs';
import type { Song } from '@/types/music';

/**
 * Read access to the audio catalogue. This is the seam to swap once the real
 * audio library is in place — the UI only talks to these functions.
 */
export function getSongs(): Song[] {
  return songs;
}

export function getSongById(id: string): Song | undefined {
  return songs.find((song) => song.id === id);
}
