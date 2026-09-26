import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { type PlanId, useSelectedPlan } from '@/hooks/use-selected-plan';

type Plan = {
  id: PlanId;
  name: string;
  distance: string;
  description: string;
};

const PLANS: Plan[] = [
  { id: '5k', name: '5K', distance: '3.1 mi', description: 'A great first goal for building a running habit.' },
  {
    id: 'half-marathon',
    name: 'Half Marathon',
    distance: '13.1 mi',
    description: 'Build endurance for a longer race.',
  },
  { id: 'marathon', name: 'Marathon', distance: '26.2 mi', description: 'Train for the full distance.' },
];

// Green and gold palette for the home screen only; the app-wide theme is unchanged.
const HomeColors = {
  light: {
    heading: '#1F6B3A',
    banner: '#1F6B3A',
    bannerText: '#FFFFFF',
    bannerLabel: '#F2D27A',
    gold: '#C9A227',
    goldText: '#8A6D12',
    card: '#EEF5EF',
    cardSelected: '#FBF3D9',
    cardText: '#12311F',
    cardSubtext: '#4A5D50',
    radio: '#7C9484',
  },
  dark: {
    heading: '#6FCF8F',
    banner: '#1E5A36',
    bannerText: '#FFFFFF',
    bannerLabel: '#F2D27A',
    gold: '#E6C15A',
    goldText: '#E6C15A',
    card: '#16241B',
    cardSelected: '#2C2512',
    cardText: '#F1F5F2',
    cardSubtext: '#A9B8AE',
    radio: '#6B8373',
  },
} as const;

export default function HomeScreen() {
  const scheme = useColorScheme();
  const colors = HomeColors[scheme === 'dark' ? 'dark' : 'light'];
  const [selectedPlan, setSelectedPlan] = useSelectedPlan();
  const currentPlan = PLANS.find((plan) => plan.id === selectedPlan);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title" style={[styles.welcome, { color: colors.heading }]}>
            Welcome
          </ThemedText>

          <View style={[styles.statusCard, { backgroundColor: colors.banner }]}>
            <View style={styles.statusText}>
              <ThemedText type="smallBold" style={[styles.sectionLabel, { color: colors.bannerLabel }]}>
                {currentPlan ? 'Current plan' : 'No plan yet'}
              </ThemedText>
              <ThemedText style={{ color: colors.bannerText }}>
                {currentPlan
                  ? `Training for the ${currentPlan.name}.`
                  : "That's fine. Run at your own pace, or pick a plan whenever you're ready."}
              </ThemedText>
            </View>
            {currentPlan && (
              <Pressable
                onPress={() => setSelectedPlan(null)}
                accessibilityRole="button"
                accessibilityLabel="Clear plan"
                style={({ pressed }) => [
                  styles.clearButton,
                  { borderColor: colors.bannerLabel },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={{ color: colors.bannerLabel }}>
                  Clear
                </ThemedText>
              </Pressable>
            )}
          </View>

          <ThemedText type="smallBold" style={[styles.sectionLabel, styles.plansLabel, { color: colors.goldText }]}>
            Training plans (optional)
          </ThemedText>

          <View style={styles.planList} accessibilityRole="radiogroup">
            {PLANS.map((plan) => {
              const isSelected = plan.id === selectedPlan;
              return (
                <Pressable
                  key={plan.id}
                  onPress={() => setSelectedPlan(isSelected ? null : plan.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityHint={isSelected ? 'Tap again to remove this plan' : undefined}
                  style={({ pressed }) => [
                    styles.planCard,
                    {
                      backgroundColor: isSelected ? colors.cardSelected : colors.card,
                      borderColor: isSelected ? colors.gold : 'transparent',
                    },
                    pressed && styles.pressed,
                  ]}>
                  <View style={styles.planInfo}>
                    <View style={styles.planHeader}>
                      <ThemedText type="subtitle" style={{ color: colors.cardText }}>
                        {plan.name}
                      </ThemedText>
                      <ThemedText type="smallBold" style={{ color: colors.goldText }}>
                        {plan.distance}
                      </ThemedText>
                    </View>
                    <ThemedText type="small" style={{ color: colors.cardSubtext }}>
                      {plan.description}
                    </ThemedText>
                  </View>
                  <View style={[styles.radio, { borderColor: isSelected ? colors.gold : colors.radio }]}>
                    {isSelected && <View style={[styles.radioDot, { backgroundColor: colors.gold }]} />}
                  </View>
                </Pressable>
              );
            })}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  statusText: {
    flex: 1,
    gap: Spacing.one,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  plansLabel: {
    marginTop: Spacing.four,
  },
  clearButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
    borderWidth: 1,
  },
  planList: {
    gap: Spacing.three,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
    borderWidth: 2,
  },
  planInfo: {
    flex: 1,
    gap: Spacing.two,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    columnGap: Spacing.three,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  pressed: {
    opacity: 0.7,
  },
});
