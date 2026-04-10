import { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Separator, Text, XStack, YStack } from 'tamagui';
import { useAppTheme } from '@/lib/ThemeContext';

interface Props {
  title: string;
  left?: ReactNode;
  right?: ReactNode;
}

export default function PageHeader({ title, left, right }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, space } = useAppTheme();

  return (
    <YStack>
      <XStack
        style={{ height: insets.top + 52, paddingTop: insets.top }}
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
