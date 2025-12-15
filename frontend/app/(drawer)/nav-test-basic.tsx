import { FixedSafeAreaView } from '@/components/FixedSafeAreaView';
import { DefaultFocus, SpatialNavigationFocusableView, SpatialNavigationRoot } from '@/services/tv-navigation';
import { useTheme } from '@/theme';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

/**
 * Test Page 1: Basic Spatial Navigation
 * - Simple grid of focusable items
 * - No manual focus keys
 * - Lets spatial navigation auto-detect neighbors
 */

export default function NavTestBasicScreen() {
  const theme = useTheme();
  const [lastPressed, setLastPressed] = useState<string | null>(null);
  const [focusLog, setFocusLog] = useState<string[]>([]);

  const items = Array.from({ length: 20 }, (_, i) => ({
    id: `item-${i}`,
    label: `Item ${i + 1}`,
  }));

  const handleSelect = (id: string) => {
    setLastPressed(id);
    console.log('[NavTest Basic] Selected:', id);
  };

  const handleFocus = (id: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `${timestamp} - ${id}`;
    setFocusLog((prev) => [logEntry, ...prev.slice(0, 9)]); // Keep last 10
    console.log('[NavTest Basic] Focused:', id);
  };

  return (
    <FixedSafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.base }}>
      <Stack.Screen
        options={{
          title: 'Nav Test: Basic',
          headerShown: false,
        }}
      />
      <SpatialNavigationRoot>
        <ScrollView style={styles.container}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text.primary }]}>
              Navigation Test: Basic Spatial Navigation
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
              Auto-detected neighbors, no manual focus keys
            </Text>
            {lastPressed && (
              <Text style={[styles.status, { color: theme.colors.accent.primary }]}>Last pressed: {lastPressed}</Text>
            )}
          </View>

          <View style={styles.grid}>
            {items.map((item, index) => (
              <DefaultFocus key={item.id} enable={index === 0}>
                <SpatialNavigationFocusableView
                  onSelect={() => handleSelect(item.id)}
                  onFocus={() => handleFocus(item.id)}>
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
              </DefaultFocus>
            ))}
          </View>

          {/* Focus log */}
          <View style={[styles.logContainer, { backgroundColor: theme.colors.background.surface }]}>
            <Text style={[styles.logTitle, { color: theme.colors.text.primary }]}>Focus Log (last 10):</Text>
            {focusLog.map((entry, index) => (
              <Text key={index} style={[styles.logEntry, { color: theme.colors.text.secondary }]}>
                {entry}
              </Text>
            ))}
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
  logContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  logTitle: {
    fontSize: Platform.isTV ? 18 : 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  logEntry: {
    fontSize: Platform.isTV ? 14 : 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
