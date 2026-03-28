import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import 'react-native-reanimated';
import { TamaguiProvider } from 'tamagui';
import { SQLiteProvider } from 'expo-sqlite';
import config from '../tamagui.config';
import { useColorScheme } from '@/hooks';
import { AuthProvider, useAuthContext } from '@/lib/AuthContext';
import { DATABASE_NAME } from '@/lib/db/schema';
import { initializeDatabase } from '@/lib/db/database';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  if (!loaded) return null;

  return (
    <TamaguiProvider config={config} defaultTheme="dark">
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={initializeDatabase}>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </SQLiteProvider>
    </TamaguiProvider>
  );
}

function RootLayoutNav() {
  const { session, loading, onboarded } = useAuthContext();
  const router = useRouter();
  const hasNavigated = useRef(false);
  const lastTarget = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (session && onboarded === null) return;

    let target: string;
    if (!session) {
      target = '/(auth)/login';
    } else if (onboarded === false) {
      target = '/(onboarding)';
    } else {
      target = '/(tabs)';
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
  }, [session, loading, onboarded]);

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack screenOptions={{ contentStyle: { backgroundColor: '#262626' } }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
