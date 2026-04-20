import { ActivityIndicator, Platform, Text as RNText, TouchableOpacity, View } from 'react-native';
import { SquashPressable } from '@/components/PressSquash';
import { useAppTheme } from '@/lib/ThemeContext';
import type { ThemeColors } from '@/lib/ThemeContext';

const isGlassSupported = Platform.OS === 'ios' && Number(Platform.Version) >= 26;

let GlassView: React.ComponentType<any> | null = null;
if (isGlassSupported) {
  try {
    GlassView = require('expo-glass-effect').GlassView;
  } catch {
    GlassView = null;
  }
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'glass' | 'ghost' | 'danger' | 'danger-ghost';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  /** Set false when an outer control already applies ghost squash (e.g. `PopupMenuButton`). */
  squash?: boolean;
}

function variantStyles(
  variant: 'primary' | 'ghost' | 'danger' | 'danger-ghost',
  colors: ThemeColors,
) {
  if (variant === 'ghost') {
    return { backgroundColor: 'transparent' as const, borderWidth: 1, borderColor: colors.accent };
  }
  if (variant === 'danger') {
    return { backgroundColor: colors.danger, borderWidth: 0 };
  }
  if (variant === 'danger-ghost') {
    return { backgroundColor: 'transparent' as const, borderWidth: 1, borderColor: colors.danger };
  }
  return { backgroundColor: colors.accent, borderWidth: 0 };
}

export default function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = false,
  squash = true,
}: ButtonProps) {
  const { colors, space, fontSize } = useAppTheme();
  const isDisabled = disabled || loading;
  const effective = variant === 'glass' ? 'primary' : (variant ?? 'primary');
  const self = fullWidth ? ('stretch' as const) : ('center' as const);

  if (variant === 'glass' && isGlassSupported && GlassView) {
    const glassInner = (
      <View style={{ borderRadius: 999, overflow: 'hidden', opacity: isDisabled ? 0.45 : 1 }}>
        <GlassView
          glassEffectStyle="systemMaterial"
          tintColor={colors.accent}
          pointerEvents="none"
          style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: space.md, paddingHorizontal: space.lg }}
        >
          {loading
            ? <ActivityIndicator size="small" color={colors.accentText} />
            : <RNText style={{ color: colors.accentText, fontSize: fontSize.md, fontWeight: '600' }}>{label}</RNText>
          }
        </GlassView>
      </View>
    );
    if (squash) {
      return (
        <SquashPressable onPress={onPress} disabled={isDisabled} contentStyle={{ alignSelf: self }}>
          {glassInner}
        </SquashPressable>
      );
    }
    return (
      <View style={{ alignSelf: self, borderRadius: 999, overflow: 'hidden', opacity: isDisabled ? 0.45 : 1 }}>
        <GlassView
          glassEffectStyle="systemMaterial"
          tintColor={colors.accent}
          onTouchEnd={isDisabled ? undefined : onPress}
          style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: space.md, paddingHorizontal: space.lg }}
        >
          {loading
            ? <ActivityIndicator size="small" color={colors.accentText} />
            : <RNText style={{ color: colors.accentText, fontSize: fontSize.md, fontWeight: '600' }}>{label}</RNText>
          }
        </GlassView>
      </View>
    );
  }

  const spinnerColor = effective === 'ghost' ? colors.accent : effective === 'danger-ghost' ? colors.danger : colors.accentText;
  const labelColor = effective === 'ghost' ? colors.accent : effective === 'danger-ghost' ? colors.danger : colors.accentText;
  const vs = variantStyles(effective, colors);

  const solidBody = (
    <View
      style={{
        borderRadius: 999,
        paddingVertical: space.md,
        paddingHorizontal: space.lg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isDisabled ? 0.45 : 1,
        ...vs,
      }}
    >
      {loading
        ? <ActivityIndicator size="small" color={spinnerColor} />
        : <RNText style={{ color: labelColor, fontSize: fontSize.md, fontWeight: '600' }}>{label}</RNText>
      }
    </View>
  );

  if (squash) {
    return (
      <SquashPressable onPress={onPress} disabled={isDisabled} contentStyle={{ alignSelf: self }}>
        {solidBody}
      </SquashPressable>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={1}
      style={{ alignSelf: self }}
    >
      {solidBody}
    </TouchableOpacity>
  );
}
