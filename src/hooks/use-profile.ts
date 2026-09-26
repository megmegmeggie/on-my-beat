import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

export const GENDERS = ['male', 'female', 'other'] as const;
export type Gender = (typeof GENDERS)[number];
export type HeightUnit = 'imperial' | 'metric';

export type Profile = {
  name: string;
  gender: Gender | null;
  /** Always stored in centimeters; `heightUnit` only controls how it is entered and shown. */
  heightCm: number | null;
  heightUnit: HeightUnit;
};

const STORAGE_KEY = 'profile';

export const EMPTY_PROFILE: Profile = {
  name: '',
  gender: null,
  heightCm: null,
  heightUnit: 'imperial',
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

// Common pedometer rule of thumb: stride ≈ height × factor. It is a rough
// walking estimate; running strides are longer and vary with pace.
const STRIDE_FACTOR: Record<Gender, number> = {
  male: 0.415,
  female: 0.413,
  other: 0.414,
};
const DEFAULT_STRIDE_FACTOR = 0.414;

const CM_PER_INCH = 2.54;
const INCHES_PER_FOOT = 12;

export const MIN_HEIGHT_CM = 90;
export const MAX_HEIGHT_CM = 250;

export function estimateStrideLengthCm(heightCm: number, gender: Gender | null) {
  return heightCm * (gender ? STRIDE_FACTOR[gender] : DEFAULT_STRIDE_FACTOR);
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
