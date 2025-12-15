import React, { PropsWithChildren, ReactNode, forwardRef, useImperativeHandle } from 'react';
import { Pressable, ScrollView, StyleProp, View, ViewStyle, ScrollViewProps } from 'react-native';

type FocusRenderFn<TProps extends Record<string, unknown> = Record<string, unknown>> = (
  props: TProps & { isFocused: boolean; hasFocusedChild: boolean },
) => ReactNode;

type MaybeFunctionChild<TProps extends Record<string, unknown> = Record<string, unknown>> =
  | ReactNode
  | FocusRenderFn<TProps>;

type FocusableViewProps = PropsWithChildren<{
  onSelect?: () => void;
  onPress?: () => void;
  onLongSelect?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessible?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  onLayout?: () => void;
}> &
  Record<string, unknown>;

const renderMaybeFunctionChild = (children: MaybeFunctionChild): ReactNode => {
  if (typeof children === 'function') {
    return (children as FocusRenderFn)({ isFocused: false, hasFocusedChild: false });
  }

  return children;
};

export const SpatialNavigationRoot: React.FC<PropsWithChildren<{ isActive?: boolean }>> = ({ children }) => (
  <>{children}</>
);

export const SpatialNavigationNode: React.FC<PropsWithChildren<{ orientation?: 'horizontal' | 'vertical' }>> = ({
  children,
}) => <>{children}</>;

export const SpatialNavigationFocusableView: React.FC<FocusableViewProps> = ({
  children,
  onSelect,
  onPress,
  onLongSelect,
  onFocus,
  onBlur,
  disabled,
  style,
  testID,
  accessible,
  accessibilityLabel,
  accessibilityHint,
  onLayout,
}) => (
  <Pressable
    accessibilityHint={accessibilityHint}
    accessibilityLabel={accessibilityLabel}
    accessible={accessible}
    disabled={disabled}
    onBlur={onBlur}
    onFocus={onFocus}
    onLayout={onLayout}
    onPress={disabled ? undefined : (onSelect ?? onPress)}
    onLongPress={disabled ? undefined : onLongSelect}
    delayLongPress={500}
    style={style}
    testID={testID}
  >
    {renderMaybeFunctionChild(children)}
  </Pressable>
);

export const DefaultFocus: React.FC<PropsWithChildren<Record<string, unknown>>> = ({ children }) => <>{children}</>;

export const SpatialNavigationScrollView = forwardRef<ScrollView, React.ComponentProps<typeof ScrollView>>(
  ({ children, contentInsetAdjustmentBehavior, automaticallyAdjustContentInsets, ...rest }, ref) => (
    <ScrollView
      ref={ref}
      contentInsetAdjustmentBehavior={contentInsetAdjustmentBehavior ?? 'never'}
      automaticallyAdjustContentInsets={automaticallyAdjustContentInsets ?? false}
      {...rest}
    >
      {children}
    </ScrollView>
  ),
);

export type SpatialNavigationVirtualizedListRef = {
  focus: (index: number) => void;
};

interface VirtualizedListProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderItem?: (info: { item: any; index: number }) => ReactNode;
  orientation?: 'horizontal' | 'vertical';
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

export const SpatialNavigationVirtualizedList = forwardRef<
  SpatialNavigationVirtualizedListRef,
  VirtualizedListProps
>(function SpatialNavigationVirtualizedList(
  { data = [], renderItem, orientation = 'vertical', style },
  ref,
) {
  useImperativeHandle(ref, () => ({ focus: () => { } }), []);

  return (
    <ScrollView
      horizontal={orientation === 'horizontal'}
      style={style}
      showsHorizontalScrollIndicator={false}
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustContentInsets={false}
    >
      {renderItem && data.map((item: unknown, index: number) => (
        <View key={((item as Record<string, unknown>)?.key as string) || String(index)}>{renderItem({ item, index })}</View>
      ))}
    </ScrollView>
  );
});

interface VirtualizedGridProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderItem?: (info: { item: any; index: number }) => ReactNode;
  numberOfColumns?: number;
  itemHeight?: number;
  style?: StyleProp<ViewStyle>;
  rowContainerStyle?: StyleProp<ViewStyle>;
  header?: ReactNode;
  headerSize?: number;
  scrollDuration?: number;
  children?: ReactNode;
}

export const SpatialNavigationVirtualizedGrid: React.FC<VirtualizedGridProps> = ({
  data = [],
  renderItem,
  numberOfColumns = 6,
  style,
  rowContainerStyle,
  header,
}) => {
  console.log('[fallback-grid] Rendering with data length:', data.length, 'renderItem:', !!renderItem);
  // Build rows from data
  const rows: unknown[][] = [];
  for (let i = 0; i < data.length; i += numberOfColumns) {
    rows.push(data.slice(i, i + numberOfColumns));
  }
  console.log('[fallback-grid] Built rows:', rows.length);

  return (
    <ScrollView style={style} showsVerticalScrollIndicator={false}>
      {header}
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={[{ flexDirection: 'row' }, rowContainerStyle]}>
          {row.map((item, colIndex) => {
            const index = rowIndex * numberOfColumns + colIndex;
            return (
              <View key={((item as Record<string, unknown>)?.key as string) || String(index)} style={{ flex: 1 }}>
                {renderItem?.({ item, index })}
              </View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
};

export const SpatialNavigation = {
  configureRemoteControl: () => undefined,
};

export const useSpatialNavigator = () => ({
  grabFocus: () => { },
});

export const Directions = {
  UP: 'UP',
  DOWN: 'DOWN',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
  ENTER: 'ENTER',
  LONG_ENTER: 'LONG_ENTER',
} as const;

export const SpatialNavigationEvents = {
  FOCUSED: 'FOCUSED',
  BLURRED: 'BLURRED',
} as const;

export const SpatialNavigationDeviceTypeProvider: React.FC<PropsWithChildren> = ({ children }) => <>{children}</>;

export const SpatialNavigationView: React.FC<PropsWithChildren<{ direction?: 'horizontal' | 'vertical'; style?: StyleProp<ViewStyle> }>> = ({
  children,
  direction = 'vertical',
  style,
}) => (
  <View style={[{ flexDirection: direction === 'horizontal' ? 'row' : 'column' }, style]}>
    {children}
  </View>
);

export type Directions = (typeof Directions)[keyof typeof Directions];
