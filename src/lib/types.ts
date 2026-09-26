/** One timed part of a workout, e.g. "Warm-up, 5 min at 160 spm". */
export type Segment = { label: string; durationSec: number; targetCadence: number };

export type Workout = { id: string; name: string; segments: Segment[] };

/** `weeks[w][d]` is the workout for week w + 1, day d + 1. */
export type Plan = { name: string; weeks: Workout[][] };

/**
 * A song the run screen can play. `file` is anything expo-audio accepts (a URL or a
 * `require('…mp3')` module), or null for a placeholder with no audio yet.
 */
export type Track = { title: string; file: any; bpm: number; id?: string; artist?: string };

/** Where the runner is in a plan, zero-based: `{ week: 0, day: 1 }` is "Week 1, Day 2". */
export type PlanPosition = { week: number; day: number };

/** A finished (or ended-early) run, saved to history. */
export type RunRecord = {
  id: string;
  workoutId: string;
  workoutName: string;
  /** ISO date-time the run started. */
  startedAt: string;
  durationSec: number;
  /** Mean of the cadence readings taken while moving, or null if none. */
  averageCadence: number | null;
  /** Seconds where cadence was within the on-target range of the segment's target. */
  timeOnTargetSec: number;
  /** False if the runner ended the workout before the last segment finished. */
  completed: boolean;
};
