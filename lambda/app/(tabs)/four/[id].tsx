import React, { useState, useEffect, useCallback } from 'react';
import { Alert, ScrollView } from 'react-native';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Separator } from 'tamagui';
import { SlideUpModal, DropdownSelect } from '@/components/FormControls';
import Input from '@/components/Input';
import Button from '@/components/Button';
import GlassButton from '@/components/GlassButton';
import { useExerciseData } from '@/lib/ExerciseDataContext';
import { useAuthContext } from '@/lib/AuthContext';
import supabase from '@/lib/supabase';
import { useAsyncGuard } from '@/lib/asyncGuard';
import T from '@/constants/Theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkoutSet {
  workout_set_id: number;
  workout_set_number: number;
  custom_exercise_id: number;
  custom_variation_id: number | null;
  workout_set_weight: number | null;
  workout_set_reps: number[] | null;
  workout_set_duration_seconds: number[] | null;
  workout_set_notes: string | null;
}

interface Workout {
  user_workout_id: number;
  user_workout_created_date: string;
  user_workout_notes: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatValues(arr: number[] | null): string {
  if (!arr || arr.length === 0) return '—';
  return arr.join(', ');
}

function parseValues(str: string): number[] {
  return str.split(',').map((v) => parseInt(v.trim(), 10)).filter((n) => !isNaN(n));
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = parseInt(id, 10);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const guard = useAsyncGuard();
  const { user } = useAuthContext();
  const { exerciseDetailMap } = useExerciseData();

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingSet, setEditingSet] = useState<WorkoutSet | null>(null);
  const [editWeight, setEditWeight] = useState('');
  const [editRepsOrDuration, setEditRepsOrDuration] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editVarId, setEditVarId] = useState<number | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [workoutRes, setsRes] = await Promise.all([
      supabase
        .from('fact_user_workout')
        .select('user_workout_id, user_workout_created_date, user_workout_notes')
        .eq('user_workout_id', workoutId)
        .single(),
      supabase
        .from('fact_workout_set')
        .select('*')
        .eq('user_workout_id', workoutId)
        .order('workout_set_number'),
    ]);
    setLoading(false);
    if (workoutRes.data) setWorkout(workoutRes.data);
    if (setsRes.data) setSets(setsRes.data);
  }, [workoutId]);

  useEffect(() => { loadData(); }, [loadData]);

  function openEditSet(s: WorkoutSet) {
    setEditingSet(s);
    setEditWeight(s.workout_set_weight != null ? String(s.workout_set_weight) : '');
    const vals = s.workout_set_reps?.length ? s.workout_set_reps : s.workout_set_duration_seconds ?? [];
    setEditRepsOrDuration(vals.join(','));
    setEditNotes(s.workout_set_notes ?? '');
    setEditVarId(s.custom_variation_id);
  }

  function saveEditSet() { return guard(async () => {
    if (!editingSet) return;
    const editEx = exerciseDetailMap[editingSet.custom_exercise_id];
    const values = parseValues(editRepsOrDuration);
    const isReps = editEx?.exercise_volume_type === 'reps';
    setEditLoading(true);
    const { error } = await supabase.from('fact_workout_set').update({
      workout_set_weight: editWeight ? parseFloat(editWeight) : null,
      workout_set_reps: isReps ? values : [],
      workout_set_duration_seconds: !isReps ? values : [],
      workout_set_notes: editNotes.trim() || null,
      custom_variation_id: editVarId,
    }).eq('workout_set_id', editingSet.workout_set_id);
    setEditLoading(false);
    if (error) return Alert.alert('Error', error.message);
    setEditingSet(null);
    loadData();
  }); }

  function deleteSet(setId: number) {
    Alert.alert('Delete Set', 'Remove this set?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => guard(async () => {
        await supabase.from('fact_workout_set').delete().eq('workout_set_id', setId);
        loadData();
      })},
    ]);
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <YStack flex={1} backgroundColor={T.bg}>
      {/* Header */}
      <XStack
        style={{ height: insets.top + 52, paddingTop: insets.top }}
        paddingHorizontal={T.space.md}
        alignItems="center"
      >
        <XStack minWidth={80}>
          <GlassButton icon="chevron-left" label="Back" onPress={() => router.back()} />
        </XStack>
        <Text flex={1} textAlign="center" color={T.primary} fontSize={T.fontSize.xl} fontWeight="600">
          Workout
        </Text>
        <XStack width={80} />
      </XStack>
      <Separator borderColor={T.border} />

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
          {/* Date */}
          {workout && (
            <Text fontSize={T.fontSize.sm} fontWeight="700" color={T.accent} marginBottom={T.space.xs}>
              {formatDate(workout.user_workout_created_date)}
            </Text>
          )}

          {/* Notes */}
          {workout?.user_workout_notes ? (
            <Text fontSize={T.fontSize.sm} color={T.muted} fontStyle="italic" marginBottom={T.space.lg}>
              "{workout.user_workout_notes}"
            </Text>
          ) : (
            <YStack height={T.space.lg} />
          )}

          {/* Sets */}
          <Text fontSize={T.fontSize.xl} fontWeight="700" color={T.primary} marginBottom={T.space.sm}>
            Sets
          </Text>

          {sets.length === 0 ? (
            <Text color={T.muted}>No sets recorded.</Text>
          ) : (
            sets.map((s) => {
              const exName = exerciseDetailMap[s.custom_exercise_id]?.exercise_name ?? `Exercise ${s.custom_exercise_id}`;
              const varName = s.custom_variation_id
                ? exerciseDetailMap[s.custom_exercise_id]?.assigned_variations.find(
                    (v) => v.custom_variation_id === s.custom_variation_id
                  )?.variation_name
                : null;
              const repsStr = s.workout_set_reps?.length
                ? `${formatValues(s.workout_set_reps)} reps`
                : s.workout_set_duration_seconds?.length
                ? `${formatValues(s.workout_set_duration_seconds)}s`
                : '—';
              return (
                <XStack
                  key={s.workout_set_id}
                  borderBottomWidth={0.5}
                  borderBottomColor={T.border}
                  paddingVertical={T.space.sm}
                  alignItems="center"
                  gap={T.space.sm}
                >
                  <Text fontWeight="700" fontSize={15} color={T.accent}>#{s.workout_set_number}</Text>
                  <YStack flex={1}>
                    <XStack alignItems="flex-end" gap={T.space.sm}>
                      <Text fontSize={15} fontWeight="500" color={T.primary}>{exName}</Text>
                      {varName && <Text fontSize={T.fontSize.sm} color={T.muted}>{varName}</Text>}
                    </XStack>
                    <Text fontSize={T.fontSize.xs} marginTop={T.space.xs} color={T.muted}>
                      {s.workout_set_weight != null ? `${s.workout_set_weight}kg · ` : ''}{repsStr}
                      {s.workout_set_notes ? (
                        <Text fontSize={T.fontSize.xs} color={T.muted} fontStyle="italic">
                          {` · "${s.workout_set_notes}"`}
                        </Text>
                      ) : ''}
                    </Text>
                  </YStack>
                  <XStack gap={T.space.sm}>
                    <XStack
                      paddingHorizontal={T.space.sm}
                      paddingVertical={T.space.xs + 1}
                      borderRadius={T.radius.sm}
                      backgroundColor={T.accentBg}
                      pressStyle={{ opacity: 0.7 }}
                      onPress={() => openEditSet(s)}
                      cursor="pointer"
                    >
                      <Text fontSize={T.fontSize.sm} fontWeight="500" color={T.accent}>Edit</Text>
                    </XStack>
                    <XStack
                      paddingHorizontal={T.space.sm}
                      paddingVertical={T.space.xs + 1}
                      borderRadius={T.radius.sm}
                      backgroundColor={T.dangerBg}
                      pressStyle={{ opacity: 0.7 }}
                      onPress={() => deleteSet(s.workout_set_id)}
                      cursor="pointer"
                    >
                      <Text fontSize={T.fontSize.sm} fontWeight="500" color={T.danger}>Del</Text>
                    </XStack>
                  </XStack>
                </XStack>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Edit Set Modal */}
      <SlideUpModal visible={!!editingSet} onClose={() => setEditingSet(null)}>
        <YStack
          backgroundColor={T.surface}
          borderTopLeftRadius={T.radius.lg}
          borderTopRightRadius={T.radius.lg}
          padding={T.space.xl}
          maxHeight="85%"
        >
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <YStack gap={T.space.md}>
              <Text fontSize={T.fontSize.lg} fontWeight="700" color={T.primary}>Edit Set</Text>
              {editingSet && (() => {
                const editEx = exerciseDetailMap[editingSet.custom_exercise_id];
                return (
                  <>
                    <Input
                      label="Weight (optional)"
                      placeholder="kg"
                      keyboardType="numbers-and-punctuation"
                      value={editWeight}
                      onChangeText={setEditWeight}
                    />
                    <Input
                      label={editEx?.exercise_volume_type === 'reps' ? 'Reps' : 'Duration (seconds)'}
                      placeholder={editEx?.exercise_volume_type === 'reps' ? 'e.g. 10,8,6' : 'e.g. 60,45'}
                      keyboardType="numbers-and-punctuation"
                      value={editRepsOrDuration}
                      onChangeText={setEditRepsOrDuration}
                    />
                    {editEx && editEx.assigned_variations.length > 0 && (
                      <YStack>
                        <Text fontSize={T.fontSize.sm} fontWeight="500" marginBottom={T.space.xs} color={T.primary}>Variation</Text>
                        <DropdownSelect
                          options={[
                            { label: 'None', value: null },
                            ...editEx.assigned_variations.map((v) => ({ label: v.variation_name, value: v.custom_variation_id })),
                          ]}
                          value={editVarId}
                          onChange={setEditVarId}
                          placeholder="None"
                        />
                      </YStack>
                    )}
                  </>
                );
              })()}
              <Input label="Notes (optional)" placeholder="Notes…" value={editNotes} onChangeText={setEditNotes} />
              <XStack gap={T.space.sm} justifyContent="center">
                <Button label="Save" onPress={saveEditSet} loading={editLoading} />
                <Button label="Cancel" onPress={() => setEditingSet(null)} variant="ghost" />
              </XStack>
              <YStack height={T.space.xl} />
            </YStack>
          </ScrollView>
        </YStack>
      </SlideUpModal>
    </YStack>
  );
}
