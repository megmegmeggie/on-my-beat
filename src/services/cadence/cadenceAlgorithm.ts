import type { AccelerometerSample, CadenceReading } from '@/types/cadence';

/**
 * Step detection from raw accelerometer samples. Pure logic with no device
 * access, so it can be tested with recorded or synthetic data.
 *
 * 1. Take the magnitude of acceleration, which doesn't depend on how the phone
 *    is held.
 * 2. Subtract a slow moving average to remove gravity (≈ 1 g).
 * 3. Smooth out high-frequency jitter.
 * 4. Count a step at each peak that rises above an adaptive threshold, with a
 *    minimum gap between steps so one footfall isn't counted twice.
 * 5. Cadence = 60 ÷ the median gap between recent steps.
 */

/** Time constant for the gravity estimate. Much slower than a stride. */
const GRAVITY_TIME_CONSTANT_S = 1;
/** Time constant for smoothing (≈ 5 Hz cutoff); running steps are ~2.5–3.5 Hz. */
const SMOOTHING_TIME_CONSTANT_S = 0.03;
/** Ignore bumps smaller than this, in g. Walking peaks are ~0.2–0.5 g, running 1–3 g. */
const MIN_PEAK_G = 0.15;
/** A peak must reach this fraction of recent peak heights to count as a step. */
const ADAPTIVE_THRESHOLD_RATIO = 0.4;
/** How quickly the typical peak height adapts to a new pace or phone position. */
const PEAK_AVERAGE_WEIGHT = 0.2;
/** The typical peak height fades over this time, so the threshold drops again after slowing down. */
const PEAK_DECAY_TIME_S = 3;
/** 0.25 s between steps = 240 steps/min, faster than a sprinter's cadence. */
const MIN_STEP_INTERVAL_S = 0.25;
/** Cadence is measured over this many seconds of recent steps. */
const CADENCE_WINDOW_S = 8;
/** Steps needed in the window before reporting a cadence. */
const MIN_STEPS_FOR_CADENCE = 4;
/** With no step for this long the runner has stopped, so cadence is null. */
const STOPPED_AFTER_S = 2;
/** Fallback sample gap when timestamps are missing or out of order. */
const DEFAULT_SAMPLE_INTERVAL_S = 0.02;

export type StepDetector = {
  /** Feed one sample; returns the reading as of that sample. */
  push: (sample: AccelerometerSample) => CadenceReading;
};

export function createStepDetector(): StepDetector {
  let lastTimestamp: number | null = null;
  // Gravity always measures about 1 g, so start there rather than at the first (noisy) sample.
  let gravity = 1;
  let smoothed = 0;
  let typicalPeak = 0;
  let inPeak = false;
  let peakValue = 0;
  let peakTime = 0;
  let lastStepTime = -Infinity;
  let totalSteps = 0;
  const recentSteps: number[] = [];

  function cadenceAt(now: number) {
    while (recentSteps.length > 0 && recentSteps[0] < now - CADENCE_WINDOW_S) {
      recentSteps.shift();
    }
    if (recentSteps.length < MIN_STEPS_FOR_CADENCE || now - lastStepTime > STOPPED_AFTER_S) {
      return null;
    }
    const gaps = recentSteps.slice(1).map((time, i) => time - recentSteps[i]);
    return Math.round(60 / median(gaps));
  }

  function push({ x, y, z, timestamp }: AccelerometerSample): CadenceReading {
    const gap = lastTimestamp === null ? 0 : timestamp - lastTimestamp;
    const dt = gap > 0 && gap < 1 ? gap : DEFAULT_SAMPLE_INTERVAL_S;
    lastTimestamp = timestamp;

    const magnitude = Math.sqrt(x * x + y * y + z * z);
    gravity += smoothingFactor(dt, GRAVITY_TIME_CONSTANT_S) * (magnitude - gravity);
    smoothed += smoothingFactor(dt, SMOOTHING_TIME_CONSTANT_S) * (magnitude - gravity - smoothed);
    typicalPeak -= smoothingFactor(dt, PEAK_DECAY_TIME_S) * typicalPeak;

    const threshold = Math.max(MIN_PEAK_G, typicalPeak * ADAPTIVE_THRESHOLD_RATIO);
    if (smoothed > threshold) {
      if (!inPeak || smoothed > peakValue) {
        peakValue = smoothed;
        peakTime = timestamp;
      }
      inPeak = true;
    } else if (inPeak && smoothed < threshold / 2) {
      // The peak has ended: count it if it isn't too soon after the last step.
      inPeak = false;
      if (peakTime - lastStepTime >= MIN_STEP_INTERVAL_S) {
        if (peakTime - lastStepTime > STOPPED_AFTER_S) {
          // Moving again after a stop: measure the new cadence from scratch.
          recentSteps.length = 0;
        }
        lastStepTime = peakTime;
        totalSteps += 1;
        recentSteps.push(peakTime);
        typicalPeak = typicalPeak === 0 ? peakValue : typicalPeak + PEAK_AVERAGE_WEIGHT * (peakValue - typicalPeak);
      }
    }

    return { stepsPerMinute: cadenceAt(timestamp), totalSteps };
  }

  return { push };
}

/** Weight for an exponential moving average with the given time constant. */
function smoothingFactor(dt: number, timeConstant: number) {
  return dt / (timeConstant + dt);
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
