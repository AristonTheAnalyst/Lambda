import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import PageHeader from '@/components/PageHeader';
import T from '@/constants/Theme';

const SECTIONS = [
  {
    route: '/two/exercises',
    label: 'Exercises',
    description: 'Create and manage exercises',
    icon: 'heartbeat' as const,
  },
  {
    route: '/two/variations',
    label: 'Variations',
    description: 'Create and manage exercise variations',
    icon: 'sliders' as const,
  },
  {
    route: '/two/assign',
    label: 'Assign Variations',
    description: 'Link variations to exercises',
    icon: 'link' as const,
  },
];

export default function AdminExercisesHub() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <PageHeader title="Exercise Configuration" />
      <View style={styles.content}>
      {SECTIONS.map((s) => (
        <TouchableOpacity
          key={s.route}
          style={styles.card}
          onPress={() => router.push(s.route as any)}
          activeOpacity={0.75}>
          <View style={styles.iconWrap}>
            <FontAwesome name={s.icon} size={22} color={T.accent} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardLabel}>{s.label}</Text>
            <Text style={styles.cardDesc}>{s.description}</Text>
          </View>
          <FontAwesome name="chevron-right" size={14} color={T.muted} />
        </TouchableOpacity>
      ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },
  content: {
    padding: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    borderRadius: 12,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: T.border,
    gap: 16,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: T.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1 },
  cardLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: T.primary,
    marginBottom: 3,
  },
  cardDesc: {
    fontSize: 13,
    color: T.muted,
  },
});
