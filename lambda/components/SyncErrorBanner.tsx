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

  const translateY = useSharedValue(-BANNER_HEIGHT);

  useEffect(() => {
    translateY.value = withTiming(visible ? 0 : -BANNER_HEIGHT, { duration: 260 });
  }, [visible, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          height: BANNER_HEIGHT,
          backgroundColor: colors.accentBg,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
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
