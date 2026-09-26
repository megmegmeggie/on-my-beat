import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

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
  /** Typical running pace; null means the user skipped it and `DEFAULT_PACE` is assumed. */
  pace: Pace | null;
};

const STORAGE_KEY = 'profile';

export const EMPTY_PROFILE: Profile = {
  name: '',
  gender: null,
  heightCm: null,
  heightUnit: 'imperial',
  pace: null,
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
      pace: PACES.includes(data.pace) ? data.pace : null,
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

// Running stride estimate. "Stride" means one step (foot strike to the opposite
// foot strike), as running watches use the term. Step length = speed ÷ cadence,
// with cadence estimated from published trends: roughly +6 steps/min per extra
// 1 m/s of speed, and −4 steps/min per extra 5 cm of leg length (leg ≈ 0.53 ×
// height). It is a starting guess; measured cadence and speed will be better.
export const PACE_SECONDS_PER_MILE: Record<Pace, number> = {
  easy: 11 * 60,
  moderate: 9 * 60 + 30,
  fast: 8 * 60,
};
export const DEFAULT_PACE: Pace = 'moderate';

const METERS_PER_MILE = 1609.344;
const BASE_CADENCE_SPM = 168; // Typical recreational cadence at 3 m/s for a 170 cm runner.
const BASE_SPEED_MPS = 3;
const BASE_HEIGHT_CM = 170;
const CADENCE_PER_MPS = 6;
const CADENCE_PER_HEIGHT_CM = -0.42;

function estimateCadenceSpm(heightCm: number, speedMps: number) {
  return (
    BASE_CADENCE_SPM +
    CADENCE_PER_MPS * (speedMps - BASE_SPEED_MPS) +
    CADENCE_PER_HEIGHT_CM * (heightCm - BASE_HEIGHT_CM)
  );
}

export function estimateStrideLengthCm(heightCm: number, pace: Pace | null) {
  const speedMps = METERS_PER_MILE / PACE_SECONDS_PER_MILE[pace ?? DEFAULT_PACE];
  const stepsPerSecond = estimateCadenceSpm(heightCm, speedMps) / 60;
  return (speedMps / stepsPerSecond) * 100;
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
