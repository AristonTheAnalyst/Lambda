import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DropdownSelect } from '@/components/FormControls';
import { useAuthContext } from '@/lib/AuthContext';
import supabase from '@/lib/supabase';
import T from '@/constants/Theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Exercise {
  exercise_id: number;
  exercise_name: string;
  exercise_volume_type: string;
  exercise_intensity_type: string;
}

interface AssignedVariation {
  exercise_variation_id: number;
  exercise_variation_name: string;
  variation_type_id: number;
  variation_type_name: string;
}

interface ExerciseDetail extends Exercise {
  assigned_variations: AssignedVariation[];
}

interface WorkoutSet {
  workout_set_id: number;
  workout_set_number: number;
  exercise_id: number;
  workout_set_weight: number | null;
  workout_set_reps: number[] | null;
  workout_set_duration_seconds: number[] | null;
  workout_set_notes: string | null;
}

const WORKOUT_ID_KEY = 'currentWorkoutId';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseValues(str: string): number[] {
  return str
    .split(',')
    .map((v) => parseInt(v.trim(), 10))
    .filter((n) => !isNaN(n));
}

function formatValues(arr: number[] | null): string {
  if (!arr || arr.length === 0) return '—';
  return arr.join(', ');
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WorkoutLogScreen() {
  const isDark = true;

  const { user } = useAuthContext();

  // ─── Workout state
  const [currentWorkoutId, setCurrentWorkoutId] = useState<number | null>(null);
  const [startNotes, setStartNotes] = useState('');
  const [endNotes, setEndNotes] = useState('');
  const [startLoading, setStartLoading] = useState(false);
  const [endLoading, setEndLoading] = useState(false);

  // ─── Exercise data
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseMap, setExerciseMap] = useState<Record<number, Exercise>>({});

  // ─── Log Set form
  const [selectedExId, setSelectedExId] = useState<number | null>(null);
  const [selectedEx, setSelectedEx] = useState<ExerciseDetail | null>(null);
  const [weight, setWeight] = useState('');
  const [repsOrDuration, setRepsOrDuration] = useState('');
  const [setNotes, setSetNotes] = useState('');
  const [selectedVarIds, setSelectedVarIds] = useState<number[]>([]);
  const [logLoading, setLogLoading] = useState(false);

  // ─── Sets table
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [setsLoading, setSetsLoading] = useState(false);

  // ─── Edit modal
  const [editingSet, setEditingSet] = useState<WorkoutSet | null>(null);
  const [editEx, setEditEx] = useState<ExerciseDetail | null>(null);
  const [editWeight, setEditWeight] = useState('');
  const [editRepsOrDuration, setEditRepsOrDuration] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editVarIds, setEditVarIds] = useState<number[]>([]);
  const [editLoading, setEditLoading] = useState(false);

  // ─── Load exercises on mount + restore workout from storage ─────────────

  useEffect(() => {
    loadExercises();
    restoreWorkout();
  }, []);

  async function restoreWorkout() {
    const stored = await AsyncStorage.getItem(WORKOUT_ID_KEY);
    if (stored) {
      const id = parseInt(stored, 10);
      setCurrentWorkoutId(id);
      loadSets(id);
    }
  }

  const loadExercises = useCallback(async () => {
    const { data } = await supabase
      .from('dim_exercise')
      .select('*')
      .eq('is_active', true)
      .order('exercise_name');
    if (data) {
      setExercises(data);
      const map: Record<number, Exercise> = {};
      data.forEach((ex: Exercise) => {
        map[ex.exercise_id] = ex;
      });
      setExerciseMap(map);
    }
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

  // ─── Exercise detail (with assigned variations) ──────────────────────────

  async function loadExerciseDetail(exId: number): Promise<ExerciseDetail | null> {
    const { data: ex } = await supabase
      .from('dim_exercise')
      .select('*')
      .eq('exercise_id', exId)
      .single();
    if (!ex) return null;

    const { data: bridge } = await supabase
      .from('bridge_exercise_variation')
      .select('exercise_variation_id, dim_exercise_variation(exercise_variation_id, exercise_variation_name, variation_type_id, dim_variation_type(variation_type_name))')
      .eq('exercise_id', exId);

    const assigned_variations: AssignedVariation[] = (bridge ?? []).map((b: any) => {
      const v = b.dim_exercise_variation;
      return {
        exercise_variation_id: v.exercise_variation_id,
        exercise_variation_name: v.exercise_variation_name,
        variation_type_id: v.variation_type_id,
        variation_type_name: v.dim_variation_type?.variation_type_name ?? '',
      };
    });

    return { ...ex, assigned_variations };
  }

  async function onSelectExercise(exId: number | null) {
    setSelectedExId(exId);
    setSelectedEx(null);
    setWeight('');
    setRepsOrDuration('');
    setSetNotes('');
    setSelectedVarIds([]);
    if (!exId) return;
    const detail = await loadExerciseDetail(exId);
    setSelectedEx(detail);
  }

  // ─── Group variations by type for pickers ────────────────────────────────

  function groupByType(variations: AssignedVariation[]): Record<string, AssignedVariation[]> {
    return variations.reduce<Record<string, AssignedVariation[]>>((acc, v) => {
      const key = v.variation_type_name;
      if (!acc[key]) acc[key] = [];
      acc[key].push(v);
      return acc;
    }, {});
  }

  function setVariationForType(type: string, varId: number | null, variations: AssignedVariation[], currentIds: number[], setter: (ids: number[]) => void) {
    const typeVarIds = variations.filter((v) => v.variation_type_name === type).map((v) => v.exercise_variation_id);
    let updated = currentIds.filter((id) => !typeVarIds.includes(id));
    if (varId !== null) updated = [...updated, varId];
    setter(updated);
  }

  // ─── Start / End workout ─────────────────────────────────────────────────

  async function startWorkout() {
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
  }

  function confirmEndWorkout() {
    Alert.alert('End Workout', 'Are you sure you want to end this workout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End Workout', style: 'destructive', onPress: endWorkout },
    ]);
  }

  async function endWorkout() {
    if (!currentWorkoutId) return;
    setEndLoading(true);
    if (endNotes.trim()) {
      await supabase
        .from('fact_user_workout')
        .update({ user_workout_notes: endNotes.trim() })
        .eq('user_workout_id', currentWorkoutId);
    }
    setEndLoading(false);
    await AsyncStorage.removeItem(WORKOUT_ID_KEY);
    setCurrentWorkoutId(null);
    setEndNotes('');
    setSets([]);
    setSelectedExId(null);
    setSelectedEx(null);
    setWeight('');
    setRepsOrDuration('');
    setSetNotes('');
    setSelectedVarIds([]);
    Alert.alert('Workout saved!');
  }

  // ─── Log set ─────────────────────────────────────────────────────────────

  async function logSet() {
    if (!currentWorkoutId || !selectedExId || !selectedEx) {
      return Alert.alert('Select an exercise first');
    }
    if (!repsOrDuration.trim()) {
      return Alert.alert(
        selectedEx.exercise_volume_type === 'reps'
          ? 'Enter reps (e.g. 10,8,6)'
          : 'Enter duration in seconds (e.g. 60,45)'
      );
    }

    const values = parseValues(repsOrDuration);
    const isReps = selectedEx.exercise_volume_type === 'reps';

    const nextSetNum = sets.length > 0 ? Math.max(...sets.map((s) => s.workout_set_number)) + 1 : 1;

    setLogLoading(true);
    const { data: setData, error } = await supabase
      .from('fact_workout_set')
      .insert({
        user_workout_id: currentWorkoutId,
        exercise_id: selectedExId,
        exercise_source: 'official',
        workout_set_number: nextSetNum,
        workout_set_weight: weight ? parseFloat(weight) : null,
        workout_set_reps: isReps ? values : [],
        workout_set_duration_seconds: !isReps ? values : [],
        workout_set_notes: setNotes.trim() || null,
      })
      .select('workout_set_id')
      .single();

    if (!error && setData && selectedVarIds.length > 0) {
      await supabase.from('fact_set_variation').insert(
        selectedVarIds.map((vid) => ({
          workout_set_id: setData.workout_set_id,
          exercise_variation_id: vid,
          variation_source: 'official',
        }))
      );
    }

    setLogLoading(false);
    if (error) return Alert.alert('Error', error.message);

    setWeight('');
    setRepsOrDuration('');
    setSetNotes('');
    setSelectedVarIds([]);
    loadSets(currentWorkoutId);
  }

  // ─── Edit set ────────────────────────────────────────────────────────────

  async function openEditSet(s: WorkoutSet) {
    setEditingSet(s);
    setEditWeight(s.workout_set_weight != null ? String(s.workout_set_weight) : '');
    const vals = s.workout_set_reps?.length
      ? s.workout_set_reps
      : s.workout_set_duration_seconds ?? [];
    setEditRepsOrDuration(vals.join(','));
    setEditNotes(s.workout_set_notes ?? '');

    // Load existing set variations
    const { data: svData } = await supabase
      .from('fact_set_variation')
      .select('exercise_variation_id')
      .eq('workout_set_id', s.workout_set_id);
    setEditVarIds(svData ? svData.map((r: any) => r.exercise_variation_id) : []);

    // Load exercise detail for variation pickers
    const detail = await loadExerciseDetail(s.exercise_id);
    setEditEx(detail);
  }

  async function saveEditSet() {
    if (!editingSet || !editEx) return;
    const values = parseValues(editRepsOrDuration);
    const isReps = editEx.exercise_volume_type === 'reps';

    setEditLoading(true);
    const { error } = await supabase
      .from('fact_workout_set')
      .update({
        workout_set_weight: editWeight ? parseFloat(editWeight) : null,
        workout_set_reps: isReps ? values : [],
        workout_set_duration_seconds: !isReps ? values : [],
        workout_set_notes: editNotes.trim() || null,
      })
      .eq('workout_set_id', editingSet.workout_set_id);

    if (!error) {
      // Replace set variations
      await supabase.from('fact_set_variation').delete().eq('workout_set_id', editingSet.workout_set_id);
      if (editVarIds.length > 0) {
        await supabase.from('fact_set_variation').insert(
          editVarIds.map((vid) => ({
            workout_set_id: editingSet.workout_set_id,
            exercise_variation_id: vid,
            variation_source: 'official',
          }))
        );
      }
    }

    setEditLoading(false);
    if (error) return Alert.alert('Error', error.message);
    setEditingSet(null);
    setEditEx(null);
    if (currentWorkoutId) loadSets(currentWorkoutId);
  }

  async function deleteSet(setId: number) {
    Alert.alert('Delete Set', 'Remove this set?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('fact_set_variation').delete().eq('workout_set_id', setId);
          await supabase.from('fact_workout_set').delete().eq('workout_set_id', setId);
          if (currentWorkoutId) loadSets(currentWorkoutId);
        },
      },
    ]);
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: T.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps="handled">

        {/* ── No active workout ── */}
        {!currentWorkoutId && (
          <View>
            <Text style={[styles.heading, { color: T.primary }]}>Start a Workout</Text>
            <TextInput
              style={[styles.input, { backgroundColor: T.surface, color: T.primary, borderColor: T.border }]}
              placeholder="Workout notes (optional)"
              placeholderTextColor={T.muted}
              value={startNotes}
              onChangeText={setStartNotes}
            />
            <TouchableOpacity style={styles.btn} onPress={startWorkout} disabled={startLoading}>
              {startLoading ? (
                <ActivityIndicator color={T.accentText} />
              ) : (
                <Text style={styles.btnText}>Start Workout</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Active workout ── */}
        {currentWorkoutId && (
          <>
            <Text style={[styles.heading, { color: T.primary }]}>Log a Set</Text>

            {/* Exercise picker */}
            <Text style={[styles.label, { color: T.primary }]}>Exercise</Text>
            <DropdownSelect
              options={exercises.map((ex) => ({ label: ex.exercise_name, value: ex.exercise_id }))}
              value={selectedExId}
              onChange={onSelectExercise}
              placeholder="Select exercise…"
              isDark={isDark}
            />

            {selectedEx && (
              <>
                {/* Weight */}
                <Text style={[styles.label, { color: T.primary }]}>Weight (optional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: T.surface, color: T.primary, borderColor: T.border }]}
                  placeholder="kg"
                  placeholderTextColor={T.muted}
                  keyboardType="decimal-pad"
                  value={weight}
                  onChangeText={setWeight}
                />

                {/* Reps or Duration */}
                <Text style={[styles.label, { color: T.primary }]}>
                  {selectedEx.exercise_volume_type === 'reps' ? 'Reps' : 'Duration (seconds)'}
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: T.surface, color: T.primary, borderColor: T.border }]}
                  placeholder={
                    selectedEx.exercise_volume_type === 'reps'
                      ? 'e.g. 10,8,6'
                      : 'e.g. 60,45'
                  }
                  placeholderTextColor={T.muted}
                  keyboardType="numbers-and-punctuation"
                  value={repsOrDuration}
                  onChangeText={setRepsOrDuration}
                />

                {/* Variation pickers */}
                {selectedEx.assigned_variations.length > 0 &&
                  Object.entries(groupByType(selectedEx.assigned_variations)).map(([typeName, vars]) => (
                    <View key={typeName}>
                      <Text style={[styles.label, { color: T.primary }]}>{typeName}</Text>
                      <DropdownSelect
                        options={[
                          { label: 'None', value: null },
                          ...vars.map((v) => ({ label: v.exercise_variation_name, value: v.exercise_variation_id })),
                        ]}
                        value={selectedVarIds.find((id) => vars.some((v) => v.exercise_variation_id === id)) ?? null}
                        onChange={(v) =>
                          setVariationForType(typeName, v, selectedEx.assigned_variations, selectedVarIds, setSelectedVarIds)
                        }
                        placeholder="None"
                        isDark={isDark}
                      />
                    </View>
                  ))}

                {/* Notes */}
                <Text style={[styles.label, { color: T.primary }]}>Set notes (optional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: T.surface, color: T.primary, borderColor: T.border }]}
                  placeholder="Notes…"
                  placeholderTextColor={T.muted}
                  value={setNotes}
                  onChangeText={setSetNotes}
                />

                <TouchableOpacity style={styles.btn} onPress={logSet} disabled={logLoading}>
                  {logLoading ? (
                    <ActivityIndicator color={T.accentText} />
                  ) : (
                    <Text style={styles.btnText}>Log Set</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* ── Sets table ── */}
            <Text style={[styles.heading, { color: T.primary, marginTop: 24 }]}>
              Sets this workout
            </Text>
            {setsLoading ? (
              <ActivityIndicator color={T.accent} style={{ marginTop: 12 }} />
            ) : sets.length === 0 ? (
              <Text style={{ color: T.muted, marginTop: 8 }}>No sets logged yet.</Text>
            ) : (
              sets.map((s) => {
                const exName = exerciseMap[s.exercise_id]?.exercise_name ?? `#${s.exercise_id}`;
                const repsStr =
                  s.workout_set_reps?.length
                    ? formatValues(s.workout_set_reps)
                    : s.workout_set_duration_seconds?.length
                    ? `${formatValues(s.workout_set_duration_seconds)}s`
                    : '—';
                return (
                  <View key={s.workout_set_id} style={[styles.setRow, { borderColor: T.border }]}>
                    <View style={styles.setMeta}>
                      <Text style={[styles.setNum, { color: T.accent }]}>#{s.workout_set_number}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.setExName, { color: T.primary }]}>{exName}</Text>
                        <Text style={[styles.setSub, { color: T.muted }]}>
                          {s.workout_set_weight != null ? `${s.workout_set_weight}kg · ` : ''}{repsStr}
                          {s.workout_set_notes ? ` · ${s.workout_set_notes}` : ''}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.setActions}>
                      <TouchableOpacity onPress={() => openEditSet(s)} style={styles.rowBtn}>
                        <Text style={styles.rowBtnText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => deleteSet(s.workout_set_id)}
                        style={[styles.rowBtn, styles.rowBtnDanger]}>
                        <Text style={[styles.rowBtnText, { color: T.danger }]}>Del</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}

            {/* ── End workout ── */}
            <View style={[styles.endSection, { borderColor: T.border }]}>
              <Text style={[styles.label, { color: T.primary }]}>Final notes (optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: T.surface, color: T.primary, borderColor: T.border }]}
                placeholder="Notes…"
                placeholderTextColor={T.muted}
                value={endNotes}
                onChangeText={setEndNotes}
              />
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: T.danger }]}
                onPress={confirmEndWorkout}
                disabled={endLoading}>
                {endLoading ? (
                  <ActivityIndicator color={T.accentText} />
                ) : (
                  <Text style={styles.btnText}>End Workout</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Edit Set Modal ── */}
      <Modal
        visible={!!editingSet}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingSet(null)}>
        <View style={styles.modalOverlay}>
          <ScrollView
            style={[styles.modalBox, { backgroundColor: T.surface }]}
            keyboardShouldPersistTaps="handled">
            <Text style={[styles.modalTitle, { color: T.primary }]}>Edit Set</Text>

            <Text style={[styles.label, { color: T.primary }]}>Weight (optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: T.surface, color: T.primary, borderColor: T.border }]}
              placeholder="kg"
              placeholderTextColor={T.muted}
              keyboardType="decimal-pad"
              value={editWeight}
              onChangeText={setEditWeight}
            />

            {editEx && (
              <>
                <Text style={[styles.label, { color: T.primary }]}>
                  {editEx.exercise_volume_type === 'reps' ? 'Reps' : 'Duration (seconds)'}
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: T.surface, color: T.primary, borderColor: T.border }]}
                  placeholder={editEx.exercise_volume_type === 'reps' ? 'e.g. 10,8,6' : 'e.g. 60,45'}
                  placeholderTextColor={T.muted}
                  keyboardType="numbers-and-punctuation"
                  value={editRepsOrDuration}
                  onChangeText={setEditRepsOrDuration}
                />

                {editEx.assigned_variations.length > 0 &&
                  Object.entries(groupByType(editEx.assigned_variations)).map(([typeName, vars]) => (
                    <View key={typeName}>
                      <Text style={[styles.label, { color: T.primary }]}>{typeName}</Text>
                      <DropdownSelect
                        options={[
                          { label: 'None', value: null },
                          ...vars.map((v) => ({ label: v.exercise_variation_name, value: v.exercise_variation_id })),
                        ]}
                        value={editVarIds.find((id) => vars.some((v) => v.exercise_variation_id === id)) ?? null}
                        onChange={(v) =>
                          setVariationForType(typeName, v, editEx.assigned_variations, editVarIds, setEditVarIds)
                        }
                        placeholder="None"
                        isDark={isDark}
                      />
                    </View>
                  ))}
              </>
            )}

            <Text style={[styles.label, { color: T.primary }]}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: T.surface, color: T.primary, borderColor: T.border }]}
              placeholder="Notes…"
              placeholderTextColor={T.muted}
              value={editNotes}
              onChangeText={setEditNotes}
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.btn, { flex: 1, marginRight: 8 }]} onPress={saveEditSet} disabled={editLoading}>
                {editLoading ? <ActivityIndicator color={T.accentText} /> : <Text style={styles.btnText}>Save</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary, { flex: 1, borderColor: T.border }]}
                onPress={() => setEditingSet(null)}>
                <Text style={[styles.btnText, { color: T.primary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 12, color: T.primary },
  label: { fontSize: 13, fontWeight: '500', marginTop: 12, marginBottom: 4, color: T.primary },
  input: {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 4,
    backgroundColor: T.surface,
    color: T.primary,
  },
  btn: {
    backgroundColor: T.accent,
    borderRadius: 8,
    padding: 13,
    alignItems: 'center',
    marginTop: 12,
  },
  btnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: T.border },
  btnText: { color: T.accentText, fontWeight: '600', fontSize: 15 },
  setRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.border,
    paddingVertical: 10,
  },
  setMeta: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  setNum: { fontWeight: '700', fontSize: 15, marginTop: 1, color: T.accent },
  setExName: { fontSize: 15, fontWeight: '500', color: T.primary },
  setSub: { fontSize: 12, marginTop: 2, color: T.muted },
  setActions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  rowBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: T.accentBg,
  },
  rowBtnDanger: { backgroundColor: T.dangerBg },
  rowBtnText: { fontSize: 13, fontWeight: '500', color: T.accent },
  endSection: {
    marginTop: 32,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: T.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '85%',
    backgroundColor: T.surface,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: T.primary },
  modalBtns: { flexDirection: 'row', marginTop: 12 },
});
