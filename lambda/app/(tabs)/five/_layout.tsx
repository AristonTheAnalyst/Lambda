import { Stack } from 'expo-router';

export default function StatisticsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: true, animation: 'fade', animationDuration: 80 }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
