# Music for runs

Drop audio files (mp3 or m4a) here, then register each one in `src/lib/tracks.ts`:

```ts
{ title: 'Song name', file: require('../../assets/music/song-name.mp3'), bpm: 170 },
```

- `bpm` is the song's real tempo. The run screen picks the song closest to the
  current segment's target cadence (155–180 steps/min in `src/lib/workouts.ts`).
- Half-time songs count: a 85 BPM song matches 170 steps/min.
- Only `require` files that exist here, or the app won't build.
- Use music you have the rights to use (your own, royalty-free, or licensed).
