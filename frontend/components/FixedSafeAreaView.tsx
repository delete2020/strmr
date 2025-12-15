import { forwardRef, PropsWithChildren, useMemo } from 'react';
import { Platform, StyleProp, View, ViewProps, ViewStyle } from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';

type Edge = 'top' | 'bottom' | 'left' | 'right';

type FixedSafeAreaViewProps = PropsWithChildren<
  ViewProps & {
    edges?: Edge[];
    paddingBehavior?: 'padding' | 'margin';
    style?: StyleProp<ViewStyle>;
  }
>;

const EDGE_DEFAULTS: Edge[] = ['top'];

const createEdgeSpacing = (insets: EdgeInsets, edges: Edge[], behavior: 'padding' | 'margin') => {
  const spacing = {
    top: edges.includes('top') ? insets.top : 0,
    bottom: edges.includes('bottom') ? insets.bottom : 0,
    left: edges.includes('left') ? insets.left : 0,
    right: edges.includes('right') ? insets.right : 0,
  };

  if (behavior === 'margin') {
    return {
      marginTop: spacing.top,
      marginBottom: spacing.bottom,
      marginLeft: spacing.left,
      marginRight: spacing.right,
    } satisfies ViewStyle;
  }

  return {
    paddingTop: spacing.top,
    paddingBottom: spacing.bottom,
    paddingLeft: spacing.left,
    paddingRight: spacing.right,
  } satisfies ViewStyle;
};

export const FixedSafeAreaView = forwardRef<View, FixedSafeAreaViewProps>(
  ({ edges = EDGE_DEFAULTS, paddingBehavior = 'padding', style, children, ...viewProps }, ref) => {
    const insets = useSafeAreaInsets();

    const edgeStyles = useMemo(() => {
      if (Platform.OS === 'android' && paddingBehavior === 'margin') {
        // Margin behavior breaks translucent Android status bar; default to padding instead.
        return createEdgeSpacing(insets, edges, 'padding');
      }

      return createEdgeSpacing(insets, edges, paddingBehavior);
    }, [paddingBehavior, insets, edges]);

    return (
      <View ref={ref} style={[edgeStyles, style]} {...viewProps}>
        {children}
      </View>
    );
  },
);

FixedSafeAreaView.displayName = 'FixedSafeAreaView';
