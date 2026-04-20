import { useCallback } from 'react';
import { Text, YStack } from 'tamagui';
import { useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '@/lib/ThemeContext';
import { useTabHeader } from '@/lib/TabHeaderContext';

export default function StatisticsScreen() {
  const { colors, space, radius, fontSize } = useAppTheme();
  const { setTabHeader } = useTabHeader();

  useFocusEffect(
    useCallback(() => {
      setTabHeader({ title: 'Statistics', left: undefined, right: undefined });
    }, [setTabHeader]),
  );

  return (
    <YStack flex={1} backgroundColor={colors.bg}>
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Text color={colors.muted} fontSize={fontSize.md}>Coming soon.</Text>
      </YStack>
    </YStack>
  );
}
