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

  function slideIn() {
    slideX.value = withTiming(-screenWidth, { duration: 280, easing: Easing.out(Easing.cubic) });
  }

  function slideOut() {
    slideX.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
  }

  function resetToPage(page: 0 | 1) {
    slideX.value = page === 1 ? -screenWidth : 0;
  }

  return { screenWidth, animatedStyle, slideIn, slideOut, resetToPage };
}
