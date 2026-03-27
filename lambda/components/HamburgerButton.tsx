import React from 'react';
import { Platform } from 'react-native';
import { XStack } from 'tamagui';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useDrawer } from '@/lib/DrawerContext';
import T from '@/constants/Theme';

const isGlassSupported = Platform.OS === 'ios' && Number(Platform.Version) >= 26;

let GlassView: React.ComponentType<any> | null = null;
if (isGlassSupported) {
  try { GlassView = require('expo-glass-effect').GlassView; } catch { GlassView = null; }
}

export default function HamburgerButton() {
  const { openDrawer } = useDrawer();

  const inner = (
    <XStack
      alignItems="center"
      paddingVertical={T.space.sm}
      paddingHorizontal={T.space.md}
    >
      <FontAwesome name="bars" size={15} color={T.accent} />
    </XStack>
  );

  if (isGlassSupported && GlassView) {
    return (
      <XStack borderRadius={999} overflow="hidden" pressStyle={{ opacity: 0.7 }} onPress={openDrawer} cursor="pointer">
        <GlassView glassEffectStyle="systemThinMaterial" tintColor={T.accent} style={{ borderRadius: 999 }}>
          {inner}
        </GlassView>
      </XStack>
    );
  }

  return (
    <XStack
      borderRadius={999}
      backgroundColor="rgba(46,46,46,0.88)"
      borderWidth={1}
      borderColor="rgba(173,144,115,0.18)"
      pressStyle={{ opacity: 0.7 }}
      onPress={openDrawer}
      cursor="pointer"
    >
      {inner}
    </XStack>
  );
}
