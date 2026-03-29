import { Text, YStack } from 'tamagui';
import PageHeader from '@/components/PageHeader';
import T from '@/constants/Theme';

export default function StatisticsScreen() {
  return (
    <YStack flex={1} backgroundColor={T.bg}>
      <PageHeader title="Statistics" />
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Text color={T.muted} fontSize={T.fontSize.md}>Coming soon.</Text>
      </YStack>
    </YStack>
  );
}
