/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

// Green and gold palette for the app's own screens (home, profile).
export const BrandColors = {
  light: {
    heading: '#1F6B3A',
    banner: '#1F6B3A',
    bannerText: '#FFFFFF',
    bannerLabel: '#F2D27A',
    gold: '#C9A227',
    goldText: '#8A6D12',
    card: '#EEF5EF',
    cardSelected: '#FBF3D9',
    cardText: '#12311F',
    cardSubtext: '#4A5D50',
    radio: '#7C9484',
    error: '#B3261E',
    // Chart marks, validated for colorblind separation on `card` (see src/components/cadence-chart.tsx).
    chartYou: '#1F6B3A',
    chartTarget: '#A07A10',
    chartGrid: '#D5E4D8',
  },
  dark: {
    heading: '#6FCF8F',
    banner: '#1E5A36',
    bannerText: '#FFFFFF',
    bannerLabel: '#F2D27A',
    gold: '#E6C15A',
    goldText: '#E6C15A',
    card: '#16241B',
    cardSelected: '#2C2512',
    cardText: '#F1F5F2',
    cardSubtext: '#A9B8AE',
    radio: '#6B8373',
    error: '#F2B8B5',
    chartYou: '#3AA862',
    chartTarget: '#B38218',
    chartGrid: '#27392D',
  },
} as const;
