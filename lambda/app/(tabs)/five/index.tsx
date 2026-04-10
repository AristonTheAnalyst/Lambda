import { Text, YStack } from 'tamagui';
import PageHeader from '@/components/PageHeader';
import { useAppTheme } from '@/lib/ThemeContext';

export default function StatisticsScreen() {
  const { colors, space, radius, fontSize } = useAppTheme();
  return (
    <YStack flex={1} backgroundColor={colors.bg}>
      <PageHeader title="Statistics" />
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Text color={colors.muted} fontSize={fontSize.md}>Coming soon.</Text>
      </YStack>
    </YStack>
  );
}
