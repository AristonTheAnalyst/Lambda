import { Platform } from 'react-native';

// SecureStore has a 2048-byte limit per key, so large values are chunked.
const CHUNK_SIZE = 1900;

/**
 * Returns a SecureStore-backed storage adapter (iOS Keychain / Android Keystore).
 * Falls back to AsyncStorage in Expo Go where the native module isn't compiled in.
 * Safe to call multiple times — the native module check is cheap.
 */
export function getSecureStorage(): {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
} {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@react-native-async-storage/async-storage').default;
  }

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
}
