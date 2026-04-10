import { ScrollView } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Separator } from 'tamagui';
import GlassButton from '@/components/GlassButton';
import { useAppTheme } from '@/lib/ThemeContext';

export default function UserGuideScreen() {
  const { colors, space, radius, fontSize } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <YStack flex={1} backgroundColor={colors.bg}>
      <XStack style={{ height: insets.top + 52, paddingTop: insets.top }} paddingHorizontal={space.md} alignItems="center">
        <XStack minWidth={80}><GlassButton icon="chevron-left" label="Back" onPress={() => router.back()} /></XStack>
        <Text flex={1} textAlign="center" color={colors.primary} fontSize={fontSize.xl} fontWeight="600">User Guide</Text>
        <XStack width={80} />
      </XStack>
      <Separator borderColor={colors.border} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <Text fontSize={fontSize.xxl} fontWeight="700" color={colors.primary} marginBottom={space.sm}>
          Getting Started
        </Text>
        <Text fontSize={fontSize.sm} color={colors.muted} marginBottom={space.xl}>
          Last updated March 2026
        </Text>

        <Text fontSize={fontSize.md} color={colors.primary} lineHeight={26} marginBottom={space.lg}>
          Lambda is a calisthenics tracking app built around bodyweight training. This guide walks you through setting up your exercises, logging workouts, and understanding how your data is structured.
        </Text>

        <Text fontSize={fontSize.lg} fontWeight="700" color={colors.primary} marginBottom={space.sm}>
          Exercises
        </Text>
        <Text fontSize={fontSize.md} color={colors.primary} lineHeight={26} marginBottom={space.lg}>
          Start by creating your exercises in the Exercises screen. Each exercise has a name and a volume type — either Reps or Duration. Volume type determines how you log your sets: rep counts (e.g. 10, 8, 6) or duration in seconds (e.g. 60, 45).
        </Text>

        <Text fontSize={fontSize.lg} fontWeight="700" color={colors.primary} marginBottom={space.sm}>
          Variations
        </Text>
        <Text fontSize={fontSize.md} color={colors.primary} lineHeight={26} marginBottom={space.lg}>
          Variations let you track how an exercise was performed — grip width, tempo, elevation, and so on. Open the Variations screen, select an exercise, and add as many variations as you need. When logging a set, you can optionally pick one variation to attach to that set.
        </Text>

        <Text fontSize={fontSize.lg} fontWeight="700" color={colors.primary} marginBottom={space.sm}>
          Logging a Workout
        </Text>
        <Text fontSize={fontSize.md} color={colors.primary} lineHeight={26} marginBottom={space.lg}>
          Head to the Workout Log tab to start a session. Select an exercise, enter your weight (optional), your reps or duration, choose a variation if applicable, and tap Log Set. Repeat for each set. When you're done, tap End Workout to save the session.
        </Text>

        <Text fontSize={fontSize.lg} fontWeight="700" color={colors.primary} marginBottom={space.sm}>
          Volume Formula
        </Text>
        <Text fontSize={fontSize.md} color={colors.primary} lineHeight={26} marginBottom={space.lg}>
          Volume is calculated as (bodyweight − assistance) × reps. For timed exercises, duration replaces reps. Assistance refers to band or machine-assisted reps where part of your bodyweight is supported.
        </Text>
      </ScrollView>
    </YStack>
  );
}
