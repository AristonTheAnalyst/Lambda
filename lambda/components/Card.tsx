import { TouchableOpacity, View, StyleSheet, Platform } from 'react-native';
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

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'glass';
}

export default function Card({ children, onPress, variant = 'default' }: CardProps) {
  if (variant === 'glass' && isGlassSupported && GlassView) {
    if (onPress) {
      return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.touchable}>
          <GlassView glassEffectStyle="systemMaterial" style={styles.inner}>
            {children}
          </GlassView>
        </TouchableOpacity>
      );
    }
    return (
      <GlassView glassEffectStyle="systemMaterial" style={styles.inner}>
        {children}
      </GlassView>
    );
  }

  // default variant (or glass fallback on older platforms)
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={styles.card}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  touchable: {
    borderRadius: T.radius.md,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: T.radius.md,
    padding: T.space.md,
  },
  inner: {
    borderRadius: T.radius.md,
    padding: T.space.md,
  },
});
