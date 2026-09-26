import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AudioPlayer } from '@/components/audio-player';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WebBadge } from '@/components/web-badge';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getSongs } from '@/services/music/musicService';

export default function MusicScreen() {
  const theme = useTheme();
  const safeAreaInsets = useSafeAreaInsets();
  const tracks = getSongs();

  // `autoPlay` is false on first load so the app never starts making noise
  // unprompted, and true once the user has engaged with the player.
  const [selection, setSelection] = useState({
    id: tracks[0]?.id ?? '',
    autoPlay: false,
  });
  const selectedSong = tracks.find((song) => song.id === selection.id) ?? tracks[0];

  const playNext = () => {
    if (tracks.length === 0) {
      return;
    }

    const currentIndex = tracks.findIndex((song) => song.id === selection.id);
    const nextSong = tracks[(currentIndex + 1) % tracks.length];

    setSelection({ id: nextSong.id, autoPlay: true });
  };

  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: Spacing.six,
      paddingBottom: Spacing.four,
    },
  });

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="subtitle">Music</ThemedText>
          <ThemedText themeColor="textSecondary">
            Browse the song library. During a run, songs are picked automatically to match your target cadence.
          </ThemedText>
        </ThemedView>

        {selectedSong ? (
          <AudioPlayer
            key={selectedSong.id}
            source={selectedSong.source}
            title={selectedSong.title}
            artist={selectedSong.artist}
            albumTitle={selectedSong.albumTitle}
            artworkUrl={selectedSong.artworkUrl}
            backgroundPlayback
            autoPlay={selection.autoPlay}
            onTrackEnded={playNext}
          />
        ) : null}

        <ThemedView type="backgroundElement" style={styles.trackList}>
          {tracks.map((song) => {
            const isSelected = song.id === selectedSong?.id;

            return (
              <Pressable
                key={song.id}
                onPress={() => setSelection({ id: song.id, autoPlay: true })}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={`${song.title} by ${song.artist}`}
                style={({ pressed }) => [
                  styles.trackRow,
                  isSelected && { backgroundColor: theme.backgroundSelected },
                  pressed && styles.pressed,
                ]}>
                <View style={styles.trackInfo}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {song.title}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" numberOfLines={1}>
                    {song.artist} · {song.bpm} BPM
                  </ThemedText>
                </View>

                {isSelected ? (
                  <ThemedText themeColor="textSecondary" style={styles.nowPlaying}>
                    Playing
                  </ThemedText>
                ) : null}
              </Pressable>
            );
          })}
        </ThemedView>

        {Platform.OS === 'web' && <WebBadge />}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    gap: Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
  },
  titleContainer: {
    gap: Spacing.three,
  },
  trackList: {
    overflow: 'hidden',
    borderRadius: Spacing.four,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  trackInfo: {
    flex: 1,
    gap: Spacing.one,
  },
  nowPlaying: {
    fontSize: 12,
  },
  pressed: {
    opacity: 0.7,
  },
});
