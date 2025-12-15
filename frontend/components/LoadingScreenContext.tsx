import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import StrmrLoadingScreen from '@/app/strmr-loading';
import { useBackendSettings } from './BackendSettingsContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

type LoadingScreenContextValue = {
  showLoadingScreen: () => void;
  hideLoadingScreen: () => void;
  isLoadingScreenVisible: boolean;
  setOnCancel: (callback: (() => void) | null) => void;
};

const LoadingScreenContext = createContext<LoadingScreenContextValue | null>(null);

export function useLoadingScreen(): LoadingScreenContextValue {
  const context = useContext(LoadingScreenContext);
  if (!context) {
    throw new Error('useLoadingScreen must be used within a LoadingScreenProvider.');
  }
  return context;
}

type LoadingScreenProviderProps = {
  children: ReactNode;
};

export function LoadingScreenProvider({ children }: LoadingScreenProviderProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [onCancelCallback, setOnCancelCallback] = useState<(() => void) | null>(null);
  const { settings, userSettings } = useBackendSettings();
  // User settings take precedence over global settings
  const isLoadingScreenEnabled = userSettings?.playback?.useLoadingScreen ?? settings?.playback?.useLoadingScreen ?? false;
  const translateX = useRef(new Animated.Value(0)).current;

  const showLoadingScreen = useCallback(() => {
    // Only show if the feature is enabled in settings
    if (isLoadingScreenEnabled) {
      translateX.setValue(0);
      setIsVisible(true);
    }
  }, [isLoadingScreenEnabled, translateX]);

  const hideLoadingScreen = useCallback(() => {
    setIsVisible(false);
    translateX.setValue(0);
  }, [translateX]);

  const setOnCancel = useCallback((callback: (() => void) | null) => {
    setOnCancelCallback(() => callback);
  }, []);

  const handleCancel = useCallback(() => {
    // Animate out before hiding
    Animated.timing(translateX, {
      toValue: SCREEN_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      // Call the cancel callback if set
      if (onCancelCallback) {
        onCancelCallback();
      }
      hideLoadingScreen();
    });
  }, [onCancelCallback, hideLoadingScreen, translateX]);

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX(10)
        .onChange((event) => {
          // Only allow dragging to the right
          if (event.translationX > 0) {
            translateX.setValue(event.translationX);
          }
        })
        .onEnd((event) => {
          // Detect swipe from left edge (iOS style back gesture)
          // or swipe right with sufficient velocity
          const shouldDismiss = event.translationX > SCREEN_WIDTH * 0.3 || event.velocityX > 500;

          if (shouldDismiss) {
            // Animate to full width and dismiss
            Animated.timing(translateX, {
              toValue: SCREEN_WIDTH,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              if (onCancelCallback) {
                onCancelCallback();
              }
              hideLoadingScreen();
            });
          } else {
            // Snap back to original position
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              damping: 20,
              stiffness: 300,
            }).start();
          }
        })
        .runOnJS(true),
    [translateX, onCancelCallback, hideLoadingScreen],
  );

  const value = useMemo<LoadingScreenContextValue>(
    () => ({
      showLoadingScreen,
      hideLoadingScreen,
      isLoadingScreenVisible: isVisible,
      setOnCancel,
    }),
    [hideLoadingScreen, showLoadingScreen, isVisible, setOnCancel],
  );

  return (
    <LoadingScreenContext.Provider value={value}>
      {children}
      {isVisible && (
        <Modal
          transparent={true}
          visible={isVisible}
          animationType="none"
          statusBarTranslucent={Platform.OS === 'android'}
          onRequestClose={handleCancel}
          style={styles.modal}>
          <StatusBar hidden />
          <GestureDetector gesture={swipeGesture}>
            <Animated.View
              renderToHardwareTextureAndroid={true}
              style={[
                styles.animatedContainer,
                {
                  transform: [{ translateX }],
                },
              ]}>
              <StrmrLoadingScreen />
            </Animated.View>
          </GestureDetector>
        </Modal>
      )}
    </LoadingScreenContext.Provider>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 0,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  animatedContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
