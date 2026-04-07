import { Spinner, Text, XStack, YStack } from 'tamagui';
import { useSyncStore } from '@/lib/sync/useSyncEngine';
import T from '@/constants/Theme';

export default function SyncStatusIcon() {
  const { isSyncing, pendingCount } = useSyncStore();

  if (isSyncing) {
    return <Spinner size="small" color={T.accent} />;
  }

  if (pendingCount > 0) {
    return (
      <XStack alignItems="center" gap={T.space.xs}>
        <YStack
          width={8}
          height={8}
          borderRadius={4}
          backgroundColor={T.accent}
        />
        <Text fontSize={T.fontSize.xs} color={T.accent} fontWeight="600">
          {pendingCount}
        </Text>
      </XStack>
    );
  }

  return null;
}
