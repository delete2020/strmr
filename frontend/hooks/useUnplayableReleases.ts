/**
 * Hook for managing unplayable releases
 *
 * When a stream fails with persistent bitstream errors, users can mark releases
 * as unplayable. These releases are then filtered from manual selection and
 * search results to prevent repeated failed playback attempts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'novastream_unplayable_releases';

export interface UnplayableRelease {
  sourcePath: string; // WebDAV path that identifies the release
  title?: string; // Release title for display
  markedAt: number; // Unix timestamp when marked as unplayable
  reason?: string; // Optional reason (e.g., "bitstream error")
}

/**
 * Get all unplayable releases from storage
 */
export const getUnplayableReleases = async (): Promise<UnplayableRelease[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) {
      return [];
    }
    return JSON.parse(data) as UnplayableRelease[];
  } catch (error) {
    console.warn('[unplayable] failed to load unplayable releases:', error);
    return [];
  }
};

/**
 * Add a release to the unplayable list
 */
export const markReleaseAsUnplayable = async (sourcePath: string, title?: string, reason?: string): Promise<void> => {
  try {
    const releases = await getUnplayableReleases();

    // Check if already marked
    if (releases.some((r) => r.sourcePath === sourcePath)) {
      return;
    }

    const newRelease: UnplayableRelease = {
      sourcePath,
      title,
      markedAt: Date.now(),
      reason,
    };

    releases.push(newRelease);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(releases));

    console.log('[unplayable] marked release as unplayable:', sourcePath);
  } catch (error) {
    console.error('[unplayable] failed to mark release as unplayable:', error);
  }
};

/**
 * Remove a release from the unplayable list
 */
export const unmarkReleaseAsUnplayable = async (sourcePath: string): Promise<void> => {
  try {
    const releases = await getUnplayableReleases();
    const filtered = releases.filter((r) => r.sourcePath !== sourcePath);

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

    console.log('[unplayable] unmarked release:', sourcePath);
  } catch (error) {
    console.error('[unplayable] failed to unmark release:', error);
  }
};

/**
 * Check if a source path is marked as unplayable
 */
export const isReleaseUnplayable = async (sourcePath: string): Promise<boolean> => {
  const releases = await getUnplayableReleases();
  return releases.some((r) => r.sourcePath === sourcePath);
};

/**
 * Clear all unplayable releases
 */
export const clearUnplayableReleases = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    console.log('[unplayable] cleared all unplayable releases');
  } catch (error) {
    console.error('[unplayable] failed to clear unplayable releases:', error);
  }
};

/**
 * Check if a release title matches any unplayable release
 * Uses exact matching on the release filename (without extension)
 */
export const isReleaseTitleUnplayable = async (releaseTitle: string): Promise<boolean> => {
  if (!releaseTitle) {
    return false;
  }
  const releases = await getUnplayableReleases();
  // Normalize: lowercase, trim, remove file extension
  const normalizedTitle = releaseTitle
    .toLowerCase()
    .trim()
    .replace(/\.(mkv|mp4|avi|m4v|webm|ts)$/i, '');

  return releases.some((r) => {
    if (!r.title) {
      return false;
    }
    // Normalize stored title the same way
    const storedTitle = r.title
      .toLowerCase()
      .trim()
      .replace(/\.(mkv|mp4|avi|m4v|webm|ts)$/i, '');
    // Exact match only - release filenames are specific enough
    return normalizedTitle === storedTitle;
  });
};

/**
 * Hook to access and manage unplayable releases
 */
export const useUnplayableReleases = () => {
  const [releases, setReleases] = useState<UnplayableRelease[]>([]);
  const [loading, setLoading] = useState(true);

  // Load releases on mount
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const data = await getUnplayableReleases();
      if (mounted) {
        setReleases(data);
        setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const markUnplayable = useCallback(async (sourcePath: string, title?: string, reason?: string) => {
    await markReleaseAsUnplayable(sourcePath, title, reason);
    setReleases(await getUnplayableReleases());
  }, []);

  const unmarkUnplayable = useCallback(async (sourcePath: string) => {
    await unmarkReleaseAsUnplayable(sourcePath);
    setReleases(await getUnplayableReleases());
  }, []);

  const isUnplayable = useCallback(
    (sourcePath: string): boolean => {
      return releases.some((r) => r.sourcePath === sourcePath);
    },
    [releases],
  );

  const isUnplayableByTitle = useCallback(
    (title: string): boolean => {
      if (!title) {
        return false;
      }
      // Normalize: lowercase, trim, remove file extension
      const normalizedTitle = title
        .toLowerCase()
        .trim()
        .replace(/\.(mkv|mp4|avi|m4v|webm|ts)$/i, '');
      return releases.some((r) => {
        if (!r.title) {
          return false;
        }
        // Normalize stored title the same way
        const storedTitle = r.title
          .toLowerCase()
          .trim()
          .replace(/\.(mkv|mp4|avi|m4v|webm|ts)$/i, '');
        // Exact match only - release filenames are specific enough
        return normalizedTitle === storedTitle;
      });
    },
    [releases],
  );

  const clearAll = useCallback(async () => {
    await clearUnplayableReleases();
    setReleases([]);
  }, []);

  return {
    releases,
    loading,
    markUnplayable,
    unmarkUnplayable,
    isUnplayable,
    isUnplayableByTitle,
    clearAll,
  };
};

export default useUnplayableReleases;
