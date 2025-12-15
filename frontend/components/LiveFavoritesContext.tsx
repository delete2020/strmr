import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const FAVORITES_STORAGE_KEY = 'novastream.live.favorites';

interface LiveFavoritesContextValue {
  favorites: Set<string>;
  isReady: boolean;
  toggleFavorite: (channelId: string) => Promise<void>;
  isFavorite: (channelId: string) => boolean;
}

const LiveFavoritesContext = createContext<LiveFavoritesContextValue | undefined>(undefined);

export const LiveFavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mountedRef = useRef(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const stored = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
        if (cancelled || !mountedRef.current) {
          return;
        }
        if (stored) {
          const favoriteIds = JSON.parse(stored) as string[];
          setFavorites(new Set(favoriteIds));
        }
      } catch (err) {
        console.warn('Failed to read stored Live TV favorites.', err);
      } finally {
        if (!cancelled && mountedRef.current) {
          setIsReady(true);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const toggleFavorite = useCallback(async (channelId: string) => {
    setFavorites((prevFavorites) => {
      const newFavorites = new Set(prevFavorites);
      if (newFavorites.has(channelId)) {
        newFavorites.delete(channelId);
      } else {
        newFavorites.add(channelId);
      }

      // Persist to AsyncStorage
      const favoritesArray = Array.from(newFavorites);
      AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoritesArray)).catch((err) => {
        console.warn('Failed to save Live TV favorites.', err);
      });

      return newFavorites;
    });
  }, []);

  const isFavorite = useCallback(
    (channelId: string) => {
      return favorites.has(channelId);
    },
    [favorites],
  );

  const value = useMemo<LiveFavoritesContextValue>(
    () => ({
      favorites,
      isReady,
      toggleFavorite,
      isFavorite,
    }),
    [favorites, isReady, isFavorite, toggleFavorite],
  );

  return <LiveFavoritesContext.Provider value={value}>{children}</LiveFavoritesContext.Provider>;
};

export const useLiveFavorites = () => {
  const context = useContext(LiveFavoritesContext);
  if (!context) {
    throw new Error('useLiveFavorites must be used within a LiveFavoritesProvider');
  }
  return context;
};
