import { type Href, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, BrandColors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PLAN_IDS, type PlanId, useSelectedPlan } from '@/hooks/use-selected-plan';
import { formatPlanPosition, getPlanPosition } from '@/lib/storage';
import type { PlanPosition } from '@/lib/types';
import { PLANS, QUICK_RUNS, workoutDurationSec } from '@/lib/workouts';

const PLAN_DETAILS: Record<PlanId, { distance: string; description: string }> = {
  '5k': { distance: '3.1 mi', description: 'A great first goal for building a running habit.' },
  'half-marathon': { distance: '13.1 mi', description: 'Build endurance for a longer race.' },
  marathon: { distance: '26.2 mi', description: 'Train for the full distance.' },
};

const QUICK_RUN_CARDS: { title: string; detail: string; href: Href }[] = [
  {
    title: 'Intervals',
    detail: `8 × 1 min fast · ${Math.round(workoutDurationSec(QUICK_RUNS.intervals) / 60)} min`,
    href: { pathname: '/workout/[id]', params: { id: QUICK_RUNS.intervals.id } },
  },
  {
    title: 'Easy run',
    detail: `Relaxed pace · ${Math.round(workoutDurationSec(QUICK_RUNS.easy) / 60)} min`,
    href: { pathname: '/workout/[id]', params: { id: QUICK_RUNS.easy.id } },
  },
  { title: 'Custom', detail: 'Set distance and pace, or a fartlek', href: '/run' },
];

/** Plan progress text, e.g. "Next: Week 1, Day 2" or "Complete". */
function progressText(planId: PlanId, position: PlanPosition | undefined) {
  if (!position) {
    return '';
  }
  return position.week >= PLANS[planId].weeks.length ? 'Complete' : `Next: ${formatPlanPosition(position)}`;
}

export default function HomeScreen() {
  const scheme = useColorScheme();
  const colors = BrandColors[scheme === 'dark' ? 'dark' : 'light'];
  const [selectedPlan, setSelectedPlan] = useSelectedPlan();
  const [positions, setPositions] = useState<Partial<Record<PlanId, PlanPosition>>>({});

  // Refresh progress whenever Home comes back into view, e.g. after a run.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all(PLAN_IDS.map(async (id) => [id, await getPlanPosition(id)] as const)).then((entries) => {
        if (!cancelled) {
          setPositions(Object.fromEntries(entries));
        }
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const currentPosition = selectedPlan ? positions[selectedPlan] : undefined;
  const nextWorkout =
    selectedPlan && currentPosition && currentPosition.week < PLANS[selectedPlan].weeks.length
      ? PLANS[selectedPlan].weeks[currentPosition.week][currentPosition.day]
      : undefined;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title" style={[styles.welcome, { color: colors.heading }]}>
            Welcome!
          </ThemedText>

          <View style={[styles.statusCard, { backgroundColor: colors.banner }]}>
            <View style={styles.statusRow}>
              <View style={styles.statusText}>
                <ThemedText type="smallBold" style={[styles.sectionLabel, { color: colors.bannerLabel }]}>
                  {selectedPlan ? 'Current plan' : 'No plan yet'}
                </ThemedText>
                <ThemedText style={{ color: colors.bannerText }}>
                  {selectedPlan
                    ? `Training for the ${PLANS[selectedPlan].name}.`
                    : "That's fine. Do a quick run, or pick a plan whenever you're ready."}
                </ThemedText>
                {selectedPlan && (
                  <ThemedText type="small" style={{ color: colors.bannerText }}>
                    {nextWorkout
                      ? `${progressText(selectedPlan, currentPosition)} · ${nextWorkout.name}`
                      : progressText(selectedPlan, currentPosition)}
                  </ThemedText>
                )}
              </View>
              {selectedPlan && (
                <Pressable
                  onPress={() => setSelectedPlan(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Clear plan"
                  style={({ pressed }) => [
                    styles.pillButton,
                    { borderColor: colors.bannerLabel },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="smallBold" style={{ color: colors.bannerLabel }}>
                    Clear
                  </ThemedText>
                </Pressable>
              )}
            </View>
            {selectedPlan && (
              <Pressable
                onPress={() => router.push({ pathname: '/plan/[id]', params: { id: selectedPlan } })}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.continueButton,
                  { backgroundColor: colors.bannerLabel },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={{ color: colors.banner }}>
                  Continue plan
                </ThemedText>
              </Pressable>
            )}
          </View>

          <ThemedText type="smallBold" style={[styles.sectionLabel, styles.groupLabel, { color: colors.goldText }]}>
            Training plans
          </ThemedText>

          <View style={styles.list}>
            {PLAN_IDS.map((planId) => {
              const isCurrent = planId === selectedPlan;
              return (
                <Pressable
                  key={planId}
                  onPress={() => router.push({ pathname: '/plan/[id]', params: { id: planId } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${PLANS[planId].name} plan${isCurrent ? ', current' : ''}`}
                  style={({ pressed }) => [
                    styles.card,
                    {
                      backgroundColor: isCurrent ? colors.cardSelected : colors.card,
                      borderColor: isCurrent ? colors.gold : 'transparent',
                    },
                    pressed && styles.pressed,
                  ]}>
                  <View style={styles.cardInfo}>
                    <View style={styles.planHeader}>
                      <ThemedText type="subtitle" style={{ color: colors.cardText }}>
                        {PLANS[planId].name}
                      </ThemedText>
                      <ThemedText type="smallBold" style={{ color: colors.goldText }}>
                        {PLAN_DETAILS[planId].distance}
                      </ThemedText>
                    </View>
                    <ThemedText type="small" style={{ color: colors.cardSubtext }}>
                      {PLAN_DETAILS[planId].description}
                    </ThemedText>
                    <ThemedText type="smallBold" style={{ color: colors.cardText }}>
                      {isCurrent ? 'Current plan · ' : ''}
                      {progressText(planId, positions[planId])}
                    </ThemedText>
                  </View>
                  <ThemedText type="subtitle" style={{ color: colors.radio }}>
                    ›
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <ThemedText type="smallBold" style={[styles.sectionLabel, styles.groupLabel, { color: colors.goldText }]}>
            Quick run
          </ThemedText>

          <View style={styles.list}>
            {QUICK_RUN_CARDS.map((card) => (
              <Pressable
                key={card.title}
                onPress={() => router.push(card.href)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: colors.card, borderColor: 'transparent' },
                  pressed && styles.pressed,
                ]}>
                <View style={styles.cardInfo}>
                  <ThemedText type="smallBold" style={{ color: colors.cardText }}>
                    {card.title}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: colors.cardSubtext }}>
                    {card.detail}
                  </ThemedText>
                </View>
                <ThemedText type="subtitle" style={{ color: colors.radio }}>
                  ›
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
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
    gap: Spacing.three,
  },
  welcome: {
    fontSize: 56,
    lineHeight: 64,
    fontWeight: 700,
    marginBottom: Spacing.two,
  },
  statusCard: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  statusText: {
    flex: 1,
    gap: Spacing.one,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  groupLabel: {
    marginTop: Spacing.four,
  },
  pillButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
    borderWidth: 1,
  },
  continueButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  list: {
    gap: Spacing.three,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
    borderWidth: 2,
  },
  cardInfo: {
    flex: 1,
    gap: Spacing.one,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    columnGap: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
