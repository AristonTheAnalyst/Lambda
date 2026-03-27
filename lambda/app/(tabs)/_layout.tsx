import React, { useState, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, useRouter, usePathname } from 'expo-router';
import T from '@/constants/Theme';
import { ExerciseDataProvider } from '@/lib/ExerciseDataContext';
import { DrawerContext } from '@/lib/DrawerContext';
import { navGuard } from '@/hooks/useNavGuard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.72;

const NAV_ITEMS = [
  { label: 'User Profile', route: '/', icon: 'user' as const },
  { label: 'Exercise Configuration', route: '/two', icon: 'pencil' as const },
  { label: 'Workout Log', route: '/three', icon: 'heartbeat' as const },
  { label: 'Training Logs', route: '/four', icon: 'list' as const },
];

export default function TabLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const overlayOpacity   = useSharedValue(0);
  const drawerTranslateX = useSharedValue(-DRAWER_WIDTH);

  const openDrawer = useCallback(() => {
    overlayOpacity.value   = 0;
    drawerTranslateX.value = -DRAWER_WIDTH;
    setDrawerOpen(true);
  }, []);

  useEffect(() => {
    if (drawerOpen) {
      overlayOpacity.value   = withTiming(1, { duration: 250 });
      drawerTranslateX.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
    }
  }, [drawerOpen]);

  const closeDrawer = useCallback(() => {
    overlayOpacity.value   = withTiming(0, { duration: 200 });
    drawerTranslateX.value = withTiming(
      -DRAWER_WIDTH,
      { duration: 220, easing: Easing.in(Easing.cubic) },
      (finished) => { if (finished) runOnJS(setDrawerOpen)(false); }
    );
  }, []);

  const navTo = useCallback((route: string) => {
    navGuard(() => {
      closeDrawer();
      router.push(route as any);
    });
  }, [closeDrawer, router]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drawerTranslateX.value }],
  }));

  return (
    <ExerciseDataProvider>
    <DrawerContext.Provider value={{ openDrawer }}>
      <Tabs
        screenOptions={{ tabBarStyle: { display: 'none' } }}>
        <Tabs.Screen name="index" options={{ headerShown: false }} />
        <Tabs.Screen name="two" options={{ headerShown: false }} />
        <Tabs.Screen name="three" options={{ headerShown: false }} />
        <Tabs.Screen name="four" options={{ headerShown: false }} />
      </Tabs>

      <Modal
        visible={drawerOpen}
        transparent
        animationType="none"
        onRequestClose={closeDrawer}
      >
        {/* Overlay — fades in/out independently */}
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={closeDrawer}
            activeOpacity={1}
          />
        </Animated.View>

        {/* Drawer panel — slides in/out from left */}
        <Animated.View style={[styles.drawer, { backgroundColor: T.surface }, drawerStyle]}>
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
                  onPress={isActive ? closeDrawer : () => navTo(item.route)}
                  activeOpacity={isActive ? 1 : 0.7}
                >
                  <FontAwesome
                    name={item.icon}
                    size={18}
                    color={isActive ? T.accent : T.muted}
                  />
                  <Text
                    style={[
                      styles.navLabel,
                      { color: isActive ? T.accent : T.primary },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </SafeAreaView>
        </Animated.View>
      </Modal>
    </DrawerContext.Provider>
    </ExerciseDataProvider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
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
