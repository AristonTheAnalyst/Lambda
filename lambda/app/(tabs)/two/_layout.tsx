import { Stack } from 'expo-router';
import T from '@/constants/Theme';
import { AdminDataProvider } from './AdminDataContext';

export default function AdminExercisesLayout() {
  return (
    <AdminDataProvider>
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: T.bg },
        headerTitleStyle: { color: T.primary },
        headerTintColor: T.accent,
        gestureEnabled: true,
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="exercises" options={{ title: 'Exercises' }} />
      <Stack.Screen name="variations" options={{ title: 'Variations' }} />
      <Stack.Screen name="assign" options={{ title: 'Assign Variations' }} />
    </Stack>
    </AdminDataProvider>
  );
}
