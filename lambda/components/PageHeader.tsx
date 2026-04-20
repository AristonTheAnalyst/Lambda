import { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Separator, Text, XStack, YStack } from 'tamagui';
import { useAppTheme } from '@/lib/ThemeContext';

interface Props {
  title: string;
  left?: ReactNode;
  right?: ReactNode;
}

/** Title/button row height (toolbar band under the top inset). */
const HEADER_ROW_HEIGHT = 52;
/** Subtracted from `insets.top` to pull the header toward the status bar. Keep `0` for full safe-area padding. */
const TOP_INSET_TUCK_PX = 0;
/** Added below the safe area — increase to push the header down if it feels too close to the top. */
const TOP_EXTRA_PADDING_PX = 10;

export default function PageHeader({ title, left, right }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, space } = useAppTheme();
  const paddingTop = Math.max(
    insets.top - TOP_INSET_TUCK_PX + TOP_EXTRA_PADDING_PX,
    0,
  );

  return (
    <YStack>
      <XStack
        style={{ height: paddingTop + HEADER_ROW_HEIGHT, paddingTop }}
        backgroundColor={colors.bg}
        alignItems="center"
        justifyContent="space-between"
      >
        <XStack width={90} alignItems="center" paddingLeft={space.md}>
          {left ?? null}
        </XStack>

        <Text
          fontSize={20}
          fontWeight="600"
          color={colors.primary}
          flex={1}
          textAlign="center"
          pointerEvents="none"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.65}
        >
          {title}
        </Text>

        <XStack width={90} justifyContent="flex-end" paddingRight={space.lg} alignItems="center">
          {right ?? null}
        </XStack>
      </XStack>
      <Separator borderColor={colors.border} />
    </YStack>
  );
}
