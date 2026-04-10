import { useEffect } from 'react';
import { Text } from 'tamagui';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useNetwork } from '@/hooks/useNetwork';
import { useAppTheme } from '@/lib/ThemeContext';

const BANNER_HEIGHT = 28;

export default function OfflineBanner() {
  const { colors, fontSize } = useAppTheme();
  const { isConnected } = useNetwork();
  const translateY = useSharedValue(-BANNER_HEIGHT);

  useEffect(() => {
    translateY.value = withTiming(isConnected ? -BANNER_HEIGHT : 0, { duration: 260 });
  }, [isConnected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          height: BANNER_HEIGHT,
          backgroundColor: colors.danger,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
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
