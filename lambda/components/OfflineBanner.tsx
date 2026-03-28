import { useEffect } from 'react';
import { Text } from 'tamagui';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useNetwork } from '@/hooks/useNetwork';
import T from '@/constants/Theme';

const BANNER_HEIGHT = 28;

export default function OfflineBanner() {
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
          backgroundColor: T.danger,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <Text fontSize={T.fontSize.xs} color={T.accentText} fontWeight="600">
        Offline — changes will sync when reconnected
      </Text>
    </Animated.View>
  );
}
