import { useEffect, useReducer, useRef } from 'react';

import type { CadenceSample, Segment, Workout } from '@/lib/types';

/** Within this many steps/min of the target counts as on target. */
export const ON_TARGET_TOLERANCE_SPM = 8;
/** How often the timer advances while running. */
const TICK_MS = 250;
/** Running time covered by each sample of the cadence trace (a segment change also starts one). */
const TRACE_SAMPLE_MS = 10_000;

export type RunStatus = 'ready' | 'running' | 'paused' | 'finished';

/** The trace sample being filled: where it started (in `activeMs`), and its cadence sums. */
type OpenSample = { startMs: number; segmentIndex: number; targetCadence: number; cadenceMs: number; cadenceWeightedSum: number };

export type RunSessionState = {
  status: RunStatus;
  segmentIndex: number;
  segmentElapsedMs: number;
  /** Time spent running, excluding pauses and skipped time. */
  activeMs: number;
  /** Time with a cadence reading, and the cadence summed over that time, for the average. */
  cadenceMs: number;
  cadenceWeightedSum: number;
  onTargetMs: number;
  /** False when the runner ended the workout early. */
  completed: boolean;
  /** Finished samples of the cadence trace; `cadenceTrace` adds the open one. */
  trace: CadenceSample[];
  openSample: OpenSample | null;
};

type Action =
  | { type: 'start' | 'pause' | 'resume' | 'skip' | 'end' }
  | { type: 'tick'; dtMs: number; cadence: number | null };

export const INITIAL_RUN_STATE: RunSessionState = {
  status: 'ready',
  segmentIndex: 0,
  segmentElapsedMs: 0,
  activeMs: 0,
  cadenceMs: 0,
  cadenceWeightedSum: 0,
  onTargetMs: 0,
  completed: false,
  trace: [],
  openSample: null,
};

export type CadenceFeedback = 'no-reading' | 'speed-up' | 'slow-down' | 'on-target';

export function cadenceFeedback(cadence: number | null, target: number): CadenceFeedback {
  if (cadence === null) {
    return 'no-reading';
  }
  if (cadence < target - ON_TARGET_TOLERANCE_SPM) {
    return 'speed-up';
  }
  return cadence > target + ON_TARGET_TOLERANCE_SPM ? 'slow-down' : 'on-target';
}

/** Pure state transitions for a run; exported so it can be tested without timers. */
export function runSessionReducer(segments: Segment[], state: RunSessionState, action: Action): RunSessionState {
  switch (action.type) {
    case 'start':
      return state.status === 'ready' ? { ...state, status: 'running' } : state;
    case 'pause':
      return state.status === 'running' ? { ...state, status: 'paused' } : state;
    case 'resume':
      return state.status === 'paused' ? { ...state, status: 'running' } : state;
    case 'end':
      return state.status === 'finished' ? state : { ...state, status: 'finished', completed: false };
    case 'skip':
      return state.status === 'running' || state.status === 'paused' ? advanceSegment(segments, state) : state;
    case 'tick': {
      if (state.status !== 'running') {
        return state;
      }
      const target = segments[state.segmentIndex].targetCadence;
      let next: RunSessionState = {
        ...state,
        activeMs: state.activeMs + action.dtMs,
        segmentElapsedMs: state.segmentElapsedMs + action.dtMs,
      };
      let sample = state.openSample;
      if (!sample || sample.segmentIndex !== state.segmentIndex || state.activeMs - sample.startMs >= TRACE_SAMPLE_MS) {
        if (sample) {
          next.trace = [...state.trace, closeSample(sample)];
        }
        sample = { startMs: state.activeMs, segmentIndex: state.segmentIndex, targetCadence: target, cadenceMs: 0, cadenceWeightedSum: 0 };
      }
      if (action.cadence !== null) {
        next.cadenceMs += action.dtMs;
        next.cadenceWeightedSum += action.cadence * action.dtMs;
        if (cadenceFeedback(action.cadence, target) === 'on-target') {
          next.onTargetMs += action.dtMs;
        }
        sample = {
          ...sample,
          cadenceMs: sample.cadenceMs + action.dtMs,
          cadenceWeightedSum: sample.cadenceWeightedSum + action.cadence * action.dtMs,
        };
      }
      next.openSample = sample;
      // Carry leftover time into the following segment(s).
      while (next.status === 'running' && next.segmentElapsedMs >= segments[next.segmentIndex].durationSec * 1000) {
        const overflow = next.segmentElapsedMs - segments[next.segmentIndex].durationSec * 1000;
        next = advanceSegment(segments, next);
        next.segmentElapsedMs = next.status === 'finished' ? 0 : overflow;
      }
      return next;
    }
  }
}

function advanceSegment(segments: Segment[], state: RunSessionState): RunSessionState {
  if (state.segmentIndex >= segments.length - 1) {
    return { ...state, status: 'finished', completed: true, segmentElapsedMs: 0 };
  }
  return { ...state, segmentIndex: state.segmentIndex + 1, segmentElapsedMs: 0 };
}

export function averageCadence(state: RunSessionState) {
  return state.cadenceMs > 0 ? Math.round(state.cadenceWeightedSum / state.cadenceMs) : null;
}

function closeSample(sample: OpenSample): CadenceSample {
  return {
    atSec: Math.round(sample.startMs / 1000),
    targetCadence: sample.targetCadence,
    cadence: sample.cadenceMs > 0 ? Math.round(sample.cadenceWeightedSum / sample.cadenceMs) : null,
  };
}

/** Target and actual cadence over the run so far, for the summary chart. */
export function cadenceTrace(state: RunSessionState): CadenceSample[] {
  return state.openSample ? [...state.trace, closeSample(state.openSample)] : state.trace;
}

/**
 * Steps through a workout's segments on a timer. `cadence` is the current
 * reading (live or simulated); it's sampled on every tick for the stats.
 */
export function useRunSession(workout: Workout, cadence: number | null) {
  const [state, dispatch] = useReducer(
    (current: RunSessionState, action: Action) => runSessionReducer(workout.segments, current, action),
    INITIAL_RUN_STATE
  );
  const latestCadence = useRef(cadence);

  useEffect(() => {
    latestCadence.current = cadence;
  }, [cadence]);

  useEffect(() => {
    if (state.status !== 'running') {
      return;
    }
    let lastTick = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      dispatch({ type: 'tick', dtMs: now - lastTick, cadence: latestCadence.current });
      lastTick = now;
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [state.status]);

  const segment = workout.segments[state.segmentIndex];
  return {
    state,
    segment,
    nextSegment: workout.segments[state.segmentIndex + 1],
    segmentRemainingSec: Math.max(0, Math.ceil(segment.durationSec - state.segmentElapsedMs / 1000)),
    start: () => dispatch({ type: 'start' }),
    pause: () => dispatch({ type: 'pause' }),
    resume: () => dispatch({ type: 'resume' }),
    skip: () => dispatch({ type: 'skip' }),
    end: () => dispatch({ type: 'end' }),
  };
}
