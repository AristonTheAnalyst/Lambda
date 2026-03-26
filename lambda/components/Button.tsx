import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  Platform,
  View,
} from 'react-native';
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

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'glass' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}

export default function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  if (variant === 'glass' && isGlassSupported && GlassView) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.75}
        style={[styles.touchable, isDisabled && styles.disabled]}
      >
        <GlassView
          glassEffectStyle="systemMaterial"
          tintColor={T.accent}
          style={styles.glassInner}
        >
          {loading ? (
            <ActivityIndicator color={T.accentText} />
          ) : (
            <Text style={styles.glassText}>{label}</Text>
          )}
        </GlassView>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'glass' && styles.primary, // fallback: same as primary
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.danger,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'ghost' ? T.accent : T.accentText}
        />
      ) : (
        <Text
          style={[
            styles.label,
            variant === 'ghost' && styles.ghostLabel,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    borderRadius: T.radius.md,
    overflow: 'hidden',
  },
  base: {
    paddingVertical: T.space.md,
    paddingHorizontal: T.space.lg,
    borderRadius: T.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: T.accent,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: T.accent,
  },
  danger: {
    backgroundColor: T.danger,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    color: T.accentText,
    fontSize: T.fontSize.md,
    fontWeight: '600',
  },
  ghostLabel: {
    color: T.accent,
  },
  glassInner: {
    paddingVertical: T.space.md,
    paddingHorizontal: T.space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassText: {
    color: T.accentText,
    fontSize: T.fontSize.md,
    fontWeight: '600',
  },
});
