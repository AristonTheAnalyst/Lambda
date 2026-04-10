import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, Keyboard, ScrollView, useWindowDimensions } from 'react-native';
import SlidePages from '@/components/SlidePages';
import { useSlidePages } from '@/hooks/useSlidePages';
import { Separator, Text, XStack, YStack } from 'tamagui';
import WorkoutLogStickyFooter from '@/components/workout/WorkoutLogStickyFooter';
import WorkoutSetsList from '@/components/workout/WorkoutSetsList';
import { useSQLiteContext } from 'expo-sqlite';
import PageHeader from '@/components/PageHeader';
import SyncStatusIcon from '@/components/SyncStatusIcon';
import Button from '@/components/Button';
import Input from '@/components/Input';
import NotesField from '@/components/NotesField';
import { DropdownSelect, SegmentedControl, SlideUpModal } from '@/components/FormControls';
import { useExerciseData } from '@/lib/ExerciseDataContext';
import { createExercise, findExerciseByName, reactivateExercise } from '@/lib/offline/exerciseStore';
import { createVariation, findVariationByName, reactivateVariation } from '@/lib/offline/variationStore';
import { addBridgeRow } from '@/lib/offline/bridgeStore';
import { useAuthContext } from '@/lib/AuthContext';
import { createWorkout, endWorkout, cancelWorkout, getActiveWorkoutId } from '@/lib/offline/workoutStore';
import { getExerciseDefault, saveExerciseDefault } from '@/lib/offline/exerciseDefaultsStore';
import { insertSet, updateSet, deleteSet, loadSetsForWorkout, WorkoutSet } from '@/lib/offline/setStore';
import GlassButton from '@/components/GlassButton';
import { useAsyncGuard } from '@/lib/asyncGuard';
import { useAppTheme } from '@/lib/ThemeContext';
import { parseValues } from '@/lib/workoutSetFormat';

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WorkoutLogScreen() {
  const { colors, space, radius, fontSize } = useAppTheme();
  const db = useSQLiteContext();
  const guard = useAsyncGuard();
  const { height: windowHeight } = useWindowDimensions();
  const { user } = useAuthContext();
  const { exercises, variations, exerciseDetailMap, refreshExercises, refreshVariations, refreshExerciseDetails } = useExerciseData();
  // ── Workout state ──────────────────────────────────────────────────────────

  const [currentWorkoutId, setCurrentWorkoutId] = useState<string | null>(null);
  const [sets, setSets]               = useState<WorkoutSet[]>([]);
  const [setsLoading, setSetsLoading] = useState(false);
  const [startNotes, setStartNotes]   = useState('');
  const [endNotes, setEndNotes]             = useState('');
  const [endWorkoutModalVisible, setEndWorkoutModalVisible] = useState(false);
  const [startLoading, setStartLoading]     = useState(false);
  const [endLoading, setEndLoading]         = useState(false);

  const slidePages = useSlidePages();

  // ── Log set form state ─────────────────────────────────────────────────────

  const [logSetModalVisible, setLogSetModalVisible] = useState(false);
  const [selectedExId, setSelectedExId]   = useState<string | null>(null);
  const [selectedVarId, setSelectedVarId] = useState<string | null>(null);
  const [weight, setWeight]               = useState('');
  const [repsOrDuration, setRepsOrDuration] = useState('');
  const [setNotes, setSetNotes]           = useState('');
  const [logLoading, setLogLoading]       = useState(false);

  const selectedEx = selectedExId ? (exerciseDetailMap[selectedExId] ?? null) : null;

  // ── Edit set form state ────────────────────────────────────────────────────

  const [editingSet, setEditingSet]   = useState<WorkoutSet | null>(null);
  const [editExId, setEditExId]       = useState<string | null>(null);
  const [editVarId, setEditVarId]     = useState<string | null>(null);
  const [editWeight, setEditWeight]   = useState('');
  const [editRepsOrDuration, setEditRepsOrDuration] = useState('');
  const [editNotes, setEditNotes]     = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const editEx = editExId ? (exerciseDetailMap[editExId] ?? null) : null;

  // ── View mode ──────────────────────────────────────────────────────────────

  const [viewMode, setViewMode] = useState<'grouped' | 'chrono'>('grouped');

  // ── New exercise modal state ───────────────────────────────────────────────

  const [newExVisible, setNewExVisible]   = useState(false);
  const [newExForEdit, setNewExForEdit]   = useState(false);
  const [newExName, setNewExName]         = useState('');
  const [newExVolume, setNewExVolume]     = useState<'reps' | 'duration'>('reps');
  const [newExCreating, setNewExCreating] = useState(false);

  // ── Assign + new variation state ───────────────────────────────────────────

  const [assignVarVisible, setAssignVarVisible] = useState(false);
  const [assignVarForEdit, setAssignVarForEdit] = useState(false);
  const [newVarVisible, setNewVarVisible]       = useState(false);
  const [newVarForEdit, setNewVarForEdit]       = useState(false);
  const [newVarName, setNewVarName]             = useState('');
  const [newVarCreating, setNewVarCreating]     = useState(false);

  // ─── Derived / memoized options ───────────────────────────────────────────

  const exerciseOptions = useMemo(
    () => exercises.map((ex) => ({ label: ex.exercise_name, value: ex.custom_exercise_id })),
    [exercises]
  );

  const logVarOptions = useMemo(() => [
    { label: 'None', value: null as string | null },
    ...(selectedEx?.assigned_variations ?? []).map((v) => ({ label: v.variation_name, value: v.custom_variation_id as string | null })),
  ], [selectedEx]);

  const editVarOptions = useMemo(() => [
    { label: 'None', value: null as string | null },
    ...(editEx?.assigned_variations ?? []).map((v) => ({ label: v.variation_name, value: v.custom_variation_id as string | null })),
  ], [editEx]);

  // ── Workout state helper ───────────────────────────────────────────────────

  function clearLogForm() {
    setSelectedExId(null);
    setSelectedVarId(null);
    setWeight('');
    setRepsOrDuration('');
    setSetNotes('');
  }

  // ── Load sets from SQLite ──────────────────────────────────────────────────

  const loadSets = useCallback(async (workoutId: string) => {
    setSetsLoading(true);
    const data = await loadSetsForWorkout(db, workoutId);
    setSets(data);
    setSetsLoading(false);
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

  // ── Exercise selection ─────────────────────────────────────────────────────

  const onSelectExercise = useCallback(async (exId: string | null) => {
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
  }, [db]);

  // ── Assign variation sheet ─────────────────────────────────────────────────

  function openAssignVar(forEdit: boolean) {
    setAssignVarForEdit(forEdit);
    setAssignVarVisible(true);
  }

  async function pickUnassignedVar(varId: string) {
    const exId = assignVarForEdit ? editExId : selectedExId;
    if (exId !== null) {
      await addBridgeRow(db, user!.id, exId, varId);
      await refreshExerciseDetails();
    }
    setAssignVarVisible(false);
    if (assignVarForEdit) setEditVarId(varId);
    else setSelectedVarId(varId);
  }

  // ── New variation ──────────────────────────────────────────────────────────

  function openNewVariation(forEdit: boolean) {
    setAssignVarVisible(false);
    setNewVarName('');
    setNewVarForEdit(forEdit);
    setNewVarVisible(true);
  }

  function createNewVariation() { return guard(async () => {
    const name = newVarName.trim();
    if (!name) return Alert.alert('Enter a name');
    setNewVarCreating(true);
    const existing = await findVariationByName(db, name);
    let localId: string;
    if (existing) {
      if (existing.is_active) { setNewVarCreating(false); return Alert.alert('Already exists', `"${name}" already exists.`); }
      await reactivateVariation(db, existing.custom_variation_id);
      localId = existing.custom_variation_id;
    } else {
      localId = await createVariation(db, user!.id, name);
    }
    const exId = newVarForEdit ? editExId : selectedExId;
    if (exId !== null) await addBridgeRow(db, user!.id, exId, localId);
    await refreshVariations();
    await refreshExerciseDetails();
    setNewVarCreating(false);
    setNewVarVisible(false);
    if (newVarForEdit) setEditVarId(localId);
    else setSelectedVarId(localId);
  }); }

  // ── New exercise ───────────────────────────────────────────────────────────

  function openNewExercise(forEdit = false) {
    setNewExForEdit(forEdit);
    setNewExName('');
    setNewExVolume('reps');
    setNewExVisible(true);
  }

  function createNewExercise() { return guard(async () => {
    const name = newExName.trim();
    if (!name) return Alert.alert('Enter a name');
    setNewExCreating(true);
    const existing = await findExerciseByName(db, name);
    let localId: string;
    if (existing) {
      if (existing.is_active) { setNewExCreating(false); return Alert.alert('Already exists', `"${name}" already exists.`); }
      await reactivateExercise(db, existing.custom_exercise_id, newExVolume);
      localId = existing.custom_exercise_id;
    } else {
      localId = await createExercise(db, user!.id, name, newExVolume);
    }
    await refreshExercises();
    await refreshExerciseDetails();
    setNewExCreating(false);
    setNewExVisible(false);
    if (newExForEdit) {
      setEditExId(localId);
      setEditVarId(null);
    } else {
      onSelectExercise(localId);
    }
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

  // ── End / cancel workout ───────────────────────────────────────────────────

  function confirmCancelWorkout() {
    Alert.alert('Cancel Workout', 'Discard this workout and all logged sets?', [
      { text: 'Discard', style: 'destructive', onPress: () => guard(async () => {
        if (!currentWorkoutId) return;
        await cancelWorkout(db, currentWorkoutId);
        slidePages.slideOut();
        setCurrentWorkoutId(null);
        setEndNotes('');
        setSets([]);
        clearLogForm();
      })},
      { text: 'Keep Going' },
    ]);
  }

  function doEndWorkout() { return guard(async () => {
    if (!currentWorkoutId) return;
    setEndLoading(true);
    await endWorkout(db, currentWorkoutId, endNotes);
    setEndLoading(false);
    setEndWorkoutModalVisible(false);
    slidePages.slideOut();
    setCurrentWorkoutId(null);
    setEndNotes('');
    setSets([]);
    clearLogForm();
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

  const openEditSet = useCallback((s: WorkoutSet) => {
    Keyboard.dismiss();
    setEditingSet(s);
    setEditExId(s.custom_exercise_id);
    setEditWeight(s.workout_set_weight != null ? String(s.workout_set_weight) : '');
    const vals = s.workout_set_reps?.length ? s.workout_set_reps : s.workout_set_duration_seconds ?? [];
    setEditRepsOrDuration(vals.join(','));
    setEditNotes(s.workout_set_notes ?? '');
    setEditVarId(s.custom_variation_id);
  }, []);

  function onEditExerciseChange(exId: string | null) {
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


  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <YStack flex={1} backgroundColor={colors.bg}>
      <PageHeader
        title="Training Session"
        left={currentWorkoutId !== null ? (
          <XStack
            borderRadius={999}
            paddingVertical={4}
            paddingHorizontal={space.sm}
            borderWidth={1}
            borderColor={colors.danger}
            pressStyle={{ opacity: 0.7 }}
            onPress={confirmCancelWorkout}
            cursor="pointer"
            alignItems="center"
          >
            <Text color={colors.danger} fontSize={fontSize.sm} fontWeight="600" numberOfLines={1}>Cancel</Text>
          </XStack>
        ) : undefined}
        right={currentWorkoutId !== null ? (
          <XStack
            borderRadius={999}
            paddingVertical={4}
            paddingHorizontal={space.md}
            borderWidth={1}
            borderColor={colors.accent}
            pressStyle={{ opacity: 0.7 }}
            onPress={() => setEndWorkoutModalVisible(true)}
            cursor="pointer"
            alignItems="center"
          >
            <Text color={colors.accent} fontSize={fontSize.sm} fontWeight="600" numberOfLines={1}>End</Text>
          </XStack>
        ) : undefined}
      />

      <SlidePages controller={slidePages}>
        {/* ── Page 0: Start ── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
        >
          <YStack gap={space.md}>
            <Text fontSize={fontSize.xl} fontWeight="700" color={colors.primary}>Start a Workout</Text>
            {exercises.length === 0 ? (
              <YStack
                backgroundColor={colors.surface}
                borderRadius={radius.md}
                padding={space.lg}
                gap={space.sm}
                alignItems="center"
              >
                <Text fontSize={fontSize.md} color={colors.primary} fontWeight="600" textAlign="center">No exercises set up yet</Text>
                <Text fontSize={fontSize.sm} color={colors.muted} textAlign="center">
                  Go to Exercises → Library to create your first exercise before logging a workout.
                </Text>
              </YStack>
            ) : (
              <>
                <NotesField
                  label="Pre-workout notes (optional)"
                  value={startNotes}
                  onChange={setStartNotes}
                  confirmLabel="Start Workout"
                  onConfirm={(notes) => startWorkout(notes)}
                />
                <Button label="Start Workout" onPress={() => startWorkout()} loading={startLoading} />
              </>
            )}
          </YStack>
        </ScrollView>

        {/* ── Page 1: Active workout ── */}
        <YStack flex={1}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: space.lg, paddingBottom: space.md }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={true}
          >
            <WorkoutSetsList
              sets={sets}
              exerciseDetailMap={exerciseDetailMap}
              setsLoading={setsLoading}
              viewMode={viewMode}
              onToggleViewMode={() => setViewMode((v) => (v === 'grouped' ? 'chrono' : 'grouped'))}
              onEditSet={openEditSet}
              allowViewModeToggle
              interactive
              title={(
                <Text fontSize={fontSize.xl} fontWeight="700" color={colors.primary} flex={1}>
                  Sets{' '}
                  <Text fontSize={fontSize.sm} fontWeight="400" color={colors.muted}>
                    ({viewMode === 'grouped' ? 'grouped' : 'full'})
                  </Text>
                </Text>
              )}
            />
          </ScrollView>

          <WorkoutLogStickyFooter onLogSet={() => setLogSetModalVisible(true)} />
        </YStack>
      </SlidePages>

      {/* ── Sync indicator — bottom right overlay ── */}
      <YStack
        position="absolute"
        bottom={80}
        right={space.lg}
        pointerEvents="none"
      >
        <SyncStatusIcon />
      </YStack>

      {/* ── End Workout Modal ── */}
      <SlideUpModal visible={endWorkoutModalVisible} onClose={() => setEndWorkoutModalVisible(false)} fitContent keyboardAware>
        <YStack padding={space.xl} gap={space.md}>
          <Text fontSize={fontSize.lg} fontWeight="700" color={colors.primary}>End Workout</Text>
          <NotesField label="Post-workout notes (optional)" value={endNotes} onChange={setEndNotes} />
          <XStack gap={space.sm} justifyContent="center">
            <Button label="Cancel" onPress={() => setEndWorkoutModalVisible(false)} variant="danger-ghost" />
            <Button label="End Workout" onPress={doEndWorkout} loading={endLoading} />
          </XStack>
          <YStack height={windowHeight * 0.15} />
        </YStack>
      </SlideUpModal>

      {/* ── Log Set Modal ── */}
      <SlideUpModal visible={logSetModalVisible} onClose={() => setLogSetModalVisible(false)} fitContent keyboardAware>
        <YStack padding={space.xl} gap={space.md}>
          <Text fontSize={fontSize.lg} fontWeight="700" color={colors.primary}>Log Set</Text>
          <XStack gap={space.sm} alignItems="flex-end">
            <YStack flex={3}>
              <Text fontSize={fontSize.sm} fontWeight="500" marginBottom={space.xs} color={colors.primary}>Exercise</Text>
              <DropdownSelect
                options={exerciseOptions}
                value={selectedExId}
                onChange={onSelectExercise}
                placeholder="Select exercise…"
                searchable
                onCreateNew={() => openNewExercise(false)}
                createNewLabel="New Exercise"
              />
            </YStack>
            {selectedEx && (
              <YStack flex={2}>
                <Text fontSize={fontSize.sm} fontWeight="500" marginBottom={space.xs} color={colors.primary}>Variation</Text>
                <DropdownSelect
                  options={logVarOptions}
                  value={selectedVarId}
                  onChange={setSelectedVarId}
                  placeholder="None"
                  onCreateNew={() => openAssignVar(false)}
                  createNewLabel="Assign New Variations"
                />
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
          <XStack gap={space.sm} justifyContent="center">
            <Button label="Cancel" onPress={() => setLogSetModalVisible(false)} variant="danger-ghost" />
            <Button label="Log Set" onPress={logSet} loading={logLoading} />
          </XStack>
          <YStack height={windowHeight * 0.15} />
        </YStack>
      </SlideUpModal>

      {/* ── Edit Set Modal ── */}
      <SlideUpModal visible={!!editingSet} onClose={() => setEditingSet(null)} fitContent keyboardAware>
        <YStack padding={space.xl} gap={space.md}>
          <XStack alignItems="center">
            <Text fontSize={fontSize.lg} fontWeight="700" color={colors.primary} flex={1}>Edit Set</Text>
            <GlassButton icon="trash" iconSize={14} color={colors.danger} onPress={() => {
              if (!editingSet) return;
              const id = editingSet.workout_set_id;
              Alert.alert('Delete Set', 'Remove this set?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => guard(async () => {
                  setEditingSet(null);
                  await deleteSet(db, id);
                  if (currentWorkoutId) loadSets(currentWorkoutId);
                })},
              ]);
            }} />
          </XStack>
          <XStack gap={space.sm} alignItems="flex-end">
            <YStack flex={3}>
              <Text fontSize={fontSize.sm} fontWeight="500" marginBottom={space.xs} color={colors.primary}>Exercise</Text>
              <DropdownSelect
                options={exerciseOptions}
                value={editExId}
                onChange={onEditExerciseChange}
                placeholder="Select exercise…"
                searchable
                onCreateNew={() => openNewExercise(true)}
                createNewLabel="New Exercise"
              />
            </YStack>
            {editEx && (
              <YStack flex={2}>
                <Text fontSize={fontSize.sm} fontWeight="500" marginBottom={space.xs} color={colors.primary}>Variation</Text>
                <DropdownSelect
                  options={editVarOptions}
                  value={editVarId}
                  onChange={setEditVarId}
                  placeholder="None"
                  onCreateNew={() => openAssignVar(true)}
                  createNewLabel="Assign New Variations"
                />
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
          <XStack gap={space.sm} justifyContent="center">
            <Button label="Cancel" onPress={() => setEditingSet(null)} variant="danger-ghost" />
            <Button label="Save" onPress={saveEditSet} loading={editLoading} />
          </XStack>
          <YStack height={windowHeight * 0.15} />
        </YStack>
      </SlideUpModal>

      {/* ── Secondary sheets — rendered after primary modals so they stack above them ── */}

      {/* ── New Exercise Modal ── */}
      <SlideUpModal visible={newExVisible} onClose={() => setNewExVisible(false)} zIndex={200_000} fitContent keyboardAware>
        <YStack padding={space.xl} gap={space.md}>
          <Text fontSize={fontSize.lg} fontWeight="700" color={colors.primary}>New Exercise</Text>
          <Input placeholder="Exercise name" value={newExName} onChangeText={setNewExName} autoCapitalize="words" />
          <YStack gap={space.xs}>
            <Text fontSize={fontSize.sm} fontWeight="500" color={colors.primary}>Volume type</Text>
            <SegmentedControl
              options={[{ label: 'Reps', value: 'reps' }, { label: 'Duration', value: 'duration' }]}
              value={newExVolume}
              onChange={setNewExVolume}
            />
          </YStack>
          <XStack gap={space.sm} justifyContent="center">
            <Button label="Cancel" onPress={() => setNewExVisible(false)} variant="danger-ghost" />
            <Button label="Create" onPress={createNewExercise} loading={newExCreating} />
          </XStack>
          <YStack height={windowHeight * 0.15} />
        </YStack>
      </SlideUpModal>

      {/* ── Assign Variations Sheet ── */}
      <SlideUpModal visible={assignVarVisible} onClose={() => setAssignVarVisible(false)} zIndex={200_000} fitContent>
        <YStack padding={space.xl} gap={space.md}>
          <Text fontSize={fontSize.lg} fontWeight="700" color={colors.primary}>Assign New Variations</Text>
          <XStack
            pressStyle={{ opacity: 0.7 }}
            onPress={() => openNewVariation(assignVarForEdit)}
            cursor="pointer"
          >
            <Text fontSize={fontSize.md} color={colors.accent} fontWeight="500">+ New Variation</Text>
          </XStack>
          <Separator borderColor={colors.border} />
          {(() => {
            const exId = assignVarForEdit ? editExId : selectedExId;
            const assignedIds = new Set(exerciseDetailMap[exId ?? -1]?.assigned_variations.map((v) => v.custom_variation_id) ?? []);
            const unassigned = variations.filter((v) => !assignedIds.has(v.custom_variation_id));
            if (unassigned.length === 0) return (
              <Text color={colors.muted} fontSize={fontSize.sm}>
                No existing variations to assign.
              </Text>
            );
            return unassigned.map((v) => (
              <XStack
                key={v.custom_variation_id}
                paddingVertical={space.sm}
                pressStyle={{ opacity: 0.7 }}
                onPress={() => pickUnassignedVar(v.custom_variation_id)}
                cursor="pointer"
                borderTopWidth={0.5}
                borderTopColor={colors.border}
              >
                <Text fontSize={fontSize.md} color={colors.primary}>{v.variation_name}</Text>
              </XStack>
            ));
          })()}
          <YStack height={windowHeight * 0.15} />
        </YStack>
      </SlideUpModal>

      {/* ── New Variation Modal ── */}
      <SlideUpModal visible={newVarVisible} onClose={() => setNewVarVisible(false)} zIndex={200_000} fitContent>
        <YStack padding={space.xl} gap={space.md}>
          <Text fontSize={fontSize.lg} fontWeight="700" color={colors.primary}>New Variation</Text>
          <Input placeholder="Variation name" value={newVarName} onChangeText={setNewVarName} autoCapitalize="words" />
          <XStack gap={space.sm} justifyContent="center">
            <Button label="Cancel" onPress={() => setNewVarVisible(false)} variant="danger-ghost" />
            <Button label="Create" onPress={createNewVariation} loading={newVarCreating} />
          </XStack>
          <YStack height={windowHeight * 0.15} />
        </YStack>
      </SlideUpModal>
    </YStack>
  );
}
