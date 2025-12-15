import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const SELECTED_CATEGORIES_STORAGE_KEY = 'novastream.live.selectedCategories';

interface LiveCategoriesContextValue {
  selectedCategories: string[];
  isReady: boolean;
  setSelectedCategories: (categories: string[]) => Promise<void>;
  toggleCategory: (category: string) => Promise<void>;
}

const LiveCategoriesContext = createContext<LiveCategoriesContextValue | undefined>(undefined);

export const LiveCategoriesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mountedRef = useRef(true);
  const [selectedCategories, setSelectedCategoriesState] = useState<string[]>([]);
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
        const stored = await AsyncStorage.getItem(SELECTED_CATEGORIES_STORAGE_KEY);
        if (cancelled || !mountedRef.current) {
          return;
        }
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setSelectedCategoriesState(parsed);
          }
        }
      } catch (err) {
        console.warn('Failed to read stored Live TV categories.', err);
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

  const setSelectedCategories = useCallback(async (categories: string[]) => {
    await AsyncStorage.setItem(SELECTED_CATEGORIES_STORAGE_KEY, JSON.stringify(categories));

    if (mountedRef.current) {
      setSelectedCategoriesState(categories);
    }
  }, []);

  const toggleCategory = useCallback(
    async (category: string) => {
      const newCategories = selectedCategories.includes(category)
        ? selectedCategories.filter((c) => c !== category)
        : [...selectedCategories, category];

      await setSelectedCategories(newCategories);
    },
    [selectedCategories, setSelectedCategories],
  );

  const value = useMemo<LiveCategoriesContextValue>(
    () => ({
      selectedCategories,
      isReady,
      setSelectedCategories,
      toggleCategory,
    }),
    [isReady, selectedCategories, setSelectedCategories, toggleCategory],
  );

  return <LiveCategoriesContext.Provider value={value}>{children}</LiveCategoriesContext.Provider>;
};

export const useLiveCategories = () => {
  const context = useContext(LiveCategoriesContext);
  if (!context) {
    throw new Error('useLiveCategories must be used within a LiveCategoriesProvider');
  }
  return context;
};
