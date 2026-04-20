import { useEffect } from 'react';
import { Text } from 'tamagui';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useNetwork } from '@/hooks/useNetwork';
import { useAppTheme } from '@/lib/ThemeContext';

const BANNER_HEIGHT = 28;

export default function OfflineBanner() {
  const { colors, fontSize } = useAppTheme();
  const { isConnected } = useNetwork();
  /** Collapse height when hidden — translate-only left a 28px layout gap (looked like huge empty space above headers). */
  const heightSv = useSharedValue(0);

  useEffect(() => {
    heightSv.value = withTiming(isConnected ? 0 : BANNER_HEIGHT, { duration: 260 });
  }, [isConnected]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: heightSv.value,
    overflow: 'hidden',
  }));

  return (
    <Animated.View
      style={[
        {
          backgroundColor: colors.danger,
          alignItems: 'center',
          justifyContent: 'center',
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <Text fontSize={fontSize.xs} color={colors.accentText} fontWeight="600">
        Offline — changes will sync when reconnected
      </Text>
    </Animated.View>
  );
}
