import { useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { ThemedText } from '@/components/themed-text';
import { BrandColors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { routeRegion } from '@/lib/route';
import type { RoutePoint } from '@/lib/types';

type Colors = (typeof BrandColors)['light' | 'dark'];

const MAP_HEIGHT = 240;
const EDGE_PADDING = { top: 32, right: 32, bottom: 32, left: 32 };

/**
 * A run's route on a map (Apple Maps on iOS, Google Maps on Android), from
 * start to finish. The map is a still picture, so it doesn't fight the page's
 * scrolling.
 */
export function RouteMap({ route, colors }: { route: RoutePoint[]; colors: Colors }) {
  const scheme = useColorScheme();
  const map = useRef<MapView>(null);
  const coordinates = useMemo(() => route.map(([latitude, longitude]) => ({ latitude, longitude })), [route]);
  const start = coordinates[0];
  const finish = coordinates[coordinates.length - 1];

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <ThemedText type="smallBold" style={[styles.sectionLabel, { color: colors.goldText }]}>
        Route
      </ThemedText>
      <View style={styles.mapFrame}>
        <MapView
          ref={map}
          style={StyleSheet.absoluteFill}
          initialRegion={routeRegion(route)}
          onMapReady={() => map.current?.fitToCoordinates(coordinates, { edgePadding: EDGE_PADDING, animated: false })}
          userInterfaceStyle={scheme === 'dark' ? 'dark' : 'light'}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          toolbarEnabled={false}
          showsPointsOfInterests={false}
          showsCompass={false}
          accessible
          accessibilityLabel="Map of your route">
          <Polyline
            coordinates={coordinates}
            strokeColor={colors.chartYou}
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />
          <Marker coordinate={start} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false} title="Start">
            <View style={[styles.dot, { backgroundColor: colors.chartYou }]} />
          </Marker>
          <Marker coordinate={finish} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false} title="Finish">
            <View style={[styles.dot, { backgroundColor: colors.chartTarget }]} />
          </Marker>
        </MapView>
      </View>
      <View style={styles.legend}>
        <LegendDot color={colors.chartYou} label="Start" textColor={colors.cardText} />
        <LegendDot color={colors.chartTarget} label="Finish" textColor={colors.cardText} />
      </View>
    </View>
  );
}

function LegendDot({ color, label, textColor }: { color: string; label: string; textColor: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <ThemedText type="small" style={{ color: textColor }}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  mapFrame: {
    height: MAP_HEIGHT,
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  legend: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
