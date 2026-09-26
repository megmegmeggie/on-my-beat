import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PlanId } from '@/hooks/use-selected-plan';
import type { Plan, PlanPosition, RunRecord, Workout } from '@/lib/types';

const KEYS = {
  planPosition: (planId: PlanId) => `planPosition:${planId}`,
  customWorkouts: 'customWorkouts',
  runHistory: 'runHistory',
};

/** How many custom workouts to keep; older ones are dropped. */
const MAX_CUSTOM_WORKOUTS = 10;

const START: PlanPosition = { week: 0, day: 0 };

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const stored = await AsyncStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch (error) {
    console.warn(`Failed to read ${key}`, error);
    return fallback;
  }
}

async function writeJson(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to save ${key}`, error);
  }
}

// ── Plan progress ─────────────────────────────────────────────────────────────

/** The next workout to do in a plan. `week === plan.weeks.length` means the plan is finished. */
export function getPlanPosition(planId: PlanId) {
  return readJson(KEYS.planPosition(planId), START);
}

export function resetPlanPosition(planId: PlanId) {
  return writeJson(KEYS.planPosition(planId), START);
}

/** Where a workout sits in a plan, or null if it isn't part of it. */
export function findInPlan(plan: Plan, workoutId: string): PlanPosition | null {
  for (let week = 0; week < plan.weeks.length; week++) {
    const day = plan.weeks[week].findIndex((workout) => workout.id === workoutId);
    if (day >= 0) {
      return { week, day };
    }
  }
  return null;
}

function comesBefore(a: PlanPosition, b: PlanPosition) {
  return a.week < b.week || (a.week === b.week && a.day < b.day);
}

/** After finishing a plan workout, move the plan's next workout past it (never backwards). */
export async function completePlanWorkout(planId: PlanId, plan: Plan, workoutId: string) {
  const done = findInPlan(plan, workoutId);
  if (!done) {
    return;
  }
  const isLastDay = done.day === plan.weeks[done.week].length - 1;
  const next = isLastDay ? { week: done.week + 1, day: 0 } : { week: done.week, day: done.day + 1 };
  const current = await getPlanPosition(planId);
  if (comesBefore(current, next)) {
    await writeJson(KEYS.planPosition(planId), next);
  }
}

export function formatPlanPosition({ week, day }: PlanPosition) {
  return `Week ${week + 1}, Day ${day + 1}`;
}

// ── Custom workouts ───────────────────────────────────────────────────────────

export function getCustomWorkouts() {
  return readJson<Workout[]>(KEYS.customWorkouts, []);
}

export async function getCustomWorkout(id: string) {
  return (await getCustomWorkouts()).find((workout) => workout.id === id);
}

/** Saves a custom workout as the most recent one. */
export async function saveCustomWorkout(workout: Workout) {
  const others = (await getCustomWorkouts()).filter((existing) => existing.id !== workout.id);
  await writeJson(KEYS.customWorkouts, [workout, ...others].slice(0, MAX_CUSTOM_WORKOUTS));
}

// ── Run history ───────────────────────────────────────────────────────────────

/** Past runs, newest first. */
export function getRunHistory() {
  return readJson<RunRecord[]>(KEYS.runHistory, []);
}

export async function getRunRecord(id: string) {
  return (await getRunHistory()).find((record) => record.id === id);
}

export async function addRunRecord(record: RunRecord) {
  await writeJson(KEYS.runHistory, [record, ...(await getRunHistory())]);
}
