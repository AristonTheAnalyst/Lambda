import { Stack } from 'expo-router';

export default function DevLayout() {
  return (
    <Stack>
      <Stack.Screen name="index"        options={{ headerShown: false }} />
      <Stack.Screen name="experimental" options={{ headerShown: false }} />
    </Stack>
  );
}
