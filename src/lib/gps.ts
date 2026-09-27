import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

const METERS_PER_MILE = 1609.344;

/** Minimum distance (meters) between updates to reduce noise. */
const MIN_DISTANCE_METERS = 2;
/** Minimum time (ms) between updates. */
const MIN_TIME_INTERVAL_MS = 1000;
/** Accuracy threshold (meters) — readings worse than this are discarded. */
const MAX_ACCURACY_METERS = 50;
/** Maximum realistic pace in seconds per mile (20:00/mi). Slower than this is treated as not moving. */
const MAX_PACE_SEC_PER_MILE = 1200;

export type GpsStatus = 'idle' | 'requesting' | 'tracking' | 'denied' | 'unavailable';

export type GpsState = {
  status: GpsStatus;
  /** Total distance traveled in miles. */
  distanceMiles: number;
  /** Current pace in seconds per mile, or null if not moving. */
  currentPaceSecPerMile: number | null;
  /** Average pace in seconds per mile, or null if not enough data. */
  averagePaceSecPerMile: number | null;
  /** Current speed in meters per second, or null. */
  speedMps: number | null;
  /** Number of location updates received. */
  updateCount: number;
  /** Error message if something went wrong. */
  error: string | null;
};

const INITIAL_GPS_STATE: GpsState = {
  status: 'idle',
  distanceMiles: 0,
  currentPaceSecPerMile: null,
  averagePaceSecPerMile: null,
  speedMps: null,
  updateCount: 0,
  error: null,
};

/** Calculate distance between two coordinates in meters using the Haversine formula. */
function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Format seconds per mile as MM:SS. */
export function formatPace(secondsPerMile: number | null): string {
  if (secondsPerMile === null || !Number.isFinite(secondsPerMile) || secondsPerMile <= 0) {
    return '--:--';
  }
  const totalSeconds = Math.round(secondsPerMile);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * GPS tracking hook for distance and pace during a run.
 *
 * Uses expo-location's watchPositionAsync for foreground tracking.
 * Calculates distance via Haversine formula between consecutive readings.
 * Pace is derived from speed readings when available, falling back to
 * distance-over-time between updates.
 */
export function useGpsTracking(active: boolean) {
  const [state, setState] = useState<GpsState>(INITIAL_GPS_STATE);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const lastLocationRef = useRef<Location.LocationObject | null>(null);
  const totalDistanceMetersRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      return;
    }

    let cancelled = false;

    async function startTracking() {
      setState((prev) => ({ ...prev, status: 'requesting', error: null }));

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;

      if (status !== 'granted') {
        setState((prev) => ({
          ...prev,
          status: 'denied',
          error: 'Location permission was denied. Enable it in Settings to track distance.',
        }));
        return;
      }

      const providerStatus = await Location.getProviderStatusAsync();
      if (cancelled) return;

      if (!providerStatus.locationServicesEnabled) {
        setState((prev) => ({
          ...prev,
          status: 'unavailable',
          error: 'Location services are turned off. Enable them in Settings.',
        }));
        return;
      }

      setState((prev) => ({ ...prev, status: 'tracking' }));

      subscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: MIN_DISTANCE_METERS,
          timeInterval: MIN_TIME_INTERVAL_MS,
        },
        (location) => {
          if (cancelled) return;

          const { coords, timestamp } = location;
          const { latitude, longitude, speed, accuracy } = coords;

          // Discard inaccurate readings.
          if (accuracy !== null && accuracy > MAX_ACCURACY_METERS) {
            return;
          }

          const last = lastLocationRef.current;
          let segmentDistanceMeters = 0;

          if (last) {
            const dist = haversineDistanceMeters(
              last.coords.latitude,
              last.coords.longitude,
              latitude,
              longitude
            );
            // Filter out GPS jitter — ignore tiny movements.
            if (dist >= MIN_DISTANCE_METERS) {
              segmentDistanceMeters = dist;
              totalDistanceMetersRef.current += dist;
            }
          } else {
            // First reading — start the clock.
            startTimeRef.current = timestamp;
          }

          const now = timestamp;
          const lastTime = lastUpdateTimeRef.current;
          let currentPace: number | null = null;

          if (lastTime !== null && segmentDistanceMeters > 0) {
            const elapsedSec = (now - lastTime) / 1000;
            if (elapsedSec > 0) {
              const pace = elapsedSec / (segmentDistanceMeters / METERS_PER_MILE);
              if (pace <= MAX_PACE_SEC_PER_MILE) {
                currentPace = pace;
              }
            }
          }

          // Use device speed if available and reasonable.
          if (speed !== null && speed > 0.5) {
            const pace = 1 / (speed / METERS_PER_MILE);
            if (pace <= MAX_PACE_SEC_PER_MILE) {
              currentPace = pace;
            }
          }

          lastLocationRef.current = location;
          lastUpdateTimeRef.current = now;

          const totalDistanceMiles = totalDistanceMetersRef.current / METERS_PER_MILE;
          let averagePace: number | null = null;
          if (startTimeRef.current !== null && totalDistanceMetersRef.current > 0) {
            const totalElapsedSec = (now - startTimeRef.current) / 1000;
            if (totalElapsedSec > 0) {
              const pace = totalElapsedSec / totalDistanceMiles;
              if (pace <= MAX_PACE_SEC_PER_MILE) {
                averagePace = pace;
              }
            }
          }

          setState((prev) => ({
            ...prev,
            status: 'tracking',
            distanceMiles: totalDistanceMiles,
            currentPaceSecPerMile: currentPace,
            averagePaceSecPerMile: averagePace,
            speedMps: speed,
            updateCount: prev.updateCount + 1,
          }));
        }
      );
    }

    void startTracking();

    return () => {
      cancelled = true;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [active]);

  function stop() {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
  }

  function reset() {
    stop();
    lastLocationRef.current = null;
    totalDistanceMetersRef.current = 0;
    startTimeRef.current = null;
    lastUpdateTimeRef.current = null;
    setState(INITIAL_GPS_STATE);
  }

  return { ...state, stop, reset };
}
