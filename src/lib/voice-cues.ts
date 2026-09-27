import * as Speech from 'expo-speech';
import { useEffect, useRef } from 'react';

import { duckMusic } from '@/lib/music';
import type { CadenceFeedback } from '@/lib/run-session';

export const VOICE_IDS = ['current', 'soft', 'sergeant'] as const;
export type Voice = (typeof VOICE_IDS)[number];

/**
 * What's spoken for each cadence feedback state. `no-reading` has no phrase:
 * a device with no usable motion sensor would otherwise announce "start
 * moving" every interval, forever.
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

/**
 * How often the runner's current pace is spoken. Announcing on a timer rather
 * than on every change: readings wobble either side of the tolerance band, so
 * cueing on change has the voice repeating itself several times a minute.
 */
const ANNOUNCE_INTERVAL_MS = 30_000;

/** Says a cue in `voice` immediately, so a voice can be heard before a run. */
export function previewVoice(voice: Voice) {
  void Speech.stop();
  // `on-target` always has a phrase; null is reserved for `no-reading`.
  Speech.speak(FEEDBACK_PHRASE['on-target']!, speechOptions(voice));
}

/**
 * Speaks the current pace every `ANNOUNCE_INTERVAL_MS` while `enabled` is true,
 * reading whatever `feedback` is at that moment. The music ducks underneath a
 * cue and speech is stopped when the screen goes away.
 */
export function useVoiceCues(feedback: CadenceFeedback, enabled: boolean, voice: Voice) {
  // The timer runs between renders, so it can't close over `feedback`.
  const latest = useRef(feedback);

  useEffect(() => {
    latest.current = feedback;
  }, [feedback]);

  useEffect(() => {
    if (!enabled) {
      duckMusic(false);
      void Speech.stop();
      return;
    }

    function announce() {
      const phrase = FEEDBACK_PHRASE[latest.current];
      if (!phrase) {
        return;
      }
      // `speak` queues behind anything already being spoken, so drop whatever
      // is in flight to keep the newest cue the only one heard.
      void Speech.stop();
      Speech.speak(phrase, {
        ...speechOptions(voice),
        onStart: () => duckMusic(true),
        // A cue that never finishes (interrupted, or the engine failing) must
        // not leave the music ducked.
        onDone: () => duckMusic(false),
        onStopped: () => duckMusic(false),
        onError: () => duckMusic(false),
      });
    }

    // Say the opening pace straight away, so a run isn't silent until the first
    // tick. Drop this line for a strictly-every-30-seconds cadence.
    announce();
    const timer = setInterval(announce, ANNOUNCE_INTERVAL_MS);
    // Clearing on pause also restarts the countdown on resume, so a paused run
    // never has announcements to catch up on.
    return () => clearInterval(timer);
  }, [enabled, voice]);

  useEffect(() => {
    return () => {
      duckMusic(false);
      void Speech.stop();
    };
  }, []);
}
