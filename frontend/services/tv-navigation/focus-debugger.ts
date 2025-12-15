import { SupportedKeys } from '@/services/remote-control/SupportedKeys';

type FocusDebugEvent = {
  key?: string;
  label?: string;
  action?: string;
  timestamp: number;
};

type FocusDebugListener = (event: FocusDebugEvent) => void;

let lastEvent: FocusDebugEvent | null = null;
const listeners = new Set<FocusDebugListener>();
type RemoteKeyPhase = 'received' | 'emitted' | 'dedup-blocked' | 'intercepted' | 'suppressed';

type RemoteKeyEvent = {
  key: SupportedKeys;
  phase: RemoteKeyPhase;
  source?: string;
  timestamp: number;
};

type RemoteKeyListener = (event: RemoteKeyEvent) => void;

let lastRemoteEvent: RemoteKeyEvent | null = null;
const remoteListeners = new Set<RemoteKeyListener>();

const notifyListeners = (event: FocusDebugEvent) => {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.warn('[focus-debugger] Listener threw an error:', error);
    }
  });
};

export const reportFocusDebugEvent = (event: { key?: string; label?: string; action?: string }) => {
  const payload: FocusDebugEvent = {
    key: event.key,
    label: event.label,
    action: event.action,
    timestamp: Date.now(),
  };
  lastEvent = payload;
  notifyListeners(payload);
};

export const subscribeToFocusDebugEvents = (listener: FocusDebugListener) => {
  listeners.add(listener);
  if (lastEvent) {
    listener(lastEvent);
  }
  return () => {
    listeners.delete(listener);
  };
};

export const getLastFocusDebugEvent = () => lastEvent;

const notifyRemoteListeners = (event: RemoteKeyEvent) => {
  remoteListeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.warn('[focus-debugger] Remote listener threw an error:', error);
    }
  });
};

export const reportRemoteKeyEvent = (event: { key: SupportedKeys; phase: RemoteKeyPhase; source?: string }) => {
  const payload: RemoteKeyEvent = {
    key: event.key,
    phase: event.phase,
    source: event.source,
    timestamp: Date.now(),
  };
  lastRemoteEvent = payload;
  notifyRemoteListeners(payload);
};

export const subscribeToRemoteKeyEvents = (listener: RemoteKeyListener) => {
  remoteListeners.add(listener);
  if (lastRemoteEvent) {
    listener(lastRemoteEvent);
  }
  return () => {
    remoteListeners.delete(listener);
  };
};

export const getLastRemoteKeyEvent = () => lastRemoteEvent;
