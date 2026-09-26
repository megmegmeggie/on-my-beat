import { type ComponentProps, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, BrandColors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  cmToFeetAndInches,
  DEFAULT_PACE,
  estimateStrideLengthCm,
  feetAndInchesToCm,
  formatLength,
  formatPace,
  type Gender,
  type HeightUnit,
  isValidHeightCm,
  type Pace,
  type Profile,
  useProfile,
} from '@/hooks/use-profile';
import { previewVoice, VOICE_OPTIONS } from '@/lib/voice-cues';

type Colors = (typeof BrandColors)['light' | 'dark'];

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const PACE_OPTIONS: { value: Pace; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'fast', label: 'Fast' },
];

const UNIT_OPTIONS: { value: HeightUnit; label: string }[] = [
  { value: 'imperial', label: 'ft / in' },
  { value: 'metric', label: 'cm' },
];

const onlyDigits = (text: string) => text.replace(/[^0-9]/g, '');

function heightDrafts(heightCm: number | null) {
  if (heightCm === null) {
    return { feet: '', inches: '', cm: '' };
  }
  const { feet, inches } = cmToFeetAndInches(heightCm);
  return { feet: String(feet), inches: String(inches), cm: String(Math.round(heightCm)) };
}

export default function ProfileScreen() {
  const scheme = useColorScheme();
  const colors = BrandColors[scheme === 'dark' ? 'dark' : 'light'];
  const [profile, updateProfile] = useProfile();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {profile && <ProfileForm profile={profile} updateProfile={updateProfile} colors={colors} />}
      </SafeAreaView>
    </ThemedView>
  );
}

