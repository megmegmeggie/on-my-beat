import { useMemo, useState } from 'react';
import { type GestureResponderEvent, type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { BrandColors, Spacing } from '@/constants/theme';
import { ON_TARGET_TOLERANCE_SPM } from '@/lib/run-session';
import type { CadenceSample } from '@/lib/types';
import { formatDuration } from '@/utils/formatting';

type Colors = (typeof BrandColors)['light' | 'dark'];

const PLOT_HEIGHT = 180;
/** Room around the plot for the axis labels. */
const PAD = { top: 8, right: 8, bottom: 24, left: 34 };
const HEIGHT = PAD.top + PLOT_HEIGHT + PAD.bottom;
const TOOLTIP_WIDTH = 132;
/** The on-target band is a wash of the target color, so the lines stay the loudest marks. */
const BAND_OPACITY = 0.18;

/** A sample with its end time filled in (the next sample's start, or the end of the run). */
type Span = CadenceSample & { endSec: number };

/**
 * The runner's cadence over a finished run against each segment's target, with
 * the on-target band drawn around the target. Press and drag to read the
 * values at any moment.
 */
export function CadenceChart({ samples, durationSec, colors }: { samples: CadenceSample[]; durationSec: number; colors: Colors }) {
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  const chart = useMemo(() => buildChart(samples, durationSec, width), [samples, durationSec, width]);
  const readings = samples.flatMap((sample) => (sample.cadence === null ? [] : [sample.cadence]));
  const targets = samples.map((sample) => sample.targetCadence);

  function inspect(event: GestureResponderEvent) {
    if (!chart) {
      return;
    }
    const sec = chart.secAt(event.nativeEvent.locationX);
    let index = chart.spans.length - 1;
    while (index > 0 && chart.spans[index].atSec > sec) {
      index--;
    }
    setActive(index);
  }

  const activeSpan = chart && active !== null ? chart.spans[active] : null;
  const activeX = activeSpan && chart ? chart.x((activeSpan.atSec + activeSpan.endSec) / 2) : 0;

  return (
    <View
      style={[styles.card, { backgroundColor: colors.card }]}
      accessible
      accessibilityLabel={describe(targets, readings)}>
      <View style={styles.header}>
        <ThemedText type="smallBold" style={[styles.sectionLabel, { color: colors.goldText }]}>
          Cadence
        </ThemedText>
        <ThemedText type="small" style={{ color: colors.cardSubtext }}>
          Steps per minute. Press and drag for details.
        </ThemedText>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.bandSwatch, { backgroundColor: withOpacity(colors.chartTarget, BAND_OPACITY) }]}>
            <View style={[styles.lineSwatch, { backgroundColor: colors.chartTarget }]} />
          </View>
          <ThemedText type="small" style={{ color: colors.cardText }}>
            Target ±{ON_TARGET_TOLERANCE_SPM}
          </ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.bandSwatch}>
            <View style={[styles.lineSwatch, { backgroundColor: colors.chartYou }]} />
          </View>
          <ThemedText type="small" style={{ color: colors.cardText }}>
            You
          </ThemedText>
        </View>
      </View>

      <View style={styles.plot} onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
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
                {tick}
              </SvgText>
            ))}
            {chart.xTicks.map((tick) => (
              <SvgText
                key={`x-${tick}`}
                x={chart.x(tick * 60)}
                y={HEIGHT - 6}
                fontSize={11}
                fill={colors.cardSubtext}
                textAnchor={tick === 0 ? 'start' : chart.x(tick * 60) > width - PAD.right - 16 ? 'end' : 'middle'}>
                {formatMinutes(tick)}
              </SvgText>
            ))}

            <Path d={chart.bandPath} fill={colors.chartTarget} fillOpacity={BAND_OPACITY} />
            <Path d={chart.targetPath} stroke={colors.chartTarget} strokeWidth={2} strokeLinejoin="round" fill="none" />
            <Path
              d={chart.youPath}
              stroke={colors.chartYou}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              fill="none"
            />
            {chart.lastPoint && (
              <Circle
                cx={chart.lastPoint.x}
                cy={chart.lastPoint.y}
                r={4}
                fill={colors.chartYou}
                stroke={colors.card}
                strokeWidth={2}
              />
            )}

            {activeSpan && (
              <>
                <Line
                  x1={activeX}
                  x2={activeX}
                  y1={PAD.top}
                  y2={PAD.top + PLOT_HEIGHT}
                  stroke={colors.cardSubtext}
                  strokeWidth={1}
                />
                {activeSpan.cadence !== null && (
                  <Circle
                    cx={activeX}
                    cy={chart.y(activeSpan.cadence)}
                    r={5}
                    fill={colors.chartYou}
                    stroke={colors.card}
                    strokeWidth={2}
                  />
                )}
              </>
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

        {activeSpan && (
          <View
            pointerEvents="none"
            style={[
              styles.tooltip,
              {
                backgroundColor: colors.cardText,
                left: Math.min(Math.max(activeX - TOOLTIP_WIDTH / 2, 0), width - TOOLTIP_WIDTH),
              },
            ]}>
            <ThemedText type="smallBold" style={{ color: colors.card }}>
              {formatDuration(activeSpan.atSec)}
            </ThemedText>
            <TooltipRow color={colors.chartTarget} label="Target" value={`${activeSpan.targetCadence}`} textColor={colors.card} />
            <TooltipRow
              color={colors.chartYou}
              label="You"
              value={activeSpan.cadence === null ? '—' : `${activeSpan.cadence}`}
              textColor={colors.card}
            />
          </View>
        )}
      </View>
    </View>
  );
}

