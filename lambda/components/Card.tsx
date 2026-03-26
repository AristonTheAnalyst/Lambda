import { Platform } from 'react-native';
import { Stack, styled } from 'tamagui';

const isGlassSupported = Platform.OS === 'ios' && Number(Platform.Version) >= 26;

let GlassView: React.ComponentType<any> | null = null;
if (isGlassSupported) {
  try {
    GlassView = require('expo-glass-effect').GlassView;
  } catch {
    GlassView = null;
  }
}

// ─── Styled card ──────────────────────────────────────────────────────────────

const StyledCard = styled(Stack, {
  backgroundColor: '$surface',
  borderWidth: 1,
  borderColor: '$borderColor',
  borderRadius: '$md',
  padding: '$md',

  variants: {
    pressable: {
      true: { pressStyle: { opacity: 0.75 }, cursor: 'pointer' },
    },
  } as const,
});

// ─── Props ────────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'glass';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Card({ children, onPress, variant = 'default' }: CardProps) {
  if (variant === 'glass' && isGlassSupported && GlassView) {
    return (
      <Stack
        borderRadius="$md"
        overflow="hidden"
        pressStyle={onPress ? { opacity: 0.8 } : undefined}
        onPress={onPress}
      >
        <GlassView glassEffectStyle="systemMaterial" style={{ borderRadius: 8, padding: 12 }}>
          {children}
        </GlassView>
      </Stack>
    );
  }

  return (
    <StyledCard pressable={!!onPress} onPress={onPress}>
      {children}
    </StyledCard>
  );
}
