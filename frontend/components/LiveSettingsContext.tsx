import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const PLAYLIST_URL_STORAGE_KEY = 'novastream.live.playlistUrl';

interface LiveSettingsContextValue {
  playlistUrl: string;
  isReady: boolean;
  setPlaylistUrl: (url: string) => Promise<void>;
}

const LiveSettingsContext = createContext<LiveSettingsContextValue | undefined>(undefined);

export const LiveSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mountedRef = useRef(true);
  const [playlistUrl, setPlaylistUrlState] = useState('');
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
        const stored = await AsyncStorage.getItem(PLAYLIST_URL_STORAGE_KEY);
        if (cancelled || !mountedRef.current) {
          return;
        }
        if (stored) {
          setPlaylistUrlState(stored);
        }
      } catch (err) {
        console.warn('Failed to read stored Live TV playlist URL.', err);
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

  const setPlaylistUrl = useCallback(async (candidate: string) => {
    const trimmed = candidate.trim();
    if (!trimmed) {
      await AsyncStorage.removeItem(PLAYLIST_URL_STORAGE_KEY);
    } else {
      await AsyncStorage.setItem(PLAYLIST_URL_STORAGE_KEY, trimmed);
    }

    if (mountedRef.current) {
      setPlaylistUrlState(trimmed);
    }
  }, []);

  const value = useMemo<LiveSettingsContextValue>(
    () => ({
      playlistUrl,
      isReady,
      setPlaylistUrl,
    }),
    [isReady, playlistUrl, setPlaylistUrl],
  );

  return <LiveSettingsContext.Provider value={value}>{children}</LiveSettingsContext.Provider>;
};

export const useLiveSettings = () => {
  const context = useContext(LiveSettingsContext);
  if (!context) {
    throw new Error('useLiveSettings must be used within a LiveSettingsProvider');
  }
  return context;
};
