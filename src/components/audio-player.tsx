import Slider from '@react-native-community/slider';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { AudioSource } from '@/types/music';
import { formatDuration } from '@/utils/formatting';

const PLAYBACK_RATES = [1, 1.25, 1.5, 2] as const;
const SKIP_SECONDS = 10;
const STATUS_UPDATE_INTERVAL = 250;

export type AudioPlayerProps = {
  source: AudioSource;
  title?: string;
  artist?: string;
  albumTitle?: string;
  artworkUrl?: string;

  /**
   * Keeps audio playing when the app is backgrounded or the screen locks, and
   * enables lock screen / media notification controls. Requires a development
   * build configured with the `expo-audio` config plugin.
   */
  backgroundPlayback?: boolean;

  /** Repeat the track after it reaches the end. */
  loop?: boolean;

  /** Start playing as soon as the source is ready. */
  autoPlay?: boolean;

  /** Fired once when a track plays to the end and `loop` is off. */
  onTrackEnded?: () => void;
};

export function AudioPlayer({
  source,
  title,
  artist,
  albumTitle,
  artworkUrl,
  backgroundPlayback = false,
  loop = false,
  autoPlay = false,
  onTrackEnded,
}: AudioPlayerProps) {
  const theme = useTheme();
  const player = useAudioPlayer(source, { updateInterval: STATUS_UPDATE_INTERVAL });
  const status = useAudioPlayerStatus(player);

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPosition, setScrubPosition] = useState(0);

  const duration = status.duration;
  const position = isScrubbing ? scrubPosition : status.currentTime;
  const isReady = status.isLoaded && duration > 0;
  const isMuted = status.mute;

  useEffect(() => {
    // `loop` is a plain assignable property on AudioPlayer with no setter
    // method, so this targets the native player rather than React state.
    // eslint-disable-next-line react-hooks/immutability
    player.loop = loop;
  }, [loop, player]);

  useEffect(() => {
    void setAudioModeAsync({
      // A run happens with the ringer silenced, so audio must ignore the
      // silent switch to be useful.
      playsInSilentMode: true,
      shouldPlayInBackground: backgroundPlayback,
      // Lock screen controls are only associated with the player when the
      // session does not mix with other audio.
      interruptionMode: backgroundPlayback ? 'doNotMix' : 'mixWithOthers',
    });
  }, [backgroundPlayback]);

  useEffect(() => {
    if (!backgroundPlayback) {
      return;
    }

    return () => {
      player.clearLockScreenControls();
    };
  }, [backgroundPlayback, player]);

  useEffect(() => {
    if (!backgroundPlayback || !status.playing) {
      return;
    }

    player.setActiveForLockScreen(true, { title, artist, albumTitle, artworkUrl });
  }, [albumTitle, artist, artworkUrl, backgroundPlayback, player, status.playing, title]);

  useEffect(() => {
    if (autoPlay && status.isLoaded) {
      player.play();
    }
  }, [autoPlay, player, status.isLoaded]);

  const prevDidJustFinish = useRef(false);
  useEffect(() => {
    if (status.didJustFinish && !prevDidJustFinish.current && !loop) {
      onTrackEnded?.();
    }

    prevDidJustFinish.current = status.didJustFinish;
  }, [loop, onTrackEnded, status.didJustFinish]);

  const togglePlayback = useCallback(() => {
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [player, status.playing]);

  const restart = useCallback(() => {
    void player.seekTo(0);
    player.play();
  }, [player]);

  const skip = useCallback(
    (seconds: number) => {
      void player.seekTo(Math.min(Math.max(status.currentTime + seconds, 0), duration));
    },
    [duration, player, status.currentTime]
  );

  const cyclePlaybackRate = useCallback(() => {
    const currentIndex = PLAYBACK_RATES.indexOf(
      status.playbackRate as (typeof PLAYBACK_RATES)[number]
    );
    const nextRate = PLAYBACK_RATES[(currentIndex + 1) % PLAYBACK_RATES.length];

    player.setPlaybackRate(nextRate);
  }, [player, status.playbackRate]);

  const toggleMute = useCallback(() => {
    // See the `loop` assignment above: `muted` is likewise property-only.
    // eslint-disable-next-line react-hooks/immutability
    player.muted = !isMuted;
  }, [isMuted, player]);

  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <View style={styles.header}>
        <View style={styles.metadata}>
          <ThemedText type="subtitle" numberOfLines={1}>
            {title ?? 'Audio'}
          </ThemedText>

          {artist ? (
            <ThemedText themeColor="textSecondary" numberOfLines={1}>
              {albumTitle ? `${artist} — ${albumTitle}` : artist}
            </ThemedText>
          ) : null}
        </View>

        {status.isBuffering && !isScrubbing ? <ActivityIndicator size="small" /> : null}
      </View>

      <Slider
        style={styles.slider}
        disabled={!isReady}
        value={Math.min(Math.max(position, 0), duration || 0)}
        minimumValue={0}
        maximumValue={duration || 1}
        onSlidingStart={() => {
          setScrubPosition(status.currentTime);
          setIsScrubbing(true);
        }}
        onValueChange={setScrubPosition}
        onSlidingComplete={(value) => {
          setIsScrubbing(false);
          void player.seekTo(value);
        }}
        minimumTrackTintColor={theme.text}
        maximumTrackTintColor={theme.textSecondary}
        thumbTintColor={theme.text}
        accessibilityLabel="Playback position"
      />

      <View style={styles.timeRow}>
        <ThemedText themeColor="textSecondary" style={styles.time}>
          {formatDuration(position)}
        </ThemedText>

        <ThemedText themeColor="textSecondary" style={styles.time}>
          {formatDuration(duration)}
        </ThemedText>
      </View>

      {status.error ? (
        <ThemedText themeColor="textSecondary" style={styles.error}>
          {status.error}
        </ThemedText>
      ) : null}

      <View style={styles.controls}>
        <TransportButton
          onPress={() => skip(-SKIP_SECONDS)}
          disabled={!isReady}
          accessibilityLabel={`Rewind ${SKIP_SECONDS} seconds`}
          iosName="gobackward.10"
          androidName="replay_10"
          tintColor={theme.text}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={status.playing ? 'Pause' : 'Play'}
          accessibilityState={{ disabled: !status.isLoaded }}
          disabled={!status.isLoaded}
          onPress={togglePlayback}
          style={({ pressed }) => [
            styles.playButton,
            { backgroundColor: theme.text },
            pressed && styles.pressed,
          ]}>
          <SymbolView
            name={{
              ios: status.playing ? 'pause.fill' : 'play.fill',
              android: status.playing ? 'pause' : 'play_arrow',
              web: status.playing ? 'pause' : 'play_arrow',
            }}
            size={28}
            tintColor={theme.background}
          />
        </Pressable>

        <TransportButton
          onPress={() => skip(SKIP_SECONDS)}
          disabled={!isReady}
          accessibilityLabel={`Forward ${SKIP_SECONDS} seconds`}
          iosName="goforward.10"
          androidName="forward_10"
          tintColor={theme.text}
        />
      </View>

      <View style={styles.secondaryControls}>
        <SecondaryButton onPress={restart} accessibilityLabel="Restart track" label="Restart" />

        <SecondaryButton
          onPress={cyclePlaybackRate}
          accessibilityLabel="Change playback speed"
          label={`${status.playbackRate}×`}
        />

        <SecondaryButton
          onPress={toggleMute}
          accessibilityLabel={isMuted ? 'Unmute' : 'Mute'}
          label={isMuted ? 'Unmute' : 'Mute'}
        />
      </View>
    </ThemedView>
  );
}

type TransportButtonProps = {
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
  iosName: 'gobackward.10' | 'goforward.10';
  androidName: 'replay_10' | 'forward_10';
  tintColor: string;
};

function TransportButton({
  onPress,
  disabled,
  accessibilityLabel,
  iosName,
  androidName,
  tintColor,
}: TransportButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}>
      <SymbolView
        name={{ ios: iosName, android: androidName, web: androidName }}
        size={24}
        tintColor={tintColor}
        style={!disabled ? undefined : styles.disabled}
      />
    </Pressable>
  );
}

type SecondaryButtonProps = {
  onPress: () => void;
  accessibilityLabel: string;
  label: string;
};

function SecondaryButton({ onPress, accessibilityLabel, label }: SecondaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
      <ThemedText themeColor="textSecondary">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  metadata: {
    flex: 1,
    gap: Spacing.one,
  },
  slider: {
    width: '100%',
    height: Spacing.five,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  error: {
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
    paddingVertical: Spacing.two,
  },
  skipButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
  },
  secondaryControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  secondaryButton: {
    paddingVertical: Spacing.one,
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.4,
  },
});
