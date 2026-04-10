import { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';
import Button from '@/components/Button';
import { useAppTheme } from '@/lib/ThemeContext';

interface WorkoutLogStickyFooterProps {
  onLogSet: () => void;
  /** Extra rows below Log Set (e.g. note triggers). */
  children?: ReactNode;
}

/** Sticky footer: primary Log Set button — same chrome as Training Session active workout. */
export default function WorkoutLogStickyFooter({ onLogSet, children }: WorkoutLogStickyFooterProps) {
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
      justifyContent="center"
      gap={space.sm}
    >
      <Button label="Log Set" onPress={onLogSet} />
      {children}
    </YStack>
  );
}
