import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

// Use SecureStore (iOS Keychain / Android Keystore) in dev builds and production.
// Falls back to AsyncStorage in Expo Go where native modules aren't compiled in.
const getStorage = () => {
  if (Platform.OS === 'web') return undefined;
  try {
    // requireNativeModule throws "Cannot find native module" in Expo Go
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { requireNativeModule } = require('expo-modules-core');
    const nativeModule = requireNativeModule('ExpoSecureStore');
    if (!nativeModule) throw new Error('ExpoSecureStore unavailable');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const SecureStore = require('expo-secure-store');
    return {
      getItem: (key: string) => SecureStore.getItemAsync(key),
      setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
      removeItem: (key: string) => SecureStore.deleteItemAsync(key),
    };
  } catch {
    // Expo Go — fall back to AsyncStorage
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@react-native-async-storage/async-storage').default;
  }
};

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: getStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

export default supabase;
