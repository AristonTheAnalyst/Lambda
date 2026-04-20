import { ReactNode, RefObject } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XStack, YStack } from 'tamagui';
import Button from '@/components/Button';
import { useAppTheme } from '@/lib/ThemeContext';

interface WorkoutLogStickyFooterProps {
  onLogSet: () => void;
  /** When provided, renders a second equal-width button to the left of Log Set. */
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  /** Ref attached to the secondary button container — used by the caller to measure its on-screen position. */
  secondaryRef?: RefObject<View>;
  /** Extra rows below the button row. */
  children?: ReactNode;
}

/** Sticky footer: primary Log Set button — same chrome as Training Session active workout. */
export default function WorkoutLogStickyFooter({ onLogSet, secondaryLabel, onSecondaryPress, secondaryRef, children }: WorkoutLogStickyFooterProps) {
  const { colors, space } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <YStack
      paddingHorizontal={space.lg}
      paddingTop={space.lg}
      paddingBottom={insets.bottom + space.xxl + space.lg}
      borderTopWidth={0.5}
      borderTopColor={colors.border}
      backgroundColor={colors.bg}
      gap={space.sm}
    >
      {secondaryLabel && onSecondaryPress ? (
        <XStack gap={space.sm}>
          <View style={{ flex: 1 }} ref={secondaryRef}>
            <Button label={secondaryLabel} onPress={onSecondaryPress} variant="ghost" fullWidth />
          </View>
          <YStack flex={1}>
            <Button label="Log Set" onPress={onLogSet} fullWidth />
          </YStack>
        </XStack>
      ) : (
        <Button label="Log Set" onPress={onLogSet} />
      )}
      {children}
    </YStack>
  );
}
