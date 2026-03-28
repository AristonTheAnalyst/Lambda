import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, XStack, YStack } from 'tamagui';
import PageHeader from '@/components/PageHeader';
import SyncStatusIcon from '@/components/SyncStatusIcon';
import T from '@/constants/Theme';
import { useExerciseData } from '@/lib/ExerciseDataContext';
// Pre-warm sub-screen modules so first navigation is instant
import '@/components/GlassButton';
import '@/components/Button';
import '@/components/Input';
import '@/components/FormControls';
import '@/lib/offline/exerciseStore';
import '@/lib/offline/variationStore';
import '@/lib/offline/bridgeStore';
import '@/lib/asyncGuard';
import 'expo-haptics';

const SECTIONS = [
  {
    route: '/two/exercises',
    label: 'Exercises',
    description: 'Create and manage exercises',
    icon: 'heartbeat' as const,
  },
  {
    route: '/two/manage-variations',
    label: 'Variations',
    description: 'Create and manage variations',
    icon: 'tags' as const,
  },
  {
    route: '/two/variations',
    label: 'Assign Variations',
    description: 'Manage variations for each exercise',
    icon: 'sliders' as const,
  },
  {
    route: '/two/guide',
    label: 'User Guide',
    description: 'Learn how to set up and use the app',
    icon: 'book' as const,
  },
];

export default function AdminExercisesHub() {
  const router = useRouter();
  const { refreshExercises, refreshVariations, refreshExerciseDetails } = useExerciseData();

  // Refresh context data in the background while the user reads this screen,
  // so sub-screens open instantly with up-to-date data already loaded.
  useEffect(() => {
    Promise.all([refreshExercises(), refreshVariations(), refreshExerciseDetails()]).catch(() => {});
  }, []);

  return (
    <YStack flex={1} backgroundColor={T.bg}>
      <PageHeader title="Exercise Configuration" right={<SyncStatusIcon />} />
      <YStack flex={1} padding={T.space.xl} gap={T.space.md}>
        {SECTIONS.map((s) => (
          <YStack
            key={s.route}
            backgroundColor={T.surface}
            borderWidth={1}
            borderColor={T.border}
            borderRadius={T.radius.md}
            padding={T.space.md}
            pressStyle={{ opacity: 0.7 }}
            onPress={() => router.push(s.route as any)}
            cursor="pointer"
          >
            <XStack alignItems="center" gap={T.space.lg}>
              <XStack
                width={44}
                height={44}
                borderRadius={T.radius.md}
                backgroundColor={T.accentBg}
                alignItems="center"
                justifyContent="center"
              >
                <FontAwesome name={s.icon} size={22} color={T.accent} />
              </XStack>
              <YStack flex={1}>
                <Text fontSize={T.fontSize.lg} fontWeight="600" color={T.primary} marginBottom={T.space.xs}>{s.label}</Text>
                <Text fontSize={T.fontSize.sm} color={T.muted}>{s.description}</Text>
              </YStack>
              <FontAwesome name="chevron-right" size={14} color={T.muted} />
            </XStack>
          </YStack>
        ))}
      </YStack>
    </YStack>
  );
}
