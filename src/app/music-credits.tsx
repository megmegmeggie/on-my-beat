import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandColors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getSongs } from '@/services/music/musicService';

const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/';

/**
 * Credits for the bundled music, linked from the bottom of the Music tab. The
 * songs are licensed under CC BY 4.0, which requires a findable credit for each
 * track: "Title" Kevin MacLeod (incompetech.com), Licensed under Creative
 * Commons: By Attribution 4.0.
 */
export default function MusicCreditsScreen() {
  const colors = BrandColors[useColorScheme() === 'dark' ? 'dark' : 'light'];

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/explore');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable onPress={goBack} accessibilityRole="button" style={({ pressed }) => pressed && styles.pressed}>
            <ThemedText type="smallBold" style={{ color: colors.goldText }}>
              ‹ Back
            </ThemedText>
          </Pressable>
          <ThemedText type="title" style={[styles.title, { color: colors.heading }]}>
            Music credits
          </ThemedText>

          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <ThemedText type="smallBold" style={[styles.sectionLabel, { color: colors.goldText }]}>
              License
            </ThemedText>
            <ThemedText type="small" style={{ color: colors.cardSubtext }}>
              All songs are by Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 4.0.
            </ThemedText>
            <ExternalLink href={LICENSE_URL}>
              <ThemedText type="smallBold" style={{ color: colors.heading }}>
                {LICENSE_URL}
              </ThemedText>
            </ExternalLink>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card }]} accessibilityLabel="Song credits">
            <ThemedText type="smallBold" style={[styles.sectionLabel, { color: colors.goldText }]}>
              Songs
            </ThemedText>
            {getSongs().map((song) => (
              <ThemedText key={song.id} type="small" style={{ color: colors.cardSubtext }}>
                “{song.title}” {song.artist} (incompetech.com)
              </ThemedText>
            ))}
          </View>
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
    padding: Spacing.four,
    gap: Spacing.four,
  },
  title: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: 700,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.one,
  },
  card: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
