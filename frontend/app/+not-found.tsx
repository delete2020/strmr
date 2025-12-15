import { Link, Stack } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '@/theme';
import type { NovaTheme } from '@/theme';

export default function NotFoundScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.errorText}>404</Text>
        <Text style={styles.messageText}>This screen doesn't exist.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}

const createStyles = (theme: NovaTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing['2xl'],
      backgroundColor: theme.colors.background.base,
      gap: theme.spacing.lg,
    },
    errorText: {
      ...theme.typography.title.xl,
      color: theme.colors.status.danger,
      fontSize: theme.typography.title.xl.fontSize * 1.6,
    },
    messageText: {
      ...theme.typography.body.lg,
      color: theme.colors.text.secondary,
      textAlign: 'center',
    },
    link: {
      marginTop: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing['2xl'],
      backgroundColor: theme.colors.accent.primary,
      borderRadius: theme.radius.md,
    },
    linkText: {
      ...theme.typography.label.md,
      color: theme.colors.background.base,
      textAlign: 'center',
    },
  });
