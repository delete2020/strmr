import { Platform } from 'react-native';

import { getTVScaleFactor } from './breakpoints';

const baseSpacingTokens = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
} as const;

export const spacingTokens = baseSpacingTokens;

export type SpacingTokens = typeof spacingTokens;

// Type for scaled spacing values (numbers instead of literal types)
export type ScaledSpacingTokens = { [K in keyof SpacingTokens]: number };

// Function to get scaled spacing tokens for TV displays
export function getSpacingForTV(isTV: boolean): SpacingTokens | ScaledSpacingTokens {
  if (!isTV) {
    return spacingTokens;
  }

  const scaleFactor = getTVScaleFactor(Platform.OS);
  const round = (value: number) => Math.round(value * 10) / 10;

  return {
    none: 0,
    xs: round(baseSpacingTokens.xs * scaleFactor),
    sm: round(baseSpacingTokens.sm * scaleFactor),
    md: round(baseSpacingTokens.md * scaleFactor),
    lg: round(baseSpacingTokens.lg * scaleFactor),
    xl: round(baseSpacingTokens.xl * scaleFactor),
    '2xl': round(baseSpacingTokens['2xl'] * scaleFactor),
    '3xl': round(baseSpacingTokens['3xl'] * scaleFactor),
  };
}
