import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'strmr.discoveryPreferences.v1';

export type QualityPreference = 'auto' | '1080p' | '2160p';
export type YearRangePreference = 'all' | 'recent' | 'classic';

export type DiscoveryPreferences = {
  quality: QualityPreference;
  yearRange: YearRangePreference;
  autoplay: boolean;
};

const DEFAULT_PREFERENCES: DiscoveryPreferences = {
  quality: 'auto',
  yearRange: 'all',
  autoplay: true,
};

export const QUALITY_OPTIONS: Array<{ label: string; value: QualityPreference }> = [
  { label: 'Auto', value: 'auto' },
  { label: '1080p', value: '1080p' },
  { label: '4K', value: '2160p' },
];

export const YEAR_RANGE_OPTIONS: Array<{ label: string; value: YearRangePreference }> = [
  { label: 'All', value: 'all' },
  { label: 'Recent', value: 'recent' },
  { label: 'Classics', value: 'classic' },
];

export function matchesYearRange(year: number | undefined, preference: YearRangePreference) {
  if (!year) {
    return true;
  }

  switch (preference) {
    case 'recent':
      return year >= 2015;
    case 'classic':
      return year <= 2005;
    default:
      return true;
  }
}

export function useDiscoveryPreferences() {
  const [preferences, setPreferences] = useState<DiscoveryPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!stored) {
          return;
        }

        const parsed = JSON.parse(stored) as Partial<DiscoveryPreferences> | null;
        if (parsed && isMounted) {
          setPreferences((prev) => ({ ...prev, ...parsed }));
        }
      } catch (err) {
        console.warn('Failed to load discovery preferences', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)).catch((err) => {
        console.warn('Failed to persist discovery preferences', err);
      });
    }
  }, [loading, preferences]);

  const updatePreferences = useCallback((partial: Partial<DiscoveryPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    AsyncStorage.removeItem(STORAGE_KEY).catch((err) => {
      console.warn('Failed to reset discovery preferences', err);
    });
  }, []);

  const qualityLabel = useMemo(() => {
    return QUALITY_OPTIONS.find((option) => option.value === preferences.quality)?.label ?? 'Auto';
  }, [preferences.quality]);

  return {
    preferences,
    loading,
    updatePreferences,
    resetPreferences,
    qualityLabel,
  };
}
