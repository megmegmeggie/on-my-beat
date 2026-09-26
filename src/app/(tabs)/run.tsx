import { router } from 'expo-router';
import { type ComponentProps, type ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, BrandColors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { estimateCadenceSpm, useProfile } from '@/hooks/use-profile';
import { useCadence } from '@/lib/cadence';
import { saveCustomWorkout } from '@/lib/storage';
import type { Segment } from '@/lib/types';
import { CADENCE } from '@/lib/workouts';
import { formatDuration } from '@/utils/formatting';

type Colors = (typeof BrandColors)['light' | 'dark'];
type RunMode = 'distance' | 'fartlek';
type TimeDraft = { minutes: string; seconds: string };

const MODE_OPTIONS: { value: RunMode; label: string; description: string }[] = [
  { value: 'distance', label: 'Distance', description: 'Set miles and a pace' },
  { value: 'fartlek', label: 'Fartlek', description: 'Alternate fast and easy' },
];

const DISTANCE_PRESETS = [
  { label: '1 mi', miles: '1' },
  { label: '5K', miles: '3.1' },
  { label: '10K', miles: '6.2' },
  { label: 'Half', miles: '13.1' },
  { label: 'Marathon', miles: '26.2' },
];

const INTERVAL_PRESETS: { fast: TimeDraft; easy: TimeDraft }[] = [
  { fast: { minutes: '0', seconds: '30' }, easy: { minutes: '1', seconds: '30' } },
  { fast: { minutes: '1', seconds: '00' }, easy: { minutes: '1', seconds: '00' } },
  { fast: { minutes: '1', seconds: '00' }, easy: { minutes: '2', seconds: '00' } },
  { fast: { minutes: '2', seconds: '00' }, easy: { minutes: '1', seconds: '00' } },
];

const MAX_MILES = 100;
const MIN_PACE_SECONDS = 3 * 60;
const MAX_PACE_SECONDS = 30 * 60;
const MAX_WORKOUT_MINUTES = 300;
const MIN_INTERVAL_SECONDS = 5;

const METERS_PER_MILE = 1609.344;
/** Height used for the cadence estimate when the profile has none. */
const DEFAULT_HEIGHT_CM = 170;

/** Saves the custom run so it can be reopened, then starts it on the run screen. */
async function startCustomRun(name: string, segments: Segment[]) {
  const id = `custom-${Date.now()}`;
  await saveCustomWorkout({ id, name, segments });
  router.push({ pathname: '/workout/[id]', params: { id } });
}

const onlyDigits = (text: string) => text.replace(/[^0-9]/g, '');
// Digits with at most one decimal point.
const onlyDecimal = (text: string) => text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');

/** Total seconds for a minutes/seconds draft, or null if empty or seconds ≥ 60. */
function toSeconds({ minutes, seconds }: TimeDraft) {
  if (minutes === '' && seconds === '') {
    return null;
  }
  const secs = Number(seconds || 0);
  return secs < 60 ? Number(minutes || 0) * 60 + secs : null;
}

function sameTime(a: TimeDraft, b: TimeDraft) {
  return toSeconds(a) === toSeconds(b);
}

export default function RunScreen() {
  const scheme = useColorScheme();
  const colors = BrandColors[scheme === 'dark' ? 'dark' : 'light'];
  const [mode, setMode] = useState<RunMode>('distance');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="title" style={[styles.title, { color: colors.heading }]}>
            Custom run
          </ThemedText>

          <View style={styles.modeRow} accessibilityRole="radiogroup">
            {MODE_OPTIONS.map((option) => {
              const selected = option.value === mode;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setMode(option.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  style={({ pressed }) => [
                    styles.modeCard,
                    {
                      backgroundColor: selected ? colors.cardSelected : colors.card,
                      borderColor: selected ? colors.gold : 'transparent',
                    },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="smallBold" style={{ color: colors.cardText }}>
                    {option.label}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: colors.cardSubtext }}>
                    {option.description}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {mode === 'distance' ? <DistanceSetup colors={colors} /> : <FartlekSetup colors={colors} />}

          <CadenceCard colors={colors} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function DistanceSetup({ colors }: { colors: Colors }) {
  const [profile] = useProfile();
  const [miles, setMiles] = useState('');
  const [pace, setPace] = useState<TimeDraft>({ minutes: '', seconds: '' });

  const distance = miles === '' || Number.isNaN(Number(miles)) ? null : Number(miles);
  const paceSeconds = toSeconds(pace);

  let summary: { value: string; detail: string } | null = null;
  let problem = 'Enter a distance and pace to see your estimated time.';
  if (distance !== null && (distance <= 0 || distance > MAX_MILES)) {
    problem = `Distance should be more than 0 and at most ${MAX_MILES} miles.`;
  } else if (paceSeconds !== null && (paceSeconds < MIN_PACE_SECONDS || paceSeconds > MAX_PACE_SECONDS)) {
    problem = 'Pace should be between 3:00 and 30:00 per mile.';
  } else if (pace.seconds !== '' && Number(pace.seconds) >= 60) {
    problem = 'Pace seconds should be less than 60.';
  } else if (distance !== null && paceSeconds !== null) {
    summary = {
      value: formatDuration(distance * paceSeconds),
      detail: `${distance} mi at ${formatDuration(paceSeconds)} per mile`,
    };
  }

  return (
    <>
      <Field label="Distance" colors={colors}>
        <View style={styles.inputRow}>
          <NumberInput
            value={miles}
            onChangeText={(text) => setMiles(onlyDecimal(text))}
            keyboardType="decimal-pad"
            placeholder="0.0"
            maxLength={5}
            accessibilityLabel="Distance in miles"
            colors={colors}
          />
          <ThemedText style={{ color: colors.cardSubtext }}>miles</ThemedText>
        </View>
        <View style={styles.chipRow}>
          {DISTANCE_PRESETS.map((preset) => (
            <Chip
              key={preset.label}
              label={preset.label}
              selected={distance === Number(preset.miles)}
              onPress={() => setMiles(preset.miles)}
              colors={colors}
            />
          ))}
        </View>
      </Field>

      <Field label="Pace" colors={colors}>
        <TimeInput value={pace} onChange={setPace} suffix="per mile" label="Pace" colors={colors} />
      </Field>

      <SummaryCard label="Estimated time" summary={summary} problem={problem} colors={colors} />
      {summary && distance !== null && paceSeconds !== null && (
        <StartButton
          colors={colors}
          onPress={() => {
            const speedMps = METERS_PER_MILE / paceSeconds;
            const targetCadence = Math.round(estimateCadenceSpm(profile?.heightCm ?? DEFAULT_HEIGHT_CM, speedMps));
            const label = `${distance} mi at ${formatDuration(paceSeconds)}/mi`;
            void startCustomRun(label, [{ label: 'Run', durationSec: Math.round(distance * paceSeconds), targetCadence }]);
          }}
        />
      )}
    </>
  );
}

function FartlekSetup({ colors }: { colors: Colors }) {
  const [totalMinutes, setTotalMinutes] = useState('');
  const [fast, setFast] = useState<TimeDraft>({ minutes: '1', seconds: '00' });
  const [easy, setEasy] = useState<TimeDraft>({ minutes: '2', seconds: '00' });

  const totalSeconds = totalMinutes === '' ? null : Number(totalMinutes) * 60;
  const fastSeconds = toSeconds(fast);
  const easySeconds = toSeconds(easy);

  let summary: { value: string; detail: string } | null = null;
  let segments: Segment[] = [];
  let problem = 'Enter a total time to see your intervals.';
  if (totalSeconds !== null && (totalSeconds <= 0 || totalSeconds > MAX_WORKOUT_MINUTES * 60)) {
    problem = `Total time should be between 1 and ${MAX_WORKOUT_MINUTES} minutes.`;
  } else if (fastSeconds === null || easySeconds === null) {
    problem = 'Enter a fast and an easy interval (seconds under 60).';
  } else if (fastSeconds < MIN_INTERVAL_SECONDS || easySeconds < MIN_INTERVAL_SECONDS) {
    problem = `Each interval should be at least ${MIN_INTERVAL_SECONDS} seconds.`;
  } else if (totalSeconds !== null && fastSeconds + easySeconds > totalSeconds) {
    problem = 'One fast + easy round is longer than the total time.';
  } else if (totalSeconds !== null) {
    const roundSeconds = fastSeconds + easySeconds;
    const rounds = Math.floor(totalSeconds / roundSeconds);
    const leftover = totalSeconds - rounds * roundSeconds;
    segments = Array.from({ length: rounds }, (_, i) => [
      { label: `Fast ${i + 1} of ${rounds}`, durationSec: fastSeconds, targetCadence: CADENCE.fast },
      { label: `Easy ${i + 1} of ${rounds}`, durationSec: easySeconds, targetCadence: CADENCE.recovery },
    ]).flat();
    if (leftover > 0) {
      segments.push({ label: 'Easy to finish', durationSec: leftover, targetCadence: CADENCE.recovery });
    }
    summary = {
      value: `${rounds} ${rounds === 1 ? 'round' : 'rounds'}`,
      detail:
        `${formatDuration(fastSeconds)} fast, then ${formatDuration(easySeconds)} easy` +
        (leftover > 0 ? `, plus ${formatDuration(leftover)} easy to finish.` : '.'),
    };
  }

  return (
    <>
      <Field label="Total time" colors={colors}>
        <View style={styles.inputRow}>
          <NumberInput
            value={totalMinutes}
            onChangeText={(text) => setTotalMinutes(onlyDigits(text))}
            keyboardType="number-pad"
            placeholder="0"
            maxLength={3}
            accessibilityLabel="Total time in minutes"
            colors={colors}
          />
          <ThemedText style={{ color: colors.cardSubtext }}>minutes</ThemedText>
        </View>
      </Field>

      <Field label="Intervals" colors={colors}>
        <View style={styles.chipRow}>
          {INTERVAL_PRESETS.map((preset) => (
            <Chip
              key={`${preset.fast.minutes}:${preset.fast.seconds}-${preset.easy.minutes}:${preset.easy.seconds}`}
              label={`${preset.fast.minutes}:${preset.fast.seconds} / ${preset.easy.minutes}:${preset.easy.seconds}`}
              selected={sameTime(fast, preset.fast) && sameTime(easy, preset.easy)}
              onPress={() => {
                setFast(preset.fast);
                setEasy(preset.easy);
              }}
              colors={colors}
            />
          ))}
        </View>
        <View style={styles.intervalRow}>
          <ThemedText style={[styles.intervalLabel, { color: colors.cardText }]}>Fast</ThemedText>
          <TimeInput value={fast} onChange={setFast} label="Fast interval" colors={colors} />
        </View>
        <View style={styles.intervalRow}>
          <ThemedText style={[styles.intervalLabel, { color: colors.cardText }]}>Easy</ThemedText>
          <TimeInput value={easy} onChange={setEasy} label="Easy interval" colors={colors} />
        </View>
      </Field>

      <SummaryCard label="Your fartlek" summary={summary} problem={problem} colors={colors} />
      {summary && (
        <StartButton colors={colors} onPress={() => void startCustomRun(`Fartlek · ${totalMinutes} min`, segments)} />
      )}
    </>
  );
}

function CadenceCard({ colors }: { colors: Colors }) {
  const cadence = useCadence();
  const isActive = cadence.status === 'tracking' || cadence.status === 'starting';

  const message = {
    idle: 'Start, then walk or run with your phone on you to see your steps per minute.',
    starting: 'Starting…',
    tracking: `${cadence.totalSteps} ${cadence.totalSteps === 1 ? 'step' : 'steps'} counted. Keep the app open while you move.`,
    unavailable: "This device doesn't have a motion sensor. Try it on a phone.",
    denied: 'Motion access was turned off. Allow it in your phone settings to track cadence.',
  }[cadence.status];

  return (
    <View style={[styles.cadenceCard, { backgroundColor: colors.card }]}>
      <View style={styles.cadenceHeader}>
        <ThemedText type="smallBold" style={[styles.sectionLabel, { color: colors.goldText }]}>
          Live cadence
        </ThemedText>
        <Pressable
          onPress={isActive ? cadence.stop : cadence.start}
          disabled={cadence.status === 'starting'}
          accessibilityRole="button"
          accessibilityLabel={isActive ? 'Stop cadence tracking' : 'Start cadence tracking'}
          style={({ pressed }) => [
            styles.cadenceButton,
            { backgroundColor: isActive ? colors.card : colors.banner, borderColor: colors.banner },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={{ color: isActive ? colors.cardText : colors.bannerText }}>
            {isActive ? 'Stop' : 'Start'}
          </ThemedText>
        </Pressable>
      </View>
      {cadence.status === 'tracking' && (
        <ThemedText type="subtitle" style={{ color: colors.cardText }}>
          {cadence.stepsPerMinute ?? '—'}
          <ThemedText style={{ color: colors.cardSubtext }}> steps/min</ThemedText>
        </ThemedText>
      )}
      <ThemedText type="small" style={{ color: colors.cardSubtext }}>
        {message}
      </ThemedText>
    </View>
  );
}

function StartButton({ onPress, colors }: { onPress: () => void; colors: Colors }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.startButton, { backgroundColor: colors.gold }, pressed && styles.pressed]}>
      <ThemedText type="smallBold" style={{ color: colors.banner }}>
        Start this run
      </ThemedText>
    </Pressable>
  );
}

function Field({ label, colors, children }: { label: string; colors: Colors; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" style={[styles.sectionLabel, { color: colors.goldText }]}>
        {label}
      </ThemedText>
      {children}
    </View>
  );
}

function SummaryCard({
  label,
  summary,
  problem,
  colors,
}: {
  label: string;
  summary: { value: string; detail: string } | null;
  problem: string;
  colors: Colors;
}) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: colors.banner }]}>
      <ThemedText type="smallBold" style={[styles.sectionLabel, { color: colors.bannerLabel }]}>
        {label}
      </ThemedText>
      {summary ? (
        <>
          <ThemedText type="subtitle" style={{ color: colors.bannerText }}>
            {summary.value}
          </ThemedText>
          <ThemedText type="small" style={{ color: colors.bannerText }}>
            {summary.detail}
          </ThemedText>
        </>
      ) : (
        <ThemedText style={{ color: colors.bannerText }}>{problem}</ThemedText>
      )}
    </View>
  );
}

