import { FixedSafeAreaView } from '@/components/FixedSafeAreaView';
import MediaGrid from '@/components/MediaGrid';
import { useMenuContext } from '@/components/MenuContext';
import { useWatchlist } from '@/components/WatchlistContext';
import type { Title } from '@/services/api';
import {
  DefaultFocus,
  SpatialNavigationFocusableView,
  SpatialNavigationNode,
  SpatialNavigationRoot,
  useSpatialNavigator,
} from '@/services/tv-navigation';
import { mapWatchlistToTitles } from '@/services/watchlist';
import type { NovaTheme } from '@/theme';
import { useTheme } from '@/theme';
import { Direction } from '@bam.tech/lrud';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

type WatchlistTitle = Title & { uniqueKey?: string };

export default function WatchlistScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const isFocused = useIsFocused();
  const { isOpen: isMenuOpen, openMenu } = useMenuContext();
  const isActive = isFocused && !isMenuOpen;

  const { items, loading, error } = useWatchlist();
  const watchlistTitles = useMemo(() => mapWatchlistToTitles(items), [items]);
  const [filter, setFilter] = useState<'all' | 'movie' | 'series'>('all');
  const [focusedFilterIndex, setFocusedFilterIndex] = useState<number | null>(null);
  const navigator = useSpatialNavigator();

  const filteredWatchlistTitles = useMemo(() => {
    if (filter === 'all') {
      return watchlistTitles;
    }

    return watchlistTitles.filter((title) => title.mediaType === filter);
  }, [filter, watchlistTitles]);

  const filterOptions: Array<{ key: 'all' | 'movie' | 'series'; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'movie', label: 'Movies' },
    { key: 'series', label: 'TV Shows' },
  ];

  const onDirectionHandledWithoutMovement = useCallback(
    (movement: Direction) => {
      // Enable horizontal step within the filter row when no movement occurred
      if ((movement === 'right' || movement === 'left') && focusedFilterIndex !== null) {
        const delta = movement === 'right' ? 1 : -1;
        const nextIndex = focusedFilterIndex + delta;
        if (nextIndex >= 0 && nextIndex < filterOptions.length) {
          navigator.grabFocus(`watchlist-filter-${filterOptions[nextIndex].key}`);
          return;
        }
      }

      if (movement === 'left') {
        openMenu();
      }
    },
    [filterOptions, focusedFilterIndex, navigator, openMenu],
  );

  const handleTitlePress = useCallback(
    (title: WatchlistTitle) => {
      router.push({
        pathname: '/details',
        params: {
          title: title.name,
          titleId: title.id ?? '',
          mediaType: title.mediaType ?? 'movie',
          description: title.overview ?? '',
          headerImage: title.backdrop?.url ?? title.poster?.url ?? '',
          posterUrl: title.poster?.url ?? '',
          backdropUrl: title.backdrop?.url ?? '',
          tmdbId: title.tmdbId ? String(title.tmdbId) : '',
          imdbId: title.imdbId ?? '',
          tvdbId: title.tvdbId ? String(title.tvdbId) : '',
          year: title.year ? String(title.year) : '',
        },
      });
    },
    [router],
  );

  const filterLabel = filter === 'movie' ? 'Movies' : filter === 'series' ? 'TV Shows' : 'All Titles';



  return (
    <SpatialNavigationRoot isActive={isActive} onDirectionHandledWithoutMovement={onDirectionHandledWithoutMovement}>
      <Stack.Screen options={{ headerShown: false }} />
      <FixedSafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          {/* Arrange filters and grid vertically for predictable TV navigation */}
          <SpatialNavigationNode orientation="vertical">
            <View style={styles.controlsRow}>
              {/* Make filters a vertical list on TV for Up/Down navigation */}
              <SpatialNavigationNode orientation="horizontal">
                <View style={[styles.filtersRow]}>
                  <DefaultFocus>
                    <SpatialNavigationFocusableView
                      focusKey={`watchlist-filter-${filterOptions[0].key}`}
                      onFocus={() => setFocusedFilterIndex(0)}
                      onSelect={() => setFilter(filterOptions[0].key)}>
                      {({ isFocused }: { isFocused: boolean }) => {
                        const isActive = filter === filterOptions[0].key;
                        const isActiveFocused = isActive && isFocused;
                        return (
                          <View
                            style={[
                              styles.filterButton,
                              Platform.isTV ? styles.filterButtonTV : styles.filterButtonMobile,
                              styles.filterButtonSpacing,
                              Platform.isTV && styles.filterButtonSpacingTV,
                              isFocused && styles.filterButtonFocused,
                              isActive && (isFocused ? styles.filterButtonActiveFocused : styles.filterButtonActive),
                            ]}>
                            <Text
                              style={[
                                Platform.isTV ? styles.filterButtonTextTV : styles.filterButtonText,
                                isFocused && !isActive && styles.filterButtonTextFocused,
                                isActive && !isFocused && styles.filterButtonTextActive,
                                isActiveFocused && styles.filterButtonTextActiveFocused,
                              ]}>
                              {filterOptions[0].label}
                            </Text>
                          </View>
                        );
                      }}
                    </SpatialNavigationFocusableView>
                  </DefaultFocus>

                  {filterOptions.slice(1).map((option, index, list) => (
                    <SpatialNavigationFocusableView
                      key={option.key}
                      focusKey={`watchlist-filter-${option.key}`}
                      onFocus={() => setFocusedFilterIndex(index + 1)}
                      onSelect={() => setFilter(option.key)}>
                      {({ isFocused }: { isFocused: boolean }) => {
                        const isActive = filter === option.key;
                        const isActiveFocused = isActive && isFocused;
                        return (
                          <View
                            style={[
                              styles.filterButton,
                              Platform.isTV ? styles.filterButtonTV : styles.filterButtonMobile,
                              index !== list.length - 1 && styles.filterButtonSpacing,
                              Platform.isTV && index !== list.length - 1 && styles.filterButtonSpacingTV,
                              isFocused && styles.filterButtonFocused,
                              isActive && (isFocused ? styles.filterButtonActiveFocused : styles.filterButtonActive),
                            ]}>
                            <Text
                              style={[
                                Platform.isTV ? styles.filterButtonTextTV : styles.filterButtonText,
                                isFocused && !isActive && styles.filterButtonTextFocused,
                                isActive && !isFocused && styles.filterButtonTextActive,
                                isActiveFocused && styles.filterButtonTextActiveFocused,
                              ]}>
                              {option.label}
                            </Text>
                          </View>
                        );
                      }}
                    </SpatialNavigationFocusableView>
                  ))}
                </View>
              </SpatialNavigationNode>
            </View>

            <MediaGrid
              title={`Your Watchlist · ${filterLabel}`}
              items={filteredWatchlistTitles}
              loading={loading}
              error={error}
              onItemPress={handleTitlePress}
              layout="grid"
              numColumns={Platform.isTV ? 6 : 7}
              defaultFocusFirstItem={!theme.breakpoint || theme.breakpoint !== 'compact'}
            />
          </SpatialNavigationNode>

          {Platform.isTV && (
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.8)']}
              locations={[0, 1]}
              start={{ x: 0.5, y: 0.6 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.bottomGradient}
            />
          )}
        </View>
      </FixedSafeAreaView>
    </SpatialNavigationRoot>
  );
}

