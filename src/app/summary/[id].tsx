import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandColors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
  // Undefined while loading.
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

  const record = history?.find((run) => run.id === id);
  const earlierRuns = history?.filter((run) => run.id !== id).slice(0, RECENT_RUNS) ?? [];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          {history === undefined ? null : record ? (
            <>
              <ThemedText type="title" style={[styles.title, { color: colors.heading }]}>
                {record.completed ? 'Nice run!' : 'Run ended'}
              </ThemedText>
              <ThemedText style={{ color: colors.cardSubtext }}>
                {record.workoutName} · {formatDate(record.startedAt)}
                {record.completed ? '' : ' · ended early'}
              </ThemedText>

              <View style={styles.stats}>
                <Stat label="Time" value={formatDuration(record.durationSec)} colors={colors} />
                <Stat
                  label="Avg cadence"
                  value={record.averageCadence === null ? '—' : String(record.averageCadence)}
                  unit="steps/min"
                  colors={colors}
                />
              </View>
              <View style={[styles.onTarget, { backgroundColor: colors.banner }]}>
                <ThemedText type="smallBold" style={[styles.sectionLabel, { color: colors.bannerLabel }]}>
                  Time on target
                </ThemedText>
                <ThemedText type="subtitle" style={{ color: colors.bannerText }}>
                  {formatDuration(record.timeOnTargetSec)}
                  {record.durationSec > 0 && (
                    <ThemedText style={{ color: colors.bannerText }}>
                      {'  '}
                      {Math.round((record.timeOnTargetSec / record.durationSec) * 100)}% of the run
                    </ThemedText>
                  )}
                </ThemedText>
              </View>
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
                    <ThemedText type="smallBold" style={{ color: colors.cardText }}>
                      {run.workoutName}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: colors.cardSubtext }}>
                      {formatDate(run.startedAt)}
                    </ThemedText>
                  </View>
                  <ThemedText type="small" style={{ color: colors.cardSubtext }}>
                    {formatDuration(run.durationSec)}
                    {run.averageCadence === null ? '' : ` · ${run.averageCadence} spm`}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Stat({ label, value, unit, colors }: { label: string; value: string; unit?: string; colors: Colors }) {
  return (
    <View style={[styles.stat, { backgroundColor: colors.card }]}>
      <ThemedText type="small" style={{ color: colors.cardSubtext }}>
        {label}
      </ThemedText>
      <ThemedText style={[styles.statValue, { color: colors.cardText }]}>{value}</ThemedText>
      {unit && (
        <ThemedText type="small" style={{ color: colors.cardSubtext }}>
          {unit}
        </ThemedText>
      )}
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
  stats: {
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
    fontSize: 40,
    lineHeight: 48,
    fontWeight: 700,
    fontVariant: ['tabular-nums'],
  },
  onTarget: {
    gap: Spacing.one,
    padding: Spacing.four,
    borderRadius: Spacing.four,
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
  pressed: {
    opacity: 0.7,
  },
});
