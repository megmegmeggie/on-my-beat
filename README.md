# On My Beat

A cadence-based running companion app for iOS. On My Beat detects your running cadence from the phone's accelerometer and matches music to your pace in real time.

Built with Expo, React Native, and TypeScript.

---

## Features

- **Cadence detection** — Estimates steps per minute from accelerometer data using adaptive peak detection
- **Music matching** — Recommends songs whose BPM aligns with your target or live cadence
- **Custom workouts** — Build distance-based or fartlek (interval) runs with target pace
- **Training plans** — 5K, Half Marathon, and Marathon plans with progressive workouts
- **Live workout tracking** — Real-time cadence, distance, pace, and music during a run
- **Workout summary** — Post-run stats including time, average cadence, distance, and time on target
- **Voice cues** — Spoken feedback during runs (speed up, slow down, on target)
- **Spotify integration** — Connect your Spotify account for personalized music matching (demo uses placeholder catalog)

---

## Requirements

- iOS 16+
- [Node.js](https://nodejs.org/) (LTS)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- Physical iPhone for accelerometer and GPS testing

---

## Getting Started

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npx expo start
```

For testing on a physical device outside your local network:

```bash
npx expo start --tunnel
```

### Run on a device

- **Physical iPhone** — Scan the QR code with the Camera app (requires [Expo Go](https://expo.dev/go) or a [development build](https://docs.expo.dev/develop/development-builds/introduction/))
- **iOS Simulator** — Press `i` in the terminal (accelerometer not available; use the simulator's location feature for GPS)

---

## Project Structure

```
src/
├── app/                    # Expo Router screens
│   ├── (tabs)/             # Tab layout (Home, Music, Run, Profile)
│   ├── plan/[id].tsx       # Training plan detail
│   ├── summary/[id].tsx   # Post-run summary
│   └── workout/[id].tsx    # Active workout
├── components/             # Reusable UI components
├── hooks/                  # React hooks (profile, color scheme, plan selection)
├── lib/                    # Core logic
│   ├── cadence.ts          # Cadence tracking hook
│   ├── catalog.ts          # Merged music catalog (local + Spotify)
│   ├── calories.ts         # Calorie estimation
│   ├── gps.ts              # GPS distance and pace tracking
│   ├── music.ts            # Audio playback and track selection
│   ├── placeholder-spotify.ts  # Demo Spotify catalog
│   ├── run-session.ts      # Workout state machine and timer
│   ├── storage.ts          # AsyncStorage persistence
│   ├── spotify.ts          # Spotify OAuth and API
│   ├── types.ts            # Shared TypeScript types
│   ├── vibration.ts        # Haptic feedback patterns
│   ├── voice-cues.ts       # Spoken cadence feedback
│   └── workouts.ts         # Built-in workout plans and segments
├── services/
│   └── cadence/            # Accelerometer service and step detection algorithm
├── types/                  # Shared TypeScript types
└── utils/                  # Formatting and calculation helpers
```

---

## How It Works

### Cadence Detection

1. Accelerometer samples at 50 Hz
2. Gravity is removed via exponential moving average
3. Signal is smoothed to reduce noise
4. Peaks above an adaptive threshold are counted as steps
5. Cadence is calculated from the median gap between recent steps

### Music Matching

1. Local catalog of 50 songs with known BPM values
2. When Spotify is connected, 20 placeholder tracks are merged into the catalog
3. Tracks are ranked by absolute difference between song BPM and target cadence
4. Half-time songs (BPM × 2) are also considered as matches

### Workout Flow

1. Choose a workout (built-in plan, quick run, or custom)
2. Configure target cadence (and distance for distance-based runs)
3. Start the workout — cadence tracking and music playback begin
4. Real-time feedback: cadence vs. target, distance, pace, current song
5. Pause, resume, skip segments, or end the workout
6. Summary shows time, average cadence, distance, calories, and time on target

---

## Configuration

### Permissions

| Permission | Purpose |
|---|---|
| Motion & Fitness | Accelerometer access for cadence detection |
| Location | GPS distance and pace tracking |
| Background audio | Music continues when screen is locked |

### Spotify (Optional)

1. Create a Spotify Developer account at [developer.spotify.com](https://developer.spotify.com)
2. Create an app and note the Client ID
3. Add `onmybeat://spotify-callback` to Redirect URIs
4. Replace `CLIENT_ID` in `src/lib/spotify.ts`
5. Add your Spotify email to Users and Access in the dashboard

---

## Scripts

| Command | Description |
|---|---|
| `npm start` | Start the Expo development server |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Type-check without emitting |
| `npx expo start --tunnel` | Start with tunnel for remote device access |

---

## Tech Stack

- [Expo](https://expo.dev) SDK 57
- [React Native](https://reactnative.dev) 0.86
- [TypeScript](https://www.typescriptlang.org) 6.0
- [Expo Router](https://docs.expo.dev/router/introduction) for navigation
- [expo-sensors](https://docs.expo.dev/versions/latest/sdk/sensors/) for accelerometer
- [expo-location](https://docs.expo.dev/versions/latest/sdk/location/) for GPS
- [expo-audio](https://docs.expo.dev/versions/latest/sdk/audio/) for music playback
- [expo-speech](https://docs.expo.dev/versions/latest/sdk/speech/) for voice cues
- [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) for persistence

---

## Known Limitations

- **Cadence lag** — Approximately 3–4 second delay due to the smoothing window required for accuracy
- **Foreground only** — Accelerometer and GPS tracking pause when the app is backgrounded
- **Placeholder audio** — Demo uses bundled sample audio; real Spotify playback requires Premium
- **No real-time Spotify data** — Demo uses a hardcoded placeholder catalog; full API integration requires Spotify Premium and proper scope approval
- **Simulator support** — Accelerometer not available on iOS Simulator; use the simulated cadence toggle (long-press workout name)

