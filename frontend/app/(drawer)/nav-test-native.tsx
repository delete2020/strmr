import { FixedSafeAreaView } from '@/components/FixedSafeAreaView';
import { useTheme } from '@/theme';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

/**
 * Test Page 5: Native Pressable (No Spatial Navigation)
 * - Uses raw React Native Pressable
 * - No spatial navigation library wrapper
 * - Tests if the library is causing the clunkiness
 * - Should rely on native TV focus handling
 */

export default function NavTestNativeScreen() {
  const theme = useTheme();
  const [lastPressed, setLastPressed] = useState<string | null>(null);
  const [focusedItem, setFocusedItem] = useState<string | null>(null);

  const items = Array.from({ length: 20 }, (_, i) => ({
    id: `item-${i}`,
    label: `Item ${i + 1}`,
  }));

  const handlePress = (id: string) => {
    setLastPressed(id);
    console.log('[NavTest Native] Pressed:', id);
  };

  return (
    <FixedSafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.base }}>
      <Stack.Screen
        options={{
          title: 'Nav Test: Native',
          headerShown: false,
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text.primary }]}>Navigation Test: Native Pressable</Text>
          <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
            No spatial navigation library, raw React Native only
          </Text>
          {lastPressed && (
            <Text style={[styles.status, { color: theme.colors.accent.primary }]}>Last pressed: {lastPressed}</Text>
          )}
          {focusedItem && (
            <Text style={[styles.status, { color: theme.colors.text.secondary }]}>Focused: {focusedItem}</Text>
          )}
        </View>

        <View style={styles.grid}>
          {items.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={() => handlePress(item.id)}
              onFocus={() => setFocusedItem(item.id)}
              onBlur={() => setFocusedItem(null)}
              // @ts-ignore - TV props not in RN types
              hasTVPreferredFocus={index === 0}
              // @ts-ignore - TV props not in RN types
              tvParallaxProperties={{
                enabled: false,
              }}
              style={({ focused }) => [
                styles.gridItem,
                { backgroundColor: theme.colors.background.surface },
                focused && { backgroundColor: theme.colors.accent.primary, borderColor: 'white' },
              ]}>
              {({ focused }) => (
                <Text style={[styles.itemText, { color: focused ? 'white' : theme.colors.text.primary }]}>
                  {item.label}
                </Text>
              )}
            </Pressable>
          ))}
        </View>

        <View style={[styles.infoBox, { backgroundColor: theme.colors.background.surface }]}>
          <Text style={[styles.infoTitle, { color: theme.colors.text.primary }]}>Note:</Text>
          <Text style={[styles.infoText, { color: theme.colors.text.secondary }]}>
            This test uses only React Native's native focus handling without the spatial navigation library. On Android
            TV, the system should handle D-pad navigation automatically.
          </Text>
        </View>
      </ScrollView>
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
    marginBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    marginBottom: 30,
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
  infoBox: {
    padding: 16,
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: Platform.isTV ? 18 : 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    fontSize: Platform.isTV ? 16 : 14,
    lineHeight: Platform.isTV ? 24 : 20,
  },
});
