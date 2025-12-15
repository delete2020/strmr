import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useShouldUseTabs } from '../hooks/useShouldUseTabs';
import { NovaTheme, useTheme } from '../theme';
import { useLoadingScreen } from './LoadingScreenContext';

export type ToastTone = 'info' | 'success' | 'danger';

export type ToastOptions = {
  tone?: ToastTone;
  duration?: number;
  id?: string;
};

type ToastRecord = {
  id: string;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  showToast: (message: string, options?: ToastOptions) => string;
  hideToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider.');
  }
  return context;
}

type ToastProviderProps = {
  children: ReactNode;
};

export function ToastProvider({ children }: ToastProviderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const shouldUseTabs = useShouldUseTabs();
  const isTV = Platform.isTV;
  const { isLoadingScreenVisible } = useLoadingScreen();
  const styles = useMemo(
    () => createToastStyles(theme, insets, shouldUseTabs, isTV),
    [theme, insets, shouldUseTabs, isTV],
  );
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timers = timersRef.current;
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message: string, options?: ToastOptions) => {
      const trimmed = message?.trim();
      if (!trimmed) {
        return '';
      }

      const id = options?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const tone = options?.tone ?? 'info';

      setToasts((prev) => {
        const next = [...prev];
        const existingIndex = next.findIndex((toast) => toast.id === id);
        const record: ToastRecord = { id, message: trimmed, tone };
        if (existingIndex >= 0) {
          next[existingIndex] = record;
        } else {
          next.push(record);
        }
        return next;
      });

      const duration = options?.duration ?? 4000;
      const timers = timersRef.current;
      const existingTimer = timers.get(id);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      if (duration > 0) {
        const timeout = setTimeout(() => {
          hideToast(id);
        }, duration);
        timers.set(id, timeout);
      } else {
        timers.delete(id);
      }

      return id;
    },
    [hideToast],
  );

  useEffect(() => {
    return () => {
      const timers = timersRef.current;
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      hideToast,
    }),
    [hideToast, showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {!isLoadingScreenVisible && (
        <View pointerEvents="box-none" style={styles.viewport} accessibilityLiveRegion="polite">
          {toasts.map((toast) => {
            const toneColor = getToneColor(theme, toast.tone);
            return (
              <View
                key={toast.id}
                style={[styles.toast, { borderColor: toneColor, shadowColor: toneColor }]}
                accessibilityRole="alert">
                <View style={[styles.indicator, { backgroundColor: toneColor }]} />
                <Text style={styles.message} numberOfLines={3}>
                  {toast.message}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </ToastContext.Provider>
  );
}

function getToneColor(theme: NovaTheme, tone: ToastTone) {
  switch (tone) {
    case 'success':
      return theme.colors.status.success;
    case 'danger':
      return theme.colors.status.danger;
    case 'info':
    default:
      return theme.colors.accent.primary;
  }
}

const createToastStyles = (
  theme: NovaTheme,
  insets: { bottom: number; top: number },
  shouldUseTabs: boolean,
  isTV: boolean,
) => {
  // For tvOS, position at top with larger sizing
  if (isTV) {
    return StyleSheet.create({
      viewport: {
        position: 'absolute',
        top: theme.spacing.xl * 3,
        left: theme.spacing.xl * 3,
        right: theme.spacing.xl * 3,
        gap: theme.spacing.lg,
        zIndex: 1000,
      },
      toast: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 3,
        borderRadius: theme.radius.xl * 1.5,
        backgroundColor: theme.colors.background.elevated,
        paddingVertical: theme.spacing.xl,
        paddingHorizontal: theme.spacing.xl * 1.5,
        shadowOpacity: 0.4,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
        elevation: 12,
        maxWidth: '100%',
      },
      indicator: {
        width: theme.spacing.md,
        alignSelf: 'stretch',
        borderRadius: theme.radius.lg,
        marginRight: theme.spacing.xl,
        flexShrink: 0,
      },
      message: {
        flex: 1,
        flexShrink: 1,
        color: theme.colors.text.primary,
        ...theme.typography.body.lg,
        fontSize: (theme.typography.body.lg.fontSize || 16) * 1.5,
      },
    });
  }

  // Mobile/tablet positioning at bottom
  // Tab bar height is 56px plus the safe area bottom inset
  const tabBarHeight = 56 + Math.max(insets.bottom, theme.spacing.md);
  // When tabs are visible, position toast above the tab bar with some spacing
  const bottomPosition = shouldUseTabs ? tabBarHeight + theme.spacing.sm : theme.spacing.lg;

  return StyleSheet.create({
    viewport: {
      position: 'absolute',
      bottom: bottomPosition,
      left: theme.spacing.lg,
      right: theme.spacing.lg,
      gap: theme.spacing.sm,
      zIndex: 1000,
    },
    toast: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.background.elevated,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      shadowOpacity: 0.35,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
      maxWidth: '100%',
    },
    indicator: {
      width: theme.spacing.xs,
      alignSelf: 'stretch',
      borderRadius: theme.radius.sm,
      marginRight: theme.spacing.md,
      flexShrink: 0,
    },
    message: {
      flex: 1,
      flexShrink: 1,
      color: theme.colors.text.primary,
      ...theme.typography.body.md,
    },
  });
};
