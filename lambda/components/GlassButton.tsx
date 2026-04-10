import { Platform } from 'react-native';
import { Text, XStack } from 'tamagui';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAppTheme } from '@/lib/ThemeContext';

const isGlassSupported = Platform.OS === 'ios' && Number(Platform.Version) >= 26;

let GlassView: React.ComponentType<any> | null = null;
if (isGlassSupported) {
  try { GlassView = require('expo-glass-effect').GlassView; } catch { GlassView = null; }
}

/** #RRGGBB or #RGB → rgba(..., alpha) for translucent fills */
function hexToRgba(hex: string, alpha: number): string {
  const raw = hex.replace('#', '');
  const v = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  if (v.length !== 6) return `rgba(128,128,128,${alpha})`;
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

interface GlassButtonProps {
  onPress: () => void;
  icon?: string;
  label?: string;
  /** Icon + text colour. Defaults to accent */
  color?: string;
  iconSize?: number;
}

export default function GlassButton({
  onPress,
  icon,
  label,
  color: colorProp,
  iconSize = 13,
}: GlassButtonProps) {
  const { colors, space, fontSize } = useAppTheme();
  const color = colorProp ?? colors.accent;

  const inner = (
    <XStack
      alignItems="center"
      gap={icon && label ? space.xs : 0}
      paddingVertical={space.sm}
      paddingHorizontal={space.md}
    >
      {icon ? <FontAwesome name={icon as any} size={iconSize} color={color} /> : null}
      {label ? <Text color={color} fontSize={fontSize.md} fontWeight="500">{label}</Text> : null}
    </XStack>
  );

  if (isGlassSupported && GlassView) {
    return (
      <XStack borderRadius={999} overflow="hidden" onPress={onPress} cursor="pointer">
        <GlassView
          glassEffectStyle="systemThinMaterial"
          tintColor={colors.surface}
          style={{ borderRadius: 999 }}
        >
          {inner}
        </GlassView>
      </XStack>
    );
  }

  return (
    <XStack
      borderRadius={999}
      backgroundColor={hexToRgba(colors.surface, 0.92)}
      borderWidth={1}
      borderColor={hexToRgba(colors.border, 0.9)}
      onPress={onPress}
      cursor="pointer"
    >
      {inner}
    </XStack>
  );
}
