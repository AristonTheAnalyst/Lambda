import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Text, YStack } from 'tamagui';
import { useFocusEffect } from '@react-navigation/native';
import GlassButton from '@/components/GlassButton';
import { useAppTheme } from '@/lib/ThemeContext';
import { useTabHeader } from '@/lib/TabHeaderContext';

export default function ProgramsScreen() {
  const { colors, space, radius, fontSize } = useAppTheme();
  const router = useRouter();
  const { setTabHeader } = useTabHeader();

  useFocusEffect(
    useCallback(() => {
      setTabHeader({
        title: 'Programs',
        left: <GlassButton icon="chevron-left" onPress={() => router.back()} />,
        right: undefined,
      });
    }, [setTabHeader, router]),
  );

  return (
    <YStack flex={1} backgroundColor={colors.bg}>
      <YStack flex={1} alignItems="center" justifyContent="center" gap={space.sm}>
        <Text fontSize={fontSize.lg} color={colors.muted}>Coming soon</Text>
      </YStack>
    </YStack>
  );
}
