import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandColors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PLAN_IDS, type PlanId } from '@/hooks/use-selected-plan';
import { PLANS } from '@/lib/workouts';

type Colors = (typeof BrandColors)['light' | 'dark'];

export default function PlanEvidenceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const planId = PLAN_IDS.find((candidate) => candidate === id);
  const scheme = useColorScheme();
  const colors = BrandColors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {planId ? (
          <EvidenceView planId={planId} colors={colors} />
        ) : (
          <View style={styles.content}>
            <ThemedText type="subtitle" style={{ color: colors.heading }}>
              Plan not found
            </ThemedText>
            <BackButton planId={planId} colors={colors} />
          </View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function EvidenceView({ planId, colors }: { planId: PlanId; colors: Colors }) {
  const plan = PLANS[planId];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <BackButton planId={planId} colors={colors} />
      <ThemedText type="title" style={[styles.title, { color: colors.heading }]}>
        {plan.name}
      </ThemedText>

      <View style={styles.evidence}>
        <ThemedText type="smallBold" style={[styles.sectionLabel, { color: colors.goldText }]}>
          What this plan is based on
        </ThemedText>
        <ThemedText type="small" style={{ color: colors.cardSubtext }}>
          {plan.evidence.basis}
        </ThemedText>

        {plan.evidence.approaches.map((approach) => (
          <View key={approach.name} style={[styles.approach, { backgroundColor: colors.card }]}>
            <ThemedText type="smallBold" style={{ color: colors.cardText }}>
              {approach.name}
            </ThemedText>
            <ThemedText type="small" style={{ color: colors.cardSubtext }}>
              {approach.summary}
            </ThemedText>
          </View>
        ))}

        {plan.evidence.caveat && (
          <View style={[styles.caveat, { backgroundColor: colors.banner }]}>
            <ThemedText type="smallBold" style={{ color: colors.bannerLabel }}>
              Worth knowing
            </ThemedText>
            <ThemedText type="small" style={{ color: colors.bannerText }}>
              {plan.evidence.caveat}
            </ThemedText>
          </View>
        )}

        <ThemedText type="smallBold" style={[styles.sectionLabel, styles.sourceLabel, { color: colors.goldText }]}>
          Sources
        </ThemedText>
        {plan.evidence.sources.map((source) => (
          <View key={source.href} style={[styles.source, { backgroundColor: colors.card }]}>
            <ExternalLink
              href={source.href}
              accessibilityLabel={`${source.label}. ${source.detail}`}
              style={styles.sourceLink}>
              <ThemedText type="smallBold" style={{ color: colors.cardText }}>
                {source.label}
              </ThemedText>
              <ThemedText type="small" style={{ color: colors.cardSubtext }}>
                {source.detail}
              </ThemedText>
            </ExternalLink>
            <ThemedText type="subtitle" style={{ color: colors.radio }}>
              ›
            </ThemedText>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function BackButton({ planId, colors }: { planId: PlanId | undefined; colors: Colors }) {
  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else if (planId) {
      router.replace({ pathname: '/plan/[id]', params: { id: planId } });
    } else {
      router.replace('/');
    }
  }

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
  evidence: {
    gap: Spacing.three,
  },
  approach: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  caveat: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  sourceLabel: {
    marginTop: Spacing.two,
  },
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  sourceLink: {
    flex: 1,
    gap: Spacing.half,
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.7,
  },
});
