import type { Track } from '@/lib/types';

/**
 * The songs the run screen can play, with their tempo in beats per minute.
 *
 * To add a real song:
 *   1. Put the audio file (mp3 or m4a) in assets/music/, e.g. assets/music/steady-170.mp3
 *   2. Replace `file: null` below with `file: require('../../assets/music/steady-170.mp3')`
 *      (the path is relative to this file), and set `title` and the song's real `bpm`.
 *
 * Only point `require` at files that exist, or the app won't build. Entries with
 * `file: null` are placeholders: they're still picked and shown on the run screen,
 * but nothing plays. A song at half the target cadence also matches (90 BPM fits 180).
 */
export const TRACKS: Track[] = [
  // Full-tempo songs, one per target cadence in src/lib/workouts.ts (155–180 spm).
  { title: 'Placeholder · 155 BPM', file: null, bpm: 155 },
  { title: 'Placeholder · 160 BPM', file: null, bpm: 160 },
  { title: 'Placeholder · 165 BPM', file: null, bpm: 165 },
  { title: 'Placeholder · 170 BPM', file: null, bpm: 170 },
  { title: 'Placeholder · 175 BPM', file: null, bpm: 175 },
  { title: 'Placeholder · 180 BPM', file: null, bpm: 180 },
  // Half-time songs: one beat every two steps.
  { title: 'Placeholder · 80 BPM (half-time)', file: null, bpm: 80 },
  { title: 'Placeholder · 85 BPM (half-time)', file: null, bpm: 85 },
  { title: 'Placeholder · 90 BPM (half-time)', file: null, bpm: 90 },
];
