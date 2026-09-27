import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Platform, Vibration } from 'react-native';

import type { RunSessionState } from '@/lib/run-session';

/**
 * - `harder`: the new segment has a higher target cadence (e.g. a fast interval starts) — two buzzes.
 * - `easier`: the target drops or stays the same (recovery, cool-down) — one long buzz.
 * - `finished`: the whole workout is done — three buzzes.
 */
export type Buzz = 'harder' | 'easier' | 'finished';

type HapticStep = { at: number; impact?: Haptics.ImpactFeedbackStyle; notify?: Haptics.NotificationFeedbackType };
const heavy = (at: number): HapticStep => ({ at, impact: Haptics.ImpactFeedbackStyle.Heavy });

// iOS: React Native's Vibration uses the system-sound vibrate, which iOS often
// suppresses (e.g. while the app is playing audio), so iPhones use the Taptic
// Engine instead. Each step is one tap at `at` ms; heavy taps are the strongest.
const IOS_HAPTICS: Record<Buzz, HapticStep[]> = {
  harder: [heavy(0), heavy(160)],
  easier: [heavy(0), { at: 120, notify: Haptics.NotificationFeedbackType.Success }],
  finished: [heavy(0), heavy(200), heavy(400), { at: 650, notify: Haptics.NotificationFeedbackType.Success }],
};

// Android patterns alternate wait and buzz lengths in ms.
const ANDROID_PATTERNS: Record<Buzz, number | number[]> = {
  harder: [0, 250, 150, 250],
  easier: 700,
  finished: [0, 250, 150, 250, 150, 250],
};

function playHaptics(steps: HapticStep[]) {
  for (const step of steps) {
    setTimeout(() => {
      const done = step.notify ? Haptics.notificationAsync(step.notify) : Haptics.impactAsync(step.impact);
      // Haptics fail quietly when the Taptic Engine is off (Low Power Mode, settings); nothing to do.
      done.catch(() => {});
    }, step.at);
  }
}

export function buzz(kind: Buzz) {
  const android = ANDROID_PATTERNS[kind];
  if (Platform.OS === 'ios') {
    playHaptics(IOS_HAPTICS[kind]);
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
