import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import T from '@/constants/Theme';
import { ExerciseDataProvider } from '@/lib/ExerciseDataContext';
import { useSyncEngine } from '@/lib/sync/useSyncEngine';
import OfflineBanner from '@/components/OfflineBanner';

/** Mounts the sync engine once for the entire tab session. */
function SyncMount() {
  useSyncEngine();
  return null;
}

const NAV_ITEMS = [
  { route: '/five',    icon: 'stats-chart'   as const, label: 'Statistics', alwaysSolid: true },
  { route: '/four',    icon: 'list'          as const, label: 'Logs'       },
  { route: '/three',   icon: 'play-circle'   as const, label: 'Session'    },
  { route: '/two',     icon: 'barbell'       as const, label: 'Exercises'  },
  { route: '/one',     icon: 'person'        as const, label: 'Profile'    },
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
        const isActive = pathname.startsWith(item.route);
        const iconName = (item as any).alwaysSolid ? item.icon : isActive ? item.icon : (`${item.icon}-outline` as any);
        return (
          <TouchableOpacity
            key={item.route}
            style={styles.navItem}
            onPress={() => router.navigate(item.route as any)}
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
      <SyncMount />
      <View style={{ flex: 1, backgroundColor: T.bg }}>
        <OfflineBanner />
        <Tabs screenOptions={{ tabBarStyle: { display: 'none' } }}>
          <Tabs.Screen name="index"   options={{ headerShown: false }} />
          <Tabs.Screen name="one"     options={{ headerShown: false }} />
          <Tabs.Screen name="two"     options={{ headerShown: false }} />
          <Tabs.Screen name="three"   options={{ headerShown: false }} />
          <Tabs.Screen name="four"    options={{ headerShown: false }} />
          <Tabs.Screen name="five"    options={{ headerShown: false }} />
          <Tabs.Screen name="ui-kit"  options={{ headerShown: false }} />
        </Tabs>
        <BottomNav />
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
