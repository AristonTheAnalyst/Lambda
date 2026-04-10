import { Spinner, Text, XStack, YStack } from 'tamagui';
import { useSyncStore } from '@/lib/sync/useSyncEngine';
import { useAppTheme } from '@/lib/ThemeContext';

export default function SyncStatusIcon() {
  const { colors, space, fontSize } = useAppTheme();
  const { isSyncing, pendingCount } = useSyncStore();

  if (isSyncing) {
    return <Spinner size="small" color={colors.accent} />;
  }

  if (pendingCount > 0) {
    return (
      <XStack alignItems="center" gap={space.xs}>
        <YStack
          width={8}
          height={8}
          borderRadius={4}
          backgroundColor={colors.accent}
        />
        <Text fontSize={fontSize.xs} color={colors.accent} fontWeight="600">
          {pendingCount}
        </Text>
      </XStack>
    );
  }

  return null;
}
