import { useRouter } from 'expo-router';
import { navGuard } from '@/lib/asyncGuard';
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
    description: 'Create and manage exercise variations',
    icon: 'sliders' as const,
  },
  {
    route: '/two/assign',
    label: 'Assign Variations',
    description: 'Link variations to exercises',
    icon: 'link' as const,
  },
];

export default function AdminExercisesHub() {
  const router = useRouter();

  return (
    <YStack flex={1} backgroundColor={T.bg}>
      <PageHeader title="Exercise Configuration" />
      <YStack padding={T.space.xl} gap={T.space.md}>
        {SECTIONS.map((s) => (
          <Card key={s.route} onPress={() => navGuard(() => router.push(s.route as any))}>
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
