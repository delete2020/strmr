import { FixedSafeAreaView } from '@/components/FixedSafeAreaView';
import { DefaultFocus, SpatialNavigationFocusableView, SpatialNavigationRoot } from '@/services/tv-navigation';
import { useTheme } from '@/theme';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

/**
 * Test Page 3: Minimal Overhead
 * - No performance logging
 * - No scroll handlers
 * - Minimal state updates
 * - Test pure navigation performance
 */

const GridItem = React.memo(({ item, onSelect }: { item: { id: string; label: string }; onSelect: () => void }) => {
  const theme = useTheme();

  return (
    <SpatialNavigationFocusableView onSelect={onSelect}>
      {({ isFocused }: { isFocused: boolean }) => (
        <View
          style={[
            styles.gridItem,
            { backgroundColor: theme.colors.background.surface },
            isFocused && { backgroundColor: theme.colors.accent.primary, borderColor: 'white' },
          ]}>
          <Text style={[styles.itemText, { color: isFocused ? 'white' : theme.colors.text.primary }]}>
            {item.label}
          </Text>
        </View>
      )}
    </SpatialNavigationFocusableView>
  );
});

GridItem.displayName = 'GridItem';

export default function NavTestMinimalScreen() {
  const theme = useTheme();
  const [lastPressed, setLastPressed] = useState<string | null>(null);

  const items = Array.from({ length: 20 }, (_, i) => ({
    id: `item-${i}`,
    label: `Item ${i + 1}`,
  }));

  const handleSelect = (id: string) => {
    setLastPressed(id);
  };

  return (
    <FixedSafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.base }}>
      <Stack.Screen
        options={{
          title: 'Nav Test: Minimal',
          headerShown: false,
        }}
      />
      <SpatialNavigationRoot>
        <ScrollView style={styles.container}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text.primary }]}>Navigation Test: Minimal Overhead</Text>
            <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
              No logging, no scroll handlers, pure performance test
            </Text>
            {lastPressed && (
              <Text style={[styles.status, { color: theme.colors.accent.primary }]}>Last pressed: {lastPressed}</Text>
            )}
          </View>

          <View style={styles.grid}>
            {items.map((item, index) =>
              index === 0 ? (
                <DefaultFocus key={item.id}>
                  <GridItem item={item} onSelect={() => handleSelect(item.id)} />
                </DefaultFocus>
              ) : (
                <GridItem key={item.id} item={item} onSelect={() => handleSelect(item.id)} />
              ),
            )}
          </View>
        </ScrollView>
      </SpatialNavigationRoot>
    </FixedSafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: Platform.isTV ? 36 : 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: Platform.isTV ? 20 : 16,
    marginBottom: 8,
  },
  status: {
    fontSize: Platform.isTV ? 18 : 14,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  gridItem: {
    width: Platform.isTV ? 200 : 150,
    height: Platform.isTV ? 120 : 80,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  itemText: {
    fontSize: Platform.isTV ? 20 : 16,
    fontWeight: '600',
  },
});
