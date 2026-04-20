import { useCallback, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, XStack, YStack } from 'tamagui';
import SyncStatusIcon from '@/components/SyncStatusIcon';
import { SquashPressable } from '@/components/PressSquash';
import { useAppTheme } from '@/lib/ThemeContext';
import { useTabHeader } from '@/lib/TabHeaderContext';
import { useExerciseData } from '@/lib/ExerciseDataContext';
// Pre-warm sub-screen modules so first navigation is instant
import '@/components/GlassButton';
import '@/lib/offline/exerciseStore';
import '@/lib/offline/variationStore';
import '@/lib/offline/bridgeStore';
import '@/lib/asyncGuard';

export default function AdminExercisesHub() {
  const { colors, space, radius, fontSize } = useAppTheme();
  const router = useRouter();
  const { setTabHeader } = useTabHeader();

  useFocusEffect(
    useCallback(() => {
      setTabHeader({ title: 'Exercise Configuration', left: undefined, right: <SyncStatusIcon /> });
    }, [setTabHeader]),
  );

  const sections: { route: string; label: string; description: string; icon: React.ReactNode }[] = [
    {
      route: '/two/library',
      label: 'Exercises & Variations',
      description: 'Create and manage exercises and variations',
      icon: <Ionicons name="barbell" size={22} color={colors.accent} />,
    },
    {
      route: '/two/guide',
      label: 'User Guide',
      description: 'Learn how to set up and use the app',
      icon: <FontAwesome name="book" size={22} color={colors.accent} />,
    },
    {
      route: '/two/programs',
      label: 'Programs',
      description: 'Structured training programs and templates',
      icon: <FontAwesome name="list-alt" size={22} color={colors.accent} />,
    },
  ];
  const { refreshExercises, refreshVariations, refreshExerciseDetails } = useExerciseData();

  // Refresh context data in the background while the user reads this screen,
  // so sub-screens open instantly with up-to-date data already loaded.
  useEffect(() => {
    Promise.all([refreshExercises(), refreshVariations(), refreshExerciseDetails()]).catch(() => {});
  }, []);

  return (
    <YStack flex={1} backgroundColor={colors.bg}>
      <YStack flex={1} padding={space.xl} gap={space.md}>
        {sections.map((s) => (
          <SquashPressable key={s.route} onPress={() => router.push(s.route as any)} contentStyle={{ alignSelf: 'stretch' }}>
            <YStack
              backgroundColor={colors.surface}
              borderWidth={1}
              borderColor={colors.border}
              borderRadius={radius.md}
              padding={space.md}
            >
              <XStack alignItems="center" gap={space.lg}>
                <XStack
                  width={44}
                  height={44}
                  borderRadius={radius.md}
                  backgroundColor={colors.accentBg}
                  alignItems="center"
                  justifyContent="center"
                >
                  {s.icon}
                </XStack>
                <YStack flex={1}>
                  <Text fontSize={fontSize.lg} fontWeight="600" color={colors.primary} marginBottom={space.xs}>{s.label}</Text>
                  <Text fontSize={fontSize.sm} color={colors.muted}>{s.description}</Text>
                </YStack>
                <FontAwesome name="chevron-right" size={14} color={colors.muted} />
              </XStack>
            </YStack>
          </SquashPressable>
        ))}
      </YStack>
    </YStack>
  );
}