function TooltipRow({ color, label, value, textColor }: { color: string; label: string; value: string; textColor: string }) {
  return (
    <View style={styles.tooltipRow}>
      <View style={[styles.tooltipKey, { backgroundColor: color }]} />
      <ThemedText type="small" style={[styles.tooltipLabel, { color: textColor }]}>
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={[styles.tooltipValue, { color: textColor }]}>
        {value} spm
      </ThemedText>
    </View>
  );
}

/** Scales, ticks, and paths for a plot `width` wide, or null before the plot has been measured. */
function buildChart(samples: CadenceSample[], durationSec: number, width: number) {
  if (width <= PAD.left + PAD.right || samples.length === 0) {
    return null;
  }
  const spans: Span[] = samples.map((sample, i) => ({
    ...sample,
    endSec: samples[i + 1]?.atSec ?? Math.max(durationSec, sample.atSec + 1),
  }));
  const endSec = spans[spans.length - 1].endSec;

  const values = spans.flatMap((span) => [
    span.targetCadence - ON_TARGET_TOLERANCE_SPM,
    span.targetCadence + ON_TARGET_TOLERANCE_SPM,
    ...(span.cadence === null ? [] : [span.cadence]),
  ]);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const yStep = [5, 10, 20, 25, 50, 100].find((step) => (high - low) / step <= 4) ?? 100;
  const yMin = Math.floor(low / yStep) * yStep;
  const yMax = Math.max(Math.ceil(high / yStep) * yStep, yMin + yStep);
  const yTicks = range(yMin, yMax, yStep);

  const totalMin = endSec / 60;
  const xStep = [1, 2, 5, 10, 15, 20, 30, 60].find((step) => totalMin / step <= 5) ?? 60;
  const xTicks = range(0, Math.floor(totalMin / xStep) * xStep, xStep);

  const plotWidth = width - PAD.left - PAD.right;
  const x = (sec: number) => PAD.left + (sec / endSec) * plotWidth;
  const y = (spm: number) => PAD.top + ((yMax - spm) / (yMax - yMin)) * PLOT_HEIGHT;
  const secAt = (px: number) => ((px - PAD.left) / plotWidth) * endSec;

  // The target as a step line, and the band as one rectangle per span (they abut, so it reads as one shape).
  let targetPath = '';
  let bandPath = '';
  spans.forEach((span, i) => {
    const x0 = x(span.atSec);
    const x1 = x(span.endSec);
    const ty = y(span.targetCadence);
    targetPath += `${i === 0 ? 'M' : 'L'}${x0},${ty}H${x1}`;
    const top = y(span.targetCadence + ON_TARGET_TOLERANCE_SPM);
    const bottom = y(span.targetCadence - ON_TARGET_TOLERANCE_SPM);
    bandPath += `M${x0},${top}H${x1}V${bottom}H${x0}Z`;
  });

  // Each reading sits at the middle of its span; gaps without a reading break the line.
  const runs: Point[][] = [[]];
  for (const span of spans) {
    if (span.cadence === null) {
      runs.push([]);
    } else {
      runs[runs.length - 1].push({ x: x((span.atSec + span.endSec) / 2), y: y(span.cadence) });
    }
  }
  const youPath = runs.map(smoothPath).join('');
  const lastPoint = runs.findLast((run) => run.length > 0)?.at(-1) ?? null;

  return { spans, x, y, secAt, yTicks, xTicks, targetPath, bandPath, youPath, lastPoint };
}

