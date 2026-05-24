import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Separator, Text, XStack } from 'tamagui';
import { SquashPressable } from '@/components/PressSquash';
import { DEV_LITE_UI } from '@/lib/devLiteUi';
import { useAppTheme } from '@/lib/ThemeContext';
import type { ThemeColors } from '@/lib/ThemeContext';

export interface PopupMenuOption {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
}

export interface PopupMenuAnchor {
  left: number;
  top: number;
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

const ROW_HEIGHT = 44;

function OptionRow({ opt, index, colors, space, fontSize, borderColor, onPress }: OptionRowProps) {
  const translateX = useSharedValue(-12);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (DEV_LITE_UI) {
      translateX.value = 0;
      opacity.value = 1;
      return;
    }
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
      <SquashPressable onPress={onPress} contentStyle={{ alignSelf: 'stretch' }}>
        <XStack paddingVertical={space.md} paddingHorizontal={space.md} cursor="pointer">
          <Text
            fontSize={fontSize.sm}
            fontWeight="500"
            color={opt.destructive ? colors.danger : colors.primary}
          >
            {opt.label}
          </Text>
        </XStack>
      </SquashPressable>
    </Animated.View>
  );
}

export interface PopupMenuProps {
  visible: boolean;
  anchor: PopupMenuAnchor | null;
  options: PopupMenuOption[];
  menuWidth?: number;
  onClose: () => void;
  /** Called after menu starts closing; use for option actions. */
  onSelectOption: (opt: PopupMenuOption) => void;
}

/**
 * Anchored popup menu (modal overlay + option list). Reusable without the default trigger.
 * Pair with your own control, or use `PopupMenuButton` for a labeled trigger + ghost squash.
 */
export default function PopupMenu({
  visible,
  anchor,
  options,
  menuWidth = 200,
  onClose,
  onSelectOption,
}: PopupMenuProps) {
  const { colors, space, radius, fontSize } = useAppTheme();
  const menuScale = useSharedValue(0.88);
  const menuOpacity = useSharedValue(0);

  const menuContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: menuScale.value }],
    opacity: menuOpacity.value,
  }));

  function openMenu() {
    if (DEV_LITE_UI) {
      menuScale.value = 1;
      menuOpacity.value = 1;
      return;
    }
    menuScale.value = 0.88;
    menuOpacity.value = 0;
    menuScale.value = withSpring(1, { damping: 20, mass: 1.2, stiffness: 250 });
    menuOpacity.value = withTiming(1, { duration: 120 });
  }

  useEffect(() => {
    if (visible && anchor) openMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open only when anchor / visibility settles
  }, [visible, anchor?.left, anchor?.top]);

  function closeMenu() {
    if (DEV_LITE_UI) {
      menuScale.value = 0.88;
      menuOpacity.value = 0;
      onClose();
      return;
    }
    menuScale.value = withSpring(0.88, { damping: 20, mass: 1.2, stiffness: 250 });
    menuOpacity.value = withTiming(0, { duration: 120 }, (finished) => {
      if (finished) runOnJS(onClose)();
    });
  }

  function selectOption(opt: PopupMenuOption) {
    closeMenu();
    onSelectOption(opt);
  }

  return (
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
              onPress={() => selectOption(opt)}
            />
          ))}
        </Animated.View>
      )}
    </Modal>
  );
}

/** @internal exported for layout estimates */
export function estimatePopupMenuHeight(optionCount: number): number {
  return optionCount * ROW_HEIGHT + Math.max(0, optionCount - 1);
}
