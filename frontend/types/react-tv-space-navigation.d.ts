declare module 'react-tv-space-navigation' {

    export interface SpatialNavigationFocusableViewProps {
        onLongSelect?: () => void;
        focusKey?: string;
    }

    export interface SpatialNavigationNodeProps {
        focusKey?: string;
    }
}

