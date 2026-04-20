import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import PageHeader from '@/components/PageHeader';
import SyncStatusIcon from '@/components/SyncStatusIcon';
import { useAuthContext } from '@/lib/AuthContext';
import { useExerciseData } from '@/lib/ExerciseDataContext';
import { useNetwork } from '@/hooks/useNetwork';
import { loadWorkoutsWithSets, seedWorkoutsFromSupabase, WorkoutWithSets } from '@/lib/offline/workoutStore';
import { useAppTheme } from '@/lib/ThemeContext';
import { toProperCase } from '@/lib/workoutSetFormat';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

interface ExerciseSummary {
  exName: string;
  varNames: string[];
  setCount: number;
}

function getExerciseSummaries(
  sets: WorkoutWithSets['sets'],
  exerciseDetailMap: ReturnType<typeof useExerciseData>['exerciseDetailMap']
): ExerciseSummary[] {
  const order: string[] = [];
  const map = new Map<string, ExerciseSummary>();

  for (const s of sets) {
    const exId = s.custom_exercise_id;
    if (!map.has(exId)) {
      order.push(exId);
      map.set(exId, {
        exName: toProperCase(exerciseDetailMap[exId]?.exercise_name ?? `Exercise ${exId}`),
        varNames: [],
        setCount: 0,
      });
    }
    const entry = map.get(exId)!;
    entry.setCount += 1;
    if (s.custom_variation_id) {
      const varName = toProperCase(
        exerciseDetailMap[exId]?.assigned_variations.find(
          (v) => v.custom_variation_id === s.custom_variation_id
        )?.variation_name ?? ''
      );
      if (varName && !entry.varNames.includes(varName)) {
        entry.varNames.push(varName);
      }
    }
  }

  return order.map((id) => map.get(id)!);
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
  const [logsCloudPullFailed, setLogsCloudPullFailed] = useState(false);

  const loadFromSQLite = useCallback(async () => {
    if (!user) return;
    const data = await loadWorkoutsWithSets(db, user.id);
    setWorkouts(data);
    setLoading(false);
  }, [db, user]);

  useEffect(() => {
    setLogsCloudPullFailed(false);
    loadFromSQLite();
  }, [loadFromSQLite]);

  // Reload from SQLite whenever the screen comes back into focus (e.g. after editing a set in [id].tsx)
  useFocusEffect(useCallback(() => {
    loadFromSQLite();
  }, [loadFromSQLite]));

  // Background seed from Supabase on first install (non-blocking)
  useEffect(() => {
    if (!user || !isConnected) return;
    let cancelled = false;
    seedWorkoutsFromSupabase(db, user.id)
      .then((outcome) => {
        if (cancelled) return;
        setLogsCloudPullFailed(outcome === 'error');
        return loadFromSQLite();
      })
      .catch(() => {
        if (!cancelled) setLogsCloudPullFailed(true);
        return loadFromSQLite();
      });
    return () => {
      cancelled = true;
    };
  }, [db, user, isConnected, loadFromSQLite]);

  useEffect(() => {
    if (!logsCloudPullFailed) return;
    if (workouts.length > 0) setLogsCloudPullFailed(false);
  }, [logsCloudPullFailed, workouts.length]);

  const handleRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      if (isConnected) {
        const outcome = await seedWorkoutsFromSupabase(db, user.id);
        setLogsCloudPullFailed(outcome === 'error');
      }
      await loadFromSQLite();
    } catch {
      setLogsCloudPullFailed(true);
    } finally {
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
              {logsCloudPullFailed ? (
                <Text color={colors.danger} fontSize={fontSize.sm} textAlign="center" paddingHorizontal={space.md}>
                  {"Couldn't load past workouts from the server. Check your connection and pull down to retry."}
                </Text>
              ) : null}
              <Text color={colors.primary} fontSize={fontSize.lg} fontWeight="600">No workouts yet</Text>
              <Text color={colors.muted} fontSize={fontSize.sm} textAlign="center">
                Head to the Session tab to log your first workout.
              </Text>
            </YStack>
          ) : (
            workouts.map((w) => {
              const summaries = getExerciseSummaries(w.sets, exerciseDetailMap);
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
                  <XStack alignItems="center" justifyContent="space-between" marginBottom={space.sm}>
                    <Text fontSize={fontSize.sm} fontWeight="700" color={colors.accent}>
                      {formatDate(w.user_workout_created_date)}
                    </Text>
                    <Text fontSize={fontSize.xs} color={colors.muted}>
                      {setCount} {setCount === 1 ? 'set' : 'sets'}
                    </Text>
                  </XStack>

                  {/* Pre-workout notes */}
                  {w.user_pre_workout_notes ? (
                    <Text fontSize={fontSize.xs} color={colors.muted} marginBottom={space.sm} fontStyle="italic" numberOfLines={2}>
                      {`"${w.user_pre_workout_notes}"`}
                    </Text>
                  ) : null}

                  {/* Per-exercise rows */}
                  {summaries.length > 0 ? (
                    <YStack gap={space.xs} marginBottom={w.user_post_workout_notes ? space.sm : 0}>
                      {summaries.map((s, i) => {
                        const label = s.varNames.length > 0
                          ? `${s.exName} (${s.varNames.join(', ')})`
                          : s.exName;
                        return (
                          <XStack key={i} alignItems="center" gap={space.sm}>
                            <YStack width={4} height={4} borderRadius={2} backgroundColor={colors.muted} marginTop={2} flexShrink={0} />
                            <Text fontSize={fontSize.sm} color={colors.primary} flex={1} numberOfLines={2}>
                              {label}
                            </Text>
                            <Text fontSize={fontSize.xs} color={colors.muted} flexShrink={0}>
                              {s.setCount} {s.setCount === 1 ? 'set' : 'sets'}
                            </Text>
                          </XStack>
                        );
                      })}
                    </YStack>
                  ) : (
                    <Text fontSize={fontSize.sm} color={colors.muted}>No sets recorded.</Text>
                  )}

                  {/* Post-workout notes */}
                  {w.user_post_workout_notes ? (
                    <Text fontSize={fontSize.xs} color={colors.muted} marginTop={space.xs} fontStyle="italic" numberOfLines={2}>
                      {`"${w.user_post_workout_notes}"`}
                    </Text>
                  ) : null}
                </YStack>
              );
            })
          )}
        </ScrollView>
      )}
    </YStack>
  );
}
