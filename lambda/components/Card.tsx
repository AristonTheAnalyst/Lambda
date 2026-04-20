import { Platform } from 'react-native';
import { YStack } from 'tamagui';
import { isDarkAppearance } from '@/constants/themes';
import { SquashPressable } from '@/components/PressSquash';
import { useAppTheme } from '@/lib/ThemeContext';

const isGlassSupported = Platform.OS === 'ios' && Number(Platform.Version) >= 26;

let GlassView: React.ComponentType<any> | null = null;
if (isGlassSupported) {
  try {
    GlassView = require('expo-glass-effect').GlassView;
  } catch {
    GlassView = null;
  }
}

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  onPressIn?: () => void;
  flex?: number;
  variant?: 'default' | 'glass';
}

export default function Card({ children, onPress, onPressIn, flex, variant = 'default' }: CardProps) {
  const { colors, space, radius, themeName } = useAppTheme();
  const pressable = !!(onPress || onPressIn);
  const lightLift = !isDarkAppearance(themeName);

  if (variant === 'glass' && isGlassSupported && GlassView) {
    const inner = (
      <YStack flex={flex} borderRadius={radius.md} overflow="hidden">
        <GlassView glassEffectStyle="systemMaterial" style={{ borderRadius: radius.md, padding: space.md }} pointerEvents="box-none">
          {children}
        </GlassView>
      </YStack>
    );
    return pressable ? (
      <SquashPressable onPress={onPress} onPressIn={onPressIn} contentStyle={{ flex, alignSelf: 'stretch' }}>
        {inner}
      </SquashPressable>
    ) : (
      inner
    );
  }

  const inner = (
    <YStack
      flex={flex}
      backgroundColor={colors.surface}
      borderWidth={1}
      borderColor={colors.border}
      borderRadius={radius.md}
      padding={space.md}
      cursor={pressable ? 'pointer' : undefined}
      {...(lightLift
        ? {
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
          }
        : {})}
    >
      {children}
    </YStack>
  );

  return pressable ? (
    <SquashPressable onPress={onPress} onPressIn={onPressIn} contentStyle={{ flex, alignSelf: 'stretch' }}>
      {inner}
    </SquashPressable>
  ) : (
    inner
  );
}
