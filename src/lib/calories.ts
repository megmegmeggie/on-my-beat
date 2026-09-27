import { paceToSpeedMps, type Pace } from '@/hooks/use-profile';
import type { RunRecord } from '@/lib/types';

const METERS_PER_MILE = 1609.344;
/** Below this GPS distance the reading is too noisy to give a speed. */
const MIN_GPS_MILES = 0.1;
/** Slower than 100 m/min (~16 min/mile) counts as walking. */
const MAX_WALKING_M_PER_MIN = 100;
/** Burning 1 litre of oxygen releases about 5 kcal. */
const KCAL_PER_LITRE_O2 = 5;

export type CalorieEstimate = {
  kcal: number;
  /** Where the speed came from: the run's GPS distance, or the profile's typical pace. */
  basis: 'gps' | 'typical-pace';
};

/**
 * Oxygen cost of level walking or running in ml per kg per minute, from the
 * American College of Sports Medicine metabolic equations.
 */
function oxygenPerKgPerMin(metersPerMin: number) {
  const perMeter = metersPerMin <= MAX_WALKING_M_PER_MIN ? 0.1 : 0.2;
  return perMeter * metersPerMin + 3.5;
}

/**
 * Estimated calories for a run, or null without a weight. Uses the run's GPS
 * speed when it tracked enough distance, otherwise the runner's typical pace.
 */
export function estimateRunCalories(
  run: Pick<RunRecord, 'durationSec' | 'distanceMiles'>,
  weightKg: number | null,
  typicalPace: Pace | null
): CalorieEstimate | null {
  if (weightKg === null || run.durationSec <= 0) {
    return null;
  }
  const hasGps = run.distanceMiles !== undefined && run.distanceMiles >= MIN_GPS_MILES;
  const speedMps = hasGps
    ? ((run.distanceMiles as number) * METERS_PER_MILE) / run.durationSec
    : paceToSpeedMps(typicalPace);
  const litresO2 = (oxygenPerKgPerMin(speedMps * 60) * weightKg * (run.durationSec / 60)) / 1000;
  return { kcal: Math.round(litresO2 * KCAL_PER_LITRE_O2), basis: hasGps ? 'gps' : 'typical-pace' };
}
