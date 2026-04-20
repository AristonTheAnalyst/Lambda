import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { BottomTabBarPropsProvider, TabBarPropsSync, useBottomTabBarProps } from '@/lib/BottomTabBarPropsContext';
import { ExerciseDataProvider } from '@/lib/ExerciseDataContext';
import { TabHeaderProvider, useTabHeader } from '@/lib/TabHeaderContext';
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
] as const;

function BottomNav({ navigation, state }: BottomTabBarProps) {
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

    const rawName = state.routes[state.index]?.name;
    const currentTabName = rawName === 'index' ? 'three' : rawName;
    if (currentTabName === item.tabName) return;

    navigation.navigate(item.tabName);
  }

  return (
    <View
      style={[
        styles.navbar,
        { paddingBottom: insets.bottom, backgroundColor: colors.surface, borderTopColor: colors.border },
      ]}
    >
      {NAV_ITEMS.map((item) => {
        const rawName = state.routes[state.index]?.name;
        const activeTabName = rawName === 'index' ? 'three' : rawName;
        const isActive = activeTabName === item.tabName;
        const iconName =
          'alwaysSolid' in item && item.alwaysSolid
            ? item.icon
            : isActive
              ? item.icon
              : (`${item.icon}-outline` as const);
        return (
          <Pressable
            key={item.route}
            style={({ pressed }) => [styles.navItem, pressed && { opacity: 0.82 }]}
            onPressIn={() => handlePress(item)}
            unstable_pressDelay={0}
            android_disableSound
            android_ripple={Platform.OS === 'android' ? { borderless: true, radius: 60, color: `${colors.muted}35` } : undefined}
            hitSlop={6}
          >
            <Ionicons name={iconName as React.ComponentProps<typeof Ionicons>['name']} size={24} color={isActive ? colors.accent : colors.muted} />
            <Text style={[styles.navLabel, { color: isActive ? colors.accent : colors.muted }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ExternalBottomNav() {
  const p = useBottomTabBarProps();
  if (!p) return null;
  return <BottomNav {...p} />;
}

function FixedTabPageHeader() {
  const { header } = useTabHeader();
  if (!header.title) return null;
  return <PageHeader title={header.title} left={header.left} right={header.right} />;
}

export default function TabLayout() {
  const { colors } = useAppTheme();

  return (
    <ExerciseDataProvider>
      <BottomTabBarPropsProvider>
        <TabHeaderProvider>
          <SyncMount />
          <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <OfflineBanner />
            <SyncErrorBanner />
            <FixedTabPageHeader />
            <View style={{ flex: 1, overflow: 'hidden' }}>
              <Tabs
                screenOptions={{
                  headerShown: false,
                  tabBarStyle: { display: 'none', height: 0 },
                  animation: 'none',
                  lazy: false,
                }}
                tabBar={(props) => <TabBarPropsSync tabBarProps={props} />}
              >
                <Tabs.Screen name="index" options={{ headerShown: false }} />
                <Tabs.Screen name="one" options={{ headerShown: false }} />
                <Tabs.Screen name="two" options={{ headerShown: false }} />
                <Tabs.Screen name="three" options={{ headerShown: false }} />
                <Tabs.Screen name="four" options={{ headerShown: false }} />
                <Tabs.Screen name="five" options={{ headerShown: false }} />
                <Tabs.Screen name="ui-kit" options={{ headerShown: false }} />
                <Tabs.Screen name="six" options={{ headerShown: false }} />
              </Tabs>
            </View>
            <ExternalBottomNav />
          </View>
        </TabHeaderProvider>
      </BottomTabBarPropsProvider>
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
