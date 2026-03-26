import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import PageHeader from '@/components/PageHeader';
import Button from '@/components/Button';
import Input from '@/components/Input';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DropdownSelect, SlideUpModal } from '@/components/FormControls';
import { useExerciseData, ExerciseDetail, AssignedVariation } from '@/lib/ExerciseDataContext';
import { useAuthContext } from '@/lib/AuthContext';
import supabase from '@/lib/supabase';
import T from '@/constants/Theme';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  const { user } = useAuthContext();
  const { exercises, exerciseDetailMap } = useExerciseData();

  // ─── Workout state
  const [currentWorkoutId, setCurrentWorkoutId] = useState<number | null>(null);
  const [startNotes, setStartNotes] = useState('');
  const [endNotes, setEndNotes] = useState('');
  const [startLoading, setStartLoading] = useState(false);
  const [endLoading, setEndLoading] = useState(false);

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

  // ─── Restore in-progress workout from storage ────────────────────────────

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(WORKOUT_ID_KEY);
      if (stored) {
        const id = parseInt(stored, 10);
        setCurrentWorkoutId(id);
        loadSets(id);
      }
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

  // ─── Exercise selection ───────────────────────────────────────────────────

  function onSelectExercise(exId: number | null) {
    setSelectedExId(exId);
    setSelectedVarIds([]);
    setWeight('');
    setRepsOrDuration('');
    setSetNotes('');
    setSelectedEx(exId ? (exerciseDetailMap[exId] ?? null) : null);
  }

  // ─── Group variations by type ─────────────────────────────────────────────

  function groupByType(variations: AssignedVariation[]): Record<string, AssignedVariation[]> {
    return variations.reduce<Record<string, AssignedVariation[]>>((acc, v) => {
      if (!acc[v.variation_type_name]) acc[v.variation_type_name] = [];
      acc[v.variation_type_name].push(v);
      return acc;
    }, {});
  }

  function setVariationForType(
    type: string,
    varId: number | null,
    variations: AssignedVariation[],
    currentIds: number[],
    setter: (ids: number[]) => void
  ) {
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
    const vals = s.workout_set_reps?.length ? s.workout_set_reps : s.workout_set_duration_seconds ?? [];
    setEditRepsOrDuration(vals.join(','));
    setEditNotes(s.workout_set_notes ?? '');
    setEditEx(exerciseDetailMap[s.exercise_id] ?? null);

    const { data: svData } = await supabase
      .from('fact_set_variation')
      .select('exercise_variation_id')
      .eq('workout_set_id', s.workout_set_id);
    setEditVarIds(svData ? svData.map((r: any) => r.exercise_variation_id) : []);
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
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <PageHeader title="Workout Log" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">

        {/* ── No active workout ── */}
        {!currentWorkoutId && (
          <View>
            <Text style={styles.heading}>Start a Workout</Text>
            <Input
              placeholder="Workout notes (optional)"
              value={startNotes}
              onChangeText={setStartNotes}
            />
            <View style={styles.btnRow}>
              <Button label="Start Workout" onPress={startWorkout} loading={startLoading} />
            </View>
          </View>
        )}

        {/* ── Active workout ── */}
        {currentWorkoutId && (
          <>
            <Text style={styles.heading}>Log a Set</Text>

            <Text style={styles.fieldLabel}>Exercise</Text>
            <DropdownSelect
              options={exercises.map((ex) => ({ label: ex.exercise_name, value: ex.exercise_id }))}
              value={selectedExId}
              onChange={onSelectExercise}
              placeholder="Select exercise…"
            />

            {selectedEx && (
              <>
                <View style={styles.fieldGap}>
                  <Input
                    label="Weight (optional)"
                    placeholder="kg"
                    keyboardType="decimal-pad"
                    value={weight}
                    onChangeText={setWeight}
                  />
                </View>

                <View style={styles.fieldGap}>
                  <Input
                    label={selectedEx.exercise_volume_type === 'reps' ? 'Reps' : 'Duration (seconds)'}
                    placeholder={selectedEx.exercise_volume_type === 'reps' ? 'e.g. 10,8,6' : 'e.g. 60,45'}
                    keyboardType="numbers-and-punctuation"
                    value={repsOrDuration}
                    onChangeText={setRepsOrDuration}
                  />
                </View>

                {selectedEx.assigned_variations.length > 0 &&
                  Object.entries(groupByType(selectedEx.assigned_variations)).map(([typeName, vars]) => (
                    <View key={typeName} style={styles.fieldGap}>
                      <Text style={styles.fieldLabel}>{typeName}</Text>
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
                      />
                    </View>
                  ))}

                <View style={styles.fieldGap}>
                  <Input
                    label="Set notes (optional)"
                    placeholder="Notes…"
                    value={setNotes}
                    onChangeText={setSetNotes}
                  />
                </View>

                <View style={styles.btnRow}>
                  <Button label="Log Set" onPress={logSet} loading={logLoading} />
                </View>
              </>
            )}

            {/* ── Sets table ── */}
            <Text style={[styles.heading, { marginTop: T.space.xl }]}>Sets this workout</Text>
            {setsLoading ? (
              <ActivityIndicator color={T.accent} style={{ marginTop: T.space.md }} />
            ) : sets.length === 0 ? (
              <Text style={styles.empty}>No sets logged yet.</Text>
            ) : (
              sets.map((s) => {
                const exName = exerciseDetailMap[s.exercise_id]?.exercise_name ?? `#${s.exercise_id}`;
                const repsStr = s.workout_set_reps?.length
                  ? formatValues(s.workout_set_reps)
                  : s.workout_set_duration_seconds?.length
                  ? `${formatValues(s.workout_set_duration_seconds)}s`
                  : '—';
                return (
                  <View key={s.workout_set_id} style={styles.setRow}>
                    <View style={styles.setMeta}>
                      <Text style={styles.setNum}>#{s.workout_set_number}</Text>
                      <View style={styles.setInfo}>
                        <Text style={styles.setExName}>{exName}</Text>
                        <Text style={styles.setSub}>
                          {s.workout_set_weight != null ? `${s.workout_set_weight}kg · ` : ''}{repsStr}
                          {s.workout_set_notes ? ` · ${s.workout_set_notes}` : ''}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.setActions}>
                      <TouchableOpacity onPress={() => openEditSet(s)} style={styles.rowBtn}>
                        <Text style={styles.rowBtnText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteSet(s.workout_set_id)} style={[styles.rowBtn, styles.rowBtnDanger]}>
                        <Text style={[styles.rowBtnText, { color: T.danger }]}>Del</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}

            {/* ── End workout ── */}
            <View style={styles.endSection}>
              <Input
                label="Final notes (optional)"
                placeholder="Notes…"
                value={endNotes}
                onChangeText={setEndNotes}
              />
              <View style={styles.btnRow}>
                <Button label="End Workout" onPress={confirmEndWorkout} loading={endLoading} variant="danger" />
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Edit Set Modal ── */}
      <SlideUpModal visible={!!editingSet} onClose={() => setEditingSet(null)}>
        <View style={styles.modalBox}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Edit Set</Text>

            <Input
              label="Weight (optional)"
              placeholder="kg"
              keyboardType="decimal-pad"
              value={editWeight}
              onChangeText={setEditWeight}
            />

            {editEx && (
              <>
                <View style={styles.fieldGap}>
                  <Input
                    label={editEx.exercise_volume_type === 'reps' ? 'Reps' : 'Duration (seconds)'}
                    placeholder={editEx.exercise_volume_type === 'reps' ? 'e.g. 10,8,6' : 'e.g. 60,45'}
                    keyboardType="numbers-and-punctuation"
                    value={editRepsOrDuration}
                    onChangeText={setEditRepsOrDuration}
                  />
                </View>

                {editEx.assigned_variations.length > 0 &&
                  Object.entries(groupByType(editEx.assigned_variations)).map(([typeName, vars]) => (
                    <View key={typeName} style={styles.fieldGap}>
                      <Text style={styles.fieldLabel}>{typeName}</Text>
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
                      />
                    </View>
                  ))}
              </>
            )}

            <View style={styles.fieldGap}>
              <Input
                label="Notes (optional)"
                placeholder="Notes…"
                value={editNotes}
                onChangeText={setEditNotes}
              />
            </View>

            <View style={styles.modalBtns}>
              <View style={styles.modalBtnFlex}>
                <Button label="Save" onPress={saveEditSet} loading={editLoading} />
              </View>
              <View style={styles.modalBtnFlex}>
                <Button label="Cancel" onPress={() => setEditingSet(null)} variant="ghost" />
              </View>
            </View>
            <View style={{ height: T.space.xl }} />
          </ScrollView>
        </View>
      </SlideUpModal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  scroll: { flex: 1 },
  scrollContent: { padding: T.space.lg, paddingBottom: T.space.xxl },
  heading: { fontSize: T.fontSize.xl, fontWeight: '700', marginBottom: T.space.md, color: T.primary },
  fieldLabel: { fontSize: T.fontSize.sm, fontWeight: '500', marginTop: T.space.md, marginBottom: T.space.xs, color: T.primary },
  fieldGap: { marginTop: T.space.md },
  btnRow: { marginTop: T.space.md },
  empty: { color: T.muted, marginTop: T.space.sm },
  setRow: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.border, paddingVertical: T.space.sm },
  setMeta: { flexDirection: 'row', alignItems: 'flex-start', gap: T.space.sm },
  setInfo: { flex: 1 },
  setNum: { fontWeight: '700', fontSize: T.fontSize.md - 1, marginTop: 1, color: T.accent },
  setExName: { fontSize: T.fontSize.md - 1, fontWeight: '500', color: T.primary },
  setSub: { fontSize: T.fontSize.xs, marginTop: T.space.xs, color: T.muted },
  setActions: { flexDirection: 'row', gap: T.space.sm, marginTop: T.space.xs + 2 },
  rowBtn: { paddingHorizontal: T.space.sm, paddingVertical: T.space.xs + 1, borderRadius: T.radius.sm, backgroundColor: T.accentBg },
  rowBtnDanger: { backgroundColor: T.dangerBg },
  rowBtnText: { fontSize: T.fontSize.sm, fontWeight: '500', color: T.accent },
  endSection: { marginTop: T.space.xxl, paddingTop: T.space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.border },
  modalBox: {
    backgroundColor: T.surface,
    borderTopLeftRadius: T.radius.lg,
    borderTopRightRadius: T.radius.lg,
    padding: T.space.xl,
    maxHeight: '85%',
  },
  modalTitle: { fontSize: T.fontSize.lg, fontWeight: '700', marginBottom: T.space.sm, color: T.primary },
  modalBtns: { flexDirection: 'row', gap: T.space.sm, marginTop: T.space.md },
  modalBtnFlex: { flex: 1 },
});
