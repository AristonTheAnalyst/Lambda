import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import PageHeader from '@/components/PageHeader';
import Button from '@/components/Button';
import Input from '@/components/Input';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DropdownSelect, SlideUpModal } from '@/components/FormControls';
import { useExerciseData, ExerciseDetail } from '@/lib/ExerciseDataContext';
import { useAuthContext } from '@/lib/AuthContext';
import supabase from '@/lib/supabase';
import { useAsyncGuard } from '@/lib/asyncGuard';
import T from '@/constants/Theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkoutSet {
  workout_set_id: number;
  workout_set_number: number;
  exercise_id: number;
  exercise_variation_id: number | null;
  workout_set_weight: number | null;
  workout_set_reps: number[] | null;
  workout_set_duration_seconds: number[] | null;
  workout_set_notes: string | null;
}

const WORKOUT_ID_KEY = 'currentWorkoutId';

function parseValues(str: string): number[] {
  return str.split(',').map((v) => parseInt(v.trim(), 10)).filter((n) => !isNaN(n));
}

function formatValues(arr: number[] | null): string {
  if (!arr || arr.length === 0) return '—';
  return arr.join(', ');
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WorkoutLogScreen() {
  const guard = useAsyncGuard();
  const { user } = useAuthContext();
  const { exercises, exerciseDetailMap } = useExerciseData();

  const [currentWorkoutId, setCurrentWorkoutId] = useState<number | null>(null);
  const [startNotes, setStartNotes]   = useState('');
  const [endNotes, setEndNotes]       = useState('');
  const [startLoading, setStartLoading] = useState(false);
  const [endLoading, setEndLoading]   = useState(false);

  const [selectedExId, setSelectedExId]     = useState<number | null>(null);
  const [selectedEx, setSelectedEx]         = useState<ExerciseDetail | null>(null);
  const [weight, setWeight]                 = useState('');
  const [repsOrDuration, setRepsOrDuration] = useState('');
  const [setNotes, setSetNotes]             = useState('');
  const [selectedVarId, setSelectedVarId]   = useState<number | null>(null);
  const [logLoading, setLogLoading]         = useState(false);

  const [sets, setSets]               = useState<WorkoutSet[]>([]);
  const [setsLoading, setSetsLoading] = useState(false);

  const [editingSet, setEditingSet]         = useState<WorkoutSet | null>(null);
  const [editEx, setEditEx]                 = useState<ExerciseDetail | null>(null);
  const [editWeight, setEditWeight]         = useState('');
  const [editRepsOrDuration, setEditRepsOrDuration] = useState('');
  const [editNotes, setEditNotes]           = useState('');
  const [editVarId, setEditVarId]           = useState<number | null>(null);
  const [editLoading, setEditLoading]       = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(WORKOUT_ID_KEY);
      if (stored) { const id = parseInt(stored, 10); setCurrentWorkoutId(id); loadSets(id); }
    })();
  }, []);

  const loadSets = useCallback(async (workoutId: number) => {
    setSetsLoading(true);
    const { data } = await supabase
      .from('fact_workout_set')
      .select('*')
      .eq('user_workout_id', workoutId)
      .order('workout_set_number');
    setSetsLoading(false);
    if (data) setSets(data);
  }, []);

  function onSelectExercise(exId: number | null) {
    setSelectedExId(exId);
    setSelectedVarId(null);
    setWeight('');
    setRepsOrDuration('');
    setSetNotes('');
    setSelectedEx(exId ? (exerciseDetailMap[exId] ?? null) : null);
  }

  function startWorkout() { return guard(async () => {
    if (!user) return;
    setStartLoading(true);
    const { data, error } = await supabase
      .from('fact_user_workout')
      .insert({ user_id: user.id, user_workout_notes: startNotes.trim() || null })
      .select('user_workout_id')
      .single();
    setStartLoading(false);
    if (error || !data) return Alert.alert('Error', error?.message ?? 'Failed to start workout');
    const id = data.user_workout_id;
    setCurrentWorkoutId(id);
    setStartNotes('');
    await AsyncStorage.setItem(WORKOUT_ID_KEY, String(id));
    setSets([]);
  }); }

  function confirmEndWorkout() {
    Alert.alert('End Workout', 'Are you sure you want to end this workout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End Workout', style: 'destructive', onPress: endWorkout },
    ]);
  }

  function endWorkout() { return guard(async () => {
    if (!currentWorkoutId) return;
    setEndLoading(true);
    if (endNotes.trim()) {
      await supabase.from('fact_user_workout').update({ user_workout_notes: endNotes.trim() }).eq('user_workout_id', currentWorkoutId);
    }
    setEndLoading(false);
    await AsyncStorage.removeItem(WORKOUT_ID_KEY);
    setCurrentWorkoutId(null); setEndNotes(''); setSets([]);
    setSelectedExId(null); setSelectedEx(null); setWeight(''); setRepsOrDuration(''); setSetNotes(''); setSelectedVarId(null);
    Alert.alert('Workout saved!');
  }); }

  function logSet() { return guard(async () => {
    if (!currentWorkoutId || !selectedExId || !selectedEx) return Alert.alert('Select an exercise first');
    if (!repsOrDuration.trim()) {
      return Alert.alert(
        selectedEx.exercise_volume_type === 'reps' ? 'Enter reps (e.g. 10,8,6)' : 'Enter duration in seconds (e.g. 60,45)'
      );
    }
    const values = parseValues(repsOrDuration);
    const isReps = selectedEx.exercise_volume_type === 'reps';
    const nextSetNum = sets.length > 0 ? Math.max(...sets.map((s) => s.workout_set_number)) + 1 : 1;

    setLogLoading(true);
    const { error } = await supabase.from('fact_workout_set').insert({
      user_workout_id: currentWorkoutId, exercise_id: selectedExId, exercise_source: 'official',
      workout_set_number: nextSetNum, workout_set_weight: weight ? parseFloat(weight) : null,
      workout_set_reps: isReps ? values : [], workout_set_duration_seconds: !isReps ? values : [],
      workout_set_notes: setNotes.trim() || null,
      exercise_variation_id: selectedVarId,
    });
    setLogLoading(false);
    if (error) return Alert.alert('Error', error.message);
    setWeight(''); setRepsOrDuration(''); setSetNotes(''); setSelectedVarId(null);
    loadSets(currentWorkoutId);
  }); }

  function openEditSet(s: WorkoutSet) { return guard(async () => {
    setEditingSet(s);
    setEditWeight(s.workout_set_weight != null ? String(s.workout_set_weight) : '');
    const vals = s.workout_set_reps?.length ? s.workout_set_reps : s.workout_set_duration_seconds ?? [];
    setEditRepsOrDuration(vals.join(','));
    setEditNotes(s.workout_set_notes ?? '');
    setEditEx(exerciseDetailMap[s.exercise_id] ?? null);
    setEditVarId(s.exercise_variation_id);
  }); }

  function saveEditSet() { return guard(async () => {
    if (!editingSet || !editEx) return;
    const values = parseValues(editRepsOrDuration);
    const isReps = editEx.exercise_volume_type === 'reps';
    setEditLoading(true);
    const { error } = await supabase.from('fact_workout_set').update({
      workout_set_weight: editWeight ? parseFloat(editWeight) : null,
      workout_set_reps: isReps ? values : [], workout_set_duration_seconds: !isReps ? values : [],
      workout_set_notes: editNotes.trim() || null,
      exercise_variation_id: editVarId,
    }).eq('workout_set_id', editingSet.workout_set_id);
    setEditLoading(false);
    if (error) return Alert.alert('Error', error.message);
    setEditingSet(null); setEditEx(null);
    if (currentWorkoutId) loadSets(currentWorkoutId);
  }); }

  function deleteSet(setId: number) {
    Alert.alert('Delete Set', 'Remove this set?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => guard(async () => {
        await supabase.from('fact_workout_set').delete().eq('workout_set_id', setId);
        if (currentWorkoutId) loadSets(currentWorkoutId);
      })},
    ]);
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: T.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <PageHeader title="Workout Log" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: T.space.lg, paddingBottom: T.space.xxl }}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── No active workout ── */}
        {!currentWorkoutId && (
          <YStack gap={T.space.md}>
            <Text fontSize={T.fontSize.xl} fontWeight="700" color={T.primary}>Start a Workout</Text>
            <Input placeholder="Workout notes (optional)" value={startNotes} onChangeText={setStartNotes} />
            <Button label="Start Workout" onPress={startWorkout} loading={startLoading} />
          </YStack>
        )}

        {/* ── Active workout ── */}
        {currentWorkoutId && (
          <>
            <Text fontSize={T.fontSize.xl} fontWeight="700" marginBottom={T.space.md} color={T.primary}>Log a Set</Text>

            <Text fontSize={T.fontSize.sm} fontWeight="500" marginBottom={T.space.xs} color={T.primary}>Exercise</Text>
            <DropdownSelect
              options={exercises.map((ex) => ({ label: ex.exercise_name, value: ex.exercise_id }))}
              value={selectedExId}
              onChange={onSelectExercise}
              placeholder="Select exercise…"
            />

            {selectedEx && (
              <YStack gap={T.space.md} marginTop={T.space.md}>
                <Input label="Weight (optional)" placeholder="kg" keyboardType="decimal-pad" value={weight} onChangeText={setWeight} />
                <Input
                  label={selectedEx.exercise_volume_type === 'reps' ? 'Reps' : 'Duration (seconds)'}
                  placeholder={selectedEx.exercise_volume_type === 'reps' ? 'e.g. 10,8,6' : 'e.g. 60,45'}
                  keyboardType="numbers-and-punctuation"
                  value={repsOrDuration}
                  onChangeText={setRepsOrDuration}
                />
                {selectedEx.assigned_variations.length > 0 && (
                  <YStack>
                    <Text fontSize={T.fontSize.sm} fontWeight="500" marginBottom={T.space.xs} color={T.primary}>Variation</Text>
                    <DropdownSelect
                      options={[
                        { label: 'None', value: null },
                        ...selectedEx.assigned_variations.map((v) => ({ label: v.exercise_variation_name, value: v.exercise_variation_id })),
                      ]}
                      value={selectedVarId}
                      onChange={setSelectedVarId}
                      placeholder="None"
                    />
                  </YStack>
                )}
                <Input label="Set notes (optional)" placeholder="Notes…" value={setNotes} onChangeText={setSetNotes} />
                <Button label="Log Set" onPress={logSet} loading={logLoading} />
              </YStack>
            )}

            {/* ── Sets table ── */}
            <Text fontSize={T.fontSize.xl} fontWeight="700" marginTop={T.space.xl} marginBottom={T.space.sm} color={T.primary}>Sets this workout</Text>
            {setsLoading ? (
              <Spinner size="large" color={T.accent} marginTop={T.space.md} />
            ) : sets.length === 0 ? (
              <Text color={T.muted} marginTop={T.space.sm}>No sets logged yet.</Text>
            ) : (
              sets.map((s) => {
                const exName = exerciseDetailMap[s.exercise_id]?.exercise_name ?? `#${s.exercise_id}`;
                const varName = s.exercise_variation_id
                  ? exerciseDetailMap[s.exercise_id]?.assigned_variations.find((v) => v.exercise_variation_id === s.exercise_variation_id)?.exercise_variation_name
                  : null;
                const repsStr = s.workout_set_reps?.length
                  ? formatValues(s.workout_set_reps)
                  : s.workout_set_duration_seconds?.length ? `${formatValues(s.workout_set_duration_seconds)}s` : '—';
                return (
                  <YStack key={s.workout_set_id} borderBottomWidth={0.5} borderBottomColor={T.border} paddingVertical={T.space.sm}>
                    <XStack alignItems="flex-start" gap={T.space.sm}>
                      <Text fontWeight="700" fontSize={15} marginTop={1} color={T.accent}>#{s.workout_set_number}</Text>
                      <YStack flex={1}>
                        <Text fontSize={15} fontWeight="500" color={T.primary}>{exName}</Text>
                        <Text fontSize={T.fontSize.xs} marginTop={T.space.xs} color={T.muted}>
                          {s.workout_set_weight != null ? `${s.workout_set_weight}kg · ` : ''}{repsStr}
                          {varName ? ` · ${varName}` : ''}
                          {s.workout_set_notes ? ` · ${s.workout_set_notes}` : ''}
                        </Text>
                      </YStack>
                    </XStack>
                    <XStack gap={T.space.sm} marginTop={T.space.xs + 2}>
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
                  </YStack>
                );
              })
            )}

            {/* ── End workout ── */}
            <YStack marginTop={T.space.xxl} paddingTop={T.space.lg} borderTopWidth={0.5} borderTopColor={T.border} gap={T.space.md}>
              <Input label="Final notes (optional)" placeholder="Notes…" value={endNotes} onChangeText={setEndNotes} />
              <Button label="End Workout" onPress={confirmEndWorkout} loading={endLoading} variant="danger" />
            </YStack>
          </>
        )}
      </ScrollView>

      {/* ── Edit Set Modal ── */}
      <SlideUpModal visible={!!editingSet} onClose={() => setEditingSet(null)}>
        <YStack
          backgroundColor={T.surface}
          borderTopLeftRadius={T.radius.lg}
          borderTopRightRadius={T.radius.lg}
          padding={T.space.xl}
          maxHeight="85%"
        >
          <ScrollView keyboardShouldPersistTaps="handled">
            <YStack gap={T.space.md}>
              <Text fontSize={T.fontSize.lg} fontWeight="700" color={T.primary}>Edit Set</Text>
              <Input label="Weight (optional)" placeholder="kg" keyboardType="decimal-pad" value={editWeight} onChangeText={setEditWeight} />
              {editEx && (
                <>
                  <Input
                    label={editEx.exercise_volume_type === 'reps' ? 'Reps' : 'Duration (seconds)'}
                    placeholder={editEx.exercise_volume_type === 'reps' ? 'e.g. 10,8,6' : 'e.g. 60,45'}
                    keyboardType="numbers-and-punctuation"
                    value={editRepsOrDuration}
                    onChangeText={setEditRepsOrDuration}
                  />
                  {editEx.assigned_variations.length > 0 && (
                    <YStack>
                      <Text fontSize={T.fontSize.sm} fontWeight="500" marginBottom={T.space.xs} color={T.primary}>Variation</Text>
                      <DropdownSelect
                        options={[
                          { label: 'None', value: null },
                          ...editEx.assigned_variations.map((v) => ({ label: v.exercise_variation_name, value: v.exercise_variation_id })),
                        ]}
                        value={editVarId}
                        onChange={setEditVarId}
                        placeholder="None"
                      />
                    </YStack>
                  )}
                </>
              )}
              <Input label="Notes (optional)" placeholder="Notes…" value={editNotes} onChangeText={setEditNotes} />
              <XStack gap={T.space.sm}>
                <YStack flex={1}><Button label="Save" onPress={saveEditSet} loading={editLoading} /></YStack>
                <YStack flex={1}><Button label="Cancel" onPress={() => setEditingSet(null)} variant="ghost" /></YStack>
              </XStack>
              <YStack height={T.space.xl} />
            </YStack>
          </ScrollView>
        </YStack>
      </SlideUpModal>
    </KeyboardAvoidingView>
  );
}
