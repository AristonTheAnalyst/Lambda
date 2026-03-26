import { Platform } from 'react-native';
import { Button as TamaguiButton, Spinner, Stack, Text, styled } from 'tamagui';

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
  borderRadius: '$md',
  paddingVertical: '$md',
  paddingHorizontal: '$lg',
  alignItems: 'center',
  justifyContent: 'center',
  height: 'auto',

  variants: {
    variant: {
      primary: {
        backgroundColor: '$accent',
        borderWidth: 0,
        pressStyle: { opacity: 0.75 },
      },
      ghost: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '$accent',
        pressStyle: { opacity: 0.75 },
      },
      danger: {
        backgroundColor: '$danger',
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
  const isDisabled = disabled || loading;
  const effective  = variant === 'glass' ? 'primary' : variant;
  const spinnerColor = effective === 'ghost' ? '$accent' : '$accentText';
  const labelColor   = effective === 'ghost' ? '$accent' : '$accentText';

  // Glass variant on iOS 26+
  if (variant === 'glass' && isGlassSupported && GlassView) {
    return (
      <Stack borderRadius="$md" overflow="hidden" opacity={isDisabled ? 0.45 : 1}>
        <GlassView
          glassEffectStyle="systemMaterial"
          tintColor="#bb7423"
          onTouchEnd={isDisabled ? undefined : onPress}
          style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 16 }}
        >
          {loading
            ? <Spinner size="small" color="$accentText" />
            : <Text color="$accentText" fontSize="$md" fontWeight="600">{label}</Text>
          }
        </GlassView>
      </Stack>
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
        : <Text color={labelColor} fontSize="$md" fontWeight="600">{label}</Text>
      }
    </Base>
  );
}
