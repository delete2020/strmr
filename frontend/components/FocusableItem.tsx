import { useFocusScrolling } from '@/hooks/useFocusScrolling';
import { SpatialNavigationFocusableView } from '@/services/tv-navigation';
import React, { forwardRef } from 'react';
import { View, ViewProps } from 'react-native';

interface FocusableItemProps extends Omit<ViewProps, 'children'> {
  itemKey: string;
  scrollViewRef: React.RefObject<any>;
  onSelect?: () => void;
  onFocus?: () => void;
  children: (props: { isFocused: boolean }) => React.ReactNode;
}

export const FocusableItem = forwardRef<any, FocusableItemProps>(
  ({ itemKey, scrollViewRef, onSelect, onFocus, children, style, ...props }, ref) => {
    const { createFocusHandler, createLayoutHandler } = useFocusScrolling({ scrollViewRef });

    const handleFocus = () => {
      createFocusHandler(itemKey)();
      onFocus?.();
    };

    return (
      <SpatialNavigationFocusableView ref={ref} onSelect={onSelect} onFocus={handleFocus}>
        {({ isFocused }: { isFocused: boolean }) => (
          <View style={style} onLayout={createLayoutHandler(itemKey)} {...props}>
            {children({ isFocused })}
          </View>
        )}
      </SpatialNavigationFocusableView>
    );
  },
);

FocusableItem.displayName = 'FocusableItem';
