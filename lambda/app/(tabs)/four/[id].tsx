import React, { useState, useEffect, useCallback } from 'react';
import { Alert, ScrollView } from 'react-native';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Separator } from 'tamagui';
import { useSQLiteContext } from 'expo-sqlite';
import { SlideUpModal, DropdownSelect } from '@/components/FormControls';
import Input from '@/components/Input';
import Button from '@/components/Button';
import GlassButton from '@/components/GlassButton';
import { useExerciseData } from '@/lib/ExerciseDataContext';
import { useAsyncGuard } from '@/lib/asyncGuard';
import { loadWorkout, updateWorkoutNotes, WorkoutRow } from '@/lib/offline/workoutStore';
import { loadSetsForWorkout, insertSet, updateSet, deleteSet, WorkoutSet } from '@/lib/offline/setStore';
import NotesField from '@/components/NotesField';
import T from '@/constants/Theme';

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
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const guard = useAsyncGuard();
  const { exercises, exerciseDetailMap } = useExerciseData();

  const [workout, setWorkout] = useState<WorkoutRow | null>(null);
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Edit mode ──────────────────────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [preNotes, setPreNotes] = useState('');
  const [postNotes, setPostNotes] = useState('');
  const [notesLoading, setNotesLoading] = useState(false);

  // ── Log Set modal ──────────────────────────────────────────────────────────
  const [logSetModalVisible, setLogSetModalVisible] = useState(false);
  const [selectedExId, setSelectedExId] = useState<number | null>(null);
  const selectedEx = selectedExId ? (exerciseDetailMap[selectedExId] ?? null) : null;
  const [weight, setWeight] = useState('');
  const [repsOrDuration, setRepsOrDuration] = useState('');
  const [setNotes, setSetNotes] = useState('');
  const [selectedVarId, setSelectedVarId] = useState<number | null>(null);
  const [logLoading, setLogLoading] = useState(false);

  // ── Edit Set modal ─────────────────────────────────────────────────────────
  const [editingSet, setEditingSet] = useState<WorkoutSet | null>(null);
  const [editExId, setEditExId] = useState<number | null>(null);
  const editEx = editExId ? (exerciseDetailMap[editExId] ?? null) : null;
  const [editWeight, setEditWeight] = useState('');
  const [editRepsOrDuration, setEditRepsOrDuration] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editVarId, setEditVarId] = useState<number | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [workoutData, setsData] = await Promise.all([
      loadWorkout(db, workoutId),
      loadSetsForWorkout(db, workoutId),
    ]);
    setLoading(false);
    if (workoutData) setWorkout(workoutData);
    setSets(setsData);
  }, [db, workoutId]);

  useEffect(() => { loadData(); }, [loadData]);

  function startEditing() {
    setPreNotes(workout?.user_pre_workout_notes ?? '');
    setPostNotes(workout?.user_post_workout_notes ?? '');
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
  }

  function saveNotes() { return guard(async () => {
    setNotesLoading(true);
    await updateWorkoutNotes(db, workoutId, preNotes, postNotes);
    setNotesLoading(false);
    await loadData();
    setEditing(false);
  }); }

  // ── Log Set ────────────────────────────────────────────────────────────────

  function onSelectExercise(exId: number | null) {
    setSelectedExId(exId);
    setSelectedVarId(null);
  }

  function logSet() { return guard(async () => {
    if (!selectedExId || !selectedEx) return Alert.alert('Select an exercise first');
    const hint = selectedEx.exercise_volume_type === 'reps' ? 'Enter reps (e.g. 10,8,6)' : 'Enter duration in seconds (e.g. 60,45)';
    if (!repsOrDuration.trim()) return Alert.alert(hint);
    const values = parseValues(repsOrDuration);
    if (values.length === 0) return Alert.alert(hint);
    const isReps = selectedEx.exercise_volume_type === 'reps';
    const nextSetNum = sets.length > 0 ? Math.max(...sets.map((s) => s.workout_set_number)) + 1 : 1;
    setLogLoading(true);
    await insertSet(db, {
      user_workout_id: workoutId,
      custom_exercise_id: selectedExId,
      custom_variation_id: selectedVarId,
      workout_set_number: nextSetNum,
      workout_set_weight: weight ? parseFloat(weight) : null,
      workout_set_reps: isReps ? values : [],
      workout_set_duration_seconds: !isReps ? values : [],
      workout_set_notes: setNotes.trim() || null,
    });
    setLogLoading(false);
    setLogSetModalVisible(false);
    setSelectedExId(null);
    setWeight('');
    setRepsOrDuration('');
    setSetNotes('');
    setSelectedVarId(null);
    loadData();
  }); }

  // ── Edit Set ───────────────────────────────────────────────────────────────

  function openEditSet(s: WorkoutSet) {
    setEditingSet(s);
    setEditExId(s.custom_exercise_id);
    setEditWeight(s.workout_set_weight != null ? String(s.workout_set_weight) : '');
    const vals = s.workout_set_reps?.length ? s.workout_set_reps : s.workout_set_duration_seconds ?? [];
    setEditRepsOrDuration(vals.join(','));
    setEditNotes(s.workout_set_notes ?? '');
    setEditVarId(s.custom_variation_id);
  }

  function saveEditSet() { return guard(async () => {
    if (!editingSet || !editEx || !editExId) return;
    const values = parseValues(editRepsOrDuration);
    if (values.length === 0) return Alert.alert(editEx.exercise_volume_type === 'reps' ? 'Enter reps (e.g. 10,8,6)' : 'Enter duration in seconds (e.g. 60,45)');
    const isReps = editEx.exercise_volume_type === 'reps';
    setEditLoading(true);
    await updateSet(db, editingSet.workout_set_id, {
      custom_exercise_id: editExId,
      workout_set_weight: editWeight ? parseFloat(editWeight) : null,
      workout_set_reps: isReps ? values : [],
      workout_set_duration_seconds: !isReps ? values : [],
      workout_set_notes: editNotes.trim() || null,
      custom_variation_id: editVarId,
    });
    setEditLoading(false);
    setEditingSet(null);
    loadData();
  }); }

  function handleDeleteSet(setId: number) {
    Alert.alert('Delete Set', 'Remove this set?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => guard(async () => {
        await deleteSet(db, setId);
        loadData();
      })},
    ]);
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

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
        <XStack width={80} justifyContent="flex-end">
          {editing ? (
            <GlassButton icon="check" label="Save" onPress={saveNotes} />
          ) : (
            <Text color={T.accent} fontSize={T.fontSize.md} fontWeight="600" onPress={startEditing} cursor="pointer">Edit</Text>
          )}
        </XStack>
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
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
        >
          {/* Date */}
          {workout && (
            <Text fontSize={T.fontSize.sm} fontWeight="700" color={T.accent} marginBottom={T.space.sm}>
              {formatDate(workout.user_workout_created_date)}
            </Text>
          )}

          {/* Pre-workout notes */}
          {editing ? (
            <NotesField
              label="Pre-workout notes (optional)"
              value={preNotes}
              onChange={setPreNotes}
            />
          ) : (
            <YStack marginBottom={T.space.md}>
              <Text fontSize={T.fontSize.xs} color={T.muted} marginBottom={T.space.xs}>Pre-workout notes</Text>
              {workout?.user_pre_workout_notes ? (
                <Text fontSize={T.fontSize.sm} color={T.primary} fontStyle="italic">"{workout.user_pre_workout_notes}"</Text>
              ) : (
                <Text fontSize={T.fontSize.sm} color={T.muted}>None</Text>
              )}
            </YStack>
          )}

          {/* Sets header */}
          <XStack alignItems="center" marginBottom={T.space.sm} marginTop={T.space.sm}>
            <Text fontSize={T.fontSize.xl} fontWeight="700" color={T.primary} flex={1}>
              {editing ? 'Sets this workout' : 'Sets'}
            </Text>
            {editing && (
              <GlassButton icon="plus" label="Log Set" onPress={() => setLogSetModalVisible(true)} />
            )}
          </XStack>

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
                  {editing && (
                    <XStack gap={T.space.sm}>
                      <GlassButton icon="pencil" iconSize={14} onPress={() => openEditSet(s)} />
                      <GlassButton icon="trash" iconSize={14} color={T.danger} onPress={() => handleDeleteSet(s.workout_set_id)} />
                    </XStack>
                  )}
                </XStack>
              );
            })
          )}

          {/* Post-workout notes */}
          <YStack marginTop={T.space.xl} gap={T.space.md}>
            {editing ? (
              <>
                <NotesField
                  label="Post-workout notes (optional)"
                  value={postNotes}
                  onChange={setPostNotes}
                />
                <XStack justifyContent="center">
                  <XStack gap={T.space.sm}>
                    <Button label="Cancel" onPress={cancelEditing} variant="danger-ghost" disabled={notesLoading} />
                    <Button label="Save" onPress={saveNotes} loading={notesLoading} disabled={notesLoading} />
                  </XStack>
                </XStack>
              </>
            ) : (
              <YStack>
                <Text fontSize={T.fontSize.xs} color={T.muted} marginBottom={T.space.xs}>Post-workout notes</Text>
                {workout?.user_post_workout_notes ? (
                  <Text fontSize={T.fontSize.sm} color={T.primary} fontStyle="italic">"{workout.user_post_workout_notes}"</Text>
                ) : (
                  <Text fontSize={T.fontSize.sm} color={T.muted}>None</Text>
                )}
              </YStack>
            )}
          </YStack>
        </ScrollView>
      )}

      {/* ── Log Set Modal ── */}
      <SlideUpModal visible={logSetModalVisible} onClose={() => setLogSetModalVisible(false)}>
        {logSetModalVisible && (
          <YStack
            backgroundColor={T.surface}
            borderTopLeftRadius={T.radius.lg}
            borderTopRightRadius={T.radius.lg}
            padding={T.space.xl}
            maxHeight="85%"
          >
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <YStack gap={T.space.md}>
                <Text fontSize={T.fontSize.lg} fontWeight="700" color={T.primary}>Log Set</Text>
                <XStack gap={T.space.sm} alignItems="flex-end">
                  <YStack flex={3}>
                    <Text fontSize={T.fontSize.sm} fontWeight="500" marginBottom={T.space.xs} color={T.primary}>Exercise</Text>
                    <DropdownSelect
                      options={exercises.map((ex) => ({ label: ex.exercise_name, value: ex.custom_exercise_id }))}
                      value={selectedExId}
                      onChange={onSelectExercise}
                      placeholder="Select exercise…"
                    />
                  </YStack>
                  {selectedEx && (
                    <YStack flex={2}>
                      <Text fontSize={T.fontSize.sm} fontWeight="500" marginBottom={T.space.xs} color={T.primary}>Variation</Text>
                      {selectedEx.assigned_variations.length > 0 ? (
                        <DropdownSelect
                          options={[
                            { label: 'None', value: null },
                            ...selectedEx.assigned_variations.map((v) => ({ label: v.variation_name, value: v.custom_variation_id })),
                          ]}
                          value={selectedVarId}
                          onChange={setSelectedVarId}
                          placeholder="None"
                        />
                      ) : (
                        <XStack
                          alignItems="center"
                          borderWidth={1}
                          borderColor={T.border}
                          borderRadius={T.radius.md}
                          paddingHorizontal={T.space.md}
                          height={48}
                          backgroundColor={T.surface}
                          opacity={0.5}
                        >
                          <Text fontSize={T.fontSize.md} color={T.muted} flex={1} numberOfLines={1}>Zero Assigned</Text>
                        </XStack>
                      )}
                    </YStack>
                  )}
                </XStack>
                {selectedEx && (
                  <>
                    <Input label="Weight (optional)" placeholder="kg" keyboardType="numbers-and-punctuation" value={weight} onChangeText={setWeight} />
                    <Input
                      label={selectedEx.exercise_volume_type === 'reps' ? 'Reps' : 'Duration (seconds)'}
                      placeholder={selectedEx.exercise_volume_type === 'reps' ? 'e.g. 10,8,6' : 'e.g. 60,45'}
                      keyboardType="numbers-and-punctuation"
                      value={repsOrDuration}
                      onChangeText={setRepsOrDuration}
                    />
                    <Input label="Set notes (optional)" placeholder="Notes…" value={setNotes} onChangeText={setSetNotes} />
                  </>
                )}
                <XStack gap={T.space.sm} justifyContent="center">
                  <Button label="Cancel" onPress={() => setLogSetModalVisible(false)} variant="danger-ghost" />
                  <Button label="Log Set" onPress={logSet} loading={logLoading} />
                </XStack>
                <YStack height={T.space.xl} />
              </YStack>
            </ScrollView>
          </YStack>
        )}
      </SlideUpModal>

      {/* ── Edit Set Modal ── */}
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
              <XStack gap={T.space.sm} alignItems="flex-end">
                <YStack flex={3}>
                  <Text fontSize={T.fontSize.sm} fontWeight="500" marginBottom={T.space.xs} color={T.primary}>Exercise</Text>
                  <DropdownSelect
                    options={exercises.map((ex) => ({ label: ex.exercise_name, value: ex.custom_exercise_id }))}
                    value={editExId}
                    onChange={(exId) => { setEditExId(exId); setEditVarId(null); }}
                    placeholder="Select exercise…"
                  />
                </YStack>
                {editEx && (
                  <YStack flex={2}>
                    <Text fontSize={T.fontSize.sm} fontWeight="500" marginBottom={T.space.xs} color={T.primary}>Variation</Text>
                    {editEx.assigned_variations.length > 0 ? (
                      <DropdownSelect
                        options={[
                          { label: 'None', value: null },
                          ...editEx.assigned_variations.map((v) => ({ label: v.variation_name, value: v.custom_variation_id })),
                        ]}
                        value={editVarId}
                        onChange={setEditVarId}
                        placeholder="None"
                      />
                    ) : (
                      <XStack
                        alignItems="center"
                        borderWidth={1}
                        borderColor={T.border}
                        borderRadius={T.radius.md}
                        paddingHorizontal={T.space.md}
                        height={48}
                        backgroundColor={T.surface}
                        opacity={0.5}
                      >
                        <Text fontSize={T.fontSize.md} color={T.muted} flex={1} numberOfLines={1}>Zero Assigned</Text>
                      </XStack>
                    )}
                  </YStack>
                )}
              </XStack>
              {editEx && (
                <>
                  <Input label="Weight (optional)" placeholder="kg" keyboardType="numbers-and-punctuation" value={editWeight} onChangeText={setEditWeight} />
                  <Input
                    label={editEx.exercise_volume_type === 'reps' ? 'Reps' : 'Duration (seconds)'}
                    placeholder={editEx.exercise_volume_type === 'reps' ? 'e.g. 10,8,6' : 'e.g. 60,45'}
                    keyboardType="numbers-and-punctuation"
                    value={editRepsOrDuration}
                    onChangeText={setEditRepsOrDuration}
                  />
                  <Input label="Set notes (optional)" placeholder="Notes…" value={editNotes} onChangeText={setEditNotes} />
                </>
              )}
              <XStack gap={T.space.sm} justifyContent="center">
                <Button label="Cancel" onPress={() => setEditingSet(null)} variant="danger-ghost" />
                <Button label="Save" onPress={saveEditSet} loading={editLoading} />
              </XStack>
              <YStack height={T.space.xl} />
            </YStack>
          </ScrollView>
        </YStack>
      </SlideUpModal>
    </YStack>
  );
}
