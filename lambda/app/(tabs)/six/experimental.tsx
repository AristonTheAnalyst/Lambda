import { useRouter } from 'expo-router';
import { Text, XStack, YStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassButton from '@/components/GlassButton';
import { useAppTheme } from '@/lib/ThemeContext';

export default function ExperimentalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, space, fontSize } = useAppTheme();

  return (
    <YStack flex={1} backgroundColor={colors.bg}>
      <YStack paddingTop={insets.top + space.sm} paddingBottom={space.md} paddingHorizontal={space.lg}>
        <XStack alignItems="center" gap={space.md}>
          <GlassButton icon="chevron-left" onPress={() => router.back()} />
          <Text fontSize={fontSize.xl} fontWeight="700" color={colors.primary} flex={1} textAlign="center" marginRight={44}>
            Experimental Features
          </Text>
        </XStack>
      </YStack>

      <YStack flex={1} padding={space.xl} justifyContent="center" alignItems="center">
        <Text color={colors.muted} fontSize={fontSize.md} textAlign="center">
          Nothing here at the moment.
        </Text>
      </YStack>
    </YStack>
  );
}
