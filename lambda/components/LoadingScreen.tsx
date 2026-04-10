import { View, StyleSheet } from 'react-native';
import LambdaLogo from './LambdaLogo';
import { useAppTheme } from '@/lib/ThemeContext';

export default function LoadingScreen() {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <LambdaLogo size={96} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
