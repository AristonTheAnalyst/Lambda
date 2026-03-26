import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import T from '@/constants/Theme';
const NAV_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : 56;

function BackButton() {
  const router = useRouter();
  return (
    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
      <FontAwesome name="chevron-left" size={13} color={T.accent} />
      <Text style={styles.backLabel}>Back</Text>
    </TouchableOpacity>
  );
}

const sharedHeader = {
  headerStyle: { backgroundColor: T.bg },
  headerTitleStyle: { color: T.primary },
  headerTintColor: T.primary,
  headerLeftContainerStyle: { paddingLeft: 8,  minWidth: 200 },
};

const styles = StyleSheet.create({
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  backLabel: { color: T.accent, fontSize: 17 },
});

export default function AdminExercisesLayout() {
  const insets = useSafeAreaInsets();
  const headerHeight = insets.top + NAV_BAR_HEIGHT;

  return (
    <Stack screenOptions={{ ...sharedHeader, gestureEnabled: true, headerHeight }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="exercises" options={{ title: 'Exercises', headerLeft: () => <BackButton /> }} />
      <Stack.Screen name="variations" options={{ title: 'Variations', headerLeft: () => <BackButton /> }} />
      <Stack.Screen name="assign" options={{ title: 'Assign Variations', headerLeft: () => <BackButton /> }} />
    </Stack>
  );
}
