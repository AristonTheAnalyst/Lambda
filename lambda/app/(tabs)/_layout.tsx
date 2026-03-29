import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import T from '@/constants/Theme';
import { ExerciseDataProvider } from '@/lib/ExerciseDataContext';
import { SyncProvider } from '@/lib/sync/syncContext';
import OfflineBanner from '@/components/OfflineBanner';
import { navGuard } from '@/hooks/useNavGuard';

const NAV_ITEMS = [
  { route: '/',        icon: 'person'        as const, label: 'Profile'   },
  { route: '/two',     icon: 'barbell'       as const, label: 'Exercises' },
  { route: '/three',   icon: 'play-circle'   as const, label: 'Session'   },
  { route: '/four',    icon: 'list'          as const, label: 'Logs'      },
  { route: '/ui-kit',  icon: 'color-palette' as const, label: 'UI Kit'    },
];

function BottomNav() {
  const router   = useRouter();
  const pathname = usePathname();
  const insets   = useSafeAreaInsets();

  return (
    <View style={[
      styles.navbar,
      { paddingBottom: insets.bottom, backgroundColor: T.surface, borderTopColor: T.border },
    ]}>
      {NAV_ITEMS.map((item) => {
        const isActive =
          (item.route === '/' && pathname === '/') ||
          (item.route !== '/' && pathname.startsWith(item.route));
        const iconName = isActive ? item.icon : (`${item.icon}-outline` as any);
        return (
          <TouchableOpacity
            key={item.route}
            style={styles.navItem}
            onPress={() => navGuard(() => router.push(item.route as any))}
            activeOpacity={0.7}
          >
            <Ionicons name={iconName} size={24} color={isActive ? T.accent : T.muted} />
            <Text style={[styles.navLabel, { color: isActive ? T.accent : T.muted }]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <ExerciseDataProvider>
    <SyncProvider>
      <View style={{ flex: 1, backgroundColor: T.bg }}>
        <OfflineBanner />
        <Tabs screenOptions={{ tabBarStyle: { display: 'none' } }}>
          <Tabs.Screen name="index"   options={{ headerShown: false }} />
          <Tabs.Screen name="two"     options={{ headerShown: false }} />
          <Tabs.Screen name="three"   options={{ headerShown: false }} />
          <Tabs.Screen name="four"    options={{ headerShown: false }} />
          <Tabs.Screen name="ui-kit"  options={{ headerShown: false }} />
        </Tabs>
        <BottomNav />
      </View>
    </SyncProvider>
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
