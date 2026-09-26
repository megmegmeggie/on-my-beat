import { Accelerometer } from 'expo-sensors';
import { Platform } from 'react-native';

import { createStepDetector } from '@/services/cadence/cadenceAlgorithm';
import type { CadenceReading } from '@/types/cadence';

/** 50 Hz: plenty for steps at up to ~4 per second, and light on battery. */
const SAMPLE_INTERVAL_MS = 20;
/** Readings are passed on at most this often, so screens don't re-render 50 times a second. */
const MIN_REPORT_INTERVAL_MS = 250;

export type CadenceTracking = { status: 'tracking'; stop: () => void } | { status: 'unavailable' | 'denied' };

/**
 * Starts counting steps from the accelerometer and calls `onReading` as the
 * step count or cadence changes. Only runs while the app is in the foreground.
 */
export async function startCadenceTracking(onReading: (reading: CadenceReading) => void): Promise<CadenceTracking> {
  // On web, expo-sensors' Accelerometer reports device tilt angles rather than
  // acceleration, so steps can't be detected there.
  if (Platform.OS === 'web' || !(await Accelerometer.isAvailableAsync())) {
    return { status: 'unavailable' };
  }
  const permission = await Accelerometer.requestPermissionsAsync();
  if (!permission.granted) {
    return { status: 'denied' };
  }

  const detector = createStepDetector();
  let lastReading: CadenceReading | null = null;
  let lastReportedAt = 0;
  let hasUnreportedChange = false;

  Accelerometer.setUpdateInterval(SAMPLE_INTERVAL_MS);
  const subscription = Accelerometer.addListener((sample) => {
    const reading = detector.push(sample);
    if (
      reading.totalSteps !== lastReading?.totalSteps ||
      reading.stepsPerMinute !== lastReading?.stepsPerMinute
    ) {
      hasUnreportedChange = true;
    }
    lastReading = reading;

    const now = Date.now();
    if (hasUnreportedChange && now - lastReportedAt >= MIN_REPORT_INTERVAL_MS) {
      hasUnreportedChange = false;
      lastReportedAt = now;
      onReading(reading);
    }
  });

  return { status: 'tracking', stop: () => subscription.remove() };
}
