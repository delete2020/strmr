import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useBackendSettings } from '@/components/BackendSettingsContext';
import { apiService, type ApiError, type UserProfile } from '@/services/api';

const USER_SETTINGS_LOAD_DEBOUNCE_MS = 100;

const ACTIVE_USER_STORAGE_KEY = 'strmr.activeUserId';

type Nullable<T> = T | null;

interface UserProfilesContextValue {
  users: UserProfile[];
  loading: boolean;
  error: string | null;
  activeUserId: Nullable<string>;
  activeUser: Nullable<UserProfile>;
  selectUser: (id: string) => Promise<void>;
  refresh: (preferredUserId?: string | null) => Promise<void>;
  createUser: (name: string) => Promise<UserProfile>;
  renameUser: (id: string, name: string) => Promise<UserProfile>;
  updateColor: (id: string, color: string) => Promise<UserProfile>;
  deleteUser: (id: string) => Promise<void>;
}

const UserProfilesContext = createContext<UserProfilesContextValue | undefined>(undefined);

const formatErrorMessage = (err: unknown) => {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'string') {
    return err;
  }
  return 'Unknown user profile error';
};

const isAuthError = (err: unknown) => {
  if (!err || typeof err !== 'object') {
    return false;
  }
  const candidate = err as ApiError;
  return candidate.code === 'AUTH_INVALID_PIN' || candidate.status === 401;
};

const isNetworkError = (err: unknown) => {
  return err instanceof TypeError && err.message === 'Network request failed';
};

const persistActiveUserId = async (id: Nullable<string>) => {
  try {
    if (id) {
      await AsyncStorage.setItem(ACTIVE_USER_STORAGE_KEY, id);
    } else {
      await AsyncStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
    }
  } catch (err) {
    console.warn('Failed to persist active user ID', err);
  }
};

export const UserProfilesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeUserId, setActiveUserId] = useState<Nullable<string>>(null);
  const activeUserIdRef = useRef<Nullable<string>>(null);
  const { backendUrl, isReady, loadUserSettings, isBackendReachable } = useBackendSettings();

  const findUser = useCallback(
    (id: string | null | undefined, list: UserProfile[] = users) => {
      if (!id) {
        return undefined;
      }
      return list.find((user) => user.id === id);
    },
    [users],
  );

  const resolveActiveUserId = useCallback((candidate: Nullable<string>, list: UserProfile[]): Nullable<string> => {
    if (candidate && list.some((user) => user.id === candidate)) {
      return candidate;
    }
    return list.length > 0 ? list[0].id : null;
  }, []);

  const refresh = useCallback(
    async (preferredUserId?: string | null) => {
      setLoading(true);
      try {
        const [list, storedId] = await Promise.all([
          apiService.getUsers(),
          AsyncStorage.getItem(ACTIVE_USER_STORAGE_KEY),
        ]);

        setUsers(list);
        setError(null);

        const nextId = resolveActiveUserId(preferredUserId ?? activeUserIdRef.current ?? storedId, list);

        setActiveUserId(nextId);
        activeUserIdRef.current = nextId;
        await persistActiveUserId(nextId);
      } catch (err) {
        const message = formatErrorMessage(err);
        const log = isAuthError(err) || isNetworkError(err) ? console.warn : console.error;
        log('Failed to load users:', err);
        setUsers([]);
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [resolveActiveUserId],
  );

  useEffect(() => {
    if (!isReady) {
      return;
    }
    void refresh();
  }, [isReady, backendUrl, refresh]);

  // Load user settings when activeUserId changes
  useEffect(() => {
    if (!activeUserId || !isBackendReachable) {
      return;
    }

    // Debounce to avoid rapid reloads during initialization
    const timeoutId = setTimeout(() => {
      console.log('[UserProfiles] Loading user settings for user:', activeUserId);
      loadUserSettings(activeUserId).catch((err) => {
        console.warn('[UserProfiles] Failed to load user settings:', err);
      });
    }, USER_SETTINGS_LOAD_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [activeUserId, isBackendReachable, loadUserSettings]);

  const selectUser = useCallback(
    async (id: string) => {
      const trimmed = id?.trim();
      if (!trimmed) {
        throw new Error('User ID is required');
      }
      if (!findUser(trimmed)) {
        throw new Error('User not found');
      }
      setActiveUserId(trimmed);
      activeUserIdRef.current = trimmed;
      await persistActiveUserId(trimmed);
    },
    [findUser],
  );

  const createUser = useCallback(
    async (name: string) => {
      const user = await apiService.createUser(name);
      await refresh(user.id);
      return user;
    },
    [refresh],
  );

  const renameUser = useCallback(async (id: string, name: string) => {
    const updated = await apiService.renameUser(id, name);
    setUsers((current) => current.map((user) => (user.id === updated.id ? updated : user)));
    if (activeUserIdRef.current === updated.id) {
      setActiveUserId(updated.id);
    }
    return updated;
  }, []);

  const updateColor = useCallback(async (id: string, color: string) => {
    const updated = await apiService.updateUserColor(id, color);
    setUsers((current) => current.map((user) => (user.id === updated.id ? updated : user)));
    return updated;
  }, []);

  const deleteUser = useCallback(
    async (id: string) => {
      await apiService.deleteUser(id);
      const nextId = activeUserIdRef.current === id ? null : activeUserIdRef.current;
      await refresh(nextId);
    },
    [refresh],
  );

  const value = useMemo<UserProfilesContextValue>(() => {
    const activeUser = findUser(activeUserId ?? undefined);
    return {
      users,
      loading,
      error,
      activeUserId,
      activeUser: activeUser ?? null,
      selectUser,
      refresh,
      createUser,
      renameUser,
      updateColor,
      deleteUser,
    };
  }, [users, loading, error, activeUserId, selectUser, refresh, createUser, renameUser, updateColor, deleteUser, findUser]);

  return <UserProfilesContext.Provider value={value}>{children}</UserProfilesContext.Provider>;
};

export const useUserProfiles = (): UserProfilesContextValue => {
  const context = useContext(UserProfilesContext);
  if (context === undefined) {
    throw new Error('useUserProfiles must be used within a UserProfilesProvider');
  }
  return context;
};
