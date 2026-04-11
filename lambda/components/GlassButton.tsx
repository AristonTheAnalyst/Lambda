import { Platform } from 'react-native';
import { Spinner, Text, XStack } from 'tamagui';
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
  disabled?: boolean;
  loading?: boolean;
  /** Tighter padding + smaller type (e.g. header pills, modal footers) */
  compact?: boolean;
}

export default function GlassButton({
  onPress,
  icon,
  label,
  color: colorProp,
  iconSize = 13,
  disabled = false,
  loading = false,
  compact = false,
}: GlassButtonProps) {
  const { colors, space, fontSize } = useAppTheme();
  const color = colorProp ?? colors.accent;
  const inactive = disabled || loading;
  const py = compact ? 4 : space.sm;
  const px = compact ? space.sm : space.md;
  const labelSize = compact ? fontSize.sm : fontSize.md;
  const weight = compact ? '600' : '500';

  const inner = loading ? (
    <XStack alignItems="center" justifyContent="center" paddingVertical={py} paddingHorizontal={px} minHeight={compact ? 28 : undefined}>
      <Spinner size="small" color={color} />
    </XStack>
  ) : (
    <XStack
      alignItems="center"
      gap={icon && label ? space.xs : 0}
      paddingVertical={py}
      paddingHorizontal={px}
    >
      {icon ? <FontAwesome name={icon as any} size={iconSize} color={color} /> : null}
      {label ? <Text color={color} fontSize={labelSize} fontWeight={weight}>{label}</Text> : null}
    </XStack>
  );

  if (isGlassSupported && GlassView) {
    return (
      <XStack
        borderRadius={999}
        overflow="hidden"
        onPress={inactive ? undefined : onPress}
        cursor={inactive ? undefined : 'pointer'}
        opacity={inactive ? 0.45 : 1}
      >
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
      onPress={inactive ? undefined : onPress}
      cursor={inactive ? undefined : 'pointer'}
      opacity={inactive ? 0.45 : 1}
    >
      {inner}
    </XStack>
  );
}
