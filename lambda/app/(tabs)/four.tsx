import { View, Text, StyleSheet } from 'react-native';
import PageHeader from '@/components/PageHeader';
import T from '@/constants/Theme';

export default function TrainingLogsScreen() {
  return (
    <View style={styles.container}>
      <PageHeader title="Training Logs" />
      <View style={styles.content}>
        <Text style={styles.text}>Training Logs</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { color: T.muted, fontSize: 16 },
});
