/** One accelerometer reading. x/y/z are in g (1 g = 9.81 m/s²); timestamp is in seconds. */
export type AccelerometerSample = {
  x: number;
  y: number;
  z: number;
  timestamp: number;
};

export type CadenceReading = {
  /** Steps per minute over the last few seconds, or null when there isn't enough recent data. */
  stepsPerMinute: number | null;
  /** Steps counted since tracking started. */
  totalSteps: number;
};

export type CadenceTrackingStatus =
  | 'idle'
  | 'starting'
  | 'tracking'
  /** The device has no accelerometer (e.g. iOS simulator, desktop browser). */
  | 'unavailable'
  /** The user declined motion access. */
  | 'denied';
