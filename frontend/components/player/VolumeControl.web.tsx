import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';

import type { NovaTheme } from '@/theme';
import { useTheme } from '@/theme';

interface VolumeControlProps {
  value: number;
  onChange: (nextValue: number) => void;
}

const VolumeControl: React.FC<VolumeControlProps> = ({ value, onChange }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const clamped = Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0;
  const percent = Math.round(clamped * 100);
  const icon: keyof typeof Ionicons.glyphMap =
    clamped === 0 ? 'volume-mute' : clamped < 0.34 ? 'volume-low' : clamped < 0.67 ? 'volume-medium' : 'volume-high';

  return (
    <div style={styles.container as React.CSSProperties}>
      <button
        type="button"
        aria-label={clamped === 0 ? 'Unmute' : 'Mute'}
        onClick={() => onChange(clamped === 0 ? 1 : 0)}
        style={styles.iconButton as React.CSSProperties}>
        <Ionicons name={icon} size={20} color={theme.colors.text.primary} />
      </button>
      <input
        type="range"
        aria-label="Volume"
        min={0}
        max={100}
        step={1}
        value={percent}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          const next = Number(e.currentTarget.value);
          if (Number.isFinite(next)) {
            onChange(Math.min(Math.max(next / 100, 0), 1));
          }
        }}
        style={styles.slider as React.CSSProperties}
      />
    </div>
  );
};

const createStyles = (theme: NovaTheme) => ({
  container: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginLeft: theme.spacing.md,
    minWidth: 0,
  },
  iconButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.radius.sm,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slider: {
    width: 120,
    cursor: 'pointer',
  },
});

export default VolumeControl;
