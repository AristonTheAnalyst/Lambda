import { Platform } from 'react-native';
import { YStack, styled } from 'tamagui';
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

// ─── Styled card ──────────────────────────────────────────────────────────────

const StyledCard = styled(YStack, {
  backgroundColor: T.surface,
  borderWidth: 1,
  borderColor: T.border,
  borderRadius: T.radius.md,
  padding: T.space.md,

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
      <YStack
        borderRadius={T.radius.md}
        overflow="hidden"
        pressStyle={onPress ? { opacity: 0.8 } : undefined}
        onPress={onPress}
      >
        <GlassView glassEffectStyle="systemMaterial" style={{ borderRadius: T.radius.md, padding: T.space.md }}>
          {children}
        </GlassView>
      </YStack>
    );
  }

  return (
    <StyledCard pressable={!!onPress} onPress={onPress}>
      {children}
    </StyledCard>
  );
}
