import { FocusScrollView, FocusScrollViewRef } from '@/components/FocusScrollView';
import { FocusableItem } from '@/components/FocusableItem';
import { SpatialNavigationRoot } from '@/services/tv-navigation';
import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

// Example of how to use the new focus scrolling components
export const HomeScreenWithFocusScrolling = () => {
    const scrollViewRef = useRef<FocusScrollViewRef>(null);

    const menuItems = [
        { id: 'home', title: 'Home' },
        { id: 'search', title: 'Search' },
        { id: 'watchlist', title: 'Watchlist' },
        { id: 'live', title: 'Live' },
        { id: 'profiles', title: 'Profiles' },
        { id: 'settings', title: 'Settings' },
    ];

    return (
        <SpatialNavigationRoot isActive={true}>
            <FocusScrollView
                ref={scrollViewRef}
                style={styles.container}
                contentContainerStyle={styles.content}
            >
                {menuItems.map((item) => (
                    <FocusableItem
                        key={item.id}
                        itemKey={item.id}
                        scrollViewRef={scrollViewRef}
                        onSelect={() => console.log('Selected:', item.title)}
                        style={styles.menuItem}
                    >
                        {({ isFocused }) => (
                            <View style={[styles.itemContent, isFocused && styles.itemFocused]}>
                                <Text style={[styles.itemText, isFocused && styles.itemTextFocused]}>
                                    {item.title}
                                </Text>
                            </View>
                        )}
                    </FocusableItem>
                ))}
            </FocusScrollView>
        </SpatialNavigationRoot>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 20,
    },
    menuItem: {
        marginBottom: 10,
    },
    itemContent: {
        padding: 15,
        backgroundColor: '#333',
        borderRadius: 8,
    },
    itemFocused: {
        backgroundColor: '#007AFF',
    },
    itemText: {
        color: '#fff',
        fontSize: 16,
    },
    itemTextFocused: {
        fontWeight: 'bold',
    },
});
