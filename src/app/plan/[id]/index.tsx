import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandColors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PLAN_IDS, type PlanId, useSelectedPlan } from '@/hooks/use-selected-plan';
import { formatPlanPosition, getPlanPosition, resetPlanPosition } from '@/lib/storage';
import type { Plan, PlanPosition, Workout } from '@/lib/types';
import { PLANS, workoutDurationSec } from '@/lib/workouts';

type Colors = (typeof BrandColors)['light' | 'dark'];
type DayStatus = 'done' | 'next' | 'upcoming';

function goBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}

/**
 * Weeks whose days are shown without being asked for: the one holding the next
 * workout, plus the one holding the workout most recently finished. Everything
 * before and after those is collapsed behind its week header.
 */
function progressWeeks(plan: Plan, position: PlanPosition | null): number[] {
  if (!position) {
    return [];
  }
  const weeks = position.week < plan.weeks.length ? [position.week] : [];
  if (position.day > 0) {
    // The last workout finished was earlier in the week being worked on.
    return weeks;
  }
  return position.week > 0 ? [...weeks, position.week - 1] : weeks;
}

function weekSummary(days: Workout[], isDone: boolean) {
  const total = Math.round(days.reduce((minutes, workout) => minutes + workoutDurationSec(workout), 0) / 60);
  return `${days.length} ${days.length === 1 ? 'workout' : 'workouts'} · ${isDone ? 'done' : `${total} min`}`;
}

export default function PlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const planId = PLAN_IDS.find((candidate) => candidate === id);
  const scheme = useColorScheme();
  const colors = BrandColors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {planId ? (
          <PlanView planId={planId} colors={colors} />
        ) : (
          <View style={styles.content}>
            <ThemedText type="subtitle" style={{ color: colors.heading }}>
              Plan not found
            </ThemedText>
            <BackButton colors={colors} />
          </View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function PlanView({ planId, colors }: { planId: PlanId; colors: Colors }) {
  const plan = PLANS[planId];
  const [position, setPosition] = useState<PlanPosition | null>(null);
  const [toggledWeeks, setToggledWeeks] = useState<Record<number, boolean>>({});
  const [, setSelectedPlan] = useSelectedPlan();

  // Reload whenever the screen comes back into view, e.g. after finishing a run.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getPlanPosition(planId).then((saved) => {
        if (!cancelled) {
          setPosition(saved);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [planId])
  );

  const isFinished = position !== null && position.week >= plan.weeks.length;
  const nextWorkout = position && !isFinished ? plan.weeks[position.week][position.day] : undefined;
  const openByDefault = progressWeeks(plan, position);

  function dayStatus(week: number, day: number): DayStatus {
    if (!position) {
      return 'upcoming';
    }
    if (week < position.week || (week === position.week && day < position.day)) {
      return 'done';
    }
    return week === position.week && day === position.day ? 'next' : 'upcoming';
  }

  function isExpanded(week: number) {
    return toggledWeeks[week] ?? openByDefault.includes(week);
  }

  function toggleWeek(week: number) {
    setToggledWeeks((current) => ({ ...current, [week]: !(current[week] ?? openByDefault.includes(week)) }));
  }

  function startWorkout(workout: Workout) {
    // Starting a plan's workout makes it the current plan on the home screen.
    setSelectedPlan(planId);
    router.push({ pathname: '/workout/[id]', params: { id: workout.id, plan: planId } });
  }

  async function startOver() {
    await resetPlanPosition(planId);
    setPosition({ week: 0, day: 0 });
    setToggledWeeks({});
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <BackButton colors={colors} />
      <ThemedText type="title" style={[styles.title, { color: colors.heading }]}>
        {plan.name}
      </ThemedText>

      <View style={[styles.banner, { backgroundColor: colors.banner }]}>
        <ThemedText type="smallBold" style={[styles.sectionLabel, { color: colors.bannerLabel }]}>
          {isFinished ? 'Plan complete' : position ? `Next up · ${formatPlanPosition(position)}` : 'Loading…'}
        </ThemedText>
        <ThemedText style={{ color: colors.bannerText }}>
          {isFinished
            ? 'You finished every workout in this plan. Nice work!'
            : nextWorkout
              ? `${nextWorkout.name} · ${Math.round(workoutDurationSec(nextWorkout) / 60)} min`
              : ''}
        </ThemedText>
        {nextWorkout && (
          <Pressable
            onPress={() => startWorkout(nextWorkout)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.startButton, { backgroundColor: colors.bannerLabel }, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={{ color: colors.banner }}>
              Start
            </ThemedText>
          </Pressable>
        )}
      </View>

      {plan.weeks.map((days, week) => (
        <WeekSection
          key={week}
          week={week}
          days={days}
          summary={weekSummary(days, position !== null && week < position.week)}
          expanded={isExpanded(week)}
          onToggle={() => toggleWeek(week)}
          dayStatus={(day) => dayStatus(week, day)}
          onStart={startWorkout}
          colors={colors}
        />
      ))}

      <Pressable onPress={startOver} accessibilityRole="button" style={({ pressed }) => pressed && styles.pressed}>
        <ThemedText type="small" style={[styles.startOver, { color: colors.cardSubtext }]}>
          Start this plan over
        </ThemedText>
      </Pressable>

      <MoreInfoLink planId={planId} planName={plan.name} colors={colors} />
    </ScrollView>
  );
}

function MoreInfoLink({ planId, planName, colors }: { planId: PlanId; planName: string; colors: Colors }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/plan/[id]/evidence', params: { id: planId } })}
      accessibilityRole="link"
      accessibilityLabel={`More information about the ${planName} plan`}
      style={({ pressed }) => [styles.moreInfo, pressed && styles.pressed]}>
      <ThemedText type="small" style={[styles.moreInfoLabel, { color: colors.goldText }]}>
        More information
      </ThemedText>
      <ThemedText type="subtitle" style={{ color: colors.radio }}>
        ›
      </ThemedText>
    </Pressable>
  );
}

function WeekSection({
  week,
  days,
  summary,
  expanded,
  onToggle,
  dayStatus,
  onStart,
  colors,
}: {
  week: number;
  days: Workout[];
  summary: string;
  expanded: boolean;
  onToggle: () => void;
  dayStatus: (day: number) => DayStatus;
  onStart: (workout: Workout) => void;
  colors: Colors;
}) {
  return (
    <View style={styles.week}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`Week ${week + 1}, ${summary}`}
        accessibilityHint={expanded ? 'Hides this week’s workouts' : 'Shows this week’s workouts'}
        accessibilityState={{ expanded }}
        style={({ pressed }) => [styles.weekHeader, pressed && styles.pressed]}>
        <View style={styles.weekInfo}>
          <ThemedText type="smallBold" style={[styles.sectionLabel, { color: colors.goldText }]}>
            Week {week + 1}
          </ThemedText>
          <ThemedText type="small" style={{ color: colors.cardSubtext }}>
            {summary}
          </ThemedText>
        </View>
        <ThemedText type="subtitle" style={[styles.chevron, expanded && styles.chevronOpen, { color: colors.radio }]}>
          ›
        </ThemedText>
      </Pressable>
      {expanded &&
        days.map((workout, day) => (
          <DayCard
            key={workout.id}
            day={day}
            workout={workout}
            status={dayStatus(day)}
            onPress={() => onStart(workout)}
            colors={colors}
          />
        ))}
    </View>
  );
}

