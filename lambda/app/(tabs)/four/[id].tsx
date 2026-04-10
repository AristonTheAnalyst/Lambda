import React, { useState, useEffect, useCallback } from 'react';
import { Alert, Keyboard, ScrollView, useWindowDimensions } from 'react-native';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Separator } from 'tamagui';
import { useSQLiteContext } from 'expo-sqlite';
import { SlideUpModal, DropdownSelect } from '@/components/FormControls';
import Input from '@/components/Input';
import Button from '@/components/Button';
import GlassButton from '@/components/GlassButton';
import WorkoutLogStickyFooter from '@/components/workout/WorkoutLogStickyFooter';
import WorkoutSetsList from '@/components/workout/WorkoutSetsList';
import { SessionAccentPill, SessionCancelPill } from '@/components/workout/WorkoutSessionHeaderPills';
import { useExerciseData } from '@/lib/ExerciseDataContext';
import { useAsyncGuard } from '@/lib/asyncGuard';
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
  const { exercises, exerciseDetailMap } = useExerciseData();

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
      Sets this workout{' '}
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
            <SessionCancelPill onPress={cancelEditing} />
          ) : (
            <GlassButton icon="chevron-left" label="Back" onPress={() => router.back()} />
          )}
        </XStack>
        <Text flex={1} textAlign="center" color={colors.primary} fontSize={fontSize.xl} fontWeight="600">
          {editing ? 'Edit workout' : 'Workout'}
        </Text>
        <XStack minWidth={80} justifyContent="flex-end">
          {editing ? (
            <SessionAccentPill label="Save" onPress={() => saveNotes()} loading={notesLoading} disabled={notesLoading} />
          ) : (
            <Text color={colors.accent} fontSize={fontSize.md} fontWeight="600" onPress={startEditing} cursor="pointer">
              Edit
            </Text>
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
            <Button label="Cancel" onPress={() => setWorkoutNotesModalVisible(false)} variant="danger-ghost" />
            <Button label="Save" onPress={applyWorkoutNotesFromModal} />
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
                options={exercises.map((ex) => ({ label: ex.exercise_name, value: ex.custom_exercise_id }))}
                value={selectedExId}
                onChange={onSelectExercise}
                placeholder="Select exercise…"
                searchable
              />
            </YStack>
            {selectedEx && (
              <YStack flex={2}>
                <Text fontSize={fontSize.sm} fontWeight="500" marginBottom={space.xs} color={colors.primary}>Variation</Text>
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
                    borderColor={colors.border}
                    borderRadius={radius.md}
                    paddingHorizontal={space.md}
                    height={48}
                    backgroundColor={colors.surface}
                    opacity={0.5}
                  >
                    <Text fontSize={fontSize.md} color={colors.muted} flex={1} numberOfLines={1}>Zero Assigned</Text>
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
          <XStack gap={space.sm} justifyContent="center">
            <Button label="Cancel" onPress={() => setLogSetModalVisible(false)} variant="danger-ghost" />
            <Button label="Log Set" onPress={logSet} loading={logLoading} />
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
                options={exercises.map((ex) => ({ label: ex.exercise_name, value: ex.custom_exercise_id }))}
                value={editExId}
                onChange={(exId) => { setEditExId(exId); setEditVarId(null); }}
                placeholder="Select exercise…"
                searchable
              />
            </YStack>
            {editEx && (
              <YStack flex={2}>
                <Text fontSize={fontSize.sm} fontWeight="500" marginBottom={space.xs} color={colors.primary}>Variation</Text>
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
                    borderColor={colors.border}
                    borderRadius={radius.md}
                    paddingHorizontal={space.md}
                    height={48}
                    backgroundColor={colors.surface}
                    opacity={0.5}
                  >
                    <Text fontSize={fontSize.md} color={colors.muted} flex={1} numberOfLines={1}>Zero Assigned</Text>
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
          <XStack gap={space.sm} justifyContent="center">
            <Button label="Cancel" onPress={() => setEditingSet(null)} variant="danger-ghost" />
            <Button label="Save" onPress={saveEditSet} loading={editLoading} />
          </XStack>
          <YStack height={windowHeight * 0.15} />
        </YStack>
      </SlideUpModal>
    </YStack>
  );
}
