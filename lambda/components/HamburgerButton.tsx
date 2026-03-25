import { TouchableOpacity, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useDrawer } from '@/lib/DrawerContext';
import T from '@/constants/Theme';

export default function HamburgerButton() {
  const { openDrawer } = useDrawer();
  return (
    <TouchableOpacity onPress={openDrawer} style={styles.btn}>
      <FontAwesome name="bars" size={25} color={T.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { paddingHorizontal: 24, paddingVertical: 14 },
});
