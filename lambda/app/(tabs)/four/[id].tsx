import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Alert, Keyboard, ScrollView, useWindowDimensions } from 'react-native';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Separator } from 'tamagui';
import { useSQLiteContext } from 'expo-sqlite';
import { SlideUpModal, DropdownSelect, SegmentedControl } from '@/components/FormControls';
import Input from '@/components/Input';
import GlassButton from '@/components/GlassButton';
import WorkoutLogStickyFooter from '@/components/workout/WorkoutLogStickyFooter';
import WorkoutSetsList from '@/components/workout/WorkoutSetsList';
import { useExerciseData } from '@/lib/ExerciseDataContext';
import { useAuthContext } from '@/lib/AuthContext';
import { useAsyncGuard } from '@/lib/asyncGuard';
import { createExercise, findExerciseByName, reactivateExercise } from '@/lib/offline/exerciseStore';
import { createVariation, findVariationByName, reactivateVariation } from '@/lib/offline/variationStore';
import { addBridgeRow } from '@/lib/offline/bridgeStore';
import { getExerciseDefault, saveExerciseDefault } from '@/lib/offline/exerciseDefaultsStore';
import { loadWorkout, updateWorkoutNotes, WorkoutRow } from '@/lib/offline/workoutStore';
import { loadSetsForWorkout, insertSet, updateSet, deleteSet, WorkoutSet } from '@/lib/offline/setStore';
import { parseValues } from '@/lib/workoutSetFormat';
import { useAppTheme } from '@/lib/ThemeContext';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function WorkoutDetailScreen() {
  const { colors, space, radius, fontSize } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = id;
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const guard = useAsyncGuard();
  const { user } = useAuthContext();
  const { exercises, variations, exerciseDetailMap, refreshExercises, refreshVariations, refreshExerciseDetails } = useExerciseData();

  const [workout, setWorkout] = useState<WorkoutRow | null>(null);
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [viewMode, setViewMode] = useState<'grouped' | 'chrono'>('grouped');
  const [preNotes, setPreNotes] = useState('');
  const [postNotes, setPostNotes] = useState('');
  const [notesLoading, setNotesLoading] = useState(false);
  const [workoutNotesModalVisible, setWorkoutNotesModalVisible] = useState(false);
  const [draftPre, setDraftPre] = useState('');
  const [draftPost, setDraftPost] = useState('');

  const [logSetModalVisible, setLogSetModalVisible] = useState(false);
  const [selectedExId, setSelectedExId] = useState<string | null>(null);
  const selectedEx = selectedExId ? (exerciseDetailMap[selectedExId] ?? null) : null;
  const [weight, setWeight] = useState('');
  const [repsOrDuration, setRepsOrDuration] = useState('');
  const [setNotes, setSetNotes] = useState('');
  const [selectedVarId, setSelectedVarId] = useState<string | null>(null);
  const [logLoading, setLogLoading] = useState(false);

  const [editingSet, setEditingSet] = useState<WorkoutSet | null>(null);
  const [editExId, setEditExId] = useState<string | null>(null);
  const editEx = editExId ? (exerciseDetailMap[editExId] ?? null) : null;
  const [editWeight, setEditWeight] = useState('');
  const [editRepsOrDuration, setEditRepsOrDuration] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editVarId, setEditVarId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const [newExVisible, setNewExVisible] = useState(false);
  const [newExForEdit, setNewExForEdit] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExVolume, setNewExVolume] = useState<'reps' | 'duration'>('reps');
  const [newExCreating, setNewExCreating] = useState(false);

  const [assignVarVisible, setAssignVarVisible] = useState(false);
  const [assignVarForEdit, setAssignVarForEdit] = useState(false);
  const [newVarVisible, setNewVarVisible] = useState(false);
  const [newVarForEdit, setNewVarForEdit] = useState(false);
  const [newVarName, setNewVarName] = useState('');
  const [newVarCreating, setNewVarCreating] = useState(false);

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

  const dataLoadedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (dataLoadedKeyRef.current === workoutId) return;
    dataLoadedKeyRef.current = workoutId;
    loadData();
  }, [workoutId, loadData]);

  function startEditing() {
    setPreNotes(workout?.user_pre_workout_notes ?? '');
    setPostNotes(workout?.user_post_workout_notes ?? '');
    setEditing(true);
  }

  function openWorkoutNotesModal() {
    setDraftPre(preNotes);
    setDraftPost(postNotes);
    setWorkoutNotesModalVisible(true);
  }

  function applyWorkoutNotesFromModal() {
    setPreNotes(draftPre);
    setPostNotes(draftPost);
    setWorkoutNotesModalVisible(false);
  }

  function cancelEditing() {
    setPreNotes(workout?.user_pre_workout_notes ?? '');
    setPostNotes(workout?.user_post_workout_notes ?? '');
    setEditing(false);
  }

  function saveNotes() {
    return guard(async () => {
      setNotesLoading(true);
      await updateWorkoutNotes(db, workoutId, preNotes, postNotes);
      setNotesLoading(false);
      await loadData();
      setEditing(false);
    });
  }

  const onSelectExercise = useCallback(async (exId: string | null) => {
    setSelectedExId(exId);
    setSelectedVarId(null);
    setRepsOrDuration('');
    setSetNotes('');
    if (exId !== null) {
      const defaults = await getExerciseDefault(db, exId);
      if (defaults) {
        setWeight(defaults.last_weight_kg != null ? String(defaults.last_weight_kg) : '');
        setSelectedVarId(defaults.last_variation_id);
      } else {
        setWeight('');
      }
    }
  }, [db]);

  function openAssignVar(forEdit: boolean) {
    setAssignVarForEdit(forEdit);
    setAssignVarVisible(true);
  }

  async function pickUnassignedVar(varId: string) {
    const exId = assignVarForEdit ? editExId : selectedExId;
    if (exId !== null && user) {
      await addBridgeRow(db, user.id, exId, varId);
      await refreshExerciseDetails();
    }
    setAssignVarVisible(false);
    if (assignVarForEdit) setEditVarId(varId);
    else setSelectedVarId(varId);
  }

  function openNewVariation(forEdit: boolean) {
    setAssignVarVisible(false);
    setNewVarName('');
    setNewVarForEdit(forEdit);
    setNewVarVisible(true);
  }

  function createNewVariation() {
    return guard(async () => {
      if (!user) return;
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
        localId = await createVariation(db, user.id, name);
      }
      const exId = newVarForEdit ? editExId : selectedExId;
      if (exId !== null) await addBridgeRow(db, user.id, exId, localId);
      await refreshVariations();
      await refreshExerciseDetails();
      setNewVarCreating(false);
      setNewVarVisible(false);
      if (newVarForEdit) setEditVarId(localId);
      else setSelectedVarId(localId);
    });
  }

  function openNewExercise(forEdit = false) {
    setNewExForEdit(forEdit);
    setNewExName('');
    setNewExVolume('reps');
    setNewExVisible(true);
  }

  function createNewExercise() {
    return guard(async () => {
      if (!user) return;
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
        localId = await createExercise(db, user.id, name, newExVolume);
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
    });
  }

  function onEditExerciseChange(exId: string | null) {
    setEditExId(exId);
    setEditVarId(null);
  }

  function logSet() {
    return guard(async () => {
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
      await saveExerciseDefault(db, selectedExId, weight ? parseFloat(weight) : null, selectedVarId);
      setLogLoading(false);
      setLogSetModalVisible(false);
      setSelectedExId(null);
      setWeight('');
      setRepsOrDuration('');
      setSetNotes('');
      setSelectedVarId(null);
      loadData();
    });
  }

  function openEditSet(s: WorkoutSet) {
    Keyboard.dismiss();
    setEditingSet(s);
    setEditExId(s.custom_exercise_id);
    setEditWeight(s.workout_set_weight != null ? String(s.workout_set_weight) : '');
    const vals = s.workout_set_reps?.length ? s.workout_set_reps : s.workout_set_duration_seconds ?? [];
    setEditRepsOrDuration(vals.join(','));
    setEditNotes(s.workout_set_notes ?? '');
    setEditVarId(s.custom_variation_id);
  }

  function saveEditSet() {
    return guard(async () => {
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
    });
  }

  const setsTitle = (
    <Text fontSize={fontSize.xl} fontWeight="700" color={colors.primary} flex={1}>
      Sets{' '}
      <Text fontSize={fontSize.sm} fontWeight="400" color={colors.muted}>
        ({viewMode === 'grouped' ? 'grouped' : 'full'})
      </Text>
    </Text>
  );

  return (
    <YStack flex={1} backgroundColor={colors.bg}>
      <XStack
        style={{ height: insets.top + 52, paddingTop: insets.top }}
        paddingHorizontal={space.md}
        alignItems="center"
      >
        <XStack minWidth={80} justifyContent="flex-start">
          {editing ? (
            <GlassButton label="Cancel" color={colors.danger} onPress={cancelEditing} compact />
          ) : (
            <GlassButton icon="chevron-left" label="Back" onPress={() => router.back()} />
          )}
        </XStack>
        <Text flex={1} textAlign="center" color={colors.primary} fontSize={fontSize.xl} fontWeight="600">
          {editing ? 'Edit Session' : 'Past Session'}
        </Text>
        <XStack minWidth={80} justifyContent="flex-end">
          {editing ? (
            <GlassButton
              label="Save"
              onPress={() => saveNotes()}
              loading={notesLoading}
              disabled={notesLoading}
              compact
            />
          ) : (
            <GlassButton label="Edit" onPress={startEditing} compact />
          )}
        </XStack>
      </XStack>
      <Separator borderColor={colors.border} />

      {loading ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner size="large" color={colors.accent} />
        </YStack>
      ) : editing ? (
        <YStack flex={1}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: space.lg, paddingBottom: space.md }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={true}
          >
            {workout && (
              <XStack alignItems="center" marginBottom={space.sm} gap={space.sm}>
                <Text flex={1} fontSize={fontSize.sm} fontWeight="700" color={colors.muted}>
                  {formatDate(workout.user_workout_created_date)}
                </Text>
                <GlassButton icon="pencil" label="Notes" onPress={openWorkoutNotesModal} />
              </XStack>
            )}
            <WorkoutSetsList
              sets={sets}
              exerciseDetailMap={exerciseDetailMap}
              setsLoading={false}
              viewMode={viewMode}
              onToggleViewMode={() => setViewMode((v) => (v === 'grouped' ? 'chrono' : 'grouped'))}
              onEditSet={openEditSet}
              allowViewModeToggle
              interactive
              emptyHint="Log your first set below."
              title={setsTitle}
            />
          </ScrollView>

          <WorkoutLogStickyFooter onLogSet={() => setLogSetModalVisible(true)} />
        </YStack>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
        >
          {workout && (
            <Text fontSize={fontSize.sm} fontWeight="700" color={colors.muted} marginBottom={space.sm}>
              {formatDate(workout.user_workout_created_date)}
            </Text>
          )}

          <YStack marginBottom={space.md}>
            <Text fontSize={fontSize.xs} color={colors.muted} marginBottom={space.xs}>Pre-workout notes</Text>
            {workout?.user_pre_workout_notes ? (
              <Text fontSize={fontSize.sm} color={colors.primary} fontStyle="italic">"{workout.user_pre_workout_notes}"</Text>
            ) : (
              <Text fontSize={fontSize.sm} color={colors.muted}>No pre-workout notes</Text>
            )}
          </YStack>

          <Separator borderColor={colors.border} marginBottom={space.sm} />

          <WorkoutSetsList
            sets={sets}
            exerciseDetailMap={exerciseDetailMap}
            setsLoading={false}
            viewMode={viewMode}
            onToggleViewMode={() => setViewMode((v) => (v === 'grouped' ? 'chrono' : 'grouped'))}
            onEditSet={openEditSet}
            allowViewModeToggle
            interactive={false}
            emptyHint="No sets recorded."
            title={setsTitle}
          />

          <Separator borderColor={colors.border} marginTop={space.sm} />

          <YStack marginTop={space.lg}>
            <Text fontSize={fontSize.xs} color={colors.muted} marginBottom={space.xs}>Post-workout notes</Text>
            {workout?.user_post_workout_notes ? (
              <Text fontSize={fontSize.sm} color={colors.primary} fontStyle="italic">"{workout.user_post_workout_notes}"</Text>
            ) : (
              <Text fontSize={fontSize.sm} color={colors.muted}>No post-workout notes</Text>
            )}
          </YStack>
        </ScrollView>
      )}

      <SlideUpModal
        visible={workoutNotesModalVisible}
        onClose={() => setWorkoutNotesModalVisible(false)}
        fitContent
        keyboardAware
      >
        <YStack padding={space.xl} gap={space.md}>
          <Text fontSize={fontSize.lg} fontWeight="700" color={colors.primary}>Workout notes</Text>
          <Input
            label="Pre-workout notes (optional)"
            value={draftPre}
            onChangeText={setDraftPre}
            placeholder="Pre-workout notes…"
            multiline
          />
          <Input
            label="Post-workout notes (optional)"
            value={draftPost}
            onChangeText={setDraftPost}
            placeholder="Post-workout notes…"
            multiline
          />
          <XStack gap={space.sm} justifyContent="center">
            <GlassButton label="Cancel" color={colors.danger} onPress={() => setWorkoutNotesModalVisible(false)} compact />
            <GlassButton label="Save" onPress={applyWorkoutNotesFromModal} compact />
          </XStack>
          <YStack height={windowHeight * 0.12} />
        </YStack>
      </SlideUpModal>

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
            <GlassButton label="Cancel" color={colors.danger} onPress={() => setLogSetModalVisible(false)} compact />
            <GlassButton label="Log Set" onPress={logSet} loading={logLoading} disabled={logLoading} compact />
          </XStack>
          <YStack height={windowHeight * 0.15} />
        </YStack>
      </SlideUpModal>

      <SlideUpModal visible={!!editingSet} onClose={() => setEditingSet(null)} fitContent keyboardAware>
        <YStack padding={space.xl} gap={space.md}>
          <XStack alignItems="center">
            <Text fontSize={fontSize.lg} fontWeight="700" color={colors.primary} flex={1}>Edit Set</Text>
            <GlassButton
              icon="trash"
              iconSize={14}
              color={colors.danger}
              onPress={() => {
                if (!editingSet) return;
                const sid = editingSet.workout_set_id;
                Alert.alert('Delete Set', 'Remove this set?', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => guard(async () => {
                      setEditingSet(null);
                      await deleteSet(db, sid);
                      loadData();
                    }),
                  },
                ]);
              }}
            />
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
            <GlassButton label="Cancel" color={colors.danger} onPress={() => setEditingSet(null)} compact />
            <GlassButton label="Save" onPress={saveEditSet} loading={editLoading} disabled={editLoading} compact />
          </XStack>
          <YStack height={windowHeight * 0.15} />
        </YStack>
      </SlideUpModal>

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
            <GlassButton label="Cancel" color={colors.danger} onPress={() => setNewExVisible(false)} compact />
            <GlassButton label="Create" onPress={createNewExercise} loading={newExCreating} disabled={newExCreating} compact />
          </XStack>
          <YStack height={windowHeight * 0.15} />
        </YStack>
      </SlideUpModal>

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
            const detail = exId != null ? exerciseDetailMap[exId] : undefined;
            const assignedIds = new Set(detail?.assigned_variations?.map((v) => v.custom_variation_id) ?? []);
            const unassigned = variations.filter((v) => !assignedIds.has(v.custom_variation_id));
            if (unassigned.length === 0) {
              return (
                <Text color={colors.muted} fontSize={fontSize.sm}>
                  No existing variations to assign.
                </Text>
              );
            }
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

      <SlideUpModal visible={newVarVisible} onClose={() => setNewVarVisible(false)} zIndex={200_000} fitContent>
        <YStack padding={space.xl} gap={space.md}>
          <Text fontSize={fontSize.lg} fontWeight="700" color={colors.primary}>New Variation</Text>
          <Input placeholder="Variation name" value={newVarName} onChangeText={setNewVarName} autoCapitalize="words" />
          <XStack gap={space.sm} justifyContent="center">
            <GlassButton label="Cancel" color={colors.danger} onPress={() => setNewVarVisible(false)} compact />
            <GlassButton label="Create" onPress={createNewVariation} loading={newVarCreating} disabled={newVarCreating} compact />
          </XStack>
          <YStack height={windowHeight * 0.15} />
        </YStack>
      </SlideUpModal>
    </YStack>
  );
}
