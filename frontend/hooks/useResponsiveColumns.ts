import type { Breakpoint } from '../theme';
import { useTheme } from '../theme';

export type ColumnOverride = number | Partial<Record<Breakpoint, number>>;

export function useResponsiveColumns(override?: ColumnOverride) {
  const { breakpoint, layout } = useTheme();

  const columns =
    typeof override === 'number' ? override : (override?.[breakpoint] ?? layout.discovery.columns[breakpoint]);
  const gap = layout.discovery.gap[breakpoint];

  return { columns, gap };
}
