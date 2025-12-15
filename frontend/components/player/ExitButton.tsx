import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import FocusablePressable from '@/components/FocusablePressable';
import { useTheme } from '@/theme';
import type { NovaTheme } from '@/theme';
import { isTV, getTVScaleMultiplier } from '@/theme/tokens/tvScale';

interface GoBackButtonProps {
  onSelect: () => void;
  onFocus?: () => void;
}

const ExitButton: React.FC<GoBackButtonProps> = ({ onSelect, onFocus }) => {
  const theme = useTheme();
  const styles = useMemo(() => useExitButtonStyles(theme), [theme]);

  return (
    <FocusablePressable
      text={'Exit'}
      focusKey="exit-button"
      onSelect={onSelect}
      onFocus={onFocus}
      style={styles.exitBtn}
    />
  );
};

const useExitButtonStyles = (theme: NovaTheme) => {
  // Unified TV scaling - tvOS is baseline, Android TV auto-derives
  const tvScale = isTV ? getTVScaleMultiplier() : 1;

  return StyleSheet.create({
    exitBtn: {
      position: 'absolute',
      top: theme.spacing.lg,
      left: theme.spacing.lg,
      // Scale minWidth for TV - designed for tvOS at 120px
      minWidth: Math.round(120 * (isTV ? tvScale : 1)),
    },
  });
};

export default ExitButton;
