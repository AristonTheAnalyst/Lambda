import { useRouter } from 'expo-router';
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
    <YStack flex={1} backgroundColor="$background">
      <PageHeader title="Exercise Configuration" />
      <YStack padding="$xl" gap="$md">
        {SECTIONS.map((s) => (
          <Card key={s.route} onPress={() => router.push(s.route as any)}>
            <XStack alignItems="center" gap="$lg">
              <XStack
                width={44}
                height={44}
                borderRadius="$md"
                backgroundColor="$accentBg"
                alignItems="center"
                justifyContent="center"
              >
                <FontAwesome name={s.icon} size={22} color={T.accent} />
              </XStack>
              <YStack flex={1}>
                <Text fontSize="$lg" fontWeight="600" color="$color" marginBottom="$xs">{s.label}</Text>
                <Text fontSize="$sm" color="$muted">{s.description}</Text>
              </YStack>
              <FontAwesome name="chevron-right" size={14} color={T.muted} />
            </XStack>
          </Card>
        ))}
      </YStack>
    </YStack>
  );
}
