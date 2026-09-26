import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

export const PLAN_IDS = ['5k', 'half-marathon', 'marathon'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

const STORAGE_KEY = 'selectedPlan';

function isPlanId(value: string | null): value is PlanId {
  return PLAN_IDS.includes(value as PlanId);
}

/**
 * The user's chosen training plan, persisted across app restarts.
 */
export function useSelectedPlan() {
  const [selectedPlan, setSelectedPlanState] = useState<PlanId | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (isPlanId(stored)) {
          setSelectedPlanState(stored);
        }
      })
      .catch((error) => console.warn('Failed to load selected plan', error));
  }, []);

  function setSelectedPlan(plan: PlanId | null) {
    setSelectedPlanState(plan);
    const save = plan === null ? AsyncStorage.removeItem(STORAGE_KEY) : AsyncStorage.setItem(STORAGE_KEY, plan);
    save.catch((error) => console.warn('Failed to save selected plan', error));
  }

  return [selectedPlan, setSelectedPlan] as const;
}