function TimeInput({
  value,
  onChange,
  label,
  suffix,
  colors,
}: {
  value: TimeDraft;
  onChange: (value: TimeDraft) => void;
  label: string;
  suffix?: string;
  colors: Colors;
}) {
  return (
    <View style={styles.inputRow}>
      <NumberInput
        value={value.minutes}
        onChangeText={(text) => onChange({ ...value, minutes: onlyDigits(text) })}
        keyboardType="number-pad"
        placeholder="0"
        maxLength={2}
        accessibilityLabel={`${label}, minutes`}
        colors={colors}
      />
      <ThemedText style={{ color: colors.cardSubtext }}>:</ThemedText>
      <NumberInput
        value={value.seconds}
        onChangeText={(text) => onChange({ ...value, seconds: onlyDigits(text) })}
        keyboardType="number-pad"
        placeholder="00"
        maxLength={2}
        accessibilityLabel={`${label}, seconds`}
        colors={colors}
      />
      {suffix && <ThemedText style={{ color: colors.cardSubtext }}>{suffix}</ThemedText>}
    </View>
  );
}

function NumberInput({ colors, ...inputProps }: ComponentProps<typeof TextInput> & { colors: Colors }) {
  return (
    <TextInput
      {...inputProps}
      returnKeyType="done"
      placeholderTextColor={colors.cardSubtext}
      style={[
        styles.input,
        { backgroundColor: colors.card, color: colors.cardText, borderColor: colors.radio },
      ]}
    />
  );
}

function Chip({
  label,
  selected,
  onPress,
  colors,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: Colors;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.cardSelected : colors.card,
          borderColor: selected ? colors.gold : 'transparent',
        },
        pressed && styles.pressed,
      ]}>
      <ThemedText type="small" style={{ color: colors.cardText }}>
        {label}
      </ThemedText>
    </Pressable>
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
  modeRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  modeCard: {
    flex: 1,
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 2,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  field: {
    gap: Spacing.two,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  input: {
    width: 72,
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: Spacing.two,
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
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
    borderWidth: 2,
  },
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  intervalLabel: {
    width: 44,
  },
  summaryCard: {
    gap: Spacing.one,
    padding: Spacing.four,
    borderRadius: Spacing.four,
    marginTop: Spacing.two,
  },
  startButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: 999,
  },
  cadenceCard: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  cadenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cadenceButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 999,
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
