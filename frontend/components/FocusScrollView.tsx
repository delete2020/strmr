import { useFocusScrolling } from '@/hooks/useFocusScrolling';
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { ScrollView, ScrollViewProps } from 'react-native';

interface FocusScrollViewProps extends ScrollViewProps {
  children: React.ReactNode;
}

export interface FocusScrollViewRef {
  scrollToItem: (itemKey: string) => void;
  scrollTo: (options: { x?: number; y?: number; animated?: boolean }) => void;
}

export const FocusScrollView = forwardRef<FocusScrollViewRef, FocusScrollViewProps>(({ children, ...props }, ref) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const { scrollToItem } = useFocusScrolling({ scrollViewRef });

  useImperativeHandle(ref, () => ({
    scrollToItem,
    scrollTo: (options) => scrollViewRef.current?.scrollTo(options),
  }));

  return (
    <ScrollView ref={scrollViewRef} {...props}>
      {children}
    </ScrollView>
  );
});

FocusScrollView.displayName = 'FocusScrollView';
