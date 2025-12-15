import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

type WarningBannerProps = {
  messages: string[];
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

export function WarningBanner({ messages, style, testID }: WarningBannerProps) {
  const theme = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: theme.colors.status.warning,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.md,
          gap: theme.spacing.xs,
        },
        heading: {
          ...theme.typography.label.md,
          color: theme.colors.text.inverse,
          textTransform: 'uppercase',
          letterSpacing: 1,
        },
        message: {
          ...theme.typography.body.sm,
          color: theme.colors.text.inverse,
        },
      }),
    [theme],
  );

  if (!messages || messages.length === 0) {
    return null;
  }

  return (
    <View style={style} testID={testID}>
      <View style={styles.container}>
        <Text style={styles.heading}>Warning</Text>
        {messages.map((message, index) => (
          <Text key={`${index}-${message}`} style={styles.message}>
            {message}
          </Text>
        ))}
      </View>
    </View>
  );
}
