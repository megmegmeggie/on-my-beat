import type { Song } from '@/types/music';

/**
 * Songs bundled with the app (assets/music/). Each BPM comes from the
 * publisher's catalogue and is what the run screen matches to the target
 * cadence; a song also matches at double its BPM (half-time, e.g. 90 BPM fits 180).
 *
 * All tracks are by Kevin MacLeod (incompetech.com), licensed under Creative
 * Commons Attribution 4.0 (CC BY 4.0). The license requires crediting each
 * track; the Music tab shows the credits (src/components/music-credits.tsx).
 * Files were re-encoded to 128 kbps to keep the app small.
 *
 * To add a song, put the mp3 in assets/music/ and add an entry here with its
 * real BPM, and make sure its license allows use in the app (add credits if
 * required).
 */
const ARTIST = 'Kevin MacLeod';

export const songs: Song[] = [
  {
    id: 'cruising-for-goblins',
    title: 'Cruising for Goblins',
    artist: ARTIST,
    bpm: 155,
    duration: 149,
    source: require('../../assets/music/cruising-for-goblins.mp3'),
    genre: 'Bouncy, Driving',
  },
  {
    id: 'nothing-broken',
    title: 'Nothing Broken',
    artist: ARTIST,
    bpm: 158,
    duration: 166,
    source: require('../../assets/music/nothing-broken.mp3'),
    genre: 'Bouncy, Bright',
  },
  {
    id: 'neon-laser-horizon',
    title: 'Neon Laser Horizon',
    artist: ARTIST,
    bpm: 160,
    duration: 179,
    source: require('../../assets/music/neon-laser-horizon.mp3'),
    genre: 'Grooving, Bright',
  },
  {
    id: 'upbeat-forever',
    title: 'Upbeat Forever',
    artist: ARTIST,
    bpm: 164,
    duration: 195,
    source: require('../../assets/music/upbeat-forever.mp3'),
    genre: 'Bouncy, Bright',
  },
  {
    id: 'minima',
    title: 'Minima',
    artist: ARTIST,
    bpm: 165,
    duration: 214,
    source: require('../../assets/music/minima.mp3'),
    genre: 'Driving, Epic',
  },
  {
    id: 'pyro-flow',
    title: 'Pyro Flow',
    artist: ARTIST,
    bpm: 84,
    duration: 234,
    source: require('../../assets/music/pyro-flow.mp3'),
    genre: 'Grooving, Driving',
  },
  {
    id: 'surf-shimmy',
    title: 'Surf Shimmy',
    artist: ARTIST,
    bpm: 170,
    duration: 123,
    source: require('../../assets/music/surf-shimmy.mp3'),
    genre: 'Grooving, Bright',
  },
  {
    id: 'exhilarate',
    title: 'Exhilarate',
    artist: ARTIST,
    bpm: 170,
    duration: 146,
    source: require('../../assets/music/exhilarate.mp3'),
    genre: 'Aggressive, Driving',
  },
  {
    id: 'fiddles-mcginty',
    title: 'Fiddles McGinty',
    artist: ARTIST,
    bpm: 174,
    duration: 207,
    source: require('../../assets/music/fiddles-mcginty.mp3'),
    genre: 'Bouncy, Bright',
  },
  {
    id: 'boogie-party',
    title: 'Boogie Party',
    artist: ARTIST,
    bpm: 178,
    duration: 272,
    source: require('../../assets/music/boogie-party.mp3'),
    genre: 'Driving, Grooving',
  },
  {
    id: 'jerry-five',
    title: 'Jerry Five',
    artist: ARTIST,
    bpm: 90,
    duration: 160,
    source: require('../../assets/music/jerry-five.mp3'),
    genre: 'Driving, Grooving',
  },
];
