import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
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
          <Card key={s.route} onPress={() => router.push(s.route as any)}>
            <View style={styles.cardInner}>
              <View style={styles.iconWrap}>
                <FontAwesome name={s.icon} size={22} color={T.accent} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardLabel}>{s.label}</Text>
                <Text style={styles.cardDesc}>{s.description}</Text>
              </View>
              <FontAwesome name="chevron-right" size={14} color={T.muted} />
            </View>
          </Card>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  content: { padding: T.space.xl, gap: T.space.md },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: T.space.lg,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: T.radius.md,
    backgroundColor: T.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1 },
  cardLabel: {
    fontSize: T.fontSize.lg,
    fontWeight: '600',
    color: T.primary,
    marginBottom: T.space.xs,
  },
  cardDesc: {
    fontSize: T.fontSize.sm,
    color: T.muted,
  },
});
