import { useRouter } from 'expo-router';
import { navGuard } from '@/hooks/useNavGuard';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, XStack, YStack } from 'tamagui';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import T from '@/constants/Theme';

const SECTIONS = [
  {
    route: '/two/exercises',
    label: 'Exercises',
    description: 'Create and manage exercises',
    icon: 'heartbeat' as const,
  },
  {
    route: '/two/variations',
    label: 'Variations',
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

  return (
    <YStack flex={1} backgroundColor={T.bg}>
      <PageHeader title="Exercise Configuration" />
      <YStack flex={1} padding={T.space.xl} gap={T.space.md}>
        {SECTIONS.map((s) => (
          <Card key={s.route} flex={0} onPressIn={() => navGuard(() => router.push(s.route as any))}>
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
          </Card>
        ))}
      </YStack>
    </YStack>
  );
}
