import { Pressable, Text, View } from 'react-native';
import { XStack } from 'tamagui';
import { useAppTheme } from '@/lib/ThemeContext';

export interface SlideTabBarProps<T extends string = string> {
  tabs: readonly T[];
  active: T;
  onChange: (t: T) => void;
}

/**
 * Underline tab strip for carousel / SlideTabView screens.
 * Uses RN Pressable + Text so labels lay out reliably (Tamagui Text inside
 * Reanimated views — e.g. SquashPressable — often disappears on device).
 */
export default function SlideTabBar<T extends string>({ tabs, active, onChange }: SlideTabBarProps<T>) {
  const { colors, space, fontSize } = useAppTheme();

  return (
    <XStack borderBottomWidth={0.5} borderBottomColor={colors.border}>
      {tabs.map((tab) => {
        const isActive = tab === active;
        return (
          <Pressable key={tab} onPress={() => onChange(tab)} style={{ flex: 1 }}>
            <View
              style={{
                paddingVertical: space.md,
                alignItems: 'center',
                justifyContent: 'center',
                borderBottomWidth: 2,
                borderBottomColor: isActive ? colors.accent : 'transparent',
              }}
            >
              <Text
                style={{
                  fontSize: fontSize.sm,
                  fontWeight: isActive ? '700' : '400',
                  color: isActive ? colors.accent : colors.muted,
                }}
                numberOfLines={1}
              >
                {tab}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </XStack>
  );
}
