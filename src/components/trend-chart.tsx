import { useMemo, useState } from 'react';
import { type GestureResponderEvent, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { BrandColors, Spacing } from '@/constants/theme';

type Colors = (typeof BrandColors)['light' | 'dark'];

/** One run on the chart. */
export type TrendPoint = { id: string; date: string; title: string; value: number };

const PLOT_HEIGHT = 160;
const PAD = { top: 12, right: 12, bottom: 24, left: 40 };
const HEIGHT = PAD.top + PLOT_HEIGHT + PAD.bottom;
const TOOLTIP_WIDTH = 160;

/**
 * One measure across runs, oldest on the left: a line with a dot per run, the
 * latest value labelled. Press and drag to read any run.
 */
export function TrendChart({
  points,
  format,
  colors,
}: {
  points: TrendPoint[];
  /** Turns a value into display text, with its unit. */
  format: (value: number) => string;
  colors: Colors;
}) {
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const chart = useMemo(() => buildChart(points, width), [points, width]);

  function inspect(event: GestureResponderEvent) {
    if (chart) {
      setActive(chart.nearest(event.nativeEvent.locationX));
    }
  }

  const activePoint = chart && active !== null ? chart.dots[active] : null;
  const last = chart?.dots[chart.dots.length - 1];

  return (
    <View style={styles.plot} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {chart && (
        <Svg width={width} height={HEIGHT}>
          {chart.yTicks.map((tick) => (
            <Line
              key={`grid-${tick}`}
              x1={PAD.left}
              x2={width - PAD.right}
              y1={chart.y(tick)}
              y2={chart.y(tick)}
              stroke={colors.chartGrid}
              strokeWidth={1}
            />
          ))}
          {chart.yTicks.map((tick) => (
            <SvgText
              key={`y-${tick}`}
              x={PAD.left - 6}
              y={chart.y(tick) + 4}
              fontSize={11}
              fill={colors.cardSubtext}
              textAnchor="end">
              {compact(tick)}
            </SvgText>
          ))}
          <SvgText x={PAD.left} y={HEIGHT - 6} fontSize={11} fill={colors.cardSubtext} textAnchor="start">
            {shortDate(points[0].date)}
          </SvgText>
          {points.length > 1 && (
            <SvgText x={width - PAD.right} y={HEIGHT - 6} fontSize={11} fill={colors.cardSubtext} textAnchor="end">
              {shortDate(points[points.length - 1].date)}
            </SvgText>
          )}

          <Path d={chart.path} stroke={colors.chartYou} strokeWidth={2} strokeLinejoin="round" fill="none" />
          {chart.dots.map((dot, i) => (
            <Circle
              key={points[i].id}
              cx={dot.x}
              cy={dot.y}
              r={i === active ? 6 : 4}
              fill={colors.chartYou}
              stroke={colors.card}
              strokeWidth={2}
            />
          ))}
          {last && active === null && (
            <SvgText
              x={Math.min(last.x, width - PAD.right)}
              y={last.y - 10}
              fontSize={12}
              fontWeight="700"
              fill={colors.cardText}
              textAnchor={points.length > 1 ? 'end' : 'middle'}>
              {format(points[points.length - 1].value)}
            </SvgText>
          )}
          {activePoint && (
            <Line
              x1={activePoint.x}
              x2={activePoint.x}
              y1={PAD.top}
              y2={PAD.top + PLOT_HEIGHT}
              stroke={colors.cardSubtext}
              strokeWidth={1}
            />
          )}
        </Svg>
      )}

      {/* A childless layer takes the touches, so `locationX` is always relative to the plot. */}
      <View
        style={StyleSheet.absoluteFill}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={inspect}
        onResponderMove={inspect}
        onResponderRelease={() => setActive(null)}
        onResponderTerminate={() => setActive(null)}
      />

      {activePoint && active !== null && (
        <View
          pointerEvents="none"
          style={[
            styles.tooltip,
            {
              backgroundColor: colors.cardText,
              left: Math.min(Math.max(activePoint.x - TOOLTIP_WIDTH / 2, 0), width - TOOLTIP_WIDTH),
            },
          ]}>
          <ThemedText type="small" style={{ color: colors.card }} numberOfLines={1}>
            {shortDate(points[active].date)} · {points[active].title}
          </ThemedText>
          <ThemedText type="smallBold" style={{ color: colors.card }}>
            {format(points[active].value)}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

function buildChart(points: TrendPoint[], width: number) {
  if (width <= PAD.left + PAD.right || points.length === 0) {
    return null;
  }
  const values = points.map((point) => point.value);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = Math.max(high - low, Math.abs(high) * 0.1, 1);
  const rawStep = span / 3;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * magnitude >= rawStep) ?? 10) * magnitude;
  const yMin = Math.floor((low - span * 0.1) / step) * step;
  const yMax = Math.ceil((high + span * 0.1) / step) * step;
  const yTicks: number[] = [];
  for (let tick = yMin; tick <= yMax + step / 2; tick += step) {
    yTicks.push(Number(tick.toFixed(6)));
  }

  const plotWidth = width - PAD.left - PAD.right;
  // A lone run sits in the middle; otherwise runs are spread evenly edge to edge.
  const x = (i: number) => PAD.left + (points.length === 1 ? plotWidth / 2 : (i / (points.length - 1)) * plotWidth);
  const y = (value: number) => PAD.top + ((yMax - value) / (yMax - yMin)) * PLOT_HEIGHT;
  const dots = points.map((point, i) => ({ x: x(i), y: y(point.value) }));
  const path = dots.map((dot, i) => `${i === 0 ? 'M' : 'L'}${dot.x},${dot.y}`).join('');
  const nearest = (px: number) =>
    dots.reduce((best, dot, i) => (Math.abs(dot.x - px) < Math.abs(dots[best].x - px) ? i : best), 0);

  return { y, yTicks, dots, path, nearest };
}

/** Axis numbers without trailing zeros: 170, 2.5, 0.75. */
function compact(value: number) {
  return String(Number(value.toFixed(2)));
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  plot: {
    height: HEIGHT,
  },
  tooltip: {
    position: 'absolute',
    top: 0,
    width: TOOLTIP_WIDTH,
    padding: Spacing.two,
    borderRadius: Spacing.two,
    gap: Spacing.half,
  },
});
