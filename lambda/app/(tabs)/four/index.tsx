import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView } from 'react-native';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { useRouter } from 'expo-router';
import PageHeader from '@/components/PageHeader';
import { useAuthContext } from '@/lib/AuthContext';
import { useExerciseData } from '@/lib/ExerciseDataContext';
import supabase from '@/lib/supabase';
import T from '@/constants/Theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SetPreview {
  custom_exercise_id: number;
  custom_variation_id: number | null;
}

interface WorkoutCard {
  user_workout_id: number;
  user_workout_created_date: string;
  user_workout_notes: string | null;
  sets: SetPreview[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TrainingLogsScreen() {
  const router = useRouter();
  const { user } = useAuthContext();
  const { exerciseDetailMap } = useExerciseData();

  const [workouts, setWorkouts] = useState<WorkoutCard[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWorkouts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('fact_user_workout')
      .select('user_workout_id, user_workout_created_date, user_workout_notes, fact_workout_set(custom_exercise_id, custom_variation_id)')
      .eq('user_id', user.id)
      .order('user_workout_created_date', { ascending: false });
    setLoading(false);
    if (data) {
      setWorkouts(
        data.map((w: any) => ({
          user_workout_id: w.user_workout_id,
          user_workout_created_date: w.user_workout_created_date,
          user_workout_notes: w.user_workout_notes,
          sets: w.fact_workout_set ?? [],
        }))
      );
    }
  }, [user]);

  useEffect(() => { loadWorkouts(); }, [loadWorkouts]);

  // ─── Unique combos for card preview ───────────────────────────────────────

  function getUniqueCombos(sets: SetPreview[]): string[] {
    const seen = new Set<string>();
    const combos: string[] = [];
    for (const s of sets) {
      const exName = exerciseDetailMap[s.custom_exercise_id]?.exercise_name ?? `Exercise ${s.custom_exercise_id}`;
      const varName = s.custom_variation_id
        ? exerciseDetailMap[s.custom_exercise_id]?.assigned_variations.find(
            (v) => v.custom_variation_id === s.custom_variation_id
          )?.variation_name
        : null;
      const key = `${s.custom_exercise_id}:${s.custom_variation_id ?? 'none'}`;
      if (!seen.has(key)) {
        seen.add(key);
        combos.push(varName ? `${exName} · ${varName}` : exName);
      }
    }
    return combos;
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <YStack flex={1} backgroundColor={T.bg}>
      <PageHeader title="Training Logs" />
      {loading ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner size="large" color={T.accent} />
        </YStack>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: T.space.lg, paddingBottom: T.space.xxl }}
          showsVerticalScrollIndicator={false}
        >
          {workouts.length === 0 ? (
            <Text color={T.muted} fontSize={T.fontSize.md} marginTop={T.space.md}>
              No workouts logged yet.
            </Text>
          ) : (
            workouts.map((w) => {
              const combos = getUniqueCombos(w.sets);
              const setCount = w.sets.length;
              return (
                <YStack
                  key={w.user_workout_id}
                  backgroundColor={T.surface}
                  borderRadius={T.radius.md}
                  padding={T.space.lg}
                  marginBottom={T.space.md}
                  pressStyle={{ opacity: 0.75 }}
                  onPress={() => router.push(`/four/${w.user_workout_id}`)}
                  cursor="pointer"
                >
                  {/* Date + set count */}
                  <XStack alignItems="center" justifyContent="space-between" marginBottom={T.space.xs}>
                    <Text fontSize={T.fontSize.sm} fontWeight="700" color={T.accent}>
                      {formatDate(w.user_workout_created_date)}
                    </Text>
                    <Text fontSize={T.fontSize.xs} color={T.muted}>
                      {setCount} {setCount === 1 ? 'set' : 'sets'}
                    </Text>
                  </XStack>

                  {/* Workout notes */}
                  {w.user_workout_notes ? (
                    <Text fontSize={T.fontSize.sm} color={T.muted} marginBottom={T.space.sm} fontStyle="italic">
                      "{w.user_workout_notes}"
                    </Text>
                  ) : null}

                  {/* Exercise + variation combos */}
                  {combos.length > 0 ? (
                    <YStack gap={T.space.xs}>
                      {combos.map((combo, i) => (
                        <XStack key={i} alignItems="center" gap={T.space.xs}>
                          <YStack width={4} height={4} borderRadius={2} backgroundColor={T.muted} />
                          <Text fontSize={T.fontSize.sm} color={T.primary}>{combo}</Text>
                        </XStack>
                      ))}
                    </YStack>
                  ) : (
                    <Text fontSize={T.fontSize.sm} color={T.muted}>No sets recorded.</Text>
                  )}
                </YStack>
              );
            })
          )}
        </ScrollView>
      )}
    </YStack>
  );
}
