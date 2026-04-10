import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { ThemeProvider as AppThemeProvider, useAppTheme } from '@/lib/ThemeContext';
import { isDarkAppearance } from '@/constants/themes';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo, useRef } from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { TamaguiProvider } from 'tamagui';
import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import config from '../tamagui.config';
import { AuthProvider, useAuthContext } from '@/lib/AuthContext';
import { DATABASE_NAME } from '@/lib/db/schema';
import { initializeDatabase } from '@/lib/db/database';
import LoadingScreen from '@/components/LoadingScreen';
import { useStatusBarForAppTheme } from '@/hooks/useStatusBarForAppTheme';

async function clearLocalUserData(db: SQLiteDatabase) {
  await db.runAsync('DELETE FROM fact_workout_set');
  await db.runAsync('DELETE FROM fact_user_workout');
  await db.runAsync('DELETE FROM user_custom_exercise');
  await db.runAsync('DELETE FROM user_custom_variation');
  await db.runAsync('DELETE FROM user_custom_exercise_variation_bridge');
  await db.runAsync('DELETE FROM exercise_defaults');
  await db.runAsync('DELETE FROM mutation_queue');
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)/',
};

SplashScreen.preventAutoHideAsync().catch(() => {});

// Root background + Tamagui theme + status bar (see useStatusBarForAppTheme).
function ThemedRoot({ children }: { children: React.ReactNode }) {
  const { themeName, colors } = useAppTheme();
  const isDark = isDarkAppearance(themeName);
  const insets = useSafeAreaInsets();
  useStatusBarForAppTheme(themeName, colors.bg);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TamaguiProvider config={config} defaultTheme={themeName}>
        {children}
      </TamaguiProvider>
      {/* iOS: status bar is transparent — paint the top safe-area band (see useStatusBarForAppTheme). */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: insets.top,
          backgroundColor: colors.bg,
          zIndex: 1000,
        }}
      />
      <StatusBar
        key={themeName}
        style={isDark ? 'light' : 'dark'}
        backgroundColor={Platform.OS === 'android' ? colors.bg : undefined}
      />
    </View>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  return (
    <AppThemeProvider>
      {!loaded ? (
        <LoadingScreen />
      ) : (
        <ThemedRoot>
          <QueryClientProvider client={queryClient}>
            <SQLiteProvider databaseName={DATABASE_NAME} onInit={initializeDatabase}>
              <AuthProvider>
                <RootLayoutNav />
              </AuthProvider>
            </SQLiteProvider>
          </QueryClientProvider>
        </ThemedRoot>
      )}
    </AppThemeProvider>
  );
}

function RootLayoutNav() {
  const { session, loading, onboarded, isPasswordRecovery, initialUrlChecked } = useAuthContext();
  const { themeName, colors } = useAppTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const hasNavigated = useRef(false);
  const lastTarget = useRef<string | null>(null);
  const prevUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const currentUserId = session?.user?.id ?? null;
    if (prevUserId.current === undefined) {
      prevUserId.current = currentUserId;
      return;
    }
    const prev = prevUserId.current;
    prevUserId.current = currentUserId;
    // Only clear when switching between two real users — not on initial load (null → user)
    if (prev !== null && currentUserId !== null && currentUserId !== prev) {
      clearLocalUserData(db).catch((e) => console.warn('[Auth] clearLocalUserData error:', e));
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (loading) return;
    // Wait for initial URL to be processed so PASSWORD_RECOVERY is detected before we navigate
    if (!initialUrlChecked) return;
    // Still waiting for profile cache / network fetch to resolve onboarded state
    if (session && onboarded === null) return;

    let target: string;
    if (isPasswordRecovery) {
      target = '/(auth)/reset-password';
    } else if (!session) {
      target = '/(auth)/login';
    } else if (onboarded === false) {
      target = '/(onboarding)';
    } else {
      target = '/(tabs)/';
    }

    if (lastTarget.current !== target) {
      console.log('[Nav] Navigating to:', target, '(session:', !!session, 'onboarded:', onboarded, ')');
      lastTarget.current = target;
      router.replace(target as any);
    }

    if (!hasNavigated.current) {
      hasNavigated.current = true;
      requestAnimationFrame(() => SplashScreen.hideAsync().catch(() => {}));
    }
  }, [session, loading, onboarded, isPasswordRecovery, initialUrlChecked]);

  const navigationTheme = useMemo(() => {
    const isDark = isDarkAppearance(themeName);
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: isDark,
      colors: {
        ...base.colors,
        background: colors.bg,
        card: colors.surface,
        border: colors.border,
        text: colors.primary,
        primary: colors.accent,
        notification: colors.accent,
      },
    };
  }, [themeName, colors]);

  // Show logo while auth state is resolving (after native splash has hidden)
  if (loading || (session && onboarded === null)) {
    return <LoadingScreen />;
  }

  // Do not set Stack statusBarStyle here: avoids Info.plist YES/NO fights; ThemedRoot owns the bar.

  return (
    <NavThemeProvider value={navigationTheme}>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </NavThemeProvider>
  );
}
