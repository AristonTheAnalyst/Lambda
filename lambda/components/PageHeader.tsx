import { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Separator, Text, XStack, YStack } from 'tamagui';
import HamburgerButton from './HamburgerButton';
import T from '@/constants/Theme';

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
        backgroundColor={T.bg}
        alignItems="center"
        justifyContent="space-between"
      >
        {/* Left — hamburger */}
        <XStack width={73} alignItems="center">
          <HamburgerButton />
        </XStack>

        {/* Center — title */}
        <Text
          fontSize={20}
          fontWeight="600"
          color={T.primary}
          flex={1}
          textAlign="center"
          pointerEvents="none"
        >
          {title}
        </Text>

        {/* Right — optional slot */}
        <XStack width={73} justifyContent="flex-end" paddingRight={T.space.lg} alignItems="center">
          {right ?? null}
        </XStack>
      </XStack>
      <Separator borderColor={T.border} />
    </YStack>
  );
}
