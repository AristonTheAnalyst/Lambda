import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, XStack, YStack } from 'tamagui';
import PageHeader from '@/components/PageHeader';
import { useAppTheme } from '@/lib/ThemeContext';

const SECTIONS = [
  {
    route: '/one/profile',
    label: 'User Profile',
    description: 'View and edit your personal details',
    icon: 'user' as const,
  },
];

export default function ProfileHub() {
  const { colors, space, radius, fontSize } = useAppTheme();
  const router = useRouter();

  return (
    <YStack flex={1} backgroundColor={colors.bg}>
      <PageHeader title="Profile" />
      <YStack flex={1} padding={space.xl} gap={space.md}>
        {SECTIONS.map((s) => (
          <TouchableOpacity
            key={s.route}
            activeOpacity={0.7}
            onPress={() => router.push(s.route as any)}
          >
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
                  <FontAwesome name={s.icon} size={22} color={colors.accent} />
                </XStack>
                <YStack flex={1}>
                  <Text fontSize={fontSize.lg} fontWeight="600" color={colors.primary} marginBottom={space.xs}>{s.label}</Text>
                  <Text fontSize={fontSize.sm} color={colors.muted}>{s.description}</Text>
                </YStack>
                <FontAwesome name="chevron-right" size={14} color={colors.muted} />
              </XStack>
            </YStack>
          </TouchableOpacity>
        ))}
      </YStack>
    </YStack>
  );
}
