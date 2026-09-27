import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TrendChart, type TrendPoint } from '@/components/trend-chart';
import { BottomTabInset, BrandColors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getRunHistory } from '@/lib/storage';
import type { RunRecord } from '@/lib/types';
import { formatDuration } from '@/utils/formatting';

type Colors = (typeof BrandColors)['light' | 'dark'];

/** How many of the latest runs the trend chart covers. */
const TREND_RUNS = 20;

const METRICS = {
  cadence: {
    label: 'Cadence',
    value: (run: RunRecord) => run.averageCadence,
    format: (value: number) => `${Math.round(value)} spm`,
  },
  onPace: {
    label: 'On pace',
    value: (run: RunRecord) => (run.durationSec > 0 ? Math.round((run.timeOnTargetSec / run.durationSec) * 100) : null),
    format: (value: number) => `${Math.round(value)}%`,
  },
  distance: {
    label: 'Distance',
    value: (run: RunRecord) => (run.distanceMiles ? run.distanceMiles : null),
    format: (value: number) => `${value.toFixed(2)} mi`,
  },
} satisfies Record<string, { label: string; value: (run: RunRecord) => number | null | undefined; format: (value: number) => string }>;

type Metric = keyof typeof METRICS;

export default function HistoryScreen() {
  const scheme = useColorScheme();
  const colors = BrandColors[scheme === 'dark' ? 'dark' : 'light'];
  const [runs, setRuns] = useState<RunRecord[] | undefined>(undefined);
  const [metric, setMetric] = useState<Metric>('cadence');

  // Reload whenever the tab comes into view, so a run just finished shows up.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getRunHistory().then((history) => {
        if (!cancelled) {
          setRuns(history);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const trends = (Object.keys(METRICS) as Metric[])
    .map((key) => ({ key, points: trendPoints(runs ?? [], key) }))
    .filter((trend) => trend.points.length > 0);
  const shown = trends.find((trend) => trend.key === metric) ?? trends[0];

  const totalSec = runs?.reduce((sum, run) => sum + run.durationSec, 0) ?? 0;
  const totalMiles = runs?.reduce((sum, run) => sum + (run.distanceMiles ?? 0), 0) ?? 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title" style={[styles.title, { color: colors.heading }]}>
            History
          </ThemedText>

          {runs === undefined ? null : runs.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: colors.card }]}>
              <ThemedText type="smallBold" style={{ color: colors.cardText }}>
                No runs yet
              </ThemedText>
              <ThemedText type="small" style={{ color: colors.cardSubtext }}>
                Finish a run and it will show up here, with your cadence and distance over time.
              </ThemedText>
            </View>
          ) : (
            <>
              <View style={styles.totals}>
                <Total label="Runs" value={String(runs.length)} colors={colors} />
                <Total label="Time" value={formatTotalTime(totalSec)} colors={colors} />
                {totalMiles > 0 && <Total label="Distance" value={totalMiles.toFixed(1)} unit="mi" colors={colors} />}
              </View>

              {shown && (
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                  <View style={styles.cardHeader}>
                    <ThemedText type="smallBold" style={[styles.sectionLabel, { color: colors.goldText }]}>
                      Trend
                    </ThemedText>
                    <ThemedText type="small" style={{ color: colors.cardSubtext }}>
                      Your last {Math.min(runs.length, TREND_RUNS)} runs. Press and drag for details.
                    </ThemedText>
                  </View>
                  {trends.length > 1 && (
                    <View style={styles.metrics} accessibilityRole="tablist">
                      {trends.map((trend) => {
                        const selected = trend.key === shown.key;
                        return (
                          <Pressable
                            key={trend.key}
                            onPress={() => setMetric(trend.key)}
                            accessibilityRole="tab"
                            accessibilityState={{ selected }}
                            style={[
                              styles.metric,
                              { borderColor: colors.radio },
                              selected && { backgroundColor: colors.banner, borderColor: colors.banner },
                            ]}>
                            <ThemedText
                              type="smallBold"
                              style={{ color: selected ? colors.bannerText : colors.cardText }}>
                              {METRICS[trend.key].label}
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                  <TrendChart points={shown.points} format={METRICS[shown.key].format} colors={colors} />
                </View>
              )}

              {groupByMonth(runs).map(([month, monthRuns]) => (
                <View key={month} style={styles.month}>
                  <ThemedText type="smallBold" style={[styles.sectionLabel, { color: colors.goldText }]}>
                    {month}
                  </ThemedText>
                  {monthRuns.map((run) => (
                    <RunRow key={run.id} run={run} colors={colors} />
                  ))}
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Total({ label, value, unit, colors }: { label: string; value: string; unit?: string; colors: Colors }) {
  return (
    <View style={[styles.total, { backgroundColor: colors.card }]}>
      <ThemedText type="small" style={{ color: colors.cardSubtext }}>
        {label}
      </ThemedText>
      <View style={styles.totalValueRow}>
        <ThemedText style={[styles.totalValue, { color: colors.cardText }]}>{value}</ThemedText>
        {unit && (
          <ThemedText type="small" style={{ color: colors.cardSubtext }}>
            {unit}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

function RunRow({ run, colors }: { run: RunRecord; colors: Colors }) {
  const onPace = METRICS.onPace.value(run);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/summary/[id]', params: { id: run.id, from: 'history' } })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, { backgroundColor: colors.card }, pressed && styles.pressed]}>
      <View style={styles.rowInfo}>
        <ThemedText type="smallBold" numberOfLines={1} style={{ color: colors.cardText }}>
          {run.workoutName}
        </ThemedText>
        <ThemedText type="small" style={{ color: colors.cardSubtext }}>
          {new Date(run.startedAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          {run.completed ? '' : ' · ended early'}
        </ThemedText>
      </View>
      <View style={styles.rowStats}>
        <ThemedText type="smallBold" style={{ color: colors.cardText }}>
          {run.distanceMiles ? `${run.distanceMiles.toFixed(1)} mi` : formatDuration(run.durationSec)}
        </ThemedText>
        <ThemedText type="small" style={{ color: colors.cardSubtext }}>
          {[run.averageCadence != null ? `${run.averageCadence} spm` : null, onPace != null ? `${onPace}% on pace` : null]
            .filter(Boolean)
            .join(' · ')}
        </ThemedText>
      </View>
      <ThemedText type="subtitle" style={{ color: colors.radio }}>
        ›
      </ThemedText>
    </Pressable>
  );
}

/** The latest runs with a value for `metric`, oldest first. */
function trendPoints(runs: RunRecord[], metric: Metric): TrendPoint[] {
  return runs
    .slice(0, TREND_RUNS)
    .flatMap((run) => {
      const value = METRICS[metric].value(run);
      return value == null ? [] : [{ id: run.id, date: run.startedAt, title: run.workoutName, value }];
    })
    .reverse();
}

/** Runs (newest first) split into months, e.g. ["September 2026", [...]]. */
function groupByMonth(runs: RunRecord[]) {
  const groups = new Map<string, RunRecord[]>();
  for (const run of runs) {
    const month = new Date(run.startedAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    groups.set(month, [...(groups.get(month) ?? []), run]);
  }
  return [...groups];
}

/** Total time as "45m" or "12h 30m". */
function formatTotalTime(seconds: number) {
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
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
  title: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: 700,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  empty: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  totals: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  total: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
  },
  totalValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.half,
  },
  totalValue: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: 700,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  cardHeader: {
    gap: Spacing.half,
  },
  metrics: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  metric: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
    borderWidth: 1,
  },
  month: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  rowInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  rowStats: {
    alignItems: 'flex-end',
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.7,
  },
});
