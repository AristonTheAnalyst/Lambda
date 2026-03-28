import { ActivityIndicator, Platform, Text as RNText, TouchableOpacity, View } from 'react-native';
import T from '@/constants/Theme';

const isGlassSupported = Platform.OS === 'ios' && Number(Platform.Version) >= 26;

let GlassView: React.ComponentType<any> | null = null;
if (isGlassSupported) {
  try {
    GlassView = require('expo-glass-effect').GlassView;
  } catch {
    GlassView = null;
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'glass' | 'ghost' | 'danger' | 'danger-ghost';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

function variantStyles(variant: 'primary' | 'ghost' | 'danger' | 'danger-ghost') {
  if (variant === 'ghost') {
    return { backgroundColor: 'transparent' as const, borderWidth: 1, borderColor: T.accent };
  }
  if (variant === 'danger') {
    return { backgroundColor: T.danger, borderWidth: 0 };
  }
  if (variant === 'danger-ghost') {
    return { backgroundColor: 'transparent' as const, borderWidth: 1, borderColor: T.danger };
  }
  return { backgroundColor: T.accent, borderWidth: 0 };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const effective  = variant === 'glass' ? 'primary' : (variant ?? 'primary');
  const self       = fullWidth ? ('stretch' as const) : ('center' as const);

  // Glass variant on iOS 26+
  if (variant === 'glass' && isGlassSupported && GlassView) {
    return (
      <View style={{ alignSelf: self, borderRadius: 999, overflow: 'hidden', opacity: isDisabled ? 0.45 : 1 }}>
        <GlassView
          glassEffectStyle="systemMaterial"
          tintColor={T.accent}
          onTouchEnd={isDisabled ? undefined : onPress}
          style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: T.space.md, paddingHorizontal: T.space.lg }}
        >
          {loading
            ? <ActivityIndicator size="small" color={T.accentText} />
            : <RNText style={{ color: T.accentText, fontSize: T.fontSize.md, fontWeight: '600' }}>{label}</RNText>
          }
        </GlassView>
      </View>
    );
  }

  const spinnerColor = effective === 'ghost' ? T.accent : effective === 'danger-ghost' ? T.danger : T.accentText;
  const labelColor   = effective === 'ghost' ? T.accent : effective === 'danger-ghost' ? T.danger : T.accentText;
  const vs = variantStyles(effective);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={1}
      style={{
        alignSelf: self,
        borderRadius: 999,
        paddingVertical: T.space.md,
        paddingHorizontal: T.space.lg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isDisabled ? 0.45 : 1,
        ...vs,
      }}
    >
      {loading
        ? <ActivityIndicator size="small" color={spinnerColor} />
        : <RNText style={{ color: labelColor, fontSize: T.fontSize.md, fontWeight: '600' }}>{label}</RNText>
      }
    </TouchableOpacity>
  );
}
