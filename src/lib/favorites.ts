import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'favoriteSongs';

/**
 * The ids of the songs the user has favourited. Kept in memory and shared, so
 * a heart tapped on the Music tab or the run screen shows everywhere at once;
 * saved to storage on every change.
 */
let favorites: ReadonlySet<string> = new Set();
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function load() {
  loading ??= AsyncStorage.getItem(STORAGE_KEY)
    .then((stored) => {
      const ids: unknown = stored ? JSON.parse(stored) : [];
      favorites = new Set(Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : []);
      emit();
    })
    .catch((error) => console.warn('Failed to load favourite songs', error));
  return loading;
}

/** The current favourites, for code outside React (e.g. picking run music). Empty until loaded. */
export function getFavoriteSongIds() {
  void load();
  return favorites;
}

export function toggleFavoriteSong(id: string) {
  // Wait for the saved list first, so an early tap can't be overwritten when it arrives.
  void load().then(() => {
    const next = new Set(favorites);
    if (!next.delete(id)) {
      next.add(id);
    }
    favorites = next;
    emit();
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...next])).catch((error) =>
      console.warn('Failed to save favourite songs', error)
    );
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The favourite song ids, kept up to date as they change. */
export function useFavoriteSongs() {
  useEffect(() => {
    void load();
  }, []);
  return useSyncExternalStore(subscribe, () => favorites);
}
