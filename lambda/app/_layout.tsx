import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks';
import { AuthProvider, useAuthContext } from '@/lib/AuthContext';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

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
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session, loading, onboarded } = useAuthContext();
  const router = useRouter();
  const segments = useSegments();
  const didInitialRoute = useRef(false);

  const authReady = !loading && (!session || onboarded !== null);

  useEffect(() => {
    if (!authReady || didInitialRoute.current) return;
    didInitialRoute.current = true;

    if (!session) {
      router.replace('/(auth)/login');
    } else if (onboarded) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(onboarding)');
    }

    requestAnimationFrame(() => SplashScreen.hideAsync());
  }, [authReady]);

  useEffect(() => {
    if (!authReady || !didInitialRoute.current) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    if (!session) {
      if (!inAuthGroup) router.replace('/(auth)/login');
    } else if (onboarded === false) {
      if (!inOnboardingGroup) router.replace('/(onboarding)');
    } else if (onboarded === true && inOnboardingGroup) {
      router.replace('/(tabs)');
    }
  }, [session, onboarded, segments]);

  if (!authReady) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
