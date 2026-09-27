import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AudioPlayer } from '@/components/audio-player';
import { FavoriteButton } from '@/components/favorite-button';
import { MusicCredits } from '@/components/music-credits';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WebBadge } from '@/components/web-badge';
import { BottomTabInset, BrandColors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getSongs } from '@/services/music/musicService';

export default function MusicScreen() {
  const colors = BrandColors[useColorScheme() === 'dark' ? 'dark' : 'light'];
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

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <ThemedText type="title" style={[styles.title, { color: colors.heading }]}>
              Music
            </ThemedText>
            <ThemedText style={{ color: colors.cardSubtext }}>
              During a run, songs are picked to match your target cadence. Your favourites play first.
            </ThemedText>
          </View>

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

          <View style={styles.libraryHeader}>
            <ThemedText type="smallBold" style={[styles.sectionLabel, { color: colors.goldText }]}>
              Song library
            </ThemedText>
            <ThemedText type="small" style={{ color: colors.cardSubtext }}>
              {tracks.length} songs
            </ThemedText>
          </View>

          <View style={styles.list}>
            {tracks.map((song) => {
              const isSelected = song.id === selectedSong?.id;

              return (
                <Pressable
                  key={song.id}
                  onPress={() => setSelection({ id: song.id, autoPlay: true })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={`${song.title} by ${song.artist}, ${song.bpm} BPM`}
                  style={({ pressed }) => [
                    styles.card,
                    {
                      backgroundColor: isSelected ? colors.cardSelected : colors.card,
                      borderColor: isSelected ? colors.gold : 'transparent',
                    },
                    pressed && styles.pressed,
                  ]}>
                  <View style={styles.trackInfo}>
                    <ThemedText type="smallBold" numberOfLines={1} style={{ color: colors.cardText }}>
                      {song.title}
                    </ThemedText>
                    <ThemedText type="small" numberOfLines={1} style={{ color: colors.cardSubtext }}>
                      {isSelected ? 'Selected · ' : ''}
                      {song.genre ?? song.artist}
                    </ThemedText>
                  </View>

                  <View style={styles.bpm}>
                    <ThemedText type="smallBold" style={[styles.bpmValue, { color: colors.cardText }]}>
                      {song.bpm}
                    </ThemedText>
                    <ThemedText type="small" style={[styles.bpmUnit, { color: colors.goldText }]}>
                      BPM
                    </ThemedText>
                  </View>

                  <FavoriteButton songId={song.id} title={song.title} color={colors.radio} activeColor={colors.gold} />
                </Pressable>
              );
            })}
          </View>

          <MusicCredits />

          {Platform.OS === 'web' && <WebBadge />}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.two,
  },
  title: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: 700,
  },
  libraryHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  list: {
    gap: Spacing.two,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 2,
  },
  trackInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  bpm: {
    alignItems: 'center',
  },
  bpmValue: {
    fontSize: 18,
    lineHeight: 22,
    fontVariant: ['tabular-nums'],
  },
  bpmUnit: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
