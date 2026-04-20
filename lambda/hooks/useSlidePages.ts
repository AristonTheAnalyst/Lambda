import { useMemo, useCallback } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

export interface SlidePagesController {
  screenWidth: number;
  animatedStyle: ReturnType<typeof useAnimatedStyle>;
  slideIn: () => void;
  slideOut: () => void;
  resetToPage: (page: 0 | 1) => void;
}

export function useSlidePages(): SlidePagesController {
  const { width: screenWidth } = useWindowDimensions();
  const slideX = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateX: slideX.value }] }));

  const slideIn = useCallback(() => {
    slideX.value = withTiming(-screenWidth, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [screenWidth, slideX]);

  const slideOut = useCallback(() => {
    slideX.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [slideX]);

  const resetToPage = useCallback(
    (page: 0 | 1) => {
      slideX.value = page === 1 ? -screenWidth : 0;
    },
    [screenWidth, slideX],
  );

  return useMemo(
    () => ({ screenWidth, animatedStyle, slideIn, slideOut, resetToPage }),
    [screenWidth, animatedStyle, slideIn, slideOut, resetToPage],
  );
}
