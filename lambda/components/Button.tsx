import { ActivityIndicator, Platform, Text as RNText, TouchableOpacity, View } from 'react-native';
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
}: ButtonProps) {
  const { colors, space, fontSize } = useAppTheme();
  const isDisabled = disabled || loading;
  const effective = variant === 'glass' ? 'primary' : (variant ?? 'primary');
  const self = fullWidth ? ('stretch' as const) : ('center' as const);

  if (variant === 'glass' && isGlassSupported && GlassView) {
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

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={1}
      style={{
        alignSelf: self,
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
    </TouchableOpacity>
  );
}
