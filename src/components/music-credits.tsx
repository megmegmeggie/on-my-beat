import { StyleSheet, View } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { BrandColors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getSongs } from '@/services/music/musicService';

const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/';

/**
 * Credits for the bundled music. The songs are licensed under CC BY 4.0, which
 * requires a findable credit for each track: "Title" Kevin MacLeod
 * (incompetech.com), Licensed under Creative Commons: By Attribution 4.0.
 */
export function MusicCredits() {
  const colors = BrandColors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  return (
    <View style={[styles.container, { backgroundColor: colors.card }]} accessibilityLabel="Music credits">
      <ThemedText type="smallBold" style={[styles.label, { color: colors.goldText }]}>
        Music credits
      </ThemedText>
      {getSongs().map((song) => (
        <ThemedText key={song.id} type="small" style={{ color: colors.cardSubtext }}>
          “{song.title}” {song.artist} (incompetech.com)
        </ThemedText>
      ))}
      <ThemedText type="small" style={{ color: colors.cardSubtext }}>
        Licensed under Creative Commons: By Attribution 4.0
      </ThemedText>
      <ExternalLink href={LICENSE_URL}>
        <ThemedText type="smallBold" style={{ color: colors.heading }}>
          {LICENSE_URL}
        </ThemedText>
      </ExternalLink>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.one,
  },
});