function ProfileForm({
  profile,
  updateProfile,
  colors,
}: {
  profile: Profile;
  updateProfile: (changes: Partial<Profile>) => void;
  colors: Colors;
}) {
  // The height fields keep what the user typed; only valid heights are saved.
  const [drafts, setDrafts] = useState(() => heightDrafts(profile.heightCm));
  const [heightTouched, setHeightTouched] = useState(false);

  const isImperial = profile.heightUnit === 'imperial';
  const hasHeightInput = isImperial ? drafts.feet !== '' || drafts.inches !== '' : drafts.cm !== '';
  const showHeightError = heightTouched && hasHeightInput && profile.heightCm === null;

  function updateHeight(next: typeof drafts) {
    setDrafts(next);
    let heightCm: number | null = null;
    if (isImperial) {
      const feet = Number(next.feet || 0);
      const inches = Number(next.inches || 0);
      heightCm = inches < 12 ? feetAndInchesToCm(feet, inches) : null;
    } else if (next.cm !== '') {
      heightCm = Number(next.cm);
    }
    updateProfile({ heightCm: heightCm !== null && isValidHeightCm(heightCm) ? heightCm : null });
  }

  function changeUnit(heightUnit: HeightUnit) {
    setDrafts(heightDrafts(profile.heightCm));
    setHeightTouched(false);
    updateProfile({ heightUnit });
  }

  const inputStyle = [styles.input, { backgroundColor: colors.card, color: colors.cardText, borderColor: colors.radio }];

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ThemedText type="title" style={[styles.title, { color: colors.heading }]}>
        Profile
      </ThemedText>
      <ThemedText style={{ color: colors.cardSubtext }}>
        Tell us a little about yourself so we can estimate your running stride.
      </ThemedText>

      <View style={styles.field}>
        <ThemedText type="smallBold" style={[styles.sectionLabel, { color: colors.goldText }]}>
          Name
        </ThemedText>
        <TextInput
          value={profile.name}
          onChangeText={(name) => updateProfile({ name })}
          placeholder="Your name"
          placeholderTextColor={colors.cardSubtext}
          autoComplete="name"
          textContentType="name"
          autoCapitalize="words"
          returnKeyType="done"
          accessibilityLabel="Name"
          style={inputStyle}
        />
      </View>

      <View style={styles.field}>
        <ThemedText type="smallBold" style={[styles.sectionLabel, { color: colors.goldText }]}>
          Gender
        </ThemedText>
        <View style={styles.chipRow} accessibilityRole="radiogroup">
          {GENDER_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={profile.gender === option.value}
              onPress={() => updateProfile({ gender: profile.gender === option.value ? null : option.value })}
              colors={colors}
            />
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <View style={styles.heightHeader}>
          <ThemedText type="smallBold" style={[styles.sectionLabel, { color: colors.goldText }]}>
            Height
          </ThemedText>
          <View style={styles.unitRow} accessibilityRole="radiogroup">
            {UNIT_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={profile.heightUnit === option.value}
                onPress={() => changeUnit(option.value)}
                colors={colors}
                small
              />
            ))}
          </View>
        </View>

        {isImperial ? (
          <View style={styles.heightRow}>
            <UnitInput
              value={drafts.feet}
              onChangeText={(feet) => updateHeight({ ...drafts, feet: onlyDigits(feet) })}
              onBlur={() => setHeightTouched(true)}
              unit="ft"
              maxLength={1}
              accessibilityLabel="Height, feet"
              inputStyle={inputStyle}
              colors={colors}
            />
            <UnitInput
              value={drafts.inches}
              onChangeText={(inches) => updateHeight({ ...drafts, inches: onlyDigits(inches) })}
              onBlur={() => setHeightTouched(true)}
              unit="in"
              maxLength={2}
              accessibilityLabel="Height, inches"
              inputStyle={inputStyle}
              colors={colors}
            />
          </View>
        ) : (
          <View style={styles.heightRow}>
            <UnitInput
              value={drafts.cm}
              onChangeText={(cm) => updateHeight({ ...drafts, cm: onlyDigits(cm) })}
              onBlur={() => setHeightTouched(true)}
              unit="cm"
              maxLength={3}
              accessibilityLabel="Height, centimeters"
              inputStyle={inputStyle}
              colors={colors}
            />
          </View>
        )}

        {showHeightError && (
          <ThemedText type="small" style={{ color: colors.error }}>
            {isImperial ? 'Enter a height between 3 ft and 8 ft 2 in.' : 'Enter a height between 90 and 250 cm.'}
          </ThemedText>
        )}
      </View>

      <View style={styles.field}>
        <ThemedText type="smallBold" style={[styles.sectionLabel, { color: colors.goldText }]}>
          Typical running pace (optional)
        </ThemedText>
        <View style={styles.chipRow} accessibilityRole="radiogroup">
          {PACE_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={profile.pace === option.value}
              onPress={() => updateProfile({ pace: profile.pace === option.value ? null : option.value })}
              colors={colors}
            />
          ))}
        </View>
        <ThemedText type="small" style={{ color: colors.cardSubtext }}>
          {profile.pace
            ? `About ${formatPace(profile.pace, profile.heightUnit)}.`
            : `Not sure? Leave it blank and we'll assume moderate (about ${formatPace(DEFAULT_PACE, profile.heightUnit)}).`}
        </ThemedText>
      </View>

      <View style={[styles.strideCard, { backgroundColor: colors.banner }]}>
        <ThemedText type="smallBold" style={[styles.sectionLabel, { color: colors.bannerLabel }]}>
          Estimated running stride
        </ThemedText>
        {profile.heightCm !== null ? (
          <>
            <ThemedText type="subtitle" style={{ color: colors.bannerText }}>
              {formatLength(estimateStrideLengthCm(profile.heightCm, profile.pace), profile.heightUnit)}
            </ThemedText>
            <ThemedText type="small" style={{ color: colors.bannerText }}>
              Per step, at {profile.pace ?? DEFAULT_PACE} pace. A rough estimate based on your height.
            </ThemedText>
          </>
        ) : (
          <ThemedText style={{ color: colors.bannerText }}>Add your height to see your estimated running stride.</ThemedText>
        )}
      </View>

      <View style={styles.field}>
        <View style={styles.toggleRow}>
          <ThemedText type="smallBold" style={[styles.sectionLabel, { color: colors.goldText }]}>
            Voice cues
          </ThemedText>
          <Switch
            value={profile.voiceCues}
            onValueChange={(voiceCues) => updateProfile({ voiceCues })}
            trackColor={{ true: colors.gold, false: colors.radio }}
            thumbColor={colors.bannerText}
            accessibilityLabel="Voice cues"
            accessibilityHint="Speaks faster, slower, or on pace as your cadence changes during a run"
          />
        </View>
        <ThemedText type="small" style={{ color: colors.cardSubtext }}>
          A voice tells you to pick the pace up, ease off, or that you are on target as your cadence drifts during a
          run. The music dips underneath each cue.
        </ThemedText>
        {profile.voiceCues && (
          <View style={styles.chipRow} accessibilityRole="radiogroup">
            {VOICE_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={profile.voice === option.value}
                onPress={() => {
                  updateProfile({ voice: option.value });
                  // Say it, so the voice can be chosen by ear.
                  previewVoice(option.value);
                }}
                colors={colors}
                small
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function Chip({
  label,
  selected,
  onPress,
  colors,
  small = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: Colors;
  small?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [
        small ? styles.chipSmall : styles.chip,
        {
          backgroundColor: selected ? colors.cardSelected : colors.card,
          borderColor: selected ? colors.gold : 'transparent',
        },
        pressed && styles.pressed,
      ]}>
      <ThemedText type={small ? 'small' : 'default'} style={{ color: colors.cardText }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function UnitInput({
  unit,
  inputStyle,
  colors,
  ...inputProps
}: ComponentProps<typeof TextInput> & {
  unit: string;
  inputStyle: ComponentProps<typeof TextInput>['style'];
  colors: Colors;
}) {
  return (
    <View style={styles.unitInput}>
      <TextInput
        {...inputProps}
        keyboardType="number-pad"
        returnKeyType="done"
        placeholder="0"
        placeholderTextColor={colors.cardSubtext}
        style={[inputStyle, styles.numberInput]}
      />
      <ThemedText style={{ color: colors.cardSubtext }}>{unit}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.four,
  },
  title: {
    fontSize: 56,
    lineHeight: 64,
    fontWeight: 700,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  field: {
    gap: Spacing.two,
  },
  input: {
    fontSize: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 999,
    borderWidth: 2,
  },
  chipSmall: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
    borderWidth: 2,
  },
  heightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unitRow: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  heightRow: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
  unitInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  numberInput: {
    width: 72,
    textAlign: 'center',
  },
  strideCard: {
    gap: Spacing.one,
    padding: Spacing.four,
    borderRadius: Spacing.four,
    marginTop: Spacing.two,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
