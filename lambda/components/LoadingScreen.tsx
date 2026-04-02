import { View, StyleSheet } from 'react-native';
import LambdaLogo from './LambdaLogo';
import T from '@/constants/Theme';

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <LambdaLogo size={96} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
