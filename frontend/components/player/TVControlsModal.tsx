import React from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';
import { SpatialNavigationRoot } from '@/services/tv-navigation';

interface TVControlsModalProps {
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
  /** When true, deactivates this modal's spatial navigation root to let a child modal take over */
  isChildModalOpen?: boolean;
  /** When true, deactivates spatial navigation (e.g., during D-pad seeking) */
  isSeeking?: boolean;
}

/**
 * Wrapper component that renders controls inside a transparent Modal on TV platforms.
 * This prevents the menu button from closing the player while controls are visible -
 * instead, pressing menu will trigger onRequestClose which hides the controls.
 *
 * The Modal creates a new view hierarchy, so we need a SpatialNavigationRoot inside
 * to make button selection work with the spatial navigation system.
 */
const TVControlsModal: React.FC<TVControlsModalProps> = ({
  visible,
  onRequestClose,
  children,
  isChildModalOpen = false,
  isSeeking = false,
}) => {
  if (!Platform.isTV) {
    // On non-TV platforms, render children directly without Modal wrapper
    return visible ? <>{children}</> : null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onRequestClose}
      supportedOrientations={['landscape']}>
      <SpatialNavigationRoot isActive={visible && !isChildModalOpen && !isSeeking}>
        <View style={styles.modalContainer} pointerEvents="box-none" renderToHardwareTextureAndroid={true}>
          {children}
        </View>
      </SpatialNavigationRoot>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default TVControlsModal;
