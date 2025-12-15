import React, { useCallback, useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';

import type { NovaTheme } from '@/theme';
import { useTheme } from '@/theme';
import { Ionicons } from '@expo/vector-icons';

interface VolumeControlProps {
  value: number;
  onChange: (nextValue: number) => void;
}

const VolumeControl: React.FC<VolumeControlProps> = ({ value, onChange }) => {
  const theme = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const [trackHeight, setTrackHeight] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const lastNonZeroRef = useRef<number>(1);
  const closeHoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const styles = useMemo(() => createStyles(theme), [theme]);

  const clearCloseHoverTimeout = useCallback(() => {
    if (closeHoverTimeoutRef.current) {
      clearTimeout(closeHoverTimeoutRef.current);
      closeHoverTimeoutRef.current = null;
    }
  }, []);

  const scheduleCloseHover = useCallback(() => {
    clearCloseHoverTimeout();
    closeHoverTimeoutRef.current = setTimeout(() => {
      if (!isDragging) {
        setIsExpanded(false);
      }
    }, 150);
  }, [clearCloseHoverTimeout, isDragging]);

  const clampVolume = useCallback((input: number) => {
    if (!Number.isFinite(input)) {
      return 0;
    }
    if (input <= 0) {
      return 0;
    }
    if (input >= 1) {
      return 1;
    }
    return input;
  }, []);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
    setTrackHeight(event.nativeEvent.layout.height);
  }, []);

  const resolveVolumeFromVerticalLocation = useCallback(
    (locationY: number) => {
      if (trackHeight <= 0) {
        return clampVolume(value);
      }

      const clampedY = Math.min(Math.max(locationY, 0), trackHeight);
      // locationY is from top; we want 0 at bottom -> invert
      const ratioFromBottom = 1 - clampedY / trackHeight;
      return clampVolume(ratioFromBottom);
    },
    [clampVolume, trackHeight, value],
  );

  const emitVolume = useCallback(
    (locationY: number) => {
      const nextValue = resolveVolumeFromVerticalLocation(locationY);
      if (nextValue > 0) {
        lastNonZeroRef.current = nextValue;
      }
      onChange(nextValue);
    },
    [onChange, resolveVolumeFromVerticalLocation],
  );

  const handleResponderGrant = useCallback(
    (event: GestureResponderEvent) => {
      setIsDragging(true);
      emitVolume(event.nativeEvent.locationY);
    },
    [emitVolume],
  );

  const handleResponderMove = useCallback(
    (event: GestureResponderEvent) => {
      if (!isDragging) {
        return;
      }

      emitVolume(event.nativeEvent.locationY);
    },
    [emitVolume, isDragging],
  );

  const handleResponderRelease = useCallback(
    (event: GestureResponderEvent) => {
      if (!isDragging) {
        return;
      }

      setIsDragging(false);
      emitVolume(event.nativeEvent.locationY);
    },
    [emitVolume, isDragging],
  );

  const toggleMute = useCallback(() => {
    const current = clampVolume(value);
    if (current <= 0) {
      const restore = clampVolume(lastNonZeroRef.current || 0.5);
      onChange(restore);
    } else {
      lastNonZeroRef.current = current;
      onChange(0);
    }
  }, [clampVolume, onChange, value]);

  const resolvedValue = clampVolume(value);
  const progressHeight = trackHeight * resolvedValue;
  const thumbDiameter = theme.spacing.md;
  const thumbBottom = Math.min(
    Math.max(progressHeight - thumbDiameter / 2, -thumbDiameter / 2),
    trackHeight - thumbDiameter / 2,
  );

  const volumeIcon: keyof typeof Ionicons.glyphMap = useMemo(() => {
    if (resolvedValue === 0) return 'volume-mute';
    if (resolvedValue < 0.34) return 'volume-low';
    if (resolvedValue < 0.67) return 'volume-medium';
    return 'volume-high';
  }, [resolvedValue]);

  // Vertical popover is only visible when expanded

  return (
    <Pressable
      style={styles.container}
      onHoverIn={() => {
        clearCloseHoverTimeout();
        setIsExpanded(true);
      }}
      onHoverOut={() => {
        scheduleCloseHover();
      }}>
      <Pressable
        onPress={toggleMute}
        style={styles.iconButton}
        onFocus={() => setIsExpanded(true)}
        onBlur={() => setIsExpanded(false)}>
        <Ionicons name={volumeIcon} size={20} color={theme.colors.text.primary} />
      </Pressable>
      {isExpanded && (
        <Pressable
          style={styles.verticalPopover}
          onHoverIn={() => {
            clearCloseHoverTimeout();
            setIsExpanded(true);
          }}
          onHoverOut={() => {
            scheduleCloseHover();
          }}>
          <View
            style={styles.verticalSlider}
            onLayout={handleLayout}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={handleResponderGrant}
            onResponderMove={handleResponderMove}
            onResponderRelease={handleResponderRelease}
            onResponderTerminate={handleResponderRelease}>
            <View style={styles.verticalTrack}>
              <View style={[styles.verticalTrackProgress, { height: progressHeight }]} />
            </View>
            <View
              style={[
                styles.verticalThumb,
                {
                  bottom: thumbBottom,
                  width: thumbDiameter,
                  height: thumbDiameter,
                  borderRadius: thumbDiameter / 2,
                  left: (trackWidth - thumbDiameter) / 2,
                },
              ]}
            />
          </View>
        </Pressable>
      )}
    </Pressable>
  );
};

const createStyles = (theme: NovaTheme) =>
  StyleSheet.create({
    container: {
      marginLeft: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      minWidth: 0,
      position: 'relative',
    },
    iconButton: {
      padding: theme.spacing.xs,
      borderRadius: theme.radius.sm,
    },
    verticalPopover: {
      position: 'absolute',
      bottom: theme.spacing.xl + theme.spacing.sm,
      left: 0,
      right: 0,
      alignItems: 'center',
      paddingBottom: theme.spacing.xs,
    },
    verticalSlider: {
      height: 120,
      width: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    verticalTrack: {
      position: 'relative',
      height: 100,
      width: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.border.subtle,
      overflow: 'hidden',
    },
    verticalTrackProgress: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.colors.accent.primary,
    },
    verticalThumb: {
      position: 'absolute',
      backgroundColor: theme.colors.accent.primary,
    },
  });

export default VolumeControl;
