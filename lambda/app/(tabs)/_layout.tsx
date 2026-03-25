import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, useRouter, usePathname } from 'expo-router';
import T from '@/constants/Theme';
import { ExerciseDataProvider } from '@/lib/ExerciseDataContext';
import { DrawerContext, useDrawer } from '@/lib/DrawerContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function HamburgerButton() {
  const { openDrawer } = useDrawer();
  return (
    <TouchableOpacity onPress={openDrawer} style={styles.hamburgerBtn}>
      <FontAwesome name="bars" size={20} color={T.primary} />
    </TouchableOpacity>
  );
}

const NAV_ITEMS = [
  { label: 'User Profile', route: '/', icon: 'user' as const },
  { label: 'Admin Exercises', route: '/two', icon: 'list' as const },
  { label: 'Workout Log', route: '/three', icon: 'heartbeat' as const },
];

export default function TabLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const navTo = (route: string) => {
    closeDrawer();
    router.push(route as any);
  };

  return (
    <ExerciseDataProvider>
    <DrawerContext.Provider value={{ openDrawer }}>
      <Tabs
        screenOptions={{
          tabBarStyle: { display: 'none' },
          headerLeft: () => <HamburgerButton />,
          headerStyle: { backgroundColor: T.bg },
          headerTitleStyle: { color: T.primary },
        }}>
        <Tabs.Screen name="index" options={{ title: 'User Profile' }} />
        <Tabs.Screen name="two" options={{ headerShown: false }} />
        <Tabs.Screen name="three" options={{ title: 'Workout Log' }} />
      </Tabs>

      <Modal
        visible={drawerOpen}
        transparent
        animationType="fade"
        onRequestClose={closeDrawer}>
        <TouchableOpacity
          style={styles.overlay}
          onPress={closeDrawer}
          activeOpacity={1}>
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.drawer, { backgroundColor: T.surface }]}
            onPress={() => {}}>
            <SafeAreaView style={{ flex: 1 }}>
              <Text style={[styles.drawerTitle, { color: T.primary }]}>
                Menu
              </Text>
              {NAV_ITEMS.map((item) => {
                const isActive =
                  (item.route === '/' && pathname === '/') ||
                  (item.route !== '/' && pathname.startsWith(item.route));
                return (
                  <TouchableOpacity
                    key={item.route}
                    style={[
                      styles.navItem,
                      isActive && { backgroundColor: T.accentBg },
                    ]}
                    onPress={() => navTo(item.route)}>
                    <FontAwesome
                      name={item.icon}
                      size={18}
                      color={isActive ? T.accent : T.muted}
                    />
                    <Text
                      style={[
                        styles.navLabel,
                        { color: isActive ? T.accent : T.primary },
                      ]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </SafeAreaView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </DrawerContext.Provider>
    </ExerciseDataProvider>
  );
}

const styles = StyleSheet.create({
  hamburgerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    flexDirection: 'row',
  },
  drawer: {
    width: SCREEN_WIDTH * 0.72,
    paddingTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  drawerTitle: {
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#444',
    marginBottom: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 14,
    borderRadius: 8,
    marginHorizontal: 8,
    marginVertical: 2,
  },
  navLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
});
