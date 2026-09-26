import { getSongs } from '@/services/music/musicService';
import type { Track } from '@/lib/types';

/**
 * The songs the run screen can play: the same catalogue as the Music tab
 * (src/data/songs.ts), so there's one list of songs and BPMs for the whole app.
 *
 * To add a real song, put the audio file in assets/music/ and add or edit an
 * entry in src/data/songs.ts with `source: require('../../assets/music/<file>.mp3')`
 * and the song's real `bpm`. A song at half the target cadence also matches
 * (90 BPM fits 180 steps/min).
 */
export const TRACKS: Track[] = getSongs().map((song) => ({
  id: song.id,
  title: song.title,
  artist: song.artist,
  file: song.source,
  bpm: song.bpm,
}));
