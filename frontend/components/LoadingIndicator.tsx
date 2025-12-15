import { View, ActivityIndicator, StyleSheet } from 'react-native';

import { useTheme } from '@/theme';

const LoadingIndicator = () => {
  const theme = useTheme();

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.colors.accent.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LoadingIndicator;
