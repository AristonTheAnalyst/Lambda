import { Platform } from 'react-native';
import { YStack } from 'tamagui';
import { isDarkAppearance } from '@/constants/themes';
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
    return (
      <YStack
        flex={flex}
        borderRadius={radius.md}
        overflow="hidden"
        pressStyle={pressable ? { opacity: 0.8 } : undefined}
        onPress={onPress}
        onPressIn={onPressIn}
      >
        <GlassView glassEffectStyle="systemMaterial" style={{ borderRadius: radius.md, padding: space.md }}>
          {children}
        </GlassView>
      </YStack>
    );
  }

  return (
    <YStack
      flex={flex}
      backgroundColor={colors.surface}
      borderWidth={1}
      borderColor={colors.border}
      borderRadius={radius.md}
      padding={space.md}
      pressStyle={pressable ? { opacity: 0.75 } : undefined}
      onPress={onPress}
      onPressIn={onPressIn}
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
}
