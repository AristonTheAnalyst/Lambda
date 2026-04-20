import { useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export interface SlideTab {
  key: string;
  content: React.ReactNode;
}

interface SlideTabViewProps {
  tabs: SlideTab[];
  activeKey: string;
  onIndexChange?: (key: string) => void;
}

const TIMING = { duration: 350, easing: Easing.out(Easing.cubic) } as const;
const VELOCITY_THRESHOLD = 500;
const RUBBER_BAND = 0.3;

export default function SlideTabView({ tabs, activeKey, onIndexChange }: SlideTabViewProps) {
  const { width } = useWindowDimensions();
  const activeIndex = Math.max(0, tabs.findIndex(t => t.key === activeKey));
  const lastIndex = tabs.length - 1;

  const translateX = useSharedValue(-activeIndex * width);
  const startX = useSharedValue(0);

  useEffect(() => {
    translateX.value = withTiming(-activeIndex * width, TIMING);
  }, [activeIndex, width]);

  function notifyIndex(index: number) {
    const clamped = Math.max(0, Math.min(lastIndex, index));
    const key = tabs[clamped]?.key;
    if (key && key !== activeKey) onIndexChange?.(key);
  }

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-15, 15])
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate((e) => {
      const raw = startX.value + e.translationX;
      const min = -lastIndex * width;
      const max = 0;
      if (raw > max) {
        translateX.value = max + (raw - max) * RUBBER_BAND;
      } else if (raw < min) {
        translateX.value = min + (raw - min) * RUBBER_BAND;
      } else {
        translateX.value = raw;
      }
    })
    .onEnd((e) => {
      const currentIndex = Math.round(-startX.value / width);
      let targetIndex = currentIndex;
      const passedThreshold = Math.abs(e.translationX) > width / 3;
      const flicked = Math.abs(e.velocityX) > VELOCITY_THRESHOLD;
      if (passedThreshold || flicked) {
        targetIndex = currentIndex + (e.translationX < 0 ? 1 : -1);
      }
      targetIndex = Math.max(0, Math.min(lastIndex, targetIndex));
      translateX.value = withTiming(-targetIndex * width, TIMING);
      runOnJS(notifyIndex)(targetIndex);
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={{ flex: 1, overflow: 'hidden' }}>
      <GestureDetector gesture={pan}>
        <Animated.View style={[{ flex: 1, flexDirection: 'row', width: width * tabs.length }, rowStyle]}>
          {tabs.map(tab => (
            <View key={tab.key} style={{ width, flex: 1 }}>
              {tab.content}
            </View>
          ))}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
