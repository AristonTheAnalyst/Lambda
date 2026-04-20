import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Separator, Text, XStack } from 'tamagui';
import Button from '@/components/Button';
import { useAppTheme } from '@/lib/ThemeContext';
import type { ThemeColors } from '@/lib/ThemeContext';

export interface PopupMenuOption {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
}

export type PressVariant = 'native' | 'bouncy' | 'ghost' | 'depth' | 'minimal';

interface PopupMenuButtonProps {
  label: string;
  options: PopupMenuOption[];
  variant?: 'primary' | 'ghost' | 'danger' | 'danger-ghost';
  menuWidth?: number;
  pressVariant?: PressVariant;
}

interface OptionRowProps {
  opt: PopupMenuOption;
  index: number;
  colors: ThemeColors;
  space: Record<string, number>;
  fontSize: Record<string, number>;
  borderColor: string;
  onPress: () => void;
}

const EDGE_MARGIN = 8;
const ROW_HEIGHT = 44;

// Scale target, opacity target (1 = no change), shadow 0–1, spring config
const PRESS_VARIANTS: Record<PressVariant, {
  scale: number;
  opacity: number;
  shadow: number;
  spring: { damping: number; stiffness: number; mass: number };
}> = {
  native:  { scale: 1.05, opacity: 1,    shadow: 0, spring: { damping: 20, stiffness: 250, mass: 1.2 } },
  bouncy:  { scale: 1.08, opacity: 1,    shadow: 0, spring: { damping: 12, stiffness: 150, mass: 1.0 } },
  ghost:   { scale: 1.05, opacity: 0.85, shadow: 0, spring: { damping: 20, stiffness: 250, mass: 1.2 } },
  depth:   { scale: 1.05, opacity: 1,    shadow: 1, spring: { damping: 20, stiffness: 250, mass: 1.2 } },
  minimal: { scale: 1.02, opacity: 1,    shadow: 0, spring: { damping: 25, stiffness: 300, mass: 0.8 } },
};

function OptionRow({ opt, index, colors, space, fontSize, borderColor, onPress }: OptionRowProps) {
  const translateX = useSharedValue(-12);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = index * 50;
    translateX.value = withDelay(delay, withTiming(0, { duration: 220, easing: Easing.out(Easing.quad) }));
    opacity.value = withDelay(delay, withTiming(1, { duration: 180 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      {index > 0 && <Separator borderColor={borderColor} />}
      <XStack
        paddingVertical={space.md}
        paddingHorizontal={space.md}
        pressStyle={{ backgroundColor: colors.surfaceHigh }}
        onPress={onPress}
        cursor="pointer"
      >
        <Text
          fontSize={fontSize.sm}
          fontWeight="500"
          color={opt.destructive ? colors.danger : colors.primary}
        >
          {opt.label}
        </Text>
      </XStack>
    </Animated.View>
  );
}

export default function PopupMenuButton({
  label,
  options,
  variant = 'ghost',
  menuWidth = 200,
  pressVariant = 'native',
}: PopupMenuButtonProps) {
  const { colors, space, radius, fontSize } = useAppTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(null);
  const triggerRef = useRef<View>(null);

  const menuScale = useSharedValue(0.88);
  const menuOpacity = useSharedValue(0);
  const pressScale = useSharedValue(1);
  const pressOpacity = useSharedValue(1);
  const pressShadow = useSharedValue(0);

  const menuContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: menuScale.value }],
    opacity: menuOpacity.value,
  }));

  const triggerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
    opacity: pressOpacity.value,
    shadowOpacity: pressShadow.value * 0.35,
    shadowRadius: pressShadow.value * 8,
    shadowOffset: { width: 0, height: pressShadow.value * 4 },
    elevation: pressShadow.value * 8,
  }));

  function onPressIn() {
    const v = PRESS_VARIANTS[pressVariant];
    pressScale.value = withSpring(v.scale, v.spring);
    pressOpacity.value = withSpring(v.opacity, v.spring);
    pressShadow.value = withSpring(v.shadow, v.spring);
  }

  function onPressOut() {
    const v = PRESS_VARIANTS[pressVariant];
    pressScale.value = withSpring(1.0, v.spring);
    pressOpacity.value = withSpring(1.0, v.spring);
    pressShadow.value = withSpring(0, v.spring);
  }

  function openMenu() {
    triggerRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
      const estimatedMenuHeight = options.length * ROW_HEIGHT + Math.max(0, options.length - 1);
      const safeLeft   = insets.left   + EDGE_MARGIN;
      const safeRight  = screenWidth   - insets.right  - EDGE_MARGIN;
      const safeTop    = insets.top    + EDGE_MARGIN;
      const safeBottom = screenHeight  - insets.bottom - EDGE_MARGIN;
      const gap = space.xs;

      let left = x + width - menuWidth;
      if (left < safeLeft) left = x;
      if (left + menuWidth > safeRight) left = safeRight - menuWidth;
      left = Math.max(safeLeft, left);

      let top = y + height + gap;
      if (top + estimatedMenuHeight > safeBottom) top = y - gap - estimatedMenuHeight;
      top = Math.max(safeTop, top);

      setAnchor({ left, top });
      setVisible(true);
      menuScale.value = 0.88;
      menuOpacity.value = 0;
      menuScale.value = withSpring(1, { damping: 20, mass: 1.2, stiffness: 250 });
      menuOpacity.value = withTiming(1, { duration: 120 });
    });
  }

  function closeMenu() {
    menuScale.value = withSpring(0.88, { damping: 20, mass: 1.2, stiffness: 250 });
    menuOpacity.value = withTiming(0, { duration: 120 }, (finished) => {
      if (finished) runOnJS(setVisible)(false);
    });
  }

  function selectOption(onSelect: () => void) {
    closeMenu();
    onSelect();
  }

  return (
    <>
      <Pressable
        ref={triggerRef}
        onPress={openMenu}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <Animated.View style={triggerAnimStyle} pointerEvents="none">
          <Button label={label} onPress={() => {}} variant={variant} />
        </Animated.View>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeMenu}
      >
        <Pressable
          style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.35)' }]}
          onPress={closeMenu}
        />

        {anchor && (
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: anchor.top,
                left: anchor.left,
                width: menuWidth,
                backgroundColor: colors.surface,
                borderRadius: radius.md,
                borderWidth: 0.5,
                borderColor: colors.border,
                overflow: 'hidden',
                elevation: 8,
              },
              menuContainerStyle,
            ]}
          >
            {options.map((opt, i) => (
              <OptionRow
                key={opt.label}
                opt={opt}
                index={i}
                colors={colors}
                space={space}
                fontSize={fontSize}
                borderColor={colors.border}
                onPress={() => selectOption(opt.onSelect)}
              />
            ))}
          </Animated.View>
        )}
      </Modal>
    </>
  );
}
