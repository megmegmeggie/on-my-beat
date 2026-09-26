import * as Speech from 'expo-speech';
import { useEffect, useRef } from 'react';

import { duckMusic } from '@/lib/music';
import type { CadenceFeedback } from '@/lib/run-session';

export const VOICE_IDS = ['current', 'soft', 'sergeant'] as const;
export type Voice = (typeof VOICE_IDS)[number];

/**
 * What's spoken for each cadence feedback state. `no-reading` has no phrase:
 * it happens whenever the step detector loses the runner, so announcing it
 * would be constant noise.
 */
export const FEEDBACK_PHRASE: Record<CadenceFeedback, string | null> = {
  'no-reading': null,
  'speed-up': 'Faster',
  'slow-down': 'Slower',
  'on-target': 'On pace',
};

export const VOICE_LABELS: Record<Voice, string> = {
  current: 'Current',
  soft: 'Soft',
  sergeant: 'Drill sergeant',
};

export const VOICE_OPTIONS = VOICE_IDS.map((value) => ({ value, label: VOICE_LABELS[value] }));

/**
 * Each voice is a tuning of the system voice rather than a named one, because
 * which voices a device has installed varies too much to pick a "soft" or a
 * "rough" one reliably. Pitch and rate are the only knobs that behave the same
 * everywhere; `current` is the tuning cues shipped with.
 */
const VOICE_TUNING: Record<Voice, Speech.SpeechOptions> = {
  current: { rate: 1.15 },
  soft: { rate: 1.05, pitch: 1.4 },
  sergeant: { rate: 1.4, pitch: 0.65 },
};

/**
 * Cues use the app's audio session: `setAudioModeAsync` in lib/music.ts turns
 * on `playsInSilentMode`, and the synthesizer's own session would respect the
 * silent switch instead, leaving cues inaudible during a run. (Sharing the
 * session costs automatic ducking, which `duckMusic` handles.)
 */
const SHARED_OPTIONS: Speech.SpeechOptions = { useApplicationAudioSession: true };

function speechOptions(voice: Voice): Speech.SpeechOptions {
  return { ...SHARED_OPTIONS, ...VOICE_TUNING[voice] };
}

/** Says a cue in `voice` immediately, so a voice can be heard before a run. */
export function previewVoice(voice: Voice) {
  void Speech.stop();
  // `on-target` always has a phrase; null is reserved for `no-reading`.
  Speech.speak(FEEDBACK_PHRASE['on-target']!, speechOptions(voice));
}

/**
 * Speaks a short phrase whenever `feedback` changes to one that has a phrase,
 * and stays quiet while `enabled` is false. The music ducks underneath a cue
 * and is stopped when the screen goes away.
 */
export function useVoiceCues(feedback: CadenceFeedback, enabled: boolean, voice: Voice) {
  // The state already announced, so only *changes* are spoken.
  const announced = useRef<CadenceFeedback | null>(null);

  useEffect(() => {
    if (!enabled) {
      // Reset so switching cues back on speaks the state the runner is in now.
      announced.current = null;
      duckMusic(false);
      void Speech.stop();
      return;
    }
    if (feedback === announced.current) {
      return;
    }
    announced.current = feedback;
    const phrase = FEEDBACK_PHRASE[feedback];
    if (!phrase) {
      return;
    }
    // `speak` queues behind anything already being spoken, which leaves cues
    // trailing the run. Drop whatever in flight so the newest one wins.
    void Speech.stop();
    Speech.speak(phrase, {
      ...speechOptions(voice),
      onStart: () => duckMusic(true),
      // A cue that never finishes (interrupted, or the engine failing) must not
      // leave the music ducked.
      onDone: () => duckMusic(false),
      onStopped: () => duckMusic(false),
      onError: () => duckMusic(false),
    });
    // A new voice applies to the next cue, not by interrupting the one playing.
  }, [enabled, feedback, voice]);

  useEffect(() => {
    return () => {
      duckMusic(false);
      void Speech.stop();
    };
  }, []);
}
