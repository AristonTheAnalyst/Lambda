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
// SecureStore has a 2048-byte limit per key, so large session tokens are chunked.
const CHUNK_SIZE = 1900;

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
      getItem: async (key: string): Promise<string | null> => {
        const chunkCount = await SecureStore.getItemAsync(`${key}_chunks`);
        if (!chunkCount) return SecureStore.getItemAsync(key);
        const chunks: string[] = [];
        for (let i = 0; i < parseInt(chunkCount); i++) {
          const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
          if (chunk === null) return null;
          chunks.push(chunk);
        }
        return chunks.join('');
      },
      setItem: async (key: string, value: string): Promise<void> => {
        if (value.length <= CHUNK_SIZE) {
          await SecureStore.setItemAsync(key, value);
          await SecureStore.deleteItemAsync(`${key}_chunks`);
          return;
        }
        const count = Math.ceil(value.length / CHUNK_SIZE);
        await SecureStore.setItemAsync(`${key}_chunks`, String(count));
        for (let i = 0; i < count; i++) {
          await SecureStore.setItemAsync(`${key}_chunk_${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
        }
        await SecureStore.deleteItemAsync(key);
      },
      removeItem: async (key: string): Promise<void> => {
        const chunkCount = await SecureStore.getItemAsync(`${key}_chunks`);
        if (chunkCount) {
          await SecureStore.deleteItemAsync(`${key}_chunks`);
          for (let i = 0; i < parseInt(chunkCount); i++) {
            await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
          }
        } else {
          await SecureStore.deleteItemAsync(key);
        }
      },
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
