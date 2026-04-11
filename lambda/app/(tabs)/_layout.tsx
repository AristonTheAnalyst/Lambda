import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExerciseDataProvider } from '@/lib/ExerciseDataContext';
import { useSyncEngine } from '@/lib/sync/useSyncEngine';
import { useAppTheme } from '@/lib/ThemeContext';
import OfflineBanner from '@/components/OfflineBanner';
import SyncErrorBanner from '@/components/SyncErrorBanner';

/** Mounts the sync engine once for the entire tab session. */
function SyncMount() {
  useSyncEngine();
  return null;
}

const NAV_ITEMS = [
  { route: '/five', tabName: 'five' as const, icon: 'stats-chart' as const, label: 'Statistics', alwaysSolid: true },
  { route: '/four', tabName: 'four' as const, icon: 'list' as const, label: 'Logs' },
  { route: '/three', tabName: 'three' as const, icon: 'play-circle' as const, label: 'Session' },
  { route: '/two', tabName: 'two' as const, icon: 'barbell' as const, label: 'Exercises' },
  { route: '/one', tabName: 'one' as const, icon: 'person' as const, label: 'Profile' },
  { route: '/six', tabName: 'six' as const, icon: 'code' as const, label: 'Dev' },
];

function BottomNav({ navigation, state }: BottomTabBarProps) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

  function handlePress(item: (typeof NAV_ITEMS)[number]) {
    if (item.tabName === 'four') {
      const current = state.routes[state.index];
      if (current?.name === 'four') {
        const nested = current.state as { routes: { name: string }[]; index: number } | undefined;
        const nestedName = nested?.routes?.[nested.index ?? 0]?.name;
        if (nestedName && nestedName !== 'index') {
          navigation.navigate('four', { screen: 'index' });
          return;
        }
        return;
      }
    }
    navigation.navigate(item.tabName);
  }

  return (
    <View style={[
      styles.navbar,
      { paddingBottom: insets.bottom, backgroundColor: colors.surface, borderTopColor: colors.border },
    ]}>
      {NAV_ITEMS.map((item) => {
        const isActive = pathname.startsWith(item.route);
        const iconName =
          'alwaysSolid' in item && item.alwaysSolid
            ? item.icon
            : isActive
              ? item.icon
              : (`${item.icon}-outline` as const);
        return (
          <TouchableOpacity
            key={item.route}
            style={styles.navItem}
            onPress={() => handlePress(item)}
            activeOpacity={0.7}
          >
            <Ionicons name={iconName as React.ComponentProps<typeof Ionicons>['name']} size={24} color={isActive ? colors.accent : colors.muted} />
            <Text style={[styles.navLabel, { color: isActive ? colors.accent : colors.muted }]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const { colors } = useAppTheme();
  return (
    <ExerciseDataProvider>
      <SyncMount />
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <OfflineBanner />
        <SyncErrorBanner />
        <Tabs
          screenOptions={{ headerShown: false }}
          tabBar={(props) => <BottomNav {...props} />}
        >
          <Tabs.Screen name="index"   options={{ headerShown: false }} />
          <Tabs.Screen name="one"     options={{ headerShown: false }} />
          <Tabs.Screen name="two"     options={{ headerShown: false }} />
          <Tabs.Screen name="three"   options={{ headerShown: false }} />
          <Tabs.Screen name="four"    options={{ headerShown: false }} />
          <Tabs.Screen name="five"    options={{ headerShown: false }} />
          <Tabs.Screen name="ui-kit"  options={{ headerShown: false }} />
          <Tabs.Screen name="six"     options={{ headerShown: false }} />
               </Tabs>
      </View>
    </ExerciseDataProvider>
  );
}

const styles = StyleSheet.create({
  navbar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    gap: 3,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
});
