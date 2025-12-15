import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const HIDDEN_CHANNELS_STORAGE_KEY = 'novastream.live.hiddenChannels';

interface LiveHiddenChannelsContextValue {
  hiddenChannels: Set<string>;
  isReady: boolean;
  hideChannel: (channelId: string) => Promise<void>;
  unhideChannel: (channelId: string) => Promise<void>;
  isHidden: (channelId: string) => boolean;
}

const LiveHiddenChannelsContext = createContext<LiveHiddenChannelsContextValue | undefined>(undefined);

export const LiveHiddenChannelsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mountedRef = useRef(true);
  const [hiddenChannels, setHiddenChannels] = useState<Set<string>>(new Set());
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
        const stored = await AsyncStorage.getItem(HIDDEN_CHANNELS_STORAGE_KEY);
        if (cancelled || !mountedRef.current) {
          return;
        }
        if (stored) {
          const hiddenIds = JSON.parse(stored) as string[];
          setHiddenChannels(new Set(hiddenIds));
        }
      } catch (err) {
        console.warn('Failed to read stored hidden Live TV channels.', err);
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

  const hideChannel = useCallback(async (channelId: string) => {
    setHiddenChannels((prevHidden) => {
      const newHidden = new Set(prevHidden);
      newHidden.add(channelId);

      // Persist to AsyncStorage
      const hiddenArray = Array.from(newHidden);
      AsyncStorage.setItem(HIDDEN_CHANNELS_STORAGE_KEY, JSON.stringify(hiddenArray)).catch((err) => {
        console.warn('Failed to save hidden Live TV channels.', err);
      });

      return newHidden;
    });
  }, []);

  const unhideChannel = useCallback(async (channelId: string) => {
    setHiddenChannels((prevHidden) => {
      const newHidden = new Set(prevHidden);
      newHidden.delete(channelId);

      // Persist to AsyncStorage
      const hiddenArray = Array.from(newHidden);
      AsyncStorage.setItem(HIDDEN_CHANNELS_STORAGE_KEY, JSON.stringify(hiddenArray)).catch((err) => {
        console.warn('Failed to save hidden Live TV channels.', err);
      });

      return newHidden;
    });
  }, []);

  const isHidden = useCallback(
    (channelId: string) => {
      return hiddenChannels.has(channelId);
    },
    [hiddenChannels],
  );

  const value = useMemo<LiveHiddenChannelsContextValue>(
    () => ({
      hiddenChannels,
      isReady,
      hideChannel,
      unhideChannel,
      isHidden,
    }),
    [hiddenChannels, isReady, hideChannel, unhideChannel, isHidden],
  );

  return <LiveHiddenChannelsContext.Provider value={value}>{children}</LiveHiddenChannelsContext.Provider>;
};

export const useLiveHiddenChannels = () => {
  const context = useContext(LiveHiddenChannelsContext);
  if (!context) {
    throw new Error('useLiveHiddenChannels must be used within a LiveHiddenChannelsProvider');
  }
  return context;
};
