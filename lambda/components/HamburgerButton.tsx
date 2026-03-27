import { useDrawer } from '@/lib/DrawerContext';
import GlassButton from './GlassButton';

export default function HamburgerButton() {
  const { openDrawer } = useDrawer();
  return <GlassButton icon="bars" iconSize={18} onPress={openDrawer} />;
}
