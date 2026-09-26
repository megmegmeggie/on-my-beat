import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

export const PLAN_IDS = ['5k', 'half-marathon', 'marathon'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

const STORAGE_KEY = 'selectedPlan';

function isPlanId(value: string | null): value is PlanId {
  return PLAN_IDS.includes(value as PlanId);
}

/**
 * The user's chosen training plan, persisted across app restarts.
 * Re-reads storage whenever the screen comes into focus, so it stays in sync
 * when another screen changes the plan.
 */
export function useSelectedPlan() {
  const [selectedPlan, setSelectedPlanState] = useState<PlanId | null>(null);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(STORAGE_KEY)
        .then((stored) => setSelectedPlanState(isPlanId(stored) ? stored : null))
        .catch((error) => console.warn('Failed to load selected plan', error));
    }, [])
  );

  function setSelectedPlan(plan: PlanId | null) {
    setSelectedPlanState(plan);
    const save = plan === null ? AsyncStorage.removeItem(STORAGE_KEY) : AsyncStorage.setItem(STORAGE_KEY, plan);
    save.catch((error) => console.warn('Failed to save selected plan', error));
  }

  return [selectedPlan, setSelectedPlan] as const;
}