function DayCard({
  day,
  workout,
  status,
  onPress,
  colors,
}: {
  day: number;
  workout: Workout;
  status: DayStatus;
  onPress: () => void;
  colors: Colors;
}) {
  const isNext = status === 'next';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Day ${day + 1}, ${workout.name}${status === 'done' ? ', done' : isNext ? ', next' : ''}`}
      style={({ pressed }) => [
        styles.dayCard,
        {
          backgroundColor: isNext ? colors.cardSelected : colors.card,
          borderColor: isNext ? colors.gold : 'transparent',
        },
        status === 'done' && styles.done,
        pressed && styles.pressed,
      ]}>
      <View style={styles.dayInfo}>
        <ThemedText type="small" style={{ color: colors.cardSubtext }}>
          Day {day + 1} · {Math.round(workoutDurationSec(workout) / 60)} min
        </ThemedText>
        <ThemedText type="smallBold" style={{ color: colors.cardText }}>
          {workout.name}
        </ThemedText>
      </View>
      <ThemedText type="smallBold" style={{ color: isNext ? colors.goldText : colors.cardSubtext }}>
        {status === 'done' ? '✓ Done' : isNext ? 'Next' : ''}
      </ThemedText>
    </Pressable>
  );
}

function BackButton({ colors }: { colors: Colors }) {
  return (
    <Pressable onPress={goBack} accessibilityRole="button" style={({ pressed }) => pressed && styles.pressed}>
      <ThemedText type="smallBold" style={{ color: colors.goldText }}>
        ‹ Back
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
    fontSize: 48,
    lineHeight: 56,
    fontWeight: 700,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  banner: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  startButton: {
    alignSelf: 'flex-start',
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  week: {
    gap: Spacing.two,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  weekInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  chevron: {
    transform: [{ rotate: '0deg' }],
  },
  chevronOpen: {
    transform: [{ rotate: '90deg' }],
  },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 2,
  },
  dayInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  done: {
    opacity: 0.6,
  },
  startOver: {
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  moreInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
  },
  moreInfoLabel: {
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.7,
  },
});
