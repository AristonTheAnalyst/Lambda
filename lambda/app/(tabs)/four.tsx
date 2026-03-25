import { View, Text, StyleSheet } from 'react-native';
import T from '@/constants/Theme';

export default function TrainingLogsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Training Logs</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' },
  text: { color: T.muted, fontSize: 16 },
});
