import { TouchableOpacity, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useDrawer } from '@/lib/DrawerContext';
import T from '@/constants/Theme';

export default function HamburgerButton() {
  const { openDrawer } = useDrawer();
  return (
    <TouchableOpacity onPress={openDrawer} style={styles.btn}>
      <FontAwesome name="bars" size={20} color={T.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { paddingHorizontal: 16, paddingVertical: 8 },
});
