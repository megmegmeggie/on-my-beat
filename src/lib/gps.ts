import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import type { RoutePoint } from '@/lib/types';

const METERS_PER_MILE = 1609.344;

/** Minimum distance (meters) between updates to reduce noise. */
const MIN_DISTANCE_METERS = 2;
/** Minimum time (ms) between updates. */
const MIN_TIME_INTERVAL_MS = 1000;
/** Accuracy threshold (meters) — readings worse than this are discarded. */
const MAX_ACCURACY_METERS = 50;
/** Route points closer together than this (meters) are skipped, to keep saved routes small. */
const ROUTE_POINT_SPACING_METERS = 10;
/** Route coordinates are rounded to this many decimals (about 1 m). */
const ROUTE_DECIMALS = 5;
/** Maximum realistic pace in seconds per mile (20:00/mi). Slower than this is treated as not moving. */
const MAX_PACE_SEC_PER_MILE = 1200;

/**
 * How location is requested. `High` is about 10 m; lower settings (e.g. `Balanced`,
 * 100 m on iOS) mostly give readings that `MAX_ACCURACY_METERS` throws away.
 */
const LOCATION_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.High,
  distanceInterval: MIN_DISTANCE_METERS,
  timeInterval: MIN_TIME_INTERVAL_MS,
};

/** The task that receives locations while the screen is locked. */
const BACKGROUND_TASK = 'run-location-updates';

/**
 * Background location needs a development or store build: Expo Go can't do it,
 * and there's no such thing on web. Elsewhere tracking falls back to
 * foreground-only updates, which pause while the phone is locked.
 */
const canTrackInBackground =
  Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

/** Where background locations go: the run being tracked, or nowhere. */
let backgroundListener: ((location: Location.LocationObject) => void) | null = null;

if (canTrackInBackground) {
  // Defined at the top level, so it exists whenever the system delivers locations.
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(BACKGROUND_TASK, async ({ data, error }) => {
    if (error || !data) {
      return;
    }
    data.locations.forEach((location) => backgroundListener?.(location));
  });
  // A run that ended in a crash can leave updates running with nothing listening; stop them.
  Location.hasStartedLocationUpdatesAsync(BACKGROUND_TASK)
    .then((started) => (started && !backgroundListener ? Location.stopLocationUpdatesAsync(BACKGROUND_TASK) : undefined))
    .catch(() => {});
}

/**
 * Sends locations to `onLocation`, in the background too when the build allows
 * it and the runner granted "Always" location access. Returns a function that stops them.
 */
async function startLocationUpdates(onLocation: (location: Location.LocationObject) => void) {
  if (canTrackInBackground && (await Location.requestBackgroundPermissionsAsync()).status === 'granted') {
    backgroundListener = onLocation;
    await Location.startLocationUpdatesAsync(BACKGROUND_TASK, {
      ...LOCATION_OPTIONS,
      activityType: Location.ActivityType.Fitness,
      pausesUpdatesAutomatically: false,
      // The blue status-bar pill, so it's clear the run is using location.
      showsBackgroundLocationIndicator: true,
      // Android shows this notification while the run tracks location.
      foregroundService: {
        notificationTitle: 'Run in progress',
        notificationBody: 'Tracking your distance and pace',
        notificationColor: '#1F6B3A',
      },
    });
    return () => {
      if (backgroundListener === onLocation) {
        backgroundListener = null;
      }
      Location.stopLocationUpdatesAsync(BACKGROUND_TASK).catch(() => {});
    };
  }
  const subscription = await Location.watchPositionAsync(LOCATION_OPTIONS, onLocation);
  return () => subscription.remove();
}

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
  const stopUpdatesRef = useRef<(() => void) | null>(null);
  const lastLocationRef = useRef<Location.LocationObject | null>(null);
  const totalDistanceMetersRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number | null>(null);
  /** Where the runner went, for the map on the summary. Appended to in place. */
  const routeRef = useRef<RoutePoint[]>([]);

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

      const onLocation = (location: Location.LocationObject) => {
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

        const route = routeRef.current;
        const lastPoint = route.at(-1);
        if (
          !lastPoint ||
          haversineDistanceMeters(lastPoint[0], lastPoint[1], latitude, longitude) >= ROUTE_POINT_SPACING_METERS
        ) {
          route.push([roundCoordinate(latitude), roundCoordinate(longitude)]);
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
      };

      const stopUpdates = await startLocationUpdates(onLocation);
      if (cancelled) {
        // The run paused or ended while updates were starting.
        stopUpdates();
      } else {
        stopUpdatesRef.current = stopUpdates;
      }
    }

    void startTracking();

    return () => {
      cancelled = true;
      stopUpdatesRef.current?.();
      stopUpdatesRef.current = null;
    };
  }, [active]);

  function stop() {
    stopUpdatesRef.current?.();
    stopUpdatesRef.current = null;
  }

  function reset() {
    stop();
    lastLocationRef.current = null;
    totalDistanceMetersRef.current = 0;
    startTimeRef.current = null;
    lastUpdateTimeRef.current = null;
    routeRef.current = [];
    setState(INITIAL_GPS_STATE);
  }

  /** The route so far. The same array grows as the run goes, so read it when it's needed (e.g. on save). */
  const getRoute = useCallback(() => routeRef.current, []);

  return { ...state, getRoute, stop, reset };
}

function roundCoordinate(degrees: number) {
  const factor = 10 ** ROUTE_DECIMALS;
  return Math.round(degrees * factor) / factor;
}
