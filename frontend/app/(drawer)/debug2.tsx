import {
  DefaultFocus,
  SpatialNavigationScrollView,
  SpatialNavigationView,
  SpatialNavigationFocusableView,
  SpatialNavigationRoot,
} from '@/services/tv-navigation';
import { useMenuContext } from '@/components/MenuContext';
import { useIsFocused } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

const FocusableBox = ({ label }: { label: string }) => (
  <SpatialNavigationFocusableView
    onFocus={() => console.log(`[debug2] FOCUS: ${label}`)}
  >
    {({ isFocused }: { isFocused: boolean }) => (
      <View style={[styles.box, isFocused && styles.boxFocused]}>
        <Text style={[styles.label, isFocused && styles.labelFocused]}>{label}</Text>
      </View>
    )}
  </SpatialNavigationFocusableView>
);

const Row = ({ rowNum }: { rowNum: number }) => (
  <SpatialNavigationView direction="horizontal" style={styles.row}>
    <FocusableBox label={`${rowNum}-1`} />
    <FocusableBox label={`${rowNum}-2`} />
    <FocusableBox label={`${rowNum}-3`} />
    <FocusableBox label={`${rowNum}-4`} />
  </SpatialNavigationView>
);

export default function Debug2Screen() {
  const { isOpen: isMenuOpen } = useMenuContext();
  const isFocused = useIsFocused();
  const isActive = isFocused && !isMenuOpen;

  console.log('[debug2] Render - isActive:', isActive);

  return (
    <SpatialNavigationRoot isActive={isActive}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.title}>Debug2 - NonVirtualized Grid</Text>
        <View style={styles.gridContainer}>
          <SpatialNavigationScrollView offsetFromStart={20} useNativeScroll>
            <SpatialNavigationView direction="vertical">
              <DefaultFocus>
                <Row rowNum={1} />
                <Row rowNum={2} />
                <Row rowNum={3} />
                <Row rowNum={4} />
                <Row rowNum={5} />
                <Row rowNum={6} />
                <Row rowNum={7} />
                <Row rowNum={8} />
              </DefaultFocus>
            </SpatialNavigationView>
          </SpatialNavigationScrollView>
        </View>
      </View>
    </SpatialNavigationRoot>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 40,
  },
  title: {
    fontSize: 32,
    color: '#fff',
    marginBottom: 20,
  },
  gridContainer: {
    flex: 1,
    backgroundColor: '#2a2a4e',
    borderRadius: 20,
    padding: 30,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  box: {
    width: 150,
    height: 100,
    backgroundColor: '#333',
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#555',
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxFocused: {
    borderColor: '#0af',
    backgroundColor: '#444',
  },
  label: {
    fontSize: 20,
    color: '#aaa',
  },
  labelFocused: {
    color: '#0af',
  },
});
