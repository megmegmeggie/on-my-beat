import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { toggleFavoriteSong, useFavoriteSongs } from '@/lib/favorites';

/** A heart that favourites `songId`: outlined in `color`, filled in `activeColor` once favourited. */
export function FavoriteButton({
  songId,
  title,
  color,
  activeColor,
}: {
  songId: string;
  title: string;
  color: string;
  activeColor: string;
}) {
  const isFavorite = useFavoriteSongs().has(songId);

  return (
    <Pressable
      onPress={() => toggleFavoriteSong(songId)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={isFavorite ? `Remove ${title} from favourites` : `Add ${title} to favourites`}
      accessibilityState={{ selected: isFavorite }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <SymbolView
        name={{ ios: isFavorite ? 'heart.fill' : 'heart', android: 'favorite', web: 'favorite' }}
        tintColor={isFavorite ? activeColor : color}
        size={22}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 4,
  },
  pressed: {
    opacity: 0.6,
  },
});
