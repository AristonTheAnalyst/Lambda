import { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Separator, Stack, Text, XStack, YStack } from 'tamagui';
import HamburgerButton from './HamburgerButton';

interface Props {
  title: string;
  right?: ReactNode;
}

export default function PageHeader({ title, right }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <YStack>
      <XStack
        paddingTop={insets.top}
        backgroundColor="$background"
        alignItems="center"
        justifyContent="space-between"
      >
        {/* Left — hamburger */}
        <XStack width={73} alignItems="center">
          <HamburgerButton />
        </XStack>

        {/* Center — title (absolutely fills remaining space, pointer-events off) */}
        <Text
          fontSize={20}
          fontWeight="600"
          color="$color"
          flex={1}
          textAlign="center"
          pointerEvents="none"
        >
          {title}
        </Text>

        {/* Right — optional slot */}
        <XStack width={73} justifyContent="flex-end" paddingRight="$lg" alignItems="center">
          {right ?? null}
        </XStack>
      </XStack>
      <Separator borderColor="$borderColor" />
    </YStack>
  );
}
