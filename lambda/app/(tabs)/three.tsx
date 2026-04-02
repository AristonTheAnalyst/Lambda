import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Keyboard,
  ScrollView,
} from 'react-native';
import SlidePages from '@/components/SlidePages';
import { useSlidePages } from '@/hooks/useSlidePages';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { useSQLiteContext } from 'expo-sqlite';
import PageHeader from '@/components/PageHeader';
import SyncStatusIcon from '@/components/SyncStatusIcon';
import Button from '@/components/Button';
import Input from '@/components/Input';
import NotesField from '@/components/NotesField';
import { DropdownSelect, SegmentedControl, SlideUpModal } from '@/components/FormControls';
import { useExerciseData } from '@/lib/ExerciseDataContext';
import { createExercise, findExerciseByName, reactivateExercise } from '@/lib/offline/exerciseStore';
import { useAuthContext } from '@/lib/AuthContext';
import { useSyncContext } from '@/lib/sync/syncContext';
import { getRemap } from '@/lib/db/idRemap';
import { createWorkout, endWorkout, cancelWorkout, getActiveWorkoutId } from '@/lib/offline/workoutStore';
import { getExerciseDefault, saveExerciseDefault } from '@/lib/offline/exerciseDefaultsStore';
import { insertSet, updateSet, deleteSet, loadSetsForWorkout, WorkoutSet } from '@/lib/offline/setStore';
import GlassButton from '@/components/GlassButton';
import { useAsyncGuard } from '@/lib/asyncGuard';
import T from '@/constants/Theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseValues(str: string): number[] {
  return str.split(',').map((v) => parseInt(v.trim(), 10)).filter((n) => !isNaN(n));
}

