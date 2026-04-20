import { useRef, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '@/components/Button';
import PopupMenu, { estimatePopupMenuHeight, type PopupMenuOption } from '@/components/PopupMenu';
import { useSquashPressHandlers, type PressSquashVariant } from '@/components/PressSquash';
import { useAppTheme } from '@/lib/ThemeContext';

export type { PopupMenuOption } from '@/components/PopupMenu';
/** @deprecated use PressSquashVariant from `@/components/PressSquash` */
export type PressVariant = PressSquashVariant;

interface PopupMenuButtonProps {
  label: string;
  options: PopupMenuOption[];
  variant?: 'primary' | 'ghost' | 'danger' | 'danger-ghost';
  menuWidth?: number;
  /** Default `ghost` — Experimental Features option 3 (scale + fade). */
  pressVariant?: PressSquashVariant;
}

const EDGE_MARGIN = 8;

/**
 * Labeled trigger + anchored popup menu. For menu-only UI (custom trigger), use `PopupMenu`.
 */
export default function PopupMenuButton({
  label,
  options,
  variant = 'ghost',
  menuWidth = 200,
  pressVariant = 'ghost',
}: PopupMenuButtonProps) {
  const { space } = useAppTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(null);
  const triggerRef = useRef<View>(null);

  const { animatedStyle, onPressIn, onPressOut } = useSquashPressHandlers(pressVariant, false);

  function openMenu() {
    triggerRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
      const estimatedMenuHeight = estimatePopupMenuHeight(options.length);
      const safeLeft = insets.left + EDGE_MARGIN;
      const safeRight = screenWidth - insets.right - EDGE_MARGIN;
      const safeTop = insets.top + EDGE_MARGIN;
      const safeBottom = screenHeight - insets.bottom - EDGE_MARGIN;
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
    });
  }

  return (
    <>
      <Pressable ref={triggerRef} onPress={openMenu} onPressIn={onPressIn} onPressOut={onPressOut}>
        <Animated.View style={animatedStyle} pointerEvents="none">
          <Button label={label} onPress={() => {}} variant={variant} squash={false} />
        </Animated.View>
      </Pressable>

      <PopupMenu
        visible={visible}
        anchor={anchor}
        options={options}
        menuWidth={menuWidth}
        onClose={() => setVisible(false)}
        onSelectOption={(opt) => opt.onSelect()}
      />
    </>
  );
}
