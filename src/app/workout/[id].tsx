import Slider from '@react-native-community/slider';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandColors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCadence } from '@/lib/cadence';
import { type CadenceFeedback, cadenceFeedback, useRunSession } from '@/lib/run-session';
import type { Workout } from '@/lib/types';
import { getBuiltInWorkout } from '@/lib/workouts';
import { formatDuration } from '@/utils/formatting';

type Colors = (typeof BrandColors)['light' | 'dark'];

const SIMULATED_MIN_SPM = 120;
const SIMULATED_MAX_SPM = 200;

const FEEDBACK_TEXT: Record<CadenceFeedback, string> = {
  'no-reading': 'Start moving',
  'speed-up': 'Speed up',
  'slow-down': 'Slow down',
  'on-target': 'On target',
};

function goBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme();
  const colors = BrandColors[scheme === 'dark' ? 'dark' : 'light'];
  const workout = getBuiltInWorkout(id);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {workout ? (
          <RunView workout={workout} colors={colors} />
        ) : (
          <View style={styles.content}>
            <ThemedText type="subtitle" style={{ color: colors.heading }}>
              Workout not found
            </ThemedText>
            <ActionButton label="Back" onPress={goBack} colors={colors} />
          </View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function RunView({ workout, colors }: { workout: Workout; colors: Colors }) {
  useKeepAwake();
  const cadence = useCadence();
  const [simulating, setSimulating] = useState(false);
  const [simulatedCadence, setSimulatedCadence] = useState(workout.segments[0].targetCadence);
  const currentCadence = simulating ? simulatedCadence : cadence.stepsPerMinute;
  const run = useRunSession(workout, currentCadence);
  const { state, segment, nextSegment } = run;

  const feedback = cadenceFeedback(currentCadence, segment.targetCadence);
  const feedbackColor = feedback === 'on-target' ? colors.banner : feedback === 'no-reading' ? colors.card : colors.gold;
  const feedbackTextColor = feedback === 'on-target' ? colors.bannerText : colors.cardText;

  function start() {
    run.start();
    void cadence.start();
  }

  function end() {
    cadence.stop();
    run.end();
  }

  if (state.status === 'finished') {
    return (
      <View style={styles.content}>
        <ThemedText type="title" style={[styles.title, { color: colors.heading }]}>
          {state.completed ? 'Done!' : 'Run ended'}
        </ThemedText>
        <ThemedText style={{ color: colors.cardSubtext }}>
          {formatDuration(state.activeMs / 1000)} of running.
        </ThemedText>
        <ActionButton label="Back" onPress={goBack} colors={colors} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable
        onLongPress={() => setSimulating((on) => !on)}
        accessibilityHint="Long press to toggle simulated cadence"
        delayLongPress={600}>
        <ThemedText type="smallBold" style={[styles.sectionLabel, { color: colors.goldText }]}>
          {workout.name}
        </ThemedText>
      </Pressable>

      <View style={styles.segmentBlock}>
        <ThemedText type="subtitle" style={{ color: colors.heading }}>
          {segment.label}
        </ThemedText>
        <ThemedText style={[styles.countdown, { color: colors.cardText }]}>
          {formatDuration(run.segmentRemainingSec)}
        </ThemedText>
        <ThemedText type="small" style={{ color: colors.cardSubtext }}>
          Segment {state.segmentIndex + 1} of {workout.segments.length}
          {nextSegment
            ? ` · Next: ${nextSegment.label}, ${formatDuration(nextSegment.durationSec)} at ${nextSegment.targetCadence}`
            : ' · Last one!'}
        </ThemedText>
      </View>

      <View style={styles.cadenceRow}>
        <CadenceStat label={simulating ? 'Simulated' : 'Your cadence'} value={currentCadence} colors={colors} />
        <CadenceStat label="Target" value={segment.targetCadence} colors={colors} />
      </View>

      {state.status !== 'ready' && (
        <View style={[styles.feedback, { backgroundColor: feedbackColor }]} accessibilityLiveRegion="polite">
          <ThemedText type="subtitle" style={{ color: feedbackTextColor }}>
            {FEEDBACK_TEXT[feedback]}
          </ThemedText>
        </View>
      )}

      {!simulating && cadence.status === 'unavailable' && (
        <ThemedText type="small" style={{ color: colors.cardSubtext }}>
          No motion sensor here. Long-press the workout name to simulate cadence.
        </ThemedText>
      )}

      {simulating && (
        <View style={[styles.simulator, { backgroundColor: colors.card }]}>
          <ThemedText type="smallBold" style={{ color: colors.cardText }}>
            Simulate cadence: {simulatedCadence} spm
          </ThemedText>
          <Slider
            value={simulatedCadence}
            onValueChange={(value) => setSimulatedCadence(Math.round(value))}
            minimumValue={SIMULATED_MIN_SPM}
            maximumValue={SIMULATED_MAX_SPM}
            step={1}
            minimumTrackTintColor={colors.banner}
            maximumTrackTintColor={colors.radio}
            thumbTintColor={colors.gold}
            accessibilityLabel="Simulated cadence"
          />
        </View>
      )}

      <View style={styles.controls}>
        {state.status === 'ready' ? (
          <ActionButton label="Start" onPress={start} colors={colors} primary />
        ) : (
          <>
            <ActionButton
              label={state.status === 'paused' ? 'Resume' : 'Pause'}
              onPress={state.status === 'paused' ? run.resume : run.pause}
              colors={colors}
              primary
            />
            <ActionButton label="Skip" onPress={run.skip} colors={colors} />
            <ActionButton label="End" onPress={end} colors={colors} />
          </>
        )}
      </View>
      {state.status === 'ready' && <ActionButton label="Back" onPress={goBack} colors={colors} />}
    </ScrollView>
  );
}

function CadenceStat({ label, value, colors }: { label: string; value: number | null; colors: Colors }) {
  return (
    <View style={[styles.stat, { backgroundColor: colors.card }]}>
      <ThemedText type="small" style={{ color: colors.cardSubtext }}>
        {label}
      </ThemedText>
      <ThemedText style={[styles.statValue, { color: colors.cardText }]}>{value ?? '—'}</ThemedText>
      <ThemedText type="small" style={{ color: colors.cardSubtext }}>
        steps/min
      </ThemedText>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  colors,
  primary = false,
}: {
  label: string;
  onPress: () => void;
  colors: Colors;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        primary
          ? { backgroundColor: colors.banner, borderColor: colors.banner }
          : { backgroundColor: colors.card, borderColor: colors.radio },
        pressed && styles.pressed,
      ]}>
      <ThemedText type="smallBold" style={{ color: primary ? colors.bannerText : colors.cardText }}>
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
    padding: Spacing.four,
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
  segmentBlock: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  countdown: {
    fontSize: 72,
    lineHeight: 80,
    fontWeight: 700,
    fontVariant: ['tabular-nums'],
  },
  cadenceRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  statValue: {
    fontSize: 44,
    lineHeight: 52,
    fontWeight: 700,
    fontVariant: ['tabular-nums'],
  },
  feedback: {
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  simulator: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  controls: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: 999,
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