function formatValues(arr: number[] | null): string {
  if (!arr || arr.length === 0) return '—';
  return arr.join(', ');
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WorkoutLogScreen() {
  const db = useSQLiteContext();
  const guard = useAsyncGuard();
  const { user } = useAuthContext();
  const { exercises, exerciseDetailMap, refreshExercises } = useExerciseData();
  const { lastSyncAt } = useSyncContext();

  const [currentWorkoutId, setCurrentWorkoutId] = useState<number | null>(null);
  const [startNotes, setStartNotes]   = useState('');
  const [endNotes, setEndNotes]       = useState('');
  const [startLoading, setStartLoading] = useState(false);
  const [endLoading, setEndLoading]   = useState(false);

  const slidePages = useSlidePages();


  const [selectedExId, setSelectedExId]     = useState<number | null>(null);
  const selectedEx = selectedExId ? (exerciseDetailMap[selectedExId] ?? null) : null;
  const [weight, setWeight]                 = useState('');
  const [repsOrDuration, setRepsOrDuration] = useState('');
  const [setNotes, setSetNotes]             = useState('');
  const [selectedVarId, setSelectedVarId]   = useState<number | null>(null);
  const [logLoading, setLogLoading]         = useState(false);
  const [logSetModalVisible, setLogSetModalVisible] = useState(false);

  const [newExVisible, setNewExVisible]   = useState(false);
  const [newExName, setNewExName]         = useState('');
  const [newExVolume, setNewExVolume]     = useState<'reps' | 'duration'>('reps');
  const [newExCreating, setNewExCreating] = useState(false);

  const [sets, setSets]               = useState<WorkoutSet[]>([]);
  const [setsLoading, setSetsLoading] = useState(false);

  const [editingSet, setEditingSet]         = useState<WorkoutSet | null>(null);
  const [editExId, setEditExId]             = useState<number | null>(null);
  const editEx = editExId ? (exerciseDetailMap[editExId] ?? null) : null;
  const [editWeight, setEditWeight]         = useState('');
  const [editRepsOrDuration, setEditRepsOrDuration] = useState('');
  const [editNotes, setEditNotes]           = useState('');
  const [editVarId, setEditVarId]           = useState<number | null>(null);
  const [editLoading, setEditLoading]       = useState(false);

  // ── Load sets from SQLite ──────────────────────────────────────────────────

  const loadSets = useCallback(async (workoutId: number) => {
    setSetsLoading(true);
    // If the ID is negative (offline), check if sync has remapped it to a server ID
    let id = workoutId;
    if (id < 0) {
      const remap = await getRemap(db, id);
      if (remap) {
        id = remap.serverId;
        setCurrentWorkoutId(id);
      }
    }
    const data = await loadSetsForWorkout(db, id);
    setSetsLoading(false);
    setSets(data);
  }, [db]);

  // ── Restore active workout on mount ───────────────────────────────────────

  useEffect(() => {
    (async () => {
      const activeId = await getActiveWorkoutId(db);
      if (activeId !== null) {
        setCurrentWorkoutId(activeId);
        slidePages.resetToPage(1);
        loadSets(activeId);
      }
    })();
  }, [db]);

  // ── Re-check after sync (ID may have changed from local to server) ─────────

  useEffect(() => {
    if (!lastSyncAt || currentWorkoutId == null || currentWorkoutId >= 0) return;
    (async () => {
      const remap = await getRemap(db, currentWorkoutId);
      if (remap) {
        setCurrentWorkoutId(remap.serverId);
        loadSets(remap.serverId);
      }
    })();
  }, [lastSyncAt]);

  async function onSelectExercise(exId: number | null) {
    setSelectedExId(exId);
    setSelectedVarId(null);
    setWeight('');
    setRepsOrDuration('');
    setSetNotes('');
    if (exId !== null) {
      const defaults = await getExerciseDefault(db, exId);
      if (defaults) {
        setWeight(defaults.last_weight_kg != null ? String(defaults.last_weight_kg) : '');
        setSelectedVarId(defaults.last_variation_id);
      }
    }
  }

  function openNewExercise() {
    setNewExName('');
    setNewExVolume('reps');
    setNewExVisible(true);
  }

  function createNewExercise() { return guard(async () => {
    const name = newExName.trim();
    if (!name) return Alert.alert('Enter a name');
    setNewExCreating(true);
    const existing = await findExerciseByName(db, name);
    let localId: number;
    if (existing) {
      if (existing.is_active) {
        setNewExCreating(false);
        return Alert.alert('Already exists', `"${name}" already exists.`);
      }
      await reactivateExercise(db, existing.custom_exercise_id);
      localId = existing.custom_exercise_id;
    } else {
      localId = await createExercise(db, { exercise_name: name, exercise_volume_type: newExVolume, exercise_intensity_type: 'weight' });
    }
    await refreshExercises();
    setNewExCreating(false);
    setNewExVisible(false);
    onSelectExercise(localId);
  }); }

  // ── Start workout ──────────────────────────────────────────────────────────

  function startWorkout(notesOverride?: string) { return guard(async () => {
    if (!user) return;
    setStartLoading(true);
    const localId = await createWorkout(db, user.id, notesOverride ?? startNotes);
    setStartLoading(false);
    setCurrentWorkoutId(localId);
    setStartNotes('');
    setSets([]);
    slidePages.slideIn();
  }); }

  // ── End workout ────────────────────────────────────────────────────────────

  function confirmCancelWorkout() {
    Alert.alert('Cancel Workout', 'Discard this workout and all logged sets?', [
      { text: 'Discard', style: 'destructive', onPress: () => guard(async () => {
        if (!currentWorkoutId) return;
        await cancelWorkout(db, currentWorkoutId);
        slidePages.slideOut();
        setCurrentWorkoutId(null);
        setEndNotes('');
        setSets([]);
        setSelectedExId(null);
        setWeight('');
        setRepsOrDuration('');
        setSetNotes('');
        setSelectedVarId(null);
      })},
      { text: 'Keep Going' },
    ]);
  }

  function confirmEndWorkout() {
    Alert.alert('End Workout', 'Are you sure you want to end this workout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End Workout', style: 'destructive', onPress: doEndWorkout },
    ]);
  }

  function doEndWorkout() { return guard(async () => {
    if (!currentWorkoutId) return;
    setEndLoading(true);
    await endWorkout(db, currentWorkoutId, endNotes);
    setEndLoading(false);
    slidePages.slideOut();
    setCurrentWorkoutId(null);
    setEndNotes('');
    setSets([]);
    setSelectedExId(null);
    setWeight('');
    setRepsOrDuration('');
    setSetNotes('');
    setSelectedVarId(null);
    Alert.alert('Workout saved!');
  }); }

  // ── Log set ────────────────────────────────────────────────────────────────

  function logSet() { return guard(async () => {
    if (!currentWorkoutId || !selectedExId || !selectedEx) return Alert.alert('Select an exercise first');
    const hint = selectedEx.exercise_volume_type === 'reps' ? 'Enter reps (e.g. 10,8,6)' : 'Enter duration in seconds (e.g. 60,45)';
    if (!repsOrDuration.trim()) return Alert.alert(hint);
    const values = parseValues(repsOrDuration);
    if (values.length === 0) return Alert.alert(hint);
    const isReps = selectedEx.exercise_volume_type === 'reps';
    const nextSetNum = sets.length > 0 ? Math.max(...sets.map((s) => s.workout_set_number)) + 1 : 1;

    setLogLoading(true);
    await insertSet(db, {
      user_workout_id: currentWorkoutId,
      custom_exercise_id: selectedExId,
      custom_variation_id: selectedVarId,
      workout_set_number: nextSetNum,
      workout_set_weight: weight ? parseFloat(weight) : null,
      workout_set_reps: isReps ? values : [],
      workout_set_duration_seconds: !isReps ? values : [],
      workout_set_notes: setNotes.trim() || null,
    });
    await saveExerciseDefault(db, selectedExId, weight ? parseFloat(weight) : null, selectedVarId);
    setLogLoading(false);
    setLogSetModalVisible(false);
    setRepsOrDuration('');
    setSetNotes('');
    loadSets(currentWorkoutId);
  }); }

  // ── Edit set ───────────────────────────────────────────────────────────────

  function openEditSet(s: WorkoutSet) { return guard(async () => {
    Keyboard.dismiss();
    setEditingSet(s);
    setEditExId(s.custom_exercise_id);
    setEditWeight(s.workout_set_weight != null ? String(s.workout_set_weight) : '');
    const vals = s.workout_set_reps?.length ? s.workout_set_reps : s.workout_set_duration_seconds ?? [];
    setEditRepsOrDuration(vals.join(','));
    setEditNotes(s.workout_set_notes ?? '');
    setEditVarId(s.custom_variation_id);
  }); }

  function onEditExerciseChange(exId: number | null) {
    setEditExId(exId);
    setEditVarId(null);
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
    if (currentWorkoutId) loadSets(currentWorkoutId);
  }); }

  function handleDeleteSet(setId: number) {
    Alert.alert('Delete Set', 'Remove this set?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => guard(async () => {
        await deleteSet(db, setId);
        if (currentWorkoutId) loadSets(currentWorkoutId);
      })},
    ]);
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <YStack flex={1} backgroundColor={T.bg}>
      <PageHeader title="Training Session" right={<SyncStatusIcon />} />

      <SlidePages controller={slidePages}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: T.space.lg, paddingBottom: T.space.xxl }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
        >
          <YStack gap={T.space.md}>
            <Text fontSize={T.fontSize.xl} fontWeight="700" color={T.primary}>Start a Workout</Text>
            <NotesField
              label="Pre-workout notes (optional)"
              value={startNotes}
              onChange={setStartNotes}
              confirmLabel="Start Workout"
              onConfirm={(notes) => startWorkout(notes)}
            />
            <Button label="Start Workout" onPress={() => startWorkout()} loading={startLoading} />
          </YStack>
        </ScrollView>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: T.space.lg, paddingBottom: T.space.xxl }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
        >
          {/* ── Sets table ── */}
          <XStack alignItems="center" marginBottom={T.space.sm}>
            <Text fontSize={T.fontSize.xl} fontWeight="700" color={T.primary} flex={1}>Sets this workout</Text>
            <GlassButton icon="plus" label="Log Set" onPress={() => setLogSetModalVisible(true)} />
          </XStack>
          {setsLoading ? (
            <Spinner size="large" color={T.accent} marginTop={T.space.md} />
          ) : sets.length === 0 ? (
            <Text color={T.muted} marginTop={T.space.sm}>No sets logged yet.</Text>
          ) : (
            sets.map((s) => {
              const exName = exerciseDetailMap[s.custom_exercise_id]?.exercise_name ?? `#${s.custom_exercise_id}`;
              const varName = s.custom_variation_id
                ? exerciseDetailMap[s.custom_exercise_id]?.assigned_variations.find((v) => v.custom_variation_id === s.custom_variation_id)?.variation_name
                : null;
              const repsStr = s.workout_set_reps?.length
                ? `${formatValues(s.workout_set_reps)} reps`
                : s.workout_set_duration_seconds?.length ? `${formatValues(s.workout_set_duration_seconds)}s` : '—';
              return (
                <XStack key={s.workout_set_id} borderBottomWidth={0.5} borderBottomColor={T.border} paddingVertical={T.space.sm} alignItems="center" gap={T.space.sm}>
                  <Text fontWeight="700" fontSize={15} color={T.accent}>#{s.workout_set_number}</Text>
                  <YStack flex={1}>
                    <XStack alignItems="flex-end" gap={T.space.sm}>
                      <Text fontSize={15} fontWeight="500" color={T.primary}>{exName}</Text>
                      {varName && <Text fontSize={T.fontSize.sm} color={T.muted}>{varName}</Text>}
                    </XStack>
                    <Text fontSize={T.fontSize.xs} marginTop={T.space.xs} color={T.muted}>
                      {s.workout_set_weight != null ? `${s.workout_set_weight}kg · ` : ''}{repsStr}
                      {s.workout_set_notes ? <Text fontSize={T.fontSize.xs} color={T.muted} fontStyle="italic">{` · "${s.workout_set_notes}"`}</Text> : ''}
                    </Text>
                  </YStack>
                  <XStack gap={T.space.sm}>
                    <GlassButton icon="pencil" iconSize={14} onPress={() => openEditSet(s)} />
                    <GlassButton icon="trash" iconSize={14} color={T.danger} onPress={() => handleDeleteSet(s.workout_set_id)} />
                  </XStack>
                </XStack>
              );
            })
          )}

          {/* ── End workout ── */}
          <YStack marginTop={T.space.xxl} paddingTop={T.space.lg} gap={T.space.md}>
            <NotesField label="Post-workout notes (optional)" value={endNotes} onChange={setEndNotes} />
            <XStack justifyContent="center">
              <XStack gap={T.space.sm}>
                <Button label="Cancel Workout" onPress={confirmCancelWorkout} variant="danger-ghost" />
                <Button label="End Workout" onPress={confirmEndWorkout} loading={endLoading} />
              </XStack>
            </XStack>
          </YStack>
        </ScrollView>
      </SlidePages>

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
                      searchable
                      onCreateNew={openNewExercise}
                      createNewLabel="New Exercise"
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

      {/* ── New Exercise Modal ── */}
      <SlideUpModal visible={newExVisible} onClose={() => setNewExVisible(false)}>
        <YStack flex={1}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: T.space.xl, paddingBottom: T.space.xxl }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <YStack gap={T.space.md}>
              <Text fontSize={T.fontSize.lg} fontWeight="700" color={T.primary}>New Exercise</Text>
              <Input
                label="Name"
                value={newExName}
                onChangeText={setNewExName}
                placeholder="e.g. Pull-up"
                autoCapitalize="words"
              />
              <YStack gap={T.space.xs}>
                <Text fontSize={T.fontSize.sm} fontWeight="500" color={T.primary}>Volume type</Text>
                <SegmentedControl
                  options={[{ label: 'Reps', value: 'reps' }, { label: 'Duration', value: 'duration' }]}
                  value={newExVolume}
                  onChange={setNewExVolume}
                />
              </YStack>
            </YStack>
          </ScrollView>
          <XStack gap={T.space.sm} padding={T.space.xl} paddingTop={T.space.sm} justifyContent="center">
            <Button label="Cancel" onPress={() => setNewExVisible(false)} variant="danger-ghost" />
            <Button label="Create" onPress={createNewExercise} loading={newExCreating} />
          </XStack>
        </YStack>
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
                    onChange={onEditExerciseChange}
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
