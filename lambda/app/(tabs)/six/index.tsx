import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, XStack, YStack } from 'tamagui';
import PageHeader from '@/components/PageHeader';
import T from '@/constants/Theme';

const SECTIONS = [
  {
    route: '/ui-kit',
    label: 'UI Kit',
    description: 'Component and style reference',
    icon: 'paint-brush' as const,
  },
  {
    route: '/six/experimental',
    label: 'Experimental Features',
    description: 'Work in progress and unreleased features',
    icon: 'flask' as const,
  },
];

export default function DevHub() {
  const router = useRouter();

  return (
    <YStack flex={1} backgroundColor={T.bg}>
      <PageHeader title="Dev" />
      <YStack flex={1} padding={T.space.xl} gap={T.space.md}>
        {SECTIONS.map((s) => (
          <TouchableOpacity
            key={s.route}
            activeOpacity={0.7}
            onPress={() => router.push(s.route as any)}
          >
            <YStack
              backgroundColor={T.surface}
              borderWidth={1}
              borderColor={T.border}
              borderRadius={T.radius.md}
              padding={T.space.md}
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
                  <FontAwesome name={s.icon} size={20} color={T.accent} />
                </XStack>
                <YStack flex={1}>
                  <Text fontSize={T.fontSize.lg} fontWeight="600" color={T.primary} marginBottom={T.space.xs}>{s.label}</Text>
                  <Text fontSize={T.fontSize.sm} color={T.muted}>{s.description}</Text>
                </YStack>
                <FontAwesome name="chevron-right" size={14} color={T.muted} />
              </XStack>
            </YStack>
          </TouchableOpacity>
        ))}
      </YStack>
    </YStack>
  );
}
