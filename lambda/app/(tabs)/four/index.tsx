import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import PageHeader from '@/components/PageHeader';
import SyncStatusIcon from '@/components/SyncStatusIcon';
import { useAuthContext } from '@/lib/AuthContext';
import { useExerciseData } from '@/lib/ExerciseDataContext';
import { useNetwork } from '@/hooks/useNetwork';
import { loadWorkoutsWithSets, seedWorkoutsFromSupabase, WorkoutWithSets } from '@/lib/offline/workoutStore';
import { useAppTheme } from '@/lib/ThemeContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function getUniqueCombos(
  sets: WorkoutWithSets['sets'],
  exerciseDetailMap: ReturnType<typeof useExerciseData>['exerciseDetailMap']
): string[] {
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

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TrainingLogsScreen() {
  const { colors, space, radius, fontSize } = useAppTheme();
  const db = useSQLiteContext();
  const router = useRouter();
  const { user } = useAuthContext();
  const { exerciseDetailMap } = useExerciseData();
  const { isConnected } = useNetwork();

  const [workouts, setWorkouts] = useState<WorkoutWithSets[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFromSQLite = useCallback(async () => {
    if (!user) return;
    const data = await loadWorkoutsWithSets(db, user.id);
    setWorkouts(data);
    setLoading(false);
  }, [db, user]);

  useEffect(() => {
    loadFromSQLite();
  }, [loadFromSQLite]);

  // Background seed from Supabase on first install (non-blocking)
  useEffect(() => {
    if (!user || !isConnected) return;
    seedWorkoutsFromSupabase(db, user.id)
      .then(() => loadFromSQLite())
      .catch(() => {});
  }, [user?.id, isConnected]);

  const handleRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      if (isConnected) await seedWorkoutsFromSupabase(db, user.id);
      await loadFromSQLite();
    } catch {} finally {
      setRefreshing(false);
    }
  }, [db, user, isConnected, loadFromSQLite]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <YStack flex={1} backgroundColor={colors.bg}>
      <PageHeader title="Training Logs" right={<SyncStatusIcon />} />
      {loading ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner size="large" color={colors.accent} />
        </YStack>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />}
        >
          {workouts.length === 0 ? (
            <YStack flex={1} alignItems="center" justifyContent="center" paddingTop={space.xxl} gap={space.md}>
              <Text fontSize={fontSize.xxl}>🏋️</Text>
              <Text color={colors.primary} fontSize={fontSize.lg} fontWeight="600">No workouts yet</Text>
              <Text color={colors.muted} fontSize={fontSize.sm} textAlign="center">
                Head to the Session tab to log your first workout.
              </Text>
            </YStack>
          ) : (
            workouts.map((w) => {
              const combos = getUniqueCombos(w.sets, exerciseDetailMap);
              const setCount = w.sets.length;
              return (
                <YStack
                  key={w.user_workout_id}
                  backgroundColor={colors.surface}
                  borderRadius={radius.md}
                  padding={space.lg}
                  marginBottom={space.md}
                  pressStyle={{ opacity: 0.75 }}
                  onPress={() => router.push(`/four/${w.user_workout_id}`)}
                  cursor="pointer"
                >
                  {/* Date + set count */}
                  <XStack alignItems="center" justifyContent="space-between" marginBottom={space.xs}>
                    <Text fontSize={fontSize.sm} fontWeight="700" color={colors.accent}>
                      {formatDate(w.user_workout_created_date)}
                    </Text>
                    <Text fontSize={fontSize.xs} color={colors.muted}>
                      {setCount} {setCount === 1 ? 'set' : 'sets'}
                    </Text>
                  </XStack>

                  {/* Workout notes */}
                  {w.user_post_workout_notes ? (
                    <Text fontSize={fontSize.sm} color={colors.muted} marginBottom={space.sm} fontStyle="italic">
                      "{w.user_post_workout_notes}"
                    </Text>
                  ) : null}

                  {/* Exercise + variation combos */}
                  {combos.length > 0 ? (
                    <YStack gap={space.xs}>
                      {combos.map((combo, i) => (
                        <XStack key={i} alignItems="center" gap={space.xs}>
                          <YStack width={4} height={4} borderRadius={2} backgroundColor={colors.muted} />
                          <Text fontSize={fontSize.sm} color={colors.primary}>{combo}</Text>
                        </XStack>
                      ))}
                    </YStack>
                  ) : (
                    <Text fontSize={fontSize.sm} color={colors.muted}>No sets recorded.</Text>
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
