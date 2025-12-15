import { FixedSafeAreaView } from '@/components/FixedSafeAreaView';
import FocusablePressable from '@/components/FocusablePressable';
import Controls from '@/components/player/Controls';
import ExitButton from '@/components/player/ExitButton';
import LoadingIndicator from '@/components/LoadingIndicator';
import VideoPlayer, {
  type TrackInfo,
  type VideoImplementation,
  type VideoPlayerHandle,
} from '@/components/player/VideoPlayer';
import RemoteControlManager from '@/services/remote-control/RemoteControlManager';
import { SupportedKeys } from '@/services/remote-control/SupportedKeys';
import { DefaultFocus, SpatialNavigationNode, SpatialNavigationRoot } from '@/services/tv-navigation';
import type { NovaTheme } from '@/theme';
import { useTheme } from '@/theme';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

type RemoteEvent = {
  id: number;
  key: SupportedKeys;
  timestamp: number;
};

type RawRemoteEvent = {
  id: number;
  type: string;
  action: number | null;
  mappedKey?: SupportedKeys | null;
  payload: Record<string, unknown>;
  timestamp: number;
};

interface PlayerDebugParams extends Record<string, any> {
  movie?: string | string[];
  headerImage?: string | string[];
  title?: string | string[];
  durationHint?: string | string[];
  startOffset?: string | string[];
}

const MAX_EVENTS = 40;
const MAX_RAW_EVENTS = 60;
const SKIP_INTERVAL = 30;
const SUBTITLE_OFF_OPTION = { id: 'off', label: 'Off' };

const toSingleString = (value?: string | string[]): string => {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
};

