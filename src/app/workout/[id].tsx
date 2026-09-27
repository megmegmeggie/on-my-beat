import Slider from '@react-native-community/slider';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandColors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProfile } from '@/hooks/use-profile';
import { PLAN_IDS } from '@/hooks/use-selected-plan';
import { useCadence } from '@/lib/cadence';
import { formatPace, useGpsTracking } from '@/lib/gps';
import { useSegmentMusic } from '@/lib/music';
import {
  averageCadence,
  type CadenceFeedback,
  cadenceFeedback,
  type RunSessionState,
  useRunSession,
} from '@/lib/run-session';
import { addRunRecord, completePlanWorkout, getCustomWorkout } from '@/lib/storage';
import type { Workout } from '@/lib/types';
import { useSegmentVibration, useSpeedUpVibration } from '@/lib/vibration';
import { useVoiceCues } from '@/lib/voice-cues';
import { getBuiltInWorkout, PLANS } from '@/lib/workouts';
import { formatDuration } from '@/utils/formatting';

type Colors = (typeof BrandColors)['light' | 'dark'];

/** Runs ended within this many seconds aren't saved to history. */
const MIN_SAVED_RUN_SEC = 5;
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
  // `plan` is set when the workout was started from a training plan.
  const { id, plan } = useLocalSearchParams<{ id: string; plan?: string }>();
  const planId = PLAN_IDS.find((candidate) => candidate === plan);
  const scheme = useColorScheme();
  const colors = BrandColors[scheme === 'dark' ? 'dark' : 'light'];
  const builtIn = getBuiltInWorkout(id);
  // Custom workouts load from storage: undefined while loading, null if missing.
  const [custom, setCustom] = useState<Workout | null | undefined>(undefined);

  useEffect(() => {
    if (builtIn) {
      return;
    }
    let cancelled = false;
    getCustomWorkout(id).then((found) => {
      if (!cancelled) {
        setCustom(found ?? null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [builtIn, id]);

  const workout = builtIn ?? custom;
  const gpsDataRef = useRef<{ distanceMiles: number; averagePaceSecPerMile: number | null } | null>(null);

  async function handleFinished(state: RunSessionState, startedAt: Date) {
    if (!workout) {
      return;
    }
    const durationSec = Math.round(state.activeMs / 1000);
    if (!state.completed && durationSec < MIN_SAVED_RUN_SEC) {
      goBack();
      return;
    }
    if (state.completed && planId) {
      await completePlanWorkout(planId, PLANS[planId], workout.id);
    }
    const recordId = `run-${startedAt.getTime()}`;
    await addRunRecord({
      id: recordId,
      workoutId: workout.id,
      workoutName: workout.name,
      startedAt: startedAt.toISOString(),
      durationSec,
      averageCadence: averageCadence(state),
      timeOnTargetSec: Math.round(state.onTargetMs / 1000),
      completed: state.completed,
      distanceMiles: gpsDataRef.current?.distanceMiles ?? undefined,
      averagePaceSecPerMile: gpsDataRef.current?.averagePaceSecPerMile ?? undefined,
    });
    // Replace, so Back from the summary doesn't return to a finished run.
    router.replace({ pathname: '/summary/[id]', params: { id: recordId } });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {workout ? (
          <RunView workout={workout} colors={colors} onFinished={handleFinished} gpsDataRef={gpsDataRef} />
        ) : workout === undefined ? null : (
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

function RunView({
  workout,
  colors,
  onFinished,
  gpsDataRef,
}: {
  workout: Workout;
  colors: Colors;
  onFinished: (state: RunSessionState, startedAt: Date) => void;
  gpsDataRef: React.MutableRefObject<{ distanceMiles: number; averagePaceSecPerMile: number | null } | null>;
}) {
  useKeepAwake();
  const cadence = useCadence();
  const [profile] = useProfile();
  const [simulating, setSimulating] = useState(false);
  const [simulatedCadence, setSimulatedCadence] = useState(workout.segments[0].targetCadence);
  const currentCadence = simulating ? simulatedCadence : cadence.stepsPerMinute;
  const run = useRunSession(workout, currentCadence);
  const { state, segment, nextSegment } = run;
  const { pick: music, nextSong } = useSegmentMusic(segment.targetCadence, state.status === 'running');
  const gps = useGpsTracking(state.status === 'running');

  // Keep the latest GPS data available to the parent for saving on finish.
  useEffect(() => {
    if (gps.status === 'tracking') {
      gpsDataRef.current = {
        distanceMiles: gps.distanceMiles,
        averagePaceSecPerMile: gps.averagePaceSecPerMile,
      };
    }
  }, [gps.status, gps.distanceMiles, gps.averagePaceSecPerMile, gpsDataRef]);

  const feedback = cadenceFeedback(currentCadence, segment.targetCadence);
  const feedbackColor = feedback === 'on-target' ? colors.banner : feedback === 'no-reading' ? colors.card : colors.gold;
  const feedbackTextColor = feedback === 'on-target' ? colors.bannerText : colors.cardText;

  // Spoken cues report the same feedback as the banner, but only while the run
  // is actually going, so a paused screen stays quiet.
  useVoiceCues(feedback, (profile?.voiceCues ?? true) && state.status === 'running', profile?.voice ?? 'standard');
  useSegmentVibration(state, segment.targetCadence, profile?.vibration ?? true);
  useSpeedUpVibration(feedback, (profile?.vibration ?? true) && state.status === 'running');

  const startedAt = useRef<Date | null>(null);
  const finished = state.status === 'finished';
  useEffect(() => {
    if (finished) {
      onFinished(state, startedAt.current ?? new Date());
    }
    // Report once, when the run finishes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  function start() {
    startedAt.current = new Date();
    run.start();
    void cadence.start();
  }

  function end() {
    cadence.stop();
    gps.stop();
    run.end();
  }

  if (state.status === 'finished') {
    // Saving, then the summary screen replaces this one.
    return null;
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

      {gps.status === 'tracking' && (
        <View style={styles.gpsRow}>
          <GpsStat label="Distance" value={`${gps.distanceMiles.toFixed(2)} mi`} colors={colors} />
          <GpsStat label="Pace" value={formatPace(gps.currentPaceSecPerMile)} unit="/mi" colors={colors} />
          <GpsStat label="Avg pace" value={formatPace(gps.averagePaceSecPerMile)} unit="/mi" colors={colors} />
        </View>
      )}

      {gps.error && (
        <ThemedText type="small" style={{ color: colors.cardSubtext }}>
          {gps.error}
        </ThemedText>
      )}

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

      {music && (
        <View style={[styles.nowPlaying, { borderColor: colors.radio }]}>
          <View style={styles.nowPlayingInfo}>
            <ThemedText type="small" style={{ color: colors.cardSubtext }}>
              {music.track.file ? (state.status === 'running' ? 'Now playing' : 'Up next') : 'Music (no audio file yet)'}
            </ThemedText>
            <ThemedText type="smallBold" style={{ color: colors.cardText }} numberOfLines={1}>
              {music.track.title}
              {music.track.artist ? ` · ${music.track.artist}` : ''}
            </ThemedText>
            <ThemedText type="small" style={{ color: colors.cardSubtext }}>
              {music.track.bpm} BPM{music.halfTime ? ` · half-time, matches ${music.matchedBpm} spm` : ''}
            </ThemedText>
          </View>
          <Pressable
            onPress={nextSong}
            accessibilityRole="button"
            accessibilityLabel="Next song"
            style={({ pressed }) => [styles.nextSong, { borderColor: colors.radio }, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={{ color: colors.cardText }}>
              Next song
            </ThemedText>
          </Pressable>
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

function GpsStat({ label, value, unit, colors }: { label: string; value: string; unit?: string; colors: Colors }) {
  return (
    <View style={[styles.gpsStat, { backgroundColor: colors.card }]}>
      <ThemedText type="small" style={{ color: colors.cardSubtext }}>
        {label}
      </ThemedText>
      <ThemedText style={[styles.gpsStatValue, { color: colors.cardText }]}>
        {value}
        {unit ? ` ${unit}` : ''}
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
  gpsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  gpsStat: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  gpsStatValue: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: 700,
    fontVariant: ['tabular-nums'],
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
  nowPlaying: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  nowPlayingInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  nextSong: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
    borderWidth: 1,
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
