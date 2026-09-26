import type { PlanId } from '@/hooks/use-selected-plan';
import type { Plan, Segment, Workout } from '@/lib/types';

import { PLAN_EVIDENCE } from '@/lib/training-evidence';

/** Target cadences in steps per minute. Easy running is lower than fast interval work. */
export const CADENCE = {
  coolDown: 155,
  walk: 115,
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
  name: 'Easy run',
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
  name: 'Long run',
  segments: [warmUp(), minutes('Steady', mins - 10, CADENCE.steady), coolDown()],
});

/** Alternating run and walk, the shape used by Couch to 5K and the Galloway plans. */
function runWalk(id: string, runMins: number, walkMins: number, rounds: number): Workout {
  const blocks = Array.from({ length: rounds }, (_, i) => [
    minutes(`Run ${i + 1}`, runMins, CADENCE.easy),
    minutes(`Walk ${i + 1}`, walkMins, CADENCE.walk),
  ]).flat();
  return {
    id,
    name: `Run/walk · ${rounds} × ${runMins}/${walkMins} min`,
    segments: [warmUp(), ...blocks, coolDown()],
  };
}

/** Race day: warm up, hold the target pace, cool down. */
const raceDay = (id: string, mins: number): Workout => ({
  id,
  name: `Race day · ${mins} min`,
  segments: [warmUp(10), minutes('Race', mins, CADENCE.steady), coolDown(10)],
});

/** A session in a given week: day 1 easy, day 2 quality, day 3 long. */
type WeekSpec = { easy: number; quality: (id: string) => Workout; long: number };

/** Builds one week per spec, with ids derived from the week's position in the plan. */
function buildWeeks(prefix: string, specs: WeekSpec[]): Workout[][] {
  return specs.map((spec, i) => {
    const w = i + 1;
    return [easyRun(`${prefix}-w${w}d1`, spec.easy), spec.quality(`${prefix}-w${w}d2`), longRun(`${prefix}-w${w}d3`, spec.long)];
  });
}

/**
 * Full-length programs, not samples.
 *
 * Durations are in minutes and follow the sources in `PLAN_EVIDENCE`: the 5K is nine weeks of
 * run/walk building to 30 minutes continuous (NHS Couch to 5K), the half is twelve weeks peaking at a
 * ~110-minute long run (B.A.A. Boston Half), and the marathon is eighteen weeks peaking at a
 * ~195-minute long run three weeks out, then a three-week taper (Hal Higdon Marathon Novice 1).
 */
export const PLANS: Record<PlanId, Plan> = {
  '5k': {
    name: '5K',
    weeks: [
      // Weeks 1–6 alternate running and walking with a rest day between each run: NHS Couch to 5K.
      ...[
        [1, 1.5, 7],
        [1.5, 2, 6],
        [2, 2, 6],
        [3, 2, 5],
        [5, 3, 4],
        [10, 2, 3],
      ].map(([run, walk, rounds], i) => {
        const w = i + 1;
        return [0, 1, 2].map((d) => runWalk(`5k-w${w}d${d + 1}`, run, walk, rounds));
      }),
      // Weeks 7–8 run continuously, the walk breaks withdrawn as the plan asks.
      ...[
        [easyRun('5k-w7d1', 25), easyRun('5k-w7d2', 25), easyRun('5k-w7d3', 28)],
        [easyRun('5k-w8d1', 28), easyRun('5k-w8d2', 30), easyRun('5k-w8d3', 30)],
      ],
      // Race week: a short shakeout, then the 5K.
      [easyRun('5k-w9d1', 20), raceDay('5k-w9d2', 30)],
    ],
    evidence: PLAN_EVIDENCE['5k'],
  },

  'half-marathon': {
    name: 'Half Marathon',
    weeks: [
      ...buildWeeks('half', [
        { easy: 30, quality: (id) => tempoRun(id, 12), long: 50 },
        { easy: 30, quality: (id) => intervalRun(id, 5, 3, 2), long: 55 },
        { easy: 35, quality: (id) => tempoRun(id, 15), long: 60 },
        { easy: 35, quality: (id) => tempoRun(id, 18), long: 65 },
        { easy: 35, quality: (id) => intervalRun(id, 6, 3, 2), long: 70 },
        { easy: 40, quality: (id) => tempoRun(id, 20), long: 75 },
        { easy: 40, quality: (id) => tempoRun(id, 22), long: 80 },
        { easy: 40, quality: (id) => intervalRun(id, 6, 3, 2), long: 85 },
        { easy: 40, quality: (id) => tempoRun(id, 25), long: 95 },
        { easy: 35, quality: (id) => tempoRun(id, 20), long: 80 },
        { easy: 30, quality: (id) => tempoRun(id, 15), long: 60 },
      ]),
      [easyRun('half-w12d1', 25), raceDay('half-w12d2', 105)],
    ],
    evidence: PLAN_EVIDENCE['half-marathon'],
  },

  marathon: {
    name: 'Marathon',
    weeks: [
      // Hal Higdon Marathon Novice 1: 18 weeks, long run opens at ~60 min, peaks at ~195 min
      // three weeks out, then a three-week taper.
      ...buildWeeks('marathon', [
        { easy: 40, quality: (id) => tempoRun(id, 20), long: 60 },
        { easy: 40, quality: (id) => intervalRun(id, 6, 3, 2), long: 70 },
        { easy: 45, quality: (id) => tempoRun(id, 25), long: 80 },
        { easy: 45, quality: (id) => intervalRun(id, 6, 3, 2), long: 90 },
        { easy: 45, quality: (id) => tempoRun(id, 30), long: 100 },
        { easy: 50, quality: (id) => intervalRun(id, 8, 3, 2), long: 110 },
        { easy: 50, quality: (id) => tempoRun(id, 30), long: 120 },
        { easy: 50, quality: (id) => intervalRun(id, 8, 3, 2), long: 130 },
        { easy: 50, quality: (id) => tempoRun(id, 35), long: 140 },
        { easy: 50, quality: (id) => tempoRun(id, 35), long: 150 },
        { easy: 50, quality: (id) => tempoRun(id, 30), long: 165 },
        { easy: 45, quality: (id) => tempoRun(id, 25), long: 180 },
        { easy: 40, quality: (id) => intervalRun(id, 6, 3, 2), long: 195 },
        { easy: 40, quality: (id) => tempoRun(id, 20), long: 150 },
        { easy: 35, quality: (id) => tempoRun(id, 15), long: 110 },
      ]),
      ...[
        [easyRun('marathon-w16d1', 30), intervalRun('marathon-w16d2', 5, 3, 2), longRun('marathon-w16d3', 75)],
        [easyRun('marathon-w17d1', 25), tempoRun('marathon-w17d2', 15), longRun('marathon-w17d3', 50)],
        [easyRun('marathon-w18d1', 20), raceDay('marathon-w18d2', 210)],
      ],
    ],
    evidence: PLAN_EVIDENCE['marathon'],
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
