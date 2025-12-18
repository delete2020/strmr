/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { Platform } from 'react-native';

// Define the shape we expect from the module (either real library or fallback)
// Use permissive types to allow all props from the real library
type SpatialNavigationModule = {
  Directions: Record<string, string>;
  SpatialNavigation: { configureRemoteControl: (options: unknown) => void };
  SpatialNavigationRoot: React.FC<Record<string, unknown>>;
  SpatialNavigationNode: React.FC<Record<string, unknown>>;
  SpatialNavigationView: React.FC<Record<string, unknown>>;
  SpatialNavigationFocusableView: React.FC<Record<string, unknown>>;
  SpatialNavigationScrollView: React.ForwardRefExoticComponent<Record<string, unknown>>;
  SpatialNavigationVirtualizedList: React.ForwardRefExoticComponent<Record<string, unknown>>;
  SpatialNavigationVirtualizedGrid: React.FC<Record<string, unknown>>;
  SpatialNavigationDeviceTypeProvider: React.FC<{ children: React.ReactNode }>;
  DefaultFocus: React.FC<Record<string, unknown>>;
  SpatialNavigationEvents?: Record<string, string>;
  useSpatialNavigator?: () => { grabFocus: (id: string) => void };
  useLockSpatialNavigation?: () => { lock: () => void; unlock: () => void };
};

const ensureReactInternals = () => {
  const reactWithInternals = React as typeof React & {
    __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?: {
      ReactCurrentOwner?: { current: unknown };
    };
  };

  const internals = reactWithInternals.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;

  if (internals?.ReactCurrentOwner) {
    return;
  }

  reactWithInternals.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
    ...internals,
    ReactCurrentOwner: { current: null },
  };
};

type PlatformConstants = {
  uiMode?: string;
  interfaceIdiom?: string;
};

const hasExplicitTvMode = (): boolean => {
  const constants = (Platform.constants as PlatformConstants | undefined) ?? {};
  if (Platform.OS === 'android' && constants.uiMode === 'tv') {
    return true;
  }
  if (Platform.OS === 'ios' && constants.interfaceIdiom === 'tv') {
    return true;
  }
  return false;
};

const isExpoTvBuild = (): boolean => {
  const envFlag = (() => {
    if (typeof globalThis === 'undefined') {
      return null;
    }
    const { process } = globalThis as { process?: { env?: Record<string, unknown> } };
    const envValue = process?.env?.EXPO_TV;
    return typeof envValue === 'string' ? envValue.toLowerCase() : null;
  })();

  if (envFlag === '1' || envFlag === 'true') {
    return true;
  }

  const globalFlag = typeof globalThis !== 'undefined' ? (globalThis as { EXPO_TV?: unknown }).EXPO_TV : undefined;
  return globalFlag === true || globalFlag === '1' || globalFlag === 'true';
};

const shouldEnableTvSpatialNavigation = (): boolean => {
  if (Platform.isTV) {
    return true;
  }

  if (hasExplicitTvMode()) {
    return true;
  }

  if (isExpoTvBuild()) {
    return true;
  }

  return false;
};

const loadModule = (): SpatialNavigationModule => {
  if (shouldEnableTvSpatialNavigation() || Platform.OS === 'web') {
    try {
      ensureReactInternals();
      console.log('[tv-navigation] Using real library (Platform.isTV:', Platform.isTV, 'OS:', Platform.OS, ')');
      return require('react-tv-space-navigation');
    } catch (error) {
      console.warn('Falling back to basic spatial navigation implementation:', error);
    }
  }

  console.log('[tv-navigation] Using fallback (Platform.isTV:', Platform.isTV, 'OS:', Platform.OS, ')');
  return require('./fallback');
};

const spatialNavigation = loadModule();

type SpatialNavigatorLike = {
  grabFocus: (id: string) => void;
};

type UseSpatialNavigatorHook = () => SpatialNavigatorLike;

type LockSpatialNavigationLike = {
  lock: () => void;
  unlock: () => void;
};

type UseLockSpatialNavigationHook = () => LockSpatialNavigationLike;

const fallbackUseSpatialNavigator: UseSpatialNavigatorHook = () => ({
  grabFocus: () => {},
});

const fallbackUseLockSpatialNavigation: UseLockSpatialNavigationHook = () => ({
  lock: () => {},
  unlock: () => {},
});

const useSpatialNavigatorImpl: UseSpatialNavigatorHook =
  typeof (spatialNavigation as any).useSpatialNavigator === 'function'
    ? (spatialNavigation as { useSpatialNavigator: UseSpatialNavigatorHook }).useSpatialNavigator
    : fallbackUseSpatialNavigator;

const useLockSpatialNavigationImpl: UseLockSpatialNavigationHook =
  typeof (spatialNavigation as any).useLockSpatialNavigation === 'function'
    ? (spatialNavigation as { useLockSpatialNavigation: UseLockSpatialNavigationHook }).useLockSpatialNavigation
    : fallbackUseLockSpatialNavigation;

export const Directions = spatialNavigation.Directions;
export const SpatialNavigation = spatialNavigation.SpatialNavigation;
export const SpatialNavigationRoot = spatialNavigation.SpatialNavigationRoot;
export const SpatialNavigationNode = spatialNavigation.SpatialNavigationNode;
export const SpatialNavigationView = spatialNavigation.SpatialNavigationView;
export const SpatialNavigationFocusableView = spatialNavigation.SpatialNavigationFocusableView;
export const SpatialNavigationScrollView = spatialNavigation.SpatialNavigationScrollView;
export const SpatialNavigationVirtualizedList = spatialNavigation.SpatialNavigationVirtualizedList;
export const SpatialNavigationVirtualizedGrid = spatialNavigation.SpatialNavigationVirtualizedGrid;
export const SpatialNavigationDeviceTypeProvider = spatialNavigation.SpatialNavigationDeviceTypeProvider;
export const DefaultFocus = spatialNavigation.DefaultFocus;
export const SpatialNavigationEvents =
  spatialNavigation.SpatialNavigationEvents ??
  ({
    FOCUSED: 'FOCUSED',
    BLURRED: 'BLURRED',
  } as const);
export const useSpatialNavigator = useSpatialNavigatorImpl;
export const useLockSpatialNavigation = useLockSpatialNavigationImpl;

// Re-export types - define locally to avoid import issues on non-TV builds
export type SpatialNavigationNodeRef = {
  focus: () => void;
};

export type SpatialNavigationVirtualizedListRef = {
  focus: (index: number) => void;
};
