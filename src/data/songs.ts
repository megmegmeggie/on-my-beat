import type { Song } from '@/types/music';

/**
 * Placeholder catalogue so the player can be exercised before the real audio
 * library exists. Replace the contents of this file with a lookup against your
 * own data source — nothing else in the app needs to change.
 */
export const songs: Song[] = [
  {
    id: 'placeholder-long',
    title: 'Steady Build',
    artist: 'Placeholder',
    albumTitle: 'Tempo Sampler',
    source: 'https://archive.org/download/testmp3testfile/mpthreetest.mp3',
    intensity: 0.5,
  },
  {
    id: 'placeholder-mid',
    title: 'Tempo Check',
    artist: 'Placeholder',
    albumTitle: 'Tempo Sampler',
    source: 'https://download.samplelib.com/mp3/sample-15s.mp3',
    intensity: 0.65,
  },
  {
    id: 'placeholder-short',
    title: 'Cooldown Cadence',
    artist: 'Placeholder',
    albumTitle: 'Tempo Sampler',
    source: 'https://download.samplelib.com/mp3/sample-9s.mp3',
    intensity: 0.3,
  },
];
