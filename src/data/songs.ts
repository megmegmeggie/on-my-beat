import type { Song } from '@/types/music';

/**
 * Local music catalogue for the MVP. Each entry carries a BPM value used by
 * the recommendation engine to match songs to a runner's cadence.
 *
 * Replace the `source` fields with real audio URLs or bundled asset ids when
 * the production audio library is available — nothing else in the app needs
 * to change.
 */
export const songs: Song[] = [
  { id: 'song-001', title: 'Morning Light', artist: 'Aria Vale', bpm: 140, duration: 212, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Indie', intensity: 0.3 },
  { id: 'song-002', title: 'First Steps', artist: 'The Drifters', bpm: 144, duration: 198, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Pop', intensity: 0.35 },
  { id: 'song-003', title: 'Steady Pulse', artist: 'Nova Reed', bpm: 148, duration: 224, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Electronic', intensity: 0.4 },
  { id: 'song-004', title: 'Warming Up', artist: 'Cassia', bpm: 150, duration: 187, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Ambient', intensity: 0.3 },
  { id: 'song-005', title: 'Easy Breeze', artist: 'Mellow Tone', bpm: 152, duration: 203, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Acoustic', intensity: 0.35 },
  { id: 'song-006', title: 'Cruise Control', artist: 'Retrograde', bpm: 155, duration: 215, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Pop', intensity: 0.4 },
  { id: 'song-007', title: 'Rolling Hills', artist: 'Green Path', bpm: 158, duration: 192, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Indie', intensity: 0.45 },
  { id: 'song-008', title: 'On Pace', artist: 'Metronome', bpm: 160, duration: 208, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Electronic', intensity: 0.45 },
  { id: 'song-009', title: 'Find My Rhythm', artist: 'Luna Wave', bpm: 162, duration: 219, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Pop', intensity: 0.5 },
  { id: 'song-010', title: 'Footfall', artist: 'Step Lightly', bpm: 164, duration: 201, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Indie', intensity: 0.5 },
  { id: 'song-011', title: 'Keep Moving', artist: 'Forward Motion', bpm: 166, duration: 226, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Electronic', intensity: 0.55 },
  { id: 'song-012', title: 'Heart of the Run', artist: 'Strider', bpm: 168, duration: 211, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Rock', intensity: 0.55 },
  { id: 'song-013', title: 'In the Pocket', artist: 'Groove Theory', bpm: 170, duration: 234, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Funk', intensity: 0.6 },
  { id: 'song-014', title: 'Perfect Tempo', artist: 'Cadence', bpm: 170, duration: 195, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Pop', intensity: 0.6 },
  { id: 'song-015', title: 'Mile Marker', artist: 'The Runners', bpm: 172, duration: 218, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Indie', intensity: 0.6 },
  { id: 'song-016', title: 'Push a Little', artist: 'Adrenaline', bpm: 174, duration: 207, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Electronic', intensity: 0.65 },
  { id: 'song-017', title: 'On Beat', artist: 'Synchronize', bpm: 175, duration: 229, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Pop', intensity: 0.65 },
  { id: 'song-018', title: 'Cadence King', artist: 'Stride', bpm: 176, duration: 213, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Hip-Hop', intensity: 0.7 },
  { id: 'song-019', title: 'Faster Now', artist: 'Rush', bpm: 178, duration: 199, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Rock', intensity: 0.7 },
  { id: 'song-020', title: 'Sprint Finish', artist: 'Velocity', bpm: 180, duration: 221, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Electronic', intensity: 0.75 },
  { id: 'song-021', title: 'Full Speed', artist: 'Turbo', bpm: 182, duration: 188, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Dance', intensity: 0.8 },
  { id: 'song-022', title: 'Redline', artist: 'Overdrive', bpm: 184, duration: 205, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Rock', intensity: 0.85 },
  { id: 'song-023', title: 'Adrenaline Rush', artist: 'Spike', bpm: 186, duration: 194, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Electronic', intensity: 0.9 },
  { id: 'song-024', title: 'Beyond Limits', artist: 'Apex', bpm: 188, duration: 216, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Dance', intensity: 0.95 },
  { id: 'song-025', title: 'Maximum Effort', artist: 'Zenith', bpm: 190, duration: 202, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Electronic', intensity: 1.0 },
  { id: 'song-026', title: 'Slow Start', artist: 'Dawn Chorus', bpm: 135, duration: 240, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Ambient', intensity: 0.2 },
  { id: 'song-027', title: 'Recovery Lap', artist: 'Calm Down', bpm: 138, duration: 255, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Acoustic', intensity: 0.25 },
  { id: 'song-028', title: 'Cool Down', artist: 'Breathe', bpm: 142, duration: 230, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Ambient', intensity: 0.3 },
  { id: 'song-029', title: 'Mid-Run Groove', artist: 'Flow State', bpm: 163, duration: 209, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Funk', intensity: 0.5 },
  { id: 'song-030', title: 'Late Push', artist: 'Second Wind', bpm: 177, duration: 223, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Rock', intensity: 0.7 },
  { id: 'song-031', title: 'Interval Burn', artist: 'HIIT', bpm: 181, duration: 196, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Electronic', intensity: 0.8 },
  { id: 'song-032', title: 'Recovery Interval', artist: 'Rest Easy', bpm: 150, duration: 214, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Indie', intensity: 0.35 },
  { id: 'song-033', title: 'Warm Down Groove', artist: 'Wind Down', bpm: 145, duration: 238, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Acoustic', intensity: 0.3 },
  { id: 'song-034', title: 'Long Haul', artist: 'Endure', bpm: 165, duration: 244, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Rock', intensity: 0.55 },
  { id: 'song-035', title: 'Marathon Mind', artist: 'Steady Eddie', bpm: 167, duration: 251, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Pop', intensity: 0.55 },
  { id: 'song-036', title: 'Halfway There', artist: 'Checkpoint', bpm: 169, duration: 206, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Indie', intensity: 0.6 },
  { id: 'song-037', title: 'Almost Home', artist: 'Finish Line', bpm: 173, duration: 217, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Rock', intensity: 0.65 },
  { id: 'song-038', title: 'Final Stretch', artist: 'Kick', bpm: 179, duration: 193, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Dance', intensity: 0.75 },
  { id: 'song-039', title: 'Coast In', artist: 'Glide', bpm: 156, duration: 232, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Ambient', intensity: 0.4 },
  { id: 'song-040', title: 'Unwind', artist: 'Soft Landing', bpm: 132, duration: 260, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Ambient', intensity: 0.15 },
  { id: 'song-041', title: 'Track Meet', artist: 'Starting Blocks', bpm: 171, duration: 199, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Hip-Hop', intensity: 0.6 },
  { id: 'song-042', title: 'Relay Baton', artist: 'Pass It On', bpm: 174, duration: 225, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Pop', intensity: 0.65 },
  { id: 'song-043', title: 'Photo Finish', artist: 'Dead Heat', bpm: 183, duration: 190, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Electronic', intensity: 0.85 },
  { id: 'song-044', title: 'Morning Miles', artist: 'Sunrise', bpm: 159, duration: 210, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Indie', intensity: 0.45 },
  { id: 'song-045', title: 'City Streets', artist: 'Urban Run', bpm: 166, duration: 214, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Hip-Hop', intensity: 0.55 },
  { id: 'song-046', title: 'Trail Blazer', artist: 'Off Road', bpm: 161, duration: 227, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Rock', intensity: 0.5 },
  { id: 'song-047', title: 'Park Loop', artist: 'Greenway', bpm: 154, duration: 235, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Acoustic', intensity: 0.4 },
  { id: 'song-048', title: 'Track Star', artist: 'Lane One', bpm: 185, duration: 197, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Dance', intensity: 0.9 },
  { id: 'song-049', title: 'Personal Best', artist: 'PB', bpm: 176, duration: 220, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Pop', intensity: 0.7 },
  { id: 'song-050', title: 'Victory Lap', artist: 'Champion', bpm: 148, duration: 243, source: 'https://download.samplelib.com/mp3/sample-9s.mp3', genre: 'Rock', intensity: 0.4 },
];
