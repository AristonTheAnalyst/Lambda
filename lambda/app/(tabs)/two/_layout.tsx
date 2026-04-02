import { Stack } from 'expo-router';

export default function AdminExercisesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: true, animation: 'fade', animationDuration: 80 }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="library" />
      <Stack.Screen name="guide" />
    </Stack>
  );
}
