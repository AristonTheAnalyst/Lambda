import { Platform } from 'react-native';
import { Text, XStack } from 'tamagui';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import T from '@/constants/Theme';

const isGlassSupported = Platform.OS === 'ios' && Number(Platform.Version) >= 26;

let GlassView: React.ComponentType<any> | null = null;
if (isGlassSupported) {
  try { GlassView = require('expo-glass-effect').GlassView; } catch { GlassView = null; }
}

interface GlassButtonProps {
  onPress: () => void;
  icon?: string;
  label?: string;
  /** Icon + text colour. Defaults to T.accent */
  color?: string;
  iconSize?: number;
}

export default function GlassButton({
  onPress,
  icon,
  label,
  color = T.accent,
  iconSize = 13,
}: GlassButtonProps) {
  const inner = (
    <XStack
      alignItems="center"
      gap={icon && label ? T.space.xs : 0}
      paddingVertical={T.space.sm}
      paddingHorizontal={T.space.md}
    >
      {icon ? <FontAwesome name={icon as any} size={iconSize} color={color} /> : null}
      {label ? <Text color={color} fontSize={T.fontSize.md} fontWeight="500">{label}</Text> : null}
    </XStack>
  );

  if (isGlassSupported && GlassView) {
    return (
      <XStack borderRadius={999} overflow="hidden" pressStyle={{ opacity: 0.7 }} onPress={onPress} cursor="pointer">
        <GlassView glassEffectStyle="systemThinMaterial" tintColor={color} style={{ borderRadius: 999 }}>
          {inner}
        </GlassView>
      </XStack>
    );
  }

  // Fallback — translucent capsule with warm border
  return (
    <XStack
      borderRadius={999}
      backgroundColor="rgba(46,46,46,0.88)"
      borderWidth={1}
      borderColor="rgba(173,144,115,0.18)"
      pressStyle={{ opacity: 0.7 }}
      onPress={onPress}
      cursor="pointer"
    >
      {inner}
    </XStack>
  );
}
