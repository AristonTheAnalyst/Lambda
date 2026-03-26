import FontAwesome from '@expo/vector-icons/FontAwesome';
import { YStack } from 'tamagui';
import { useDrawer } from '@/lib/DrawerContext';
import T from '@/constants/Theme';

export default function HamburgerButton() {
  const { openDrawer } = useDrawer();
  return (
    <YStack
      paddingHorizontal={24}
      paddingVertical={14}
      pressStyle={{ opacity: 0.7 }}
      onPress={openDrawer}
      cursor="pointer"
    >
      <FontAwesome name="bars" size={25} color={T.primary} />
    </YStack>
  );
}
