import { useEffect, useRef, useState } from 'react';

import { startCadenceTracking } from '@/services/cadence/cadenceService';
import type { CadenceReading, CadenceTrackingStatus } from '@/types/cadence';

const NO_READING: CadenceReading = { stepsPerMinute: null, totalSteps: 0 };

/**
 * Live running cadence from the phone's accelerometer.
 * Call `start()` from a button press; tracking stops automatically on unmount.
 */
export function useCadence() {
  const [status, setStatus] = useState<CadenceTrackingStatus>('idle');
  const [reading, setReading] = useState<CadenceReading>(NO_READING);
  const stopTracking = useRef<(() => void) | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      stopTracking.current?.();
      stopTracking.current = null;
    };
  }, []);

  async function start() {
    if (status === 'starting' || status === 'tracking') {
      return;
    }
    setStatus('starting');
    setReading(NO_READING);

    let tracking;
    try {
      tracking = await startCadenceTracking(setReading);
    } catch (error) {
      console.warn('Failed to start cadence tracking', error);
      setStatus('unavailable');
      return;
    }
    if (tracking.status !== 'tracking') {
      setStatus(tracking.status);
      return;
    }
    if (!isMounted.current) {
      tracking.stop();
      return;
    }
    stopTracking.current = tracking.stop;
    setStatus('tracking');
  }

  function stop() {
    stopTracking.current?.();
    stopTracking.current = null;
    setStatus('idle');
  }

  return { status, ...reading, start, stop };
}
