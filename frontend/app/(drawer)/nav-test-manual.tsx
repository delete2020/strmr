import { FixedSafeAreaView } from '@/components/FixedSafeAreaView';
import { DefaultFocus, SpatialNavigationFocusableView, SpatialNavigationRoot } from '@/services/tv-navigation';
import { useTheme } from '@/theme';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

/**
 * Test Page 2: Manual Focus Keys
 * - Explicit focus key relationships
 * - Predictable navigation paths
 * - Test if manual configuration improves responsiveness
 */

export default function NavTestManualScreen() {
  const theme = useTheme();
  const [lastPressed, setLastPressed] = useState<string | null>(null);
  const [navigationTime, setNavigationTime] = useState<number | null>(null);
  const lastFocusTime = React.useRef<number>(Date.now());

  const items = Array.from({ length: 20 }, (_, i) => ({
    id: `item-${i}`,
    label: `Item ${i + 1}`,
    focusKey: `manual-${i}`,
  }));

  const handleSelect = (id: string) => {
    setLastPressed(id);
    console.log('[NavTest Manual] Selected:', id);
  };

  const handleFocus = (id: string) => {
    const now = Date.now();
    const timeSinceLastFocus = now - lastFocusTime.current;
    setNavigationTime(timeSinceLastFocus);
    lastFocusTime.current = now;
    console.log('[NavTest Manual] Focused:', id, `(${timeSinceLastFocus}ms)`);
  };

  return (
    <FixedSafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.base }}>
      <Stack.Screen
        options={{
          title: 'Nav Test: Manual Keys',
          headerShown: false,
        }}
      />
      <SpatialNavigationRoot>
        <ScrollView style={styles.container}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text.primary }]}>Navigation Test: Manual Focus Keys</Text>
            <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
              Explicit focus key relationships for predictable navigation
            </Text>
            {lastPressed && (
              <Text style={[styles.status, { color: theme.colors.accent.primary }]}>Last pressed: {lastPressed}</Text>
            )}
            {navigationTime !== null && (
              <Text style={[styles.status, { color: theme.colors.text.secondary }]}>
                Navigation time: {navigationTime}ms
              </Text>
            )}
          </View>

          <View style={styles.grid}>
            {items.map((item, index) => (
              <DefaultFocus key={item.id} enable={index === 0}>
                <SpatialNavigationFocusableView
                  focusKey={item.focusKey}
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
                      <Text style={[styles.focusKeyText, { color: isFocused ? 'white' : theme.colors.text.secondary }]}>
                        {item.focusKey}
                      </Text>
                    </View>
                  )}
                </SpatialNavigationFocusableView>
              </DefaultFocus>
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
    marginBottom: 4,
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
  focusKeyText: {
    fontSize: Platform.isTV ? 12 : 10,
    marginTop: 4,
  },
});
