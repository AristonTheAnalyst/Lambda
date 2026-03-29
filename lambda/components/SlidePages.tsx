import React from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { YStack } from 'tamagui';
import type { SlidePagesController } from '@/hooks/useSlidePages';

interface SlidePagesProps {
  controller: SlidePagesController;
  children: [React.ReactNode, React.ReactNode];
}

export default function SlidePages({ controller, children }: SlidePagesProps) {
  const { screenWidth, animatedStyle } = controller;
  return (
    <YStack flex={1} overflow="hidden">
      <Animated.View style={[{ flexDirection: 'row', width: screenWidth * 2, flex: 1 }, animatedStyle]}>
        <View style={{ width: screenWidth, flex: 1 }}>{children[0]}</View>
        <View style={{ width: screenWidth, flex: 1 }}>{children[1]}</View>
      </Animated.View>
    </YStack>
  );
}