const toNumberParam = (value?: string | string[]): number | null => {
  const raw = toSingleString(value);
  if (!raw) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseBooleanParam = (value?: string | string[]): boolean => {
  const raw = toSingleString(value);
  if (!raw) {
    return false;
  }
  const normalized = raw.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
};

const sanitizeMovieParam = (value?: string | string[]): string | null => {
  const rawValue = toSingleString(value);
  if (!rawValue) {
    return null;
  }

  try {
    const url = new URL(rawValue);
    const encodedPathname = url.pathname
      .split('/')
      .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
      .join('/');
    url.pathname = encodedPathname;
    return url.toString();
  } catch {
    return rawValue;
  }
};

type RemoteControlManagerWithRaw = typeof RemoteControlManager & {
  addRawEventListener?: (
    listener: (event: Record<string, any>) => void,
  ) => void | (() => void) | { remove?: () => void };
};

const formatTrackLabel = (track: TrackInfo, fallbackPrefix: string) => {
  const trimmed = track.name?.trim();
  if (trimmed) {
    return trimmed;
  }
  return `${fallbackPrefix} ${track.id}`;
};

export default function PlayerDebugScreen() {
  const params = useLocalSearchParams<PlayerDebugParams>();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const resolvedMovie = useMemo(() => sanitizeMovieParam(params.movie), [params.movie]);
  const headerImage = useMemo(() => toSingleString(params.headerImage), [params.headerImage]);
  const displayTitle = useMemo(() => toSingleString(params.title) || 'Debug Stream', [params.title]);
  const durationHint = useMemo(() => {
    const parsed = toNumberParam(params.durationHint);
    return parsed && parsed > 0 ? parsed : undefined;
  }, [params.durationHint]);
  const initialStartOffset = useMemo(() => {
    const parsed = toNumberParam(params.startOffset);
    return parsed && parsed > 0 ? parsed : 0;
  }, [params.startOffset]);
  const hasDolbyVision = useMemo(() => parseBooleanParam(params.dv), [params.dv]);

  const videoRef = useRef<VideoPlayerHandle | null>(null);
  const pendingSeekRef = useRef<number | null>(initialStartOffset > 0 ? initialStartOffset : null);
  useEffect(() => {
    pendingSeekRef.current = initialStartOffset > 0 ? initialStartOffset : null;
  }, [initialStartOffset]);

  const [paused, setPaused] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [currentTime, setCurrentTime] = useState(initialStartOffset);
  const [duration, setDuration] = useState(durationHint ?? 0);
  const [volume, setVolume] = useState(1);
  const [audioTracks, setAudioTracks] = useState<TrackInfo[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<TrackInfo[]>([]);
  const [selectedAudioTrackId, setSelectedAudioTrackId] = useState<string | null>(null);
  const [selectedSubtitleTrackId, setSelectedSubtitleTrackId] = useState<string>('off');
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const [implementation, setImplementation] = useState<VideoImplementation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const durationRef = useRef(durationHint ?? 0);
  const currentTimeRef = useRef(initialStartOffset);
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  const audioTrackOptions = useMemo(
    () => audioTracks.map((track) => ({ id: String(track.id), label: formatTrackLabel(track, 'Audio') })),
    [audioTracks],
  );
  const subtitleTrackOptions = useMemo(() => {
    const items = subtitleTracks.map((track) => ({ id: String(track.id), label: formatTrackLabel(track, 'Subtitle') }));
    return [SUBTITLE_OFF_OPTION, ...items];
  }, [subtitleTracks]);

  const selectedAudioTrackIndex = useMemo(() => {
    if (!selectedAudioTrackId) {
      return null;
    }
    const parsed = Number(selectedAudioTrackId);
    return Number.isFinite(parsed) ? parsed : null;
  }, [selectedAudioTrackId]);

  const selectedSubtitleTrackIndex = useMemo(() => {
    if (!selectedSubtitleTrackId || selectedSubtitleTrackId === 'off') {
      return null;
    }
    const parsed = Number(selectedSubtitleTrackId);
    return Number.isFinite(parsed) ? parsed : null;
  }, [selectedSubtitleTrackId]);

  const [eventLog, setEventLog] = useState<RemoteEvent[]>([]);
  const [rawEvents, setRawEvents] = useState<RawRemoteEvent[]>([]);
  const supportsRawRemoteEvents = useMemo(
    () => typeof (RemoteControlManager as RemoteControlManagerWithRaw).addRawEventListener === 'function',
    [],
  );
  const eventSeq = useRef(0);
  const rawEventSeq = useRef(0);
  const logRef = useRef<ScrollView | null>(null);
  const nativeLogRef = useRef<ScrollView | null>(null);

  const appendRemoteEvent = useCallback((key: SupportedKeys) => {
    eventSeq.current += 1;
    setEventLog((current) => {
      const entry: RemoteEvent = {
        id: eventSeq.current,
        key,
        timestamp: Date.now(),
      };
      const next = [entry, ...current];
      return next.slice(0, MAX_EVENTS);
    });
  }, []);

  const togglePlayPause = useCallback(() => {
    setPaused((value) => {
      const next = !value;
      const handle = videoRef.current;
      if (!next) {
        handle?.play?.();
      } else {
        handle?.pause?.();
      }
      return next;
    });
  }, []);

  const handleSeek = useCallback((nextTime: number) => {
    const durationValue = durationRef.current;
    const safeDuration = Number.isFinite(durationValue) && durationValue > 0 ? durationValue : Math.max(nextTime, 0);
    const clamped = Math.max(0, Math.min(safeDuration, nextTime));
    videoRef.current?.seek(clamped);
    setCurrentTime(clamped);
    currentTimeRef.current = clamped;
  }, []);

  const handleSkip = useCallback(
    (amount: number) => {
      const target = currentTimeRef.current + amount;
      handleSeek(target);
    },
    [handleSeek],
  );

  const handleRemoteKey = useCallback(
    (key: SupportedKeys) => {
      appendRemoteEvent(key);
      switch (key) {
        case SupportedKeys.PlayPause:
          togglePlayPause();
          break;
        case SupportedKeys.Left:
          handleSkip(-SKIP_INTERVAL);
          break;
        case SupportedKeys.Right:
          handleSkip(SKIP_INTERVAL);
          break;
        default:
          break;
      }
    },
    [appendRemoteEvent, handleSkip, togglePlayPause],
  );

  useEffect(() => {
    const listener = RemoteControlManager.addKeydownListener(handleRemoteKey);
    return () => {
      RemoteControlManager.removeKeydownListener(listener);
    };
  }, [handleRemoteKey]);

  useEffect(() => {
    if (Platform.isTV) {
      RemoteControlManager.enableTvEventHandling();
    }
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTo({ y: 0, animated: true });
    }
  }, [eventLog]);

  useEffect(() => {
    if (nativeLogRef.current) {
      nativeLogRef.current.scrollTo({ y: 0, animated: true });
    }
  }, [rawEvents]);

  useEffect(() => {
    const manager = RemoteControlManager as RemoteControlManagerWithRaw;
    if (typeof manager.addRawEventListener !== 'function') {
      return;
    }
    const unsubscribe = manager.addRawEventListener((nativeEvent) => {
      rawEventSeq.current += 1;
      setRawEvents((current) => {
        const entry: RawRemoteEvent = {
          id: rawEventSeq.current,
          type: nativeEvent.eventType?.toLowerCase() ?? 'unknown',
          action:
            typeof nativeEvent.action === 'number'
              ? nativeEvent.action
              : typeof nativeEvent.action === 'string'
                ? Number(nativeEvent.action)
                : null,
          mappedKey: nativeEvent.mappedKey ?? null,
          payload: nativeEvent.event ? (nativeEvent.event as Record<string, unknown>) : {},
          timestamp: nativeEvent.timestamp,
        };
        const next = [entry, ...current];
        return next.slice(0, MAX_RAW_EVENTS);
      });
    });

    return () => {
      if (!unsubscribe) {
        return;
      }
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      } else if (typeof unsubscribe === 'object' && typeof unsubscribe.remove === 'function') {
        unsubscribe.remove();
      }
    };
  }, []);

  const handleBufferState = useCallback((buffering: boolean) => {
    setIsBuffering(buffering);
  }, []);

  const handleProgressUpdate = useCallback((time: number) => {
    const safeTime = Number.isFinite(time) ? time : 0;
    setCurrentTime(safeTime);
    currentTimeRef.current = safeTime;
    setHasStartedPlaying(true);
    setIsBuffering(false);
    setError(null);
  }, []);

  const handleVideoLoad = useCallback(
    (loadedDuration: number) => {
      const normalized = Number.isFinite(loadedDuration) && loadedDuration > 0 ? loadedDuration : (durationHint ?? 0);
      if (normalized > 0) {
        setDuration(normalized);
        durationRef.current = normalized;
      }
      setIsBuffering(false);
      const pendingSeek = pendingSeekRef.current;
      if (typeof pendingSeek === 'number') {
        videoRef.current?.seek(pendingSeek);
        setCurrentTime(pendingSeek);
        currentTimeRef.current = pendingSeek;
        pendingSeekRef.current = null;
      }
    },
    [durationHint],
  );

  const handleVideoEnd = useCallback(() => {
    setPaused(true);
  }, []);

  const handleVideoError = useCallback((err: unknown) => {
    const message = err instanceof Error ? err.message : 'Unknown playback error.';
    setError(message);
  }, []);

  const handleTracksAvailable = useCallback((audio: TrackInfo[], subtitles: TrackInfo[]) => {
    setAudioTracks(audio);
    setSubtitleTracks(subtitles);
  }, []);

  const handleReset = useCallback(() => {
    setPaused(true);
    setCurrentTime(0);
    currentTimeRef.current = 0;
    pendingSeekRef.current = 0;
    videoRef.current?.seek(0);
    setEventLog([]);
    setRawEvents([]);
    setError(null);
  }, []);

  const missingStream = !resolvedMovie;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SpatialNavigationRoot isActive={Platform.isTV}>
        <FixedSafeAreaView style={styles.safeArea}>
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>tvOS Remote Debug Player</Text>
              <Text style={styles.subtitle}>
                Simplified controls rendered above the VLC player so we can stress-test focus, seeking, and track menus.
              </Text>
            </View>
            <View style={styles.playerShell}>
              {missingStream ? (
                <View style={styles.missingStream}>
                  <Text style={styles.missingText}>Missing stream URL. Return to the details page and try again.</Text>
                  <DefaultFocus>
                    <FocusablePressable focusKey="back-from-debug" text="Back" onSelect={() => router.back()} />
                  </DefaultFocus>
                </View>
              ) : (
                <View style={styles.videoWrapper}>
                  <VideoPlayer
                    key={resolvedMovie}
                    ref={videoRef}
                    movie={resolvedMovie ?? ''}
                    headerImage={headerImage}
                    movieTitle={displayTitle}
                    paused={paused}
                    controls={false}
                    onBuffer={handleBufferState}
                    onProgress={handleProgressUpdate}
                    onLoad={handleVideoLoad}
                    onEnd={handleVideoEnd}
                    onError={handleVideoError}
                    durationHint={durationHint}
                    onInteract={() => setError(null)}
                    onTogglePlay={togglePlayPause}
                    volume={volume}
                    onAutoplayBlocked={() => setPaused(true)}
                    onToggleFullscreen={() => {}}
                    onImplementationResolved={(impl) => setImplementation(impl)}
                    selectedAudioTrackIndex={selectedAudioTrackIndex}
                    selectedSubtitleTrackIndex={selectedSubtitleTrackIndex}
                    onTracksAvailable={handleTracksAvailable}
                    forceRnvPlayer={hasDolbyVision}
                  />
                  {isBuffering && (
                    <View style={styles.loadingOverlay} pointerEvents="none">
                      <LoadingIndicator />
                    </View>
                  )}
                  {error && (
                    <View style={styles.errorBanner}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}
                  <View style={styles.overlay} pointerEvents="box-none">
                    <View style={styles.overlayTopRow}>
                      <DefaultFocus>
                        <ExitButton onSelect={() => router.back()} />
                      </DefaultFocus>
                      <View style={styles.videoMetadata}>
                        <Text style={styles.videoTitle}>{displayTitle}</Text>
                        <Text style={styles.videoMeta}>
                          {implementation ? `Renderer: ${implementation}` : 'Resolving renderer…'}
                        </Text>
                        {hasDolbyVision && <Text style={styles.videoMeta}>Dolby Vision stream</Text>}
                      </View>
                    </View>
                    <View style={styles.controlsRegion}>
                      <SpatialNavigationNode orientation="vertical">
                        <Controls
                          paused={paused}
                          onPlayPause={togglePlayPause}
                          currentTime={currentTime}
                          duration={duration}
                          onSeek={handleSeek}
                          volume={volume}
                          onVolumeChange={setVolume}
                          audioTracks={audioTrackOptions}
                          selectedAudioTrackId={selectedAudioTrackId}
                          onSelectAudioTrack={setSelectedAudioTrackId}
                          subtitleTracks={subtitleTrackOptions}
                          selectedSubtitleTrackId={selectedSubtitleTrackId}
                          onSelectSubtitleTrack={setSelectedSubtitleTrackId}
                          hasStartedPlaying={hasStartedPlaying}
                          onSkipBackward={() => handleSkip(-SKIP_INTERVAL)}
                          onSkipForward={() => handleSkip(SKIP_INTERVAL)}
                        />
                      </SpatialNavigationNode>
                    </View>
                  </View>
                </View>
              )}
            </View>
            <View style={styles.logHeader}>
              <Text style={styles.logTitle}>Recent Remote Events</Text>
              <DefaultFocus>
                <FocusablePressable
                  focusKey="reset-debug-player"
                  icon={Platform.isTV ? 'refresh' : undefined}
                  text="Reset Session"
                  accessibilityLabel="Reset debug session"
                  onSelect={handleReset}
                  style={styles.resetButton}
                />
              </DefaultFocus>
            </View>
            <ScrollView ref={logRef} style={styles.logContainer}>
              {eventLog.length === 0 ? (
                <Text style={styles.logPlaceholder}>Interact with the remote to see events appear here.</Text>
              ) : (
                eventLog.map((entry) => (
                  <View key={entry.id} style={styles.logEntry}>
                    <Text style={styles.logTimestamp}>{new Date(entry.timestamp).toLocaleTimeString()}</Text>
                    <Text style={styles.logKey}>{entry.key}</Text>
                  </View>
                ))
              )}
            </ScrollView>
            <View style={styles.logHeader}>
              <Text style={styles.logTitle}>Native Remote Events</Text>
            </View>
            {supportsRawRemoteEvents ? (
              <ScrollView ref={nativeLogRef} style={[styles.logContainer, styles.nativeLogContainer]}>
                {rawEvents.length === 0 ? (
                  <Text style={styles.logPlaceholder}>
                    tvOS will report raw events here (eventType, action, and mapping).
                  </Text>
                ) : (
                  rawEvents.map((entry) => (
                    <View key={entry.id} style={styles.rawLogEntry}>
                      <View style={styles.rawLogHeader}>
                        <Text style={styles.rawLogType}>{entry.type}</Text>
                        <Text style={styles.rawLogTimestamp}>{new Date(entry.timestamp).toLocaleTimeString()}</Text>
                      </View>
                      <Text style={styles.rawLogMeta}>
                        action: {entry.action ?? 'n/a'} · mapped: {entry.mappedKey ?? 'none'}
                      </Text>
                      <Text style={styles.rawLogPayload}>{JSON.stringify(entry.payload)}</Text>
                    </View>
                  ))
                )}
              </ScrollView>
            ) : (
              <View style={[styles.logContainer, styles.nativeLogContainer, styles.rawLogFallback]}>
                <Text style={styles.logPlaceholder}>
                  Raw tvOS event streams are unavailable in this build. Only mapped key presses are logged above.
                </Text>
              </View>
            )}
          </View>
        </FixedSafeAreaView>
      </SpatialNavigationRoot>
    </>
  );
}

