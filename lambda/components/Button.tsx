import { Platform } from 'react-native';
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
  borderRadius: T.radius.md,
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
  variant?: 'primary' | 'glass' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
}: ButtonProps) {
  const isDisabled   = disabled || loading;
  const effective    = variant === 'glass' ? 'primary' : variant;
  const spinnerColor = effective === 'ghost' ? T.accent : T.accentText;
  const labelColor   = effective === 'ghost' ? T.accent : T.accentText;

  // Glass variant on iOS 26+
  if (variant === 'glass' && isGlassSupported && GlassView) {
    return (
      <YStack borderRadius={T.radius.md} overflow="hidden" opacity={isDisabled ? 0.45 : 1}>
        <GlassView
          glassEffectStyle="systemMaterial"
          tintColor={T.accent}
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

  return (
    <Base
      variant={effective}
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