type Point = { x: number; y: number };

/**
 * A curve through every point that never overshoots them (monotone cubic
 * interpolation), so the line reads smoothly without inventing peaks.
 */
function smoothPath(points: Point[]) {
  if (points.length === 0) {
    return '';
  }
  const slopes = points.slice(1).map((point, i) => (point.y - points[i].y) / (point.x - points[i].x));
  const tangents = points.map((_, i) => {
    if (i === 0 || i === points.length - 1) {
      return slopes[Math.min(i, slopes.length - 1)] ?? 0;
    }
    const before = slopes[i - 1];
    const after = slopes[i];
    return before * after <= 0 ? 0 : (2 * before * after) / (before + after);
  });
  let path = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1];
    const to = points[i];
    const dx = (to.x - from.x) / 3;
    path += `C${from.x + dx},${from.y + dx * tangents[i - 1]},${to.x - dx},${to.y - dx * tangents[i]},${to.x},${to.y}`;
  }
  return path;
}

function range(from: number, to: number, step: number) {
  const values: number[] = [];
  for (let value = from; value <= to; value += step) {
    values.push(value);
  }
  return values;
}

function formatMinutes(min: number) {
  if (min < 60) {
    return `${min}m`;
  }
  const hours = Math.floor(min / 60);
  const rest = min % 60;
  return rest === 0 ? `${hours}h` : `${hours}h${rest}`;
}

/** `#RRGGBB` plus an alpha, for the legend swatch (SVG marks use `fillOpacity` instead). */
function withOpacity(hex: string, opacity: number) {
  return `${hex}${Math.round(opacity * 255)
    .toString(16)
    .padStart(2, '0')}`;
}

/** What the chart shows, for screen readers. */
function describe(targets: number[], readings: number[]) {
  const targetText =
    Math.min(...targets) === Math.max(...targets)
      ? `a target of ${targets[0]}`
      : `targets from ${Math.min(...targets)} to ${Math.max(...targets)}`;
  const youText =
    readings.length > 0
      ? `your cadence ranged from ${Math.min(...readings)} to ${Math.max(...readings)}`
      : 'no cadence was recorded';
  return `Cadence chart in steps per minute: ${targetText}, within ${ON_TARGET_TOLERANCE_SPM} counting as on target; ${youText}.`;
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    gap: Spacing.half,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  legend: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  bandSwatch: {
    width: 18,
    height: 10,
    borderRadius: 2,
    justifyContent: 'center',
  },
  lineSwatch: {
    height: 2,
    borderRadius: 1,
  },
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
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  tooltipKey: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tooltipLabel: {
    flex: 1,
  },
  tooltipValue: {
    fontVariant: ['tabular-nums'],
  },
});
