import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import 'react-native-reanimated';
import { TamaguiProvider } from 'tamagui';
import { SQLiteProvider } from 'expo-sqlite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import config from '../tamagui.config';
import { useColorScheme } from '@/hooks';
import { AuthProvider, useAuthContext } from '@/lib/AuthContext';
import { DATABASE_NAME } from '@/lib/db/schema';
import { initializeDatabase } from '@/lib/db/database';
import LoadingScreen from '@/components/LoadingScreen';
import T from '@/constants/Theme';

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

const rootStyles = StyleSheet.create({
  root: { flex: 1, tintColor: T.primary } as any,
});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  if (!loaded) return <LoadingScreen />;

  return (
    <View style={rootStyles.root}>
      <TamaguiProvider config={config} defaultTheme="dark">
        <QueryClientProvider client={queryClient}>
          <SQLiteProvider databaseName={DATABASE_NAME} onInit={initializeDatabase}>
            <AuthProvider>
              <RootLayoutNav />
            </AuthProvider>
          </SQLiteProvider>
        </QueryClientProvider>
      </TamaguiProvider>
    </View>
  );
}

function RootLayoutNav() {
  const { session, loading, onboarded } = useAuthContext();
  const router = useRouter();
  const hasNavigated = useRef(false);
  const lastTarget = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;
    // Still waiting for profile cache / network fetch to resolve onboarded state
    if (session && onboarded === null) return;

    let target: string;
    if (!session) {
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
  }, [session, loading, onboarded]);

  // Show logo while auth state is resolving (after native splash has hidden)
  if (loading || (session && onboarded === null)) {
    return <LoadingScreen />;
  }

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
