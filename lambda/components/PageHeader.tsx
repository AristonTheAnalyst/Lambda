import { View, Text, StyleSheet, ReactNode } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HamburgerButton from './HamburgerButton';
import T from '@/constants/Theme';

interface Props {
  title: string;
  right?: ReactNode;
}

export default function PageHeader({ title, right }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.side}>
        <HamburgerButton />
      </View>
      <Text style={styles.title}>{title}</Text>
      <View style={[styles.side, styles.rightSlot]}>{right ?? null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: T.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.border,
  },
  title: {
    position: 'static',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    color: T.primary,
    pointerEvents: 'none',
  },
  side: {
    width: 73,
  },
  rightSlot: {
    alignItems: 'flex-end',
    paddingRight: 16,
  },
});