import { useCallback, useRef } from 'react';
import { Platform } from 'react-native';

interface FocusScrollingOptions {
    margin?: number;
    animated?: boolean;
    scrollViewRef: React.RefObject<any>;
}

interface ItemLayout {
    x: number;
    y: number;
    width: number;
    height: number;
}

export const useFocusScrolling = (options: FocusScrollingOptions) => {
    const { margin = 20, animated = true, scrollViewRef } = options;
    const itemLayouts = useRef<{ [key: string]: ItemLayout }>({});

    const captureLayout = useCallback((itemKey: string, event: any) => {
        const { x, y, width, height } = event.nativeEvent.layout;
        itemLayouts.current[itemKey] = { x, y, width, height };
    }, []);

    const scrollToItem = useCallback((itemKey: string) => {
        if (!Platform.isTV || !scrollViewRef.current) {
            return;
        }

        const layout = itemLayouts.current[itemKey];
        if (!layout) {
            return;
        }

        const scrollView = scrollViewRef.current;

        // Try different methods to get scroll view dimensions and position
        let scrollViewHeight = 400;
        let currentOffset = 0;

        // Method 1: Try getScrollableNode
        if (scrollView.getScrollableNode) {
            const scrollableNode = scrollView.getScrollableNode();
            if (scrollableNode) {
                scrollViewHeight = scrollableNode.clientHeight || 400;
                currentOffset = scrollableNode.scrollTop || 0;
            }
        }

        // Method 2: Try direct properties
        if (scrollView.clientHeight) {
            scrollViewHeight = scrollView.clientHeight;
        }
        if (scrollView.scrollTop !== undefined) {
            currentOffset = scrollView.scrollTop;
        }

        // Method 3: Try getInnerViewNode
        if (scrollView.getInnerViewNode) {
            const innerNode = scrollView.getInnerViewNode();
            if (innerNode) {
                scrollViewHeight = innerNode.clientHeight || 400;
                currentOffset = innerNode.scrollTop || 0;
            }
        }

        const visibleTop = currentOffset + margin;
        const visibleBottom = currentOffset + scrollViewHeight - margin;
        const itemTop = layout.y;
        const itemBottom = layout.y + layout.height;

        let nextOffset = currentOffset;
        if (itemTop < visibleTop) {
            nextOffset = Math.max(0, itemTop - margin);
        } else if (itemBottom > visibleBottom) {
            nextOffset = Math.max(0, itemBottom - scrollViewHeight + margin);
        } else {
            return; // Item is already visible
        }

        // Try different scroll methods
        if (scrollView.scrollTo) {
            scrollView.scrollTo({ y: nextOffset, animated });
        } else if (scrollView.scrollToOffset) {
            scrollView.scrollToOffset({ offset: nextOffset, animated });
        }
    }, [margin, animated, scrollViewRef]);

    const createFocusHandler = useCallback((itemKey: string) => {
        return () => scrollToItem(itemKey);
    }, [scrollToItem]);

    const createLayoutHandler = useCallback((itemKey: string) => {
        return (event: any) => captureLayout(itemKey, event);
    }, [captureLayout]);

    return {
        scrollToItem,
        createFocusHandler,
        createLayoutHandler,
        itemLayouts: itemLayouts.current,
    };
};
