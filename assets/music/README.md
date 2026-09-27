# Music for runs

The songs here are listed in `src/data/songs.ts`, which feeds both the Music tab
and the run screen.

## Current tracks

All by Kevin MacLeod (incompetech.com), licensed under Creative Commons
Attribution 4.0 (https://creativecommons.org/licenses/by/4.0/). Downloaded from
incompetech.com and re-encoded to 128 kbps. BPMs are from incompetech's catalogue.
The license requires crediting each track; the Music tab shows the credits
(`src/components/music-credits.tsx`), so keep that in place.

## Adding a song

1. Put the mp3 (or m4a) here, e.g. `assets/music/song-name.mp3`.
2. Add an entry to `src/data/songs.ts`:
   ```ts
   { id: 'song-name', title: 'Song name', artist: 'Artist', bpm: 170, duration: 210,
     source: require('../../assets/music/song-name.mp3') },
   ```
3. Only use music whose license allows it in the app, and add any required credits.

- `bpm` must be the song's real tempo. During a run, the song closest to the
  current segment's target cadence (155–180 steps/min in `src/lib/workouts.ts`) plays.
- Half-time songs count: an 85 BPM song matches 170 steps/min.
- Only `require` files that exist here, or the app won't build.
