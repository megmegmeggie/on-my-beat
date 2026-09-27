/** One timed part of a workout, e.g. "Warm-up, 5 min at 160 spm". */
export type Segment = { label: string; durationSec: number; targetCadence: number };

export type Workout = { id: string; name: string; segments: Segment[] };

/** A study or official programme a plan's design is drawn from. */
export type TrainingSource = { label: string; detail: string; href: string };

/** One established approach that shaped the plan. */
export type TrainingApproach = { name: string; summary: string };

/** What the plan is based on, plus where the evidence is contested. */
export type PlanEvidence = {
  basis: string;
  approaches: TrainingApproach[];
  caveat?: string;
  sources: TrainingSource[];
};

/** `weeks[w][d]` is the workout for week w + 1, day d + 1. */
export type Plan = { name: string; weeks: Workout[][]; evidence: PlanEvidence };

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
  /** Distance covered in miles (from GPS tracking), or null if GPS was unavailable. */
  distanceMiles?: number;
  /** Average pace in seconds per mile (from GPS), or null if not enough data. */
  averagePaceSecPerMile?: number;
};
