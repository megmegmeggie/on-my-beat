import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { BrandColors, Spacing } from '@/constants/theme';
import { pathThrough, projectRoute } from '@/lib/route';
import type { RoutePoint } from '@/lib/types';

type Colors = (typeof BrandColors)['light' | 'dark'];

const MAP_HEIGHT = 240;

/** The web build has no native map, so it draws the route's shape on its own. */
export function RouteMap({ route, colors }: { route: RoutePoint[]; colors: Colors }) {
  const [width, setWidth] = useState(0);
  const points = width > 0 ? projectRoute(route, width, MAP_HEIGHT, 24) : [];
  const start = points[0];
  const finish = points[points.length - 1];

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <ThemedText type="smallBold" style={[styles.sectionLabel, { color: colors.goldText }]}>
        Route
      </ThemedText>
      <View style={styles.frame} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {start && finish && (
          <Svg width={width} height={MAP_HEIGHT} accessibilityLabel="Shape of your route">
            <Path
              d={pathThrough(points)}
              stroke={colors.chartYou}
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Circle cx={start.x} cy={start.y} r={6} fill={colors.chartYou} stroke={colors.card} strokeWidth={2} />
            <Circle cx={finish.x} cy={finish.y} r={6} fill={colors.chartTarget} stroke={colors.card} strokeWidth={2} />
          </Svg>
        )}
      </View>
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
  frame: {
    height: MAP_HEIGHT,
  },
});
