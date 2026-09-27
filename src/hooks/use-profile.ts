import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { type Voice, VOICE_IDS } from '@/lib/voice-cues';

export const GENDERS = ['male', 'female', 'other'] as const;
export type Gender = (typeof GENDERS)[number];
export type HeightUnit = 'imperial' | 'metric';
export const PACES = ['easy', 'moderate', 'fast'] as const;
export type Pace = (typeof PACES)[number];

export type Profile = {
  name: string;
  gender: Gender | null;
  /** Always stored in centimeters; `heightUnit` only controls how it is entered and shown. */
  heightCm: number | null;
  heightUnit: HeightUnit;
  /** Always stored in kilograms; shown in lb or kg to match `heightUnit`. Used for calories. */
  weightKg: number | null;
  /** Typical running pace; null means the user skipped it and `DEFAULT_PACE` is assumed. */
  pace: Pace | null;
  /** Speak cadence cues ("faster", "slower", "on pace") while a run is going. */
  voiceCues: boolean;
  /** Which voice speaks those cues. */
  voice: Voice;
  /** Vibrate when the workout moves to a new segment and when it's completed. */
  vibration: boolean;
};

const STORAGE_KEY = 'profile';

export const EMPTY_PROFILE: Profile = {
  name: '',
  gender: null,
  heightCm: null,
  heightUnit: 'imperial',
  weightKg: null,
  pace: null,
  voiceCues: true,
  voice: 'standard',
  vibration: true,
};

function parseProfile(stored: string | null): Profile {
  if (!stored) {
    return EMPTY_PROFILE;
  }
  try {
    const data = JSON.parse(stored);
    return {
      name: typeof data.name === 'string' ? data.name : '',
      gender: GENDERS.includes(data.gender) ? data.gender : null,
      heightCm: typeof data.heightCm === 'number' ? data.heightCm : null,
      heightUnit: data.heightUnit === 'metric' ? 'metric' : 'imperial',
      weightKg: typeof data.weightKg === 'number' ? data.weightKg : null,
      pace: PACES.includes(data.pace) ? data.pace : null,
      // Absent on profiles saved before cues existed, so default them on.
      voiceCues: typeof data.voiceCues === 'boolean' ? data.voiceCues : true,
      // Anything unrecognized (including the old `current` id) falls back to
      // the default voice, which is what `current` already meant.
      voice: VOICE_IDS.includes(data.voice) ? data.voice : 'standard',
      // Absent on profiles saved before vibration existed, so default it on.
      vibration: typeof data.vibration === 'boolean' ? data.vibration : true,
    };
  } catch {
    return EMPTY_PROFILE;
  }
}

/**
 * The user's profile, persisted across app restarts.
 * `profile` is null until the saved value has loaded.
 */
export function useProfile() {
  const [profile, setProfileState] = useState<Profile | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => setProfileState(parseProfile(stored)))
      .catch((error) => {
        console.warn('Failed to load profile', error);
        setProfileState(EMPTY_PROFILE);
      });
  }, []);

  function updateProfile(changes: Partial<Profile>) {
    const next = { ...(profile ?? EMPTY_PROFILE), ...changes };
    setProfileState(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch((error) =>
      console.warn('Failed to save profile', error)
    );
  }

  return [profile, updateProfile] as const;
}

const CM_PER_INCH = 2.54;
const INCHES_PER_FOOT = 12;

export const MIN_HEIGHT_CM = 90;
export const MAX_HEIGHT_CM = 250;
export const MIN_WEIGHT_KG = 25;
export const MAX_WEIGHT_KG = 300;
const LB_PER_KG = 2.20462;

export const PACE_SECONDS_PER_MILE: Record<Pace, number> = {
  easy: 10 * 60,
  moderate: 7 * 60 + 30,
  fast: 5 * 60 + 30,
};
export const DEFAULT_PACE: Pace = 'moderate';

// Running stride estimate shown on the Profile page. "Stride" means one step
// (foot strike to the opposite foot strike), as running watches use the term.
// It follows the usual rule of thumb that a recreational runner's step is about
// 0.55–0.75 × their height, longer the faster they run. (Deriving it from
// speed ÷ cadence instead gives about 5 ft per step at a 5:30 mile, which is
// right for fast runners but reads as wrong to most people.)
const STRIDE_TO_HEIGHT: Record<Pace, number> = {
  easy: 0.55,
  moderate: 0.65,
  fast: 0.75,
};

const METERS_PER_MILE = 1609.344;
const BASE_CADENCE_SPM = 168; // Typical recreational cadence at 3 m/s for a 170 cm runner.
const BASE_SPEED_MPS = 3;
const BASE_HEIGHT_CM = 170;
const CADENCE_PER_MPS = 6;
const CADENCE_PER_HEIGHT_CM = -0.42;

export function paceToSpeedMps(pace: Pace | null) {
  return METERS_PER_MILE / PACE_SECONDS_PER_MILE[pace ?? DEFAULT_PACE];
}

/**
 * Estimated running cadence in steps per minute for a runner of `heightCm` at
 * `speedMps` (use `paceToSpeedMps` for a pace choice, or a live GPS speed).
 * Use this rather than deriving cadence from the stride estimate, which is
 * itself calculated from this cadence. Prefer measured cadence when available.
 */
export function estimateCadenceSpm(heightCm: number, speedMps: number) {
  return (
    BASE_CADENCE_SPM +
    CADENCE_PER_MPS * (speedMps - BASE_SPEED_MPS) +
    CADENCE_PER_HEIGHT_CM * (heightCm - BASE_HEIGHT_CM)
  );
}

export function estimateStrideLengthCm(heightCm: number, pace: Pace | null) {
  return heightCm * STRIDE_TO_HEIGHT[pace ?? DEFAULT_PACE];
}

export function formatPace(pace: Pace, unit: HeightUnit) {
  const miles = unit === 'imperial';
  const seconds = Math.round(PACE_SECONDS_PER_MILE[pace] / (miles ? 1 : METERS_PER_MILE / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')} per ${miles ? 'mile' : 'km'}`;
}

export function isValidHeightCm(heightCm: number) {
  return heightCm >= MIN_HEIGHT_CM && heightCm <= MAX_HEIGHT_CM;
}

export function isValidWeightKg(weightKg: number) {
  return weightKg >= MIN_WEIGHT_KG && weightKg <= MAX_WEIGHT_KG;
}

export const poundsToKg = (pounds: number) => pounds / LB_PER_KG;
export const kgToPounds = (kg: number) => kg * LB_PER_KG;

export function feetAndInchesToCm(feet: number, inches: number) {
  return (feet * INCHES_PER_FOOT + inches) * CM_PER_INCH;
}

export function cmToFeetAndInches(cm: number) {
  const totalInches = Math.round(cm / CM_PER_INCH);
  return { feet: Math.floor(totalInches / INCHES_PER_FOOT), inches: totalInches % INCHES_PER_FOOT };
}

export function formatLength(cm: number, unit: 'imperial' | 'metric') {
  if (unit === 'metric') {
    return `${Math.round(cm)} cm`;
  }
  const { feet, inches } = cmToFeetAndInches(cm);
  return feet > 0 ? `${feet} ft ${inches} in` : `${inches} in`;
}
