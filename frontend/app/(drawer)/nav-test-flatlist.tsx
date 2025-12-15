import { FixedSafeAreaView } from '@/components/FixedSafeAreaView';
import {
  DefaultFocus,
  SpatialNavigationFocusableView,
  SpatialNavigationRoot,
  SpatialNavigationScrollView,
} from '@/services/tv-navigation';
import { useTheme } from '@/theme';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

/**
 * Test Page 4: ScrollView with Many Items
 * - Uses SpatialNavigationScrollView
 * - Test performance with many items (50 items)
 * - Test scrolling behavior
 */

const ListItem = React.memo(({ item, onSelect }: { item: { id: string; label: string }; onSelect: () => void }) => {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <SpatialNavigationFocusableView onSelect={onSelect}>
        {({ isFocused }: { isFocused: boolean }) => (
          <View
            style={[
              styles.item,
              { backgroundColor: theme.colors.background.surface },
              isFocused && { backgroundColor: theme.colors.accent.primary, borderColor: 'white' },
            ]}>
            <Text style={[styles.itemText, { color: isFocused ? 'white' : theme.colors.text.primary }]}>
              {item.label}
            </Text>
          </View>
        )}
      </SpatialNavigationFocusableView>
    </View>
  );
});

ListItem.displayName = 'ListItem';

export default function NavTestFlatListScreen() {
  const theme = useTheme();
  const [lastPressed, setLastPressed] = useState<string | null>(null);

  const items = Array.from({ length: 50 }, (_, i) => ({
    id: `item-${i}`,
    label: `Item ${i + 1}`,
  }));

  const handleSelect = (id: string) => {
    setLastPressed(id);
    console.log('[NavTest ScrollView] Selected:', id);
  };

  return (
    <FixedSafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.base }}>
      <Stack.Screen
        options={{
          title: 'Nav Test: ScrollView',
          headerShown: false,
        }}
      />
      <SpatialNavigationRoot>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text.primary }]}>
              Navigation Test: ScrollView with Many Items
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
              50 items with SpatialNavigationScrollView
            </Text>
            {lastPressed && (
              <Text style={[styles.status, { color: theme.colors.accent.primary }]}>Last pressed: {lastPressed}</Text>
            )}
          </View>

          <SpatialNavigationScrollView style={styles.list}>
            {items.map((item, index) =>
              index === 0 ? (
                <DefaultFocus key={item.id}>
                  <ListItem item={item} onSelect={() => handleSelect(item.id)} />
                </DefaultFocus>
              ) : (
                <ListItem key={item.id} item={item} onSelect={() => handleSelect(item.id)} />
              ),
            )}
          </SpatialNavigationScrollView>
        </View>
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
    marginBottom: 20,
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
  list: {
    flex: 1,
  },
  row: {
    marginBottom: 12,
  },
  item: {
    padding: Platform.isTV ? 24 : 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  itemText: {
    fontSize: Platform.isTV ? 20 : 16,
    fontWeight: '600',
  },
});
