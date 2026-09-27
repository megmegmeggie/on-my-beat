import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';

import { formatPace } from '@/lib/gps';
import { pathThrough, projectRoute } from '@/lib/route';
import type { CadenceSample, RoutePoint, RunRecord } from '@/lib/types';
import { formatDuration } from '@/utils/formatting';

/**
 * The card's own palette. It's an image people post elsewhere, so it keeps
 * the brand's green and gold whatever theme the phone is in.
 */
const CARD = {
  top: '#1F6B3A',
  bottom: '#0E2A18',
  gold: '#F2D27A',
  text: '#FFFFFF',
  muted: 'rgba(255, 255, 255, 0.72)',
  faint: 'rgba(255, 255, 255, 0.14)',
  target: 'rgba(242, 210, 122, 0.55)',
};

const WIDTH = 320;
const HEIGHT = 400;
const PADDING = 20;
const HERO_HEIGHT = 150;
const HERO_WIDTH = WIDTH - PADDING * 2;

/** The run as a 4:5 image-ready card: what was run, where, and how it went. */
export function ShareCard({ record }: { record: RunRecord }) {
  const stats = [
    { label: 'Time', value: formatDuration(record.durationSec) },
    record.distanceMiles != null ? { label: 'Distance', value: `${record.distanceMiles.toFixed(2)} mi` } : null,
    record.averageCadence != null ? { label: 'Cadence', value: `${record.averageCadence} spm` } : null,
    record.durationSec > 0
      ? { label: 'On pace', value: `${Math.round((record.timeOnTargetSec / record.durationSec) * 100)}%` }
      : null,
    // Only makes the cut when one of the above is missing.
    record.averagePaceSecPerMile != null ? { label: 'Pace', value: `${formatPace(record.averagePaceSecPerMile)} /mi` } : null,
  ]
    .filter((stat) => stat !== null)
    .slice(0, 4);

  return (
    <View style={styles.card} collapsable={false}>
      <Svg width={WIDTH} height={HEIGHT} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="background" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={CARD.top} />
            <Stop offset="1" stopColor={CARD.bottom} />
          </LinearGradient>
        </Defs>
        <Rect width={WIDTH} height={HEIGHT} fill="url(#background)" />
      </Svg>

      <View style={styles.header}>
        <Text style={styles.brand}>ON MY BEAT</Text>
        <Text style={styles.date}>{formatDate(record.startedAt)}</Text>
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {record.workoutName}
      </Text>

      <View style={styles.hero}>
        {record.route && record.route.length > 1 ? (
          <RouteShape route={record.route} />
        ) : record.cadenceTrace && record.cadenceTrace.some((sample) => sample.cadence !== null) ? (
          <CadenceShape samples={record.cadenceTrace} />
        ) : null}
      </View>

      <View style={styles.stats}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.stat}>
            <Text style={styles.statLabel}>{stat.label.toUpperCase()}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function RouteShape({ route }: { route: RoutePoint[] }) {
  const points = projectRoute(route, HERO_WIDTH, HERO_HEIGHT, 10);
  const start = points[0];
  const finish = points[points.length - 1];
  return (
    <Svg width={HERO_WIDTH} height={HERO_HEIGHT}>
      <Path
        d={pathThrough(points)}
        stroke={CARD.gold}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx={start.x} cy={start.y} r={5} fill={CARD.text} />
      <Circle cx={finish.x} cy={finish.y} r={5} fill={CARD.gold} stroke={CARD.text} strokeWidth={2} />
    </Svg>
  );
}

/** Target (gold step line) and actual cadence (white) over the run, when there's no route to show. */
function CadenceShape({ samples }: { samples: CadenceSample[] }) {
  const values = samples.flatMap((sample) => [sample.targetCadence, ...(sample.cadence === null ? [] : [sample.cadence])]);
  const low = Math.min(...values) - 5;
  const high = Math.max(...values) + 5;
  const last = samples[samples.length - 1];
  const endSec = last.atSec + 10;
  const x = (sec: number) => (sec / endSec) * HERO_WIDTH;
  const y = (spm: number) => 8 + ((high - spm) / (high - low)) * (HERO_HEIGHT - 16);

  let target = '';
  let you = '';
  let drawing = false;
  samples.forEach((sample, i) => {
    const next = samples[i + 1]?.atSec ?? endSec;
    target += `${i === 0 ? 'M' : 'L'}${x(sample.atSec)},${y(sample.targetCadence)}H${x(next)}`;
    if (sample.cadence === null) {
      drawing = false;
      return;
    }
    you += `${drawing ? 'L' : 'M'}${x((sample.atSec + next) / 2)},${y(sample.cadence)}`;
    drawing = true;
  });

  return (
    <Svg width={HERO_WIDTH} height={HERO_HEIGHT}>
      <Path d={target} stroke={CARD.target} strokeWidth={2} fill="none" />
      <Path d={you} stroke={CARD.text} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/**
 * A preview of the share card, with a button that turns it into an image and
 * opens the system share sheet (Messages, Instagram, Photos, …).
 */
export function ShareSheet({ record, visible, onClose }: { record: RunRecord; visible: boolean; onClose: () => void }) {
  const card = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function share() {
    setSharing(true);
    setError(null);
    try {
      const uri = await captureRef(card, { format: 'png', result: 'tmpfile' });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share your run' });
      onClose();
    } catch (caught) {
      console.warn('Failed to share run', caught);
      setError("Couldn't create the image. Please try again.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View ref={card} collapsable={false}>
          <ShareCard record={record} />
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.actions}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            style={({ pressed }) => [styles.action, styles.secondaryAction, pressed && styles.pressed]}>
            <Text style={styles.secondaryActionText}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={share}
            disabled={sharing}
            accessibilityRole="button"
            style={({ pressed }) => [styles.action, styles.primaryAction, (pressed || sharing) && styles.pressed]}>
            <Text style={styles.primaryActionText}>{sharing ? 'Preparing…' : 'Share'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const styles = StyleSheet.create({
  card: {
    width: WIDTH,
    height: HEIGHT,
    padding: PADDING,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    color: CARD.gold,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
  },
  date: {
    color: CARD.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    color: CARD.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
  },
  hero: {
    height: HERO_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
    borderTopWidth: 1,
    borderTopColor: CARD.faint,
    paddingTop: 12,
  },
  stat: {
    width: '50%',
    gap: 2,
  },
  statLabel: {
    color: CARD.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statValue: {
    color: CARD.text,
    fontSize: 22,
    fontWeight: '800',
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  error: {
    color: '#F2B8B5',
    fontSize: 14,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: WIDTH,
  },
  action: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 999,
  },
  primaryAction: {
    backgroundColor: CARD.gold,
  },
  primaryActionText: {
    color: CARD.bottom,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryAction: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  secondaryActionText: {
    color: CARD.text,
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
