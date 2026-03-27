import { Platform, TouchableOpacity } from 'react-native';
import { Button as TamaguiButton, Spinner, YStack, Text, styled } from 'tamagui';
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

// ─── Styled variants ──────────────────────────────────────────────────────────

const Base = styled(TamaguiButton, {
  borderRadius: 999,
  paddingVertical: T.space.md,
  paddingHorizontal: T.space.lg,
  alignItems: 'center',
  justifyContent: 'center',
  height: 'auto',

  variants: {
    variant: {
      primary: {
        backgroundColor: T.accent,
        borderWidth: 0,
        pressStyle: { opacity: 0.75 },
      },
      ghost: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: T.accent,
        pressStyle: { opacity: 0.75 },
      },
      danger: {
        backgroundColor: T.danger,
        borderWidth: 0,
        pressStyle: { opacity: 0.75 },
      },
    },
  } as const,

  defaultVariants: { variant: 'primary' },
});

// ─── Props ────────────────────────────────────────────────────────────────────

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'glass' | 'glass-primary' | 'glass-danger' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}

// ─── Glass render helper ──────────────────────────────────────────────────────

function GlassButtonBody({
  label, loading, tintColor, isDisabled, onPress,
}: {
  label: string; loading: boolean; tintColor: string; isDisabled: boolean; onPress: () => void;
}) {
  if (isGlassSupported && GlassView) {
    return (
      <YStack borderRadius={T.radius.md} overflow="hidden" opacity={isDisabled ? 0.45 : 1}>
        <GlassView
          glassEffectStyle="systemMaterial"
          tintColor={tintColor}
          onTouchEnd={isDisabled ? undefined : onPress}
          style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: T.space.md, paddingHorizontal: T.space.lg }}
        >
          {loading
            ? <Spinner size="small" color={T.accentText} />
            : <Text color={T.accentText} fontSize={T.fontSize.md} fontWeight="600">{label}</Text>
          }
        </GlassView>
      </YStack>
    );
  }

  // Fallback — translucent tinted capsule
  const borderColor = tintColor === T.danger ? T.danger : T.accent;
  const bgColor     = tintColor === T.danger ? 'rgba(192,57,43,0.18)' : 'rgba(187,116,35,0.18)';
  const textColor   = tintColor === T.danger ? T.danger : T.accent;
  return (
    <TouchableOpacity
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={{
        borderRadius: T.radius.md,
        paddingVertical: T.space.md,
        paddingHorizontal: T.space.lg,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bgColor,
        borderWidth: 1,
        borderColor,
        opacity: isDisabled ? 0.45 : 1,
      }}
    >
      {loading
        ? <Spinner size="small" color={textColor} />
        : <Text color={textColor} fontSize={T.fontSize.md} fontWeight="600">{label}</Text>
      }
    </TouchableOpacity>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  if (variant === 'glass' || variant === 'glass-primary') {
    return <GlassButtonBody label={label} loading={loading} tintColor={T.accent} isDisabled={isDisabled} onPress={onPress} />;
  }

  if (variant === 'glass-danger') {
    return <GlassButtonBody label={label} loading={loading} tintColor={T.danger} isDisabled={isDisabled} onPress={onPress} />;
  }

  const spinnerColor = variant === 'ghost' ? T.accent : T.accentText;
  const labelColor   = variant === 'ghost' ? T.accent : T.accentText;

  return (
    <Base
      variant={variant}
      onPress={onPress}
      disabled={isDisabled}
      opacity={isDisabled ? 0.45 : 1}
    >
      {loading
        ? <Spinner size="small" color={spinnerColor} />
        : <Text color={labelColor} fontSize={T.fontSize.md} fontWeight="600">{label}</Text>
      }
    </Base>
  );
}
