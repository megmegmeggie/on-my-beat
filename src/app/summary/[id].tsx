import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CadenceChart } from '@/components/cadence-chart';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandColors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProfile } from '@/hooks/use-profile';
import { estimateRunCalories } from '@/lib/calories';
import { formatPace } from '@/lib/gps';
import { getRunHistory } from '@/lib/storage';
import type { RunRecord } from '@/lib/types';
import { formatDuration } from '@/utils/formatting';

type Colors = (typeof BrandColors)['light' | 'dark'];

/** How many earlier runs to list under the summary. */
const RECENT_RUNS = 5;

export default function SummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme();
  const colors = BrandColors[scheme === 'dark' ? 'dark' : 'light'];
  const [history, setHistory] = useState<RunRecord[] | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getRunHistory().then((runs) => {
      if (!cancelled) {
        setHistory(runs);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const [profile] = useProfile();
  const record = history?.find((run) => run.id === id);
  const calories = record && profile ? estimateRunCalories(record, profile.weightKg, profile.pace) : null;
  const earlierRuns = history?.filter((run) => run.id !== id).slice(0, RECENT_RUNS) ?? [];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          {history === undefined ? null : record ? (
            <>
              <View style={styles.header}>
                <ThemedText type="title" style={[styles.title, { color: colors.heading }]}>
                  Nice run!
                </ThemedText>
                <ThemedText style={{ color: colors.cardSubtext }}>
                  {record.workoutName} · {formatDate(record.startedAt)}
                  {record.completed ? '' : ' · ended early'}
                </ThemedText>
              </View>

              <View style={styles.statsGrid}>
                <StatCard label="Time" value={formatDuration(record.durationSec)} colors={colors} />
                <StatCard
                  label="Avg cadence"
                  value={record.averageCadence === null ? '—' : String(record.averageCadence)}
                  unit="spm"
                  colors={colors}
                />
                {record.distanceMiles != null && (
                  <StatCard label="Distance" value={record.distanceMiles.toFixed(2)} unit="mi" colors={colors} />
                )}
                {record.averagePaceSecPerMile != null && (
                  <StatCard label="Avg pace" value={formatPace(record.averagePaceSecPerMile)} unit="/mi" colors={colors} />
                )}
                {calories && <StatCard label="Calories" value={String(calories.kcal)} unit="kcal" colors={colors} />}
              </View>
              {profile &&
                (calories ? (
                  <ThemedText type="small" style={{ color: colors.cardSubtext }}>
                    Calories are an estimate from your weight and{' '}
                    {calories.basis === 'gps' ? 'GPS pace' : 'your typical pace in Profile'}.
                  </ThemedText>
                ) : (
                  <Pressable onPress={() => router.push('/profile')} accessibilityRole="link">
                    <ThemedText type="small" style={{ color: colors.goldText }}>
                      Add your weight in Profile to see calories burned ›
                    </ThemedText>
                  </Pressable>
                ))}

              <View style={[styles.onTarget, { backgroundColor: colors.banner }]}>
                <View style={styles.onTargetHeader}>
                  <ThemedText type="smallBold" style={[styles.sectionLabel, { color: colors.bannerLabel }]}>
                    On target
                  </ThemedText>
                  <ThemedText type="smallBold" style={{ color: colors.bannerText }}>
                    {record.durationSec > 0
                      ? `${Math.round((record.timeOnTargetSec / record.durationSec) * 100)}%`
                      : '—'}
                  </ThemedText>
                </View>
                <ThemedText style={{ color: colors.bannerText }}>
                  {formatDuration(record.timeOnTargetSec)} of {formatDuration(record.durationSec)}
                </ThemedText>
              </View>

              {record.cadenceTrace && record.cadenceTrace.length > 0 && (
                <CadenceChart samples={record.cadenceTrace} durationSec={record.durationSec} colors={colors} />
              )}
            </>
          ) : (
            <ThemedText type="subtitle" style={{ color: colors.heading }}>
              Run not found
            </ThemedText>
          )}

          <Pressable
            onPress={() => router.replace('/')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.doneButton, { backgroundColor: colors.banner }, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={{ color: colors.bannerText }}>
              Done
            </ThemedText>
          </Pressable>

          {earlierRuns.length > 0 && (
            <View style={styles.history}>
              <ThemedText type="smallBold" style={[styles.sectionLabel, { color: colors.goldText }]}>
                Recent runs
              </ThemedText>
              {earlierRuns.map((run) => (
                <View key={run.id} style={[styles.historyRow, { backgroundColor: colors.card }]}>
                  <View style={styles.historyInfo}>
                    <ThemedText type="smallBold" numberOfLines={1} style={{ color: colors.cardText }}>
                      {run.workoutName}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: colors.cardSubtext }}>
                      {formatDate(run.startedAt)}
                    </ThemedText>
                  </View>
                  <View style={styles.historyStats}>
                    <ThemedText type="small" style={{ color: colors.cardSubtext }}>
                      {formatDuration(run.durationSec)}
                    </ThemedText>
                    {run.distanceMiles != null && (
                      <ThemedText type="small" style={{ color: colors.cardSubtext }}>
                        {run.distanceMiles.toFixed(1)} mi
                      </ThemedText>
                    )}
                    {run.averageCadence != null && (
                      <ThemedText type="small" style={{ color: colors.cardSubtext }}>
                        {run.averageCadence} spm
                      </ThemedText>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function StatCard({
  label,
  value,
  unit,
  colors,
}: {
  label: string;
  value: string;
  unit?: string;
  colors: Colors;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card }]}>
      <ThemedText type="small" style={{ color: colors.cardSubtext }}>
        {label}
      </ThemedText>
      <View style={styles.statValueRow}>
        <ThemedText style={[styles.statValue, { color: colors.cardText }]}>{value}</ThemedText>
        {unit && (
          <ThemedText type="small" style={{ color: colors.cardSubtext }}>
            {unit}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
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
    paddingTop: Spacing.six,
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.half,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: '46%',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.half,
  },
  statValue: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: 700,
    fontVariant: ['tabular-nums'],
  },
  onTarget: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  onTargetHeader: {
    gap: Spacing.half,
  },
  doneButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: 999,
  },
  history: {
    gap: Spacing.two,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  historyInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  historyStats: {
    alignItems: 'flex-end',
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.7,
  },
});
