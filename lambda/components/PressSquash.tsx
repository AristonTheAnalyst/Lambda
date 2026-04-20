import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

export type PressSquashVariant = 'native' | 'bouncy' | 'ghost' | 'depth' | 'minimal';

/** Matches Experimental Features → Popup Menu → Option 3 (Ghost): scale + fade. */
export const PRESS_SQUASH_VARIANTS: Record<
  PressSquashVariant,
  {
    scale: number;
    opacity: number;
    shadow: number;
    spring: { damping: number; stiffness: number; mass: number };
  }
> = {
  native: { scale: 1.05, opacity: 1, shadow: 0, spring: { damping: 20, stiffness: 250, mass: 1.2 } },
  bouncy: { scale: 1.08, opacity: 1, shadow: 0, spring: { damping: 12, stiffness: 150, mass: 1.0 } },
  ghost: { scale: 1.05, opacity: 0.85, shadow: 0, spring: { damping: 20, stiffness: 250, mass: 1.2 } },
  depth: { scale: 1.05, opacity: 1, shadow: 1, spring: { damping: 20, stiffness: 250, mass: 1.2 } },
  minimal: { scale: 1.02, opacity: 1, shadow: 0, spring: { damping: 25, stiffness: 300, mass: 0.8 } },
};

export function useSquashPressHandlers(
  variant: PressSquashVariant = 'ghost',
  disabled?: boolean,
) {
  const v = PRESS_SQUASH_VARIANTS[variant];
  const pressScale = useSharedValue(1);
  const pressOpacity = useSharedValue(1);
  const pressShadow = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
    opacity: pressOpacity.value,
    shadowOpacity: pressShadow.value * 0.35,
    shadowRadius: pressShadow.value * 8,
    shadowOffset: { width: 0, height: pressShadow.value * 4 },
    elevation: pressShadow.value * 8,
  }));

  function onPressIn() {
    if (disabled) return;
    pressScale.value = withSpring(v.scale, v.spring);
    pressOpacity.value = withSpring(v.opacity, v.spring);
    pressShadow.value = withSpring(v.shadow, v.spring);
  }

  function onPressOut() {
    if (disabled) return;
    pressScale.value = withSpring(1.0, v.spring);
    pressOpacity.value = withSpring(1.0, v.spring);
    pressShadow.value = withSpring(0, v.spring);
  }

  function reset() {
    pressScale.value = 1;
    pressOpacity.value = 1;
    pressShadow.value = 0;
  }

  return { animatedStyle, onPressIn, onPressOut, reset };
}

type SquashPressableProps = Pick<PressableProps, 'hitSlop' | 'accessibilityLabel' | 'accessibilityRole'> & {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  variant?: PressSquashVariant;
  /** Fires after squash press-in starts (e.g. Card `onPressIn`). */
  onPressIn?: () => void;
  /** Fires after squash press-out completes. */
  onPressOut?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Wrapper style around the animated view (e.g. flex:1). */
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * Ghost-style squash (scale + opacity spring) for any press target.
 * Default variant is `ghost` (Experimental Features option 3).
 */
export function SquashPressable({
  children,
  onPress,
  disabled = false,
  variant = 'ghost',
  onPressIn: onPressInProp,
  onPressOut: onPressOutProp,
  style,
  contentStyle,
  hitSlop,
  accessibilityLabel,
  accessibilityRole,
}: SquashPressableProps) {
  const { animatedStyle, onPressIn, onPressOut } = useSquashPressHandlers(variant, disabled);

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={() => {
        onPressIn();
        onPressInProp?.();
      }}
      onPressOut={() => {
        onPressOut();
        onPressOutProp?.();
      }}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      style={style}
    >
      <Animated.View style={[animatedStyle, contentStyle]} pointerEvents="box-none">
        {children}
      </Animated.View>
    </Pressable>
  );
}
