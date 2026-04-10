import { useRouter } from 'expo-router';
import { Text, YStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassButton from '@/components/GlassButton';
import { useAppTheme } from '@/lib/ThemeContext';

export default function ProgramsScreen() {
  const { colors, space, radius, fontSize } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <YStack flex={1} backgroundColor={colors.bg}>
      {/* Header */}
      <YStack paddingTop={insets.top + space.sm} paddingBottom={space.md} paddingHorizontal={space.lg}>
        <YStack flexDirection="row" alignItems="center" gap={space.md}>
          <GlassButton icon="chevron-left" onPress={() => router.back()} />
          <Text fontSize={fontSize.xl} fontWeight="700" color={colors.primary} flex={1} textAlign="center" marginRight={44}>
            Programs
          </Text>
        </YStack>
      </YStack>

      {/* Body */}
      <YStack flex={1} alignItems="center" justifyContent="center" gap={space.sm}>
        <Text fontSize={fontSize.lg} color={colors.muted}>Coming soon</Text>
      </YStack>
    </YStack>
  );
}
