import type { RoutePoint } from '@/lib/types';

/** The smallest area a map zooms out to (degrees), so a short route isn't shown at street-corner zoom. */
const MIN_REGION_DELTA = 0.004;

/** A map region that fits the whole route with some margin. */
export function routeRegion(route: RoutePoint[]) {
  const lats = route.map(([lat]) => lat);
  const lons = route.map(([, lon]) => lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.4, MIN_REGION_DELTA),
    longitudeDelta: Math.max((maxLon - minLon) * 1.4, MIN_REGION_DELTA),
  };
}

/**
 * The route as points in a `width` × `height` box, keeping its real shape
 * (east–west distances shrink away from the equator), centred with `padding`.
 * For drawing a route without a map, e.g. on the share card.
 */
export function projectRoute(route: RoutePoint[], width: number, height: number, padding: number) {
  const meanLat = route.reduce((sum, [lat]) => sum + lat, 0) / route.length;
  const lonScale = Math.cos((meanLat * Math.PI) / 180);
  const xs = route.map(([, lon]) => lon * lonScale);
  const ys = route.map(([lat]) => -lat);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX || 1e-9;
  const spanY = Math.max(...ys) - minY || 1e-9;
  const scale = Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanY);
  const offsetX = (width - spanX * scale) / 2;
  const offsetY = (height - spanY * scale) / 2;
  return xs.map((x, i) => ({ x: offsetX + (x - minX) * scale, y: offsetY + (ys[i] - minY) * scale }));
}

/** An SVG path through `points`. */
export function pathThrough(points: { x: number; y: number }[]) {
  return points.map((point, i) => `${i === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join('');
}