const createStyles = (theme: NovaTheme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background.base,
    },
    container: {
      flex: 1,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.lg,
      gap: theme.spacing.lg,
    },
    header: {
      gap: theme.spacing.xs,
    },
    title: {
      fontSize: 28,
      fontWeight: '600',
      color: theme.colors.text.primary,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.text.secondary,
    },
    playerShell: {
      flex: 1,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border.subtle,
      backgroundColor: theme.colors.background.surface,
      padding: theme.spacing.lg,
    },
    videoWrapper: {
      flex: 1,
      borderRadius: theme.radius.md,
      overflow: 'hidden',
      backgroundColor: '#000',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'space-between',
      padding: theme.spacing.lg,
    },
    overlayTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: theme.spacing.lg,
    },
    videoMetadata: {
      flexShrink: 1,
      alignItems: 'flex-end',
      gap: theme.spacing.xs,
    },
    videoTitle: {
      ...theme.typography.title.md,
      color: theme.colors.text.inverse,
      textAlign: 'right',
    },
    videoMeta: {
      ...theme.typography.caption,
      color: theme.colors.text.inverse,
    },
    controlsRegion: {
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.35)',
    },
    errorBanner: {
      position: 'absolute',
      top: theme.spacing.lg,
      left: theme.spacing.lg,
      right: theme.spacing.lg,
      padding: theme.spacing.sm,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.status.danger,
    },
    errorText: {
      color: theme.colors.text.inverse,
      textAlign: 'center',
      ...theme.typography.label.md,
    },
    logHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    logTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text.primary,
    },
    resetButton: {
      minWidth: 180,
    },
    logContainer: {
      flex: 1,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border.subtle,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.background.elevated,
    },
    logPlaceholder: {
      color: theme.colors.text.secondary,
      fontSize: 15,
    },
    logEntry: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.subtle,
    },
    logTimestamp: {
      color: theme.colors.text.secondary,
      fontVariant: ['tabular-nums'],
    },
    logKey: {
      color: theme.colors.text.primary,
      fontWeight: '500',
    },
    nativeLogContainer: {
      marginTop: theme.spacing.sm,
    },
    rawLogEntry: {
      paddingVertical: theme.spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.subtle,
      gap: theme.spacing.xs,
    },
    rawLogFallback: {
      justifyContent: 'center',
    },
    rawLogHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    rawLogType: {
      ...theme.typography.label.md,
      color: theme.colors.text.primary,
      textTransform: 'uppercase',
    },
    rawLogTimestamp: {
      ...theme.typography.caption,
      color: theme.colors.text.secondary,
    },
    rawLogMeta: {
      ...theme.typography.caption,
      color: theme.colors.text.secondary,
      fontVariant: ['tabular-nums'],
    },
    rawLogPayload: {
      ...theme.typography.caption,
      color: theme.colors.text.muted,
      fontFamily: 'SpaceMono',
    },
    missingStream: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: theme.spacing.lg,
    },
    missingText: {
      ...theme.typography.body.lg,
      color: theme.colors.text.primary,
      textAlign: 'center',
    },
  });
