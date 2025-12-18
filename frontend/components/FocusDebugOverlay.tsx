import { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

// TVEventHandler is available on TV platforms but not always typed correctly
type TVEventHandlerType = {
  enable: (
    component: unknown,
    callback: (component: unknown, event: { eventType?: string; eventKeyAction?: number | string }) => void,
  ) => void;
  disable: () => void;
};
// eslint-disable-next-line @typescript-eslint/no-var-requires
const TVEventHandler: (new () => TVEventHandlerType) | undefined = Platform.isTV
  ? require('react-native').TVEventHandler
  : undefined;

import {
  getLastFocusDebugEvent,
  getLastRemoteKeyEvent,
  subscribeToFocusDebugEvents,
  subscribeToRemoteKeyEvents,
} from '@/services/tv-navigation/focus-debugger';
import { getTvEventMappedKey } from '@/services/remote-control/RemoteControlManager';
import type { NovaTheme } from '@/theme';
import { useTheme } from '@/theme';

const formatTimestamp = (value: number) => {
  const date = new Date(value);
  return date.toLocaleTimeString();
};

export const FocusDebugOverlay = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [isTv] = useState(Platform.isTV);
  const [event, setEvent] = useState(() => getLastFocusDebugEvent());
  const [remoteEvent, setRemoteEvent] = useState(() => getLastRemoteKeyEvent());
  const [tvEvent, setTvEvent] = useState<{
    type?: string;
    action?: number | string;
    mappedKey?: string;
    timestamp: number;
  } | null>(null);

  useEffect(() => {
    if (!isTv) {
      return;
    }
    const unsubFocus = subscribeToFocusDebugEvents((payload) => {
      setEvent(payload);
    });
    const unsubRemote = subscribeToRemoteKeyEvents((payload) => {
      setRemoteEvent(payload);
    });
    let handler: TVEventHandlerType | null = null;
    if (TVEventHandler) {
      try {
        handler = new TVEventHandler();
        handler.enable(null, (_: unknown, nativeEvent: { eventType?: string; eventKeyAction?: number | string }) => {
          if (!nativeEvent) {
            return;
          }
          setTvEvent({
            type: nativeEvent.eventType,
            action: nativeEvent.eventKeyAction,
            mappedKey: nativeEvent.eventType ? getTvEventMappedKey(nativeEvent.eventType) : undefined,
            timestamp: Date.now(),
          });
        });
      } catch (error) {
        console.warn('[FocusDebugOverlay] Unable to attach TVEventHandler:', error);
      }
    }
    return () => {
      unsubFocus();
      unsubRemote();
      if (handler) {
        handler.disable();
        handler = null;
      }
    };
  }, [isTv]);

  if (!isTv) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.container}>
      <Text style={styles.heading}>Focus Debugger</Text>
      <View style={styles.section}>
        <Text style={styles.sectionHeading}>Focus</Text>
        {event ? (
          <>
            <Text style={styles.value}>Key: {event.key || 'unknown'}</Text>
            {event.label ? <Text style={styles.value}>Label: {event.label}</Text> : null}
            {event.action ? <Text style={styles.value}>Action: {event.action}</Text> : null}
            <Text style={styles.timestamp}>Updated {formatTimestamp(event.timestamp)}</Text>
          </>
        ) : (
          <Text style={styles.value}>Waiting for focus…</Text>
        )}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionHeading}>Remote Input</Text>
        {remoteEvent ? (
          <>
            <Text style={styles.value}>
              Key: {remoteEvent.key} ({remoteEvent.phase})
            </Text>
            {remoteEvent.source ? <Text style={styles.value}>Source: {remoteEvent.source}</Text> : null}
            <Text style={styles.timestamp}>Updated {formatTimestamp(remoteEvent.timestamp)}</Text>
          </>
        ) : (
          <Text style={styles.value}>No remote input yet</Text>
        )}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionHeading}>Native TV Event</Text>
        {tvEvent ? (
          <>
            <Text style={styles.value}>Type: {tvEvent.type || 'unknown'}</Text>
            <Text style={styles.value}>Action: {String(tvEvent.action ?? 'n/a')}</Text>
            <Text style={styles.value}>Mapped: {tvEvent.mappedKey ?? '—'}</Text>
            <Text style={styles.timestamp}>Updated {formatTimestamp(tvEvent.timestamp)}</Text>
          </>
        ) : (
          <Text style={styles.value}>No native events detected</Text>
        )}
      </View>
    </View>
  );
};

const createStyles = (theme: NovaTheme) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      top: theme.spacing.md,
      right: theme.spacing.md,
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(148, 163, 184, 0.6)',
      zIndex: 999,
      minWidth: 260,
    },
    heading: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xs,
    },
    section: {
      marginBottom: theme.spacing.sm,
    },
    sectionHeading: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.text.secondary,
      marginBottom: 2,
      textTransform: 'uppercase',
    },
    value: {
      fontSize: 13,
      color: theme.colors.text.secondary,
    },
    timestamp: {
      fontSize: 11,
      color: theme.colors.text.muted,
      marginTop: theme.spacing.xs,
      fontVariant: ['tabular-nums'],
    },
  });
