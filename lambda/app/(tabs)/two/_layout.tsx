import { Stack } from 'expo-router';

export default function AdminExercisesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: true }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="exercises" />
      <Stack.Screen name="variations" />
      <Stack.Screen name="variation-exercises" options={{ animation: 'none', gestureEnabled: false }} />
      <Stack.Screen name="guide" />
    </Stack>
  );
}
