import { StyleSheet, View } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { getSongs } from '@/services/music/musicService';

const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/';

/**
 * Credits for the bundled music. The songs are licensed under CC BY 4.0, which
 * requires a findable credit for each track: "Title" Kevin MacLeod
 * (incompetech.com), Licensed under Creative Commons: By Attribution 4.0.
 */
export function MusicCredits() {
  return (
    <View style={styles.container} accessibilityLabel="Music credits">
      <ThemedText type="smallBold" themeColor="textSecondary">
        Music credits
      </ThemedText>
      {getSongs().map((song) => (
        <ThemedText key={song.id} type="small" themeColor="textSecondary">
          “{song.title}” {song.artist} (incompetech.com)
        </ThemedText>
      ))}
      <ThemedText type="small" themeColor="textSecondary">
        Licensed under Creative Commons: By Attribution 4.0
      </ThemedText>
      <ExternalLink href={LICENSE_URL}>
        <ThemedText type="linkPrimary">{LICENSE_URL}</ThemedText>
      </ExternalLink>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
});
