# Music for runs

Drop audio files (mp3 or m4a) here, then point a song at the file in `src/data/songs.ts`:

```ts
{ id: 'song-051', title: 'Song name', artist: 'Artist', bpm: 170, duration: 210,
  source: require('../../assets/music/song-name.mp3') },
```

- That one catalogue feeds both the Music tab and the run screen.
- `bpm` is the song's real tempo. During a run, the song closest to the current
  segment's target cadence (155–180 steps/min in `src/lib/workouts.ts`) plays.
- Half-time songs count: an 85 BPM song matches 170 steps/min.
- Only `require` files that exist here, or the app won't build.
- Use music you have the rights to use (your own, royalty-free, or licensed).
