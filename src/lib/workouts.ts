import type { PlanId } from '@/hooks/use-selected-plan';
import type { Plan, Segment, Workout } from '@/lib/types';

/** Target cadences in steps per minute. Easy running is lower than fast interval work. */
export const CADENCE = {
  coolDown: 155,
  warmUp: 160,
  recovery: 160,
  easy: 165,
  steady: 170,
  tempo: 175,
  fast: 180,
} as const;

const minutes = (label: string, mins: number, targetCadence: number): Segment => ({
  label,
  durationSec: Math.round(mins * 60),
  targetCadence,
});

const warmUp = (mins = 5) => minutes('Warm-up', mins, CADENCE.warmUp);
const coolDown = (mins = 5) => minutes('Cool-down', mins, CADENCE.coolDown);

/** `rounds` × (fast, then recovery), e.g. 6 × (1 min fast, 1:30 easy). */
function intervals(rounds: number, fastMins: number, recoveryMins: number): Segment[] {
  return Array.from({ length: rounds }, (_, i) => [
    minutes(`Fast ${i + 1} of ${rounds}`, fastMins, CADENCE.fast),
    minutes(`Recover ${i + 1} of ${rounds}`, recoveryMins, CADENCE.recovery),
  ]).flat();
}

const easyRun = (id: string, mins: number): Workout => ({
  id,
  name: `Easy run · ${mins} min`,
  segments: [warmUp(), minutes('Easy', mins - 10, CADENCE.easy), coolDown()],
});

const intervalRun = (id: string, rounds: number, fastMins: number, recoveryMins: number): Workout => ({
  id,
  name: `Intervals · ${rounds} × ${fastMins} min`,
  segments: [warmUp(8), ...intervals(rounds, fastMins, recoveryMins), coolDown()],
});

const tempoRun = (id: string, tempoMins: number): Workout => ({
  id,
  name: `Tempo · ${tempoMins} min`,
  segments: [warmUp(10), minutes('Tempo', tempoMins, CADENCE.tempo), coolDown()],
});

const longRun = (id: string, mins: number): Workout => ({
  id,
  name: `Long run · ${mins} min`,
  segments: [warmUp(), minutes('Steady', mins - 10, CADENCE.steady), coolDown()],
});

/** Short sample plans (two weeks each), not full training programs. */
export const PLANS: Record<PlanId, Plan> = {
  '5k': {
    name: '5K',
    weeks: [
      [easyRun('5k-w1d1', 20), intervalRun('5k-w1d2', 6, 1, 1.5), easyRun('5k-w1d3', 25)],
      [easyRun('5k-w2d1', 25), intervalRun('5k-w2d2', 8, 1, 1.5), tempoRun('5k-w2d3', 12)],
    ],
  },
  'half-marathon': {
    name: 'Half Marathon',
    weeks: [
      [easyRun('half-w1d1', 30), tempoRun('half-w1d2', 15), longRun('half-w1d3', 50)],
      [easyRun('half-w2d1', 35), intervalRun('half-w2d2', 5, 3, 2), longRun('half-w2d3', 60)],
    ],
  },
  marathon: {
    name: 'Marathon',
    weeks: [
      [easyRun('marathon-w1d1', 40), tempoRun('marathon-w1d2', 25), longRun('marathon-w1d3', 75)],
      [easyRun('marathon-w2d1', 45), intervalRun('marathon-w2d2', 6, 3, 2), longRun('marathon-w2d3', 90)],
    ],
  },
};

/** Quick runs on the home screen. "Custom" is built on the Run tab and stored separately. */
export const QUICK_RUNS = {
  intervals: {
    id: 'quick-intervals',
    name: 'Intervals',
    segments: [warmUp(8), ...intervals(8, 1, 1.5), coolDown()],
  },
  easy: easyRun('quick-easy', 30),
} satisfies Record<string, Workout>;

const BUILT_IN_WORKOUTS: Workout[] = [
  ...Object.values(PLANS).flatMap((plan) => plan.weeks.flat()),
  ...Object.values(QUICK_RUNS),
];

/** A plan or quick-run workout by id. Custom workouts come from storage instead. */
export function getBuiltInWorkout(id: string): Workout | undefined {
  return BUILT_IN_WORKOUTS.find((workout) => workout.id === id);
}

export function workoutDurationSec(workout: Workout) {
  return workout.segments.reduce((total, segment) => total + segment.durationSec, 0);
}
