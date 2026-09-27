import { useEffect, useRef } from 'react';
import { Platform, Vibration } from 'react-native';

import type { RunSessionState } from '@/lib/run-session';

/**
 * - `harder`: the new segment has a higher target cadence (e.g. a fast interval starts) — two buzzes.
 * - `easier`: the target drops or stays the same (recovery, cool-down) — one long buzz.
 * - `finished`: the whole workout is done — three buzzes.
 */
export type Buzz = 'harder' | 'easier' | 'finished';

// iOS buzzes are a fixed ~0.4 s and can't be lengthened; an iOS pattern lists the
// pause before each buzz. Android patterns alternate wait and buzz lengths in ms.
const PATTERNS: Record<Buzz, { ios: number | number[]; android: number | number[] }> = {
  harder: { ios: [0, 500], android: [0, 250, 150, 250] },
  easier: { ios: 400, android: 700 },
  finished: { ios: [0, 500, 500], android: [0, 250, 150, 250, 150, 250] },
};

export function buzz(kind: Buzz) {
  const { ios, android } = PATTERNS[kind];
  if (Platform.OS === 'ios') {
    Vibration.vibrate(ios);
  } else if (Platform.OS === 'android') {
    Vibration.vibrate(android);
  } else {
    // The web Vibration API alternates buzz and pause, with no leading wait.
    Vibration.vibrate(Array.isArray(android) ? android.slice(1) : android);
  }
}

/**
 * Buzzes when the run moves to a new segment (including skips) and when the
 * workout is completed, so the runner feels the change without looking.
 */
export function useSegmentVibration(state: RunSessionState, targetCadence: number, enabled: boolean) {
  const previous = useRef({ segmentIndex: state.segmentIndex, targetCadence });

  useEffect(() => {
    const before = previous.current;
    previous.current = { segmentIndex: state.segmentIndex, targetCadence };
    if (enabled && state.segmentIndex !== before.segmentIndex && state.status !== 'finished') {
      buzz(targetCadence > before.targetCadence ? 'harder' : 'easier');
    }
  }, [enabled, state.segmentIndex, state.status, targetCadence]);

  useEffect(() => {
    if (enabled && state.status === 'finished' && state.completed) {
      buzz('finished');
    }
  }, [enabled, state.status, state.completed]);
}
