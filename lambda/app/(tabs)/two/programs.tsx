import { useRouter } from 'expo-router';
import { Text, YStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassButton from '@/components/GlassButton';
import T from '@/constants/Theme';

export default function ProgramsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <YStack flex={1} backgroundColor={T.bg}>
      {/* Header */}
      <YStack paddingTop={insets.top + T.space.sm} paddingBottom={T.space.md} paddingHorizontal={T.space.lg}>
        <YStack flexDirection="row" alignItems="center" gap={T.space.md}>
          <GlassButton icon="chevron-left" onPress={() => router.back()} />
          <Text fontSize={T.fontSize.xl} fontWeight="700" color={T.primary} flex={1} textAlign="center" marginRight={44}>
            Programs
          </Text>
        </YStack>
      </YStack>

      {/* Body */}
      <YStack flex={1} alignItems="center" justifyContent="center" gap={T.space.sm}>
        <Text fontSize={T.fontSize.lg} color={T.muted}>Coming soon</Text>
      </YStack>
    </YStack>
  );
}
