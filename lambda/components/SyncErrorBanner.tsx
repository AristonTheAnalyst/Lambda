import { useEffect } from 'react';
import { Text } from 'tamagui';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useNetwork } from '@/hooks/useNetwork';
import { useAppTheme } from '@/lib/ThemeContext';
import { useSyncStore } from '@/lib/sync/useSyncEngine';

const BANNER_HEIGHT = 32;

/**
 * Shown when the device reports connectivity but the sync engine failed while
 * mutations are still pending (e.g. Supabase outage). Distinct from OfflineBanner.
 */
export default function SyncErrorBanner() {
  const { colors, fontSize } = useAppTheme();
  const { isConnected } = useNetwork();
  const lastError = useSyncStore((s) => s.lastError);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const visible = isConnected && !!lastError && pendingCount > 0;

  const heightSv = useSharedValue(0);

  useEffect(() => {
    heightSv.value = withTiming(visible ? BANNER_HEIGHT : 0, { duration: 260 });
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: heightSv.value,
    overflow: 'hidden',
  }));

  return (
    <Animated.View
      style={[
        {
          backgroundColor: colors.accentBg,
          alignItems: 'center',
          justifyContent: 'center',
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <Text fontSize={fontSize.xs} color={colors.accent} fontWeight="600" textAlign="center" paddingHorizontal={8}>
        {"Can't reach server — changes saved locally; we'll retry"}
      </Text>
    </Animated.View>
  );
}