const createStyles = (theme: NovaTheme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: Platform.isTV ? 'transparent' : theme.colors.background.base,
    },
    container: {
      flex: 1,
      backgroundColor: Platform.isTV ? 'transparent' : theme.colors.background.base,
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.xl,
    },
    controlsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginBottom: theme.spacing.sm,
    },
    filtersRow: {
      flexDirection: 'row',
      marginBottom: theme.spacing.sm,
    },
    filtersRowTV: {
      flexDirection: 'column',
    },
    filterButton: {
      backgroundColor: theme.colors.overlay.button,
      borderColor: 'transparent',
      alignItems: 'center',
    },
    filterButtonMobile: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      borderWidth: 3,
      borderRadius: theme.radius.md,
    },
    filterButtonTV: {
      paddingVertical: theme.spacing.md * 1.375,
      paddingHorizontal: theme.spacing.lg * 1.375,
      justifyContent: 'center',
      borderWidth: 4,
      borderRadius: theme.radius.md * 1.375,
    },
    filterButtonSpacing: {
      marginRight: theme.spacing.md,
    },
    filterButtonSpacingTV: {
      marginRight: theme.spacing.lg,
      marginBottom: 0,
    },
    filterButtonFocused: {
      backgroundColor: theme.colors.accent.primary,
      borderColor: theme.colors.accent.primary,
    },
    filterButtonActive: {
      backgroundColor: theme.colors.background.elevated,
      borderColor: theme.colors.accent.primary,
    },
    filterButtonActiveFocused: {
      backgroundColor: theme.colors.accent.primary,
      borderColor: theme.colors.text.primary,
    },
    filterButtonText: {
      ...theme.typography.label.md,
      color: theme.colors.text.primary,
      textAlign: 'center',
    },
    filterButtonTextTV: {
      ...theme.typography.label.md,
      fontSize: theme.typography.label.md.fontSize * 1.375,
      lineHeight: theme.typography.label.md.lineHeight * 1.375,
      color: theme.colors.text.primary,
      textAlign: 'center',
    },
    filterButtonTextFocused: {
      color: theme.colors.text.inverse,
    },
    filterButtonTextActive: {
      color: theme.colors.accent.primary,
    },
    filterButtonTextActiveFocused: {
      color: theme.colors.text.inverse,
    },
    bottomGradient: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: '40%',
    },
  });
