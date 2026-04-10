import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, useWindowDimensions } from 'react-native';
import { Separator, Spinner, Text, XStack, YStack } from 'tamagui';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DropdownSelect, SegmentedControl, SlideUpModal } from '@/components/FormControls';
import { useExerciseData } from '@/lib/ExerciseDataContext';
import { useAuthContext } from '@/lib/AuthContext';
import GlassButton from '@/components/GlassButton';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { useSQLiteContext } from 'expo-sqlite';
import {
  findExerciseByName,
  createExercise,
  reactivateExercise,
  updateExercise,
  softDeleteExercise,
} from '@/lib/offline/exerciseStore';
import {
  findVariationByName,
  createVariation,
  reactivateVariation,
  updateVariation,
  softDeleteVariation,
} from '@/lib/offline/variationStore';
import {
  getBridgeForExercises,
  getBridgeForVariations,
  addBridgeRow,
  removeBridgeRow,
} from '@/lib/offline/bridgeStore';
import { useAsyncGuard, useUIGuard } from '@/lib/asyncGuard';
import T from '@/constants/Theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Exercise {
  custom_exercise_id: string;
  exercise_name: string;
  exercise_volume_type: string;
  is_active: boolean;
}

interface Variation {
  custom_variation_id: string;
  variation_name: string;
  is_active: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { label: 'Exercises', value: 'exercises' },
  { label: 'Variations', value: 'variations' },
];
const VOLUME_OPTIONS = [
  { label: 'Reps', value: 'reps' },
  { label: 'Duration', value: 'duration' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addLabel(count: number, singular: string, plural: string) {
  if (count === 0) return 'Done';
  return `Add ${count} ${count === 1 ? singular : plural}`;
}

// ─── Memoized list rows (defined outside to keep reference stable) ─────────────

const ExRow = React.memo(function ExRow({
  ex,
  onEdit,
  onDelete,
}: {
  ex: Exercise;
  onEdit: (ex: Exercise) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <XStack alignItems="center" paddingVertical={T.space.md} borderBottomWidth={0.5} borderBottomColor={T.border}>
      <YStack flex={1}>
        <Text fontSize={15} color={T.primary}>{ex.exercise_name}</Text>
        <Text fontSize={T.fontSize.xs} color={T.muted} marginTop={T.space.xs}>{ex.exercise_volume_type}</Text>
      </YStack>
      <XStack marginLeft={T.space.sm}>
        <GlassButton icon="pencil" iconSize={14} onPress={() => onEdit(ex)} />
      </XStack>
      <XStack marginLeft={T.space.sm}>
        <GlassButton icon="trash" iconSize={14} color={T.danger} onPress={() => onDelete(ex.custom_exercise_id)} />
      </XStack>
    </XStack>
  );
});

const VarRow = React.memo(function VarRow({
  v,
  onEdit,
  onDelete,
}: {
  v: Variation;
  onEdit: (v: Variation) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <XStack alignItems="center" paddingVertical={T.space.md} borderBottomWidth={0.5} borderBottomColor={T.border}>
      <Text flex={1} fontSize={15} color={T.primary}>{v.variation_name}</Text>
      <XStack marginLeft={T.space.sm}>
        <GlassButton icon="pencil" iconSize={14} onPress={() => onEdit(v)} />
      </XStack>
      <XStack marginLeft={T.space.sm}>
        <GlassButton icon="trash" iconSize={14} color={T.danger} onPress={() => onDelete(v.custom_variation_id)} />
      </XStack>
    </XStack>
  );
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LibraryScreen() {
  const guard    = useAsyncGuard();
  const openEdit = useUIGuard();
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const db       = useSQLiteContext();
  const { user } = useAuthContext();
  const { exercises, variations, refreshExercises, refreshVariations, refreshExerciseDetails } = useExerciseData();

  const [tab, setTab] = useState<'exercises' | 'variations'>('exercises');

  // ── Exercises state ──────────────────────────────────────────────────────
  const [exSearch, setExSearch]               = useState('');
  const [exName, setExName]                   = useState('');
  const [exVolume, setExVolume]               = useState('reps');
  const [exCreating, setExCreating]           = useState(false);
  const [exCreateVisible, setExCreateVisible] = useState(false);
  const [editEx, setEditEx]                   = useState<Exercise | null>(null);

  // ── Edit exercise — draft bridge state ───────────────────────────────────
  // original: DB state when modal opened (used to compute diff on Save)
  // draft: what's shown in the modal (updates as user adds/removes)
  // selection: what's checked in the dropdown right now (cleared after Add)
  const [exOriginalVarIds, setExOriginalVarIds] = useState<Set<string>>(new Set());
  const [exDraftVarIds, setExDraftVarIds]       = useState<Set<string>>(new Set());
  const [exSelection, setExSelection]           = useState<string[]>([]);
  const [loadingExVars, setLoadingExVars]       = useState(false);

  // ── Variations state ─────────────────────────────────────────────────────
  const [varSearch, setVarSearch]               = useState('');
  const [varName, setVarName]                   = useState('');
  const [varCreating, setVarCreating]           = useState(false);
  const [varCreateVisible, setVarCreateVisible] = useState(false);
  const [editVar, setEditVar]                   = useState<Variation | null>(null);

  // ── Edit variation — draft bridge state ──────────────────────────────────
  const [varOriginalExIds, setVarOriginalExIds] = useState<Set<string>>(new Set());
  const [varDraftExIds, setVarDraftExIds]       = useState<Set<string>>(new Set());
  const [varSelection, setVarSelection]         = useState<string[]>([]);
  const [loadingVarExs, setLoadingVarExs]       = useState(false);

  // ── Filtered lists ───────────────────────────────────────────────────────

  const filteredEx = useMemo(
    () => exercises.filter((e) => e.exercise_name.toLowerCase().includes(exSearch.toLowerCase())),
    [exercises, exSearch]
  );
  const filteredVar = useMemo(
    () => variations.filter((v) => v.variation_name.toLowerCase().includes(varSearch.toLowerCase())),
    [variations, varSearch]
  );

  // ── Draft-derived lists shown inside the edit modals ─────────────────────

  const exAssignedVars = useMemo(
    () => variations.filter((v) => exDraftVarIds.has(v.custom_variation_id)),
    [variations, exDraftVarIds]
  );
  const exAvailableVars = useMemo(
    () => variations.filter((v) => !exDraftVarIds.has(v.custom_variation_id)),
    [variations, exDraftVarIds]
  );
  const varAssignedExs = useMemo(
    () => exercises.filter((e) => varDraftExIds.has(e.custom_exercise_id)),
    [exercises, varDraftExIds]
  );
  const varAvailableExs = useMemo(
    () => exercises.filter((e) => !varDraftExIds.has(e.custom_exercise_id)),
    [exercises, varDraftExIds]
  );

  // ── Bridge loaders ───────────────────────────────────────────────────────

  const loadExVars = useCallback(async (exId: string) => {
    setLoadingExVars(true);
    const rows = await getBridgeForExercises(db, [exId]);
    const ids = new Set(rows.map((r) => r.custom_variation_id));
    setExOriginalVarIds(ids);
    setExDraftVarIds(new Set(ids));
    setExSelection([]);
    setLoadingExVars(false);
  }, [db]);

  const loadVarExs = useCallback(async (varId: string) => {
    setLoadingVarExs(true);
    const rows = await getBridgeForVariations(db, [varId]);
    const ids = new Set(rows.map((r) => r.custom_exercise_id));
    setVarOriginalExIds(ids);
    setVarDraftExIds(new Set(ids));
    setVarSelection([]);
    setLoadingVarExs(false);
  }, [db]);

  useEffect(() => {
    if (editEx) { loadExVars(editEx.custom_exercise_id); }
    else { setExOriginalVarIds(new Set()); setExDraftVarIds(new Set()); setExSelection([]); }
  }, [editEx?.custom_exercise_id, loadExVars]);

  useEffect(() => {
    if (editVar) { loadVarExs(editVar.custom_variation_id); }
    else { setVarOriginalExIds(new Set()); setVarDraftExIds(new Set()); setVarSelection([]); }
  }, [editVar?.custom_variation_id, loadVarExs]);

  // ── Exercise handlers ────────────────────────────────────────────────────

  function createEx() { return guard(async () => {
    if (!exName.trim()) return Alert.alert('Name required');
    if (!user) return;
    setExCreating(true);
    const existing = await findExerciseByName(db, exName.trim());
    if (existing) {
      if (existing.is_active) { setExCreating(false); return Alert.alert('Already exists', 'An exercise with this name already exists.'); }
      await reactivateExercise(db, existing.custom_exercise_id, exVolume);
      setExCreating(false); setExName(''); setExCreateVisible(false);
      return refreshExercises();
    }
    await createExercise(db, user.id, exName.trim(), exVolume);
    setExCreating(false); setExName(''); setExCreateVisible(false);
    refreshExercises();
  }); }

  function saveEditEx() { return guard(async () => {
    if (!editEx?.exercise_name.trim() || !user) return;

    await updateExercise(db, editEx.custom_exercise_id, editEx.exercise_name, editEx.exercise_volume_type);

    const toAdd    = [...exDraftVarIds].filter((id) => !exOriginalVarIds.has(id));
    const toRemove = [...exOriginalVarIds].filter((id) => !exDraftVarIds.has(id));
    for (const varId of toAdd)    { await addBridgeRow(db, user.id, editEx.custom_exercise_id, varId); }
    for (const varId of toRemove) { await removeBridgeRow(db, editEx.custom_exercise_id, varId); }

    setEditEx(null);
    const tasks: Promise<void>[] = [refreshExercises()];
    if (toAdd.length > 0 || toRemove.length > 0) tasks.push(refreshExerciseDetails());
    await Promise.all(tasks);
  }); }

  const confirmDeleteEx = useCallback((id: string) => {
    Alert.alert('Delete Exercise', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => guard(async () => {
        await softDeleteExercise(db, id);
        refreshExercises();
      })},
    ]);
  }, [guard, db, refreshExercises]);

  const handleEditEx = useCallback((ex: Exercise) => {
    openEdit(() => setEditEx({ ...ex }));
  }, [openEdit]);

  // ── Variation handlers ───────────────────────────────────────────────────

  function createVar() { return guard(async () => {
    if (!varName.trim()) return Alert.alert('Name required');
    if (!user) return;
    setVarCreating(true);
    const existing = await findVariationByName(db, varName.trim());
    if (existing) {
      if (existing.is_active) { setVarCreating(false); return Alert.alert('Already exists', 'A variation with this name already exists.'); }
      await reactivateVariation(db, existing.custom_variation_id);
      setVarCreating(false); setVarName(''); setVarCreateVisible(false);
      return refreshVariations();
    }
    await createVariation(db, user.id, varName.trim());
    setVarCreating(false); setVarName(''); setVarCreateVisible(false);
    refreshVariations();
  }); }

  function saveEditVar() { return guard(async () => {
    if (!editVar?.variation_name.trim() || !user) return;

    await updateVariation(db, editVar.custom_variation_id, editVar.variation_name);

    const toAdd    = [...varDraftExIds].filter((id) => !varOriginalExIds.has(id));
    const toRemove = [...varOriginalExIds].filter((id) => !varDraftExIds.has(id));
    for (const exId of toAdd)    { await addBridgeRow(db, user.id, exId, editVar.custom_variation_id); }
    for (const exId of toRemove) { await removeBridgeRow(db, exId, editVar.custom_variation_id); }

    setEditVar(null);
    const tasks: Promise<void>[] = [refreshVariations()];
    if (toAdd.length > 0 || toRemove.length > 0) tasks.push(refreshExerciseDetails());
    await Promise.all(tasks);
  }); }

  const confirmDeleteVar = useCallback((id: string) => {
    Alert.alert('Delete Variation', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => guard(async () => {
        await softDeleteVariation(db, id);
        await Promise.all([refreshVariations(), refreshExerciseDetails()]);
      })},
    ]);
  }, [guard, db, refreshVariations, refreshExerciseDetails]);

  const handleEditVar = useCallback((v: Variation) => {
    openEdit(() => setEditVar({ ...v, is_active: true }));
  }, [openEdit]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <YStack flex={1} backgroundColor={T.bg}>

      {/* ── Header ── */}
      <XStack
        style={{ height: insets.top + 52, paddingTop: insets.top }}
        paddingHorizontal={T.space.md}
        alignItems="center"
      >
        <XStack minWidth={80}>
          <GlassButton icon="chevron-left" label="Back" onPress={() => router.back()} />
        </XStack>
        <Text flex={1} textAlign="center" color={T.primary} fontSize={T.fontSize.xl} fontWeight="600">
          {tab === 'exercises' ? 'Exercises' : 'Variations'}
        </Text>
        <XStack width={80} />
      </XStack>

      {/* ── Tab switcher ── */}
      <YStack paddingHorizontal={T.space.lg} paddingVertical={T.space.sm} backgroundColor={T.bg}>
        <SegmentedControl
          options={TABS}
          value={tab}
          onChange={(v) => setTab(v as 'exercises' | 'variations')}
        />
      </YStack>
      <Separator borderColor={T.border} />

      {/* ── Exercises tab ── */}
      {tab === 'exercises' && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: T.space.lg }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <XStack alignItems="center" marginBottom={T.space.md}>
            <Text fontSize={T.fontSize.lg} fontWeight="700" color={T.primary} flex={1}>All Exercises</Text>
            {exercises.length > 0 && (
              <XStack backgroundColor={T.surface} borderRadius={T.radius.md} paddingHorizontal={T.space.sm} alignItems="center" height={34} minWidth={130} marginRight={T.space.sm}>
                <TextInput
                  placeholder="Search…"
                  placeholderTextColor={T.muted}
                  value={exSearch}
                  onChangeText={setExSearch}
                  spellCheck={false}
                  selectionColor={T.primary}
                  style={s.search}
                />
              </XStack>
            )}
            <GlassButton icon="plus" iconSize={14} onPress={() => { setExName(''); setExVolume('reps'); setExCreateVisible(true); }} />
          </XStack>

          {exercises.length === 0 ? (
            <YStack alignItems="center" paddingTop={T.space.xxl} gap={T.space.sm}>
              <Text color={T.primary} fontSize={T.fontSize.md} fontWeight="600">No exercises yet</Text>
              <Text color={T.muted} fontSize={T.fontSize.sm} textAlign="center">Tap + to create your first exercise.</Text>
            </YStack>
          ) : filteredEx.length === 0 ? (
            <Text color={T.muted} padding={T.space.xs}>No results.</Text>
          ) : filteredEx.map((ex) => (
            <ExRow key={ex.custom_exercise_id} ex={ex} onEdit={handleEditEx} onDelete={confirmDeleteEx} />
          ))}
          <YStack height={T.space.xxl} />
        </ScrollView>
      )}

      {/* ── Variations tab ── */}
      {tab === 'variations' && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: T.space.lg }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <XStack alignItems="center" marginBottom={T.space.md}>
            <Text fontSize={T.fontSize.lg} fontWeight="700" color={T.primary} flex={1}>All Variations</Text>
            {variations.length > 0 && (
              <XStack backgroundColor={T.surface} borderRadius={T.radius.md} paddingHorizontal={T.space.sm} alignItems="center" height={34} minWidth={130} marginRight={T.space.sm}>
                <TextInput
                  placeholder="Search…"
                  placeholderTextColor={T.muted}
                  value={varSearch}
                  onChangeText={setVarSearch}
                  spellCheck={false}
                  selectionColor={T.primary}
                  style={s.search}
                />
              </XStack>
            )}
            <GlassButton icon="plus" iconSize={14} onPress={() => { setVarName(''); setVarCreateVisible(true); }} />
          </XStack>

          {variations.length === 0 ? (
            <YStack alignItems="center" paddingTop={T.space.xxl} gap={T.space.sm}>
              <Text color={T.primary} fontSize={T.fontSize.md} fontWeight="600">No variations yet</Text>
              <Text color={T.muted} fontSize={T.fontSize.sm} textAlign="center">Tap + to create your first variation.</Text>
            </YStack>
          ) : filteredVar.length === 0 ? (
            <Text color={T.muted} padding={T.space.xs}>No results.</Text>
          ) : filteredVar.map((v) => (
            <VarRow key={v.custom_variation_id} v={v} onEdit={handleEditVar} onDelete={confirmDeleteVar} />
          ))}
          <YStack height={T.space.xxl} />
        </ScrollView>
      )}

      {/* ── Modals — always mounted so Tamagui Sheet state is never lost on tab switch ── */}

      <SlideUpModal visible={exCreateVisible} onClose={() => setExCreateVisible(false)} fitContent>
        <YStack padding={T.space.xl} gap={T.space.md}>
          <Text fontSize={T.fontSize.lg} fontWeight="700" color={T.primary}>New Exercise</Text>
          <Input placeholder="Exercise name" value={exName} onChangeText={setExName} />
          <YStack gap={T.space.xs}>
            <Text fontSize={T.fontSize.sm} fontWeight="500" color={T.primary}>Volume type</Text>
            <SegmentedControl options={VOLUME_OPTIONS} value={exVolume} onChange={setExVolume} />
          </YStack>
          <XStack gap={T.space.sm} justifyContent="center">
            <Button label="Cancel" onPress={() => setExCreateVisible(false)} variant="danger-ghost" />
            <Button label="Create" onPress={createEx} loading={exCreating} />
          </XStack>
          <YStack height={windowHeight * 0.15} />
        </YStack>
      </SlideUpModal>

      {/* ── Edit Exercise ── */}
      <SlideUpModal visible={!!editEx} onClose={() => setEditEx(null)} fitContent>
        <YStack padding={T.space.xl} gap={T.space.md}>
          <Text fontSize={T.fontSize.lg} fontWeight="700" color={T.primary}>Edit Exercise</Text>
          <Input
            value={editEx?.exercise_name ?? ''}
            onChangeText={(t) => setEditEx((e) => e ? { ...e, exercise_name: t } : e)}
            placeholder="Exercise name"
          />
          <YStack gap={T.space.xs}>
            <Text fontSize={T.fontSize.sm} fontWeight="500" color={T.primary}>Volume type</Text>
            <SegmentedControl
              options={VOLUME_OPTIONS}
              value={editEx?.exercise_volume_type ?? 'reps'}
              onChange={(v) => setEditEx((e) => e ? { ...e, exercise_volume_type: v } : e)}
            />
          </YStack>
          <Separator borderColor={T.border} />
          <Text fontSize={T.fontSize.md} fontWeight="600" color={T.primary}>
            Assigned Variations
          </Text>
          {loadingExVars ? (
            <Spinner size="small" color={T.accent} alignSelf="center" />
          ) : exAssignedVars.length === 0 ? (
            <Text color={T.muted} fontSize={T.fontSize.sm}>No variations assigned yet.</Text>
          ) : (
            <YStack>
              {exAssignedVars.map((v, i) => (
                <XStack
                  key={v.custom_variation_id}
                  alignItems="center"
                  paddingVertical={T.space.sm}
                  borderBottomWidth={i < exAssignedVars.length - 1 ? 0.5 : 0}
                  borderBottomColor={T.border}
                >
                  <Text flex={1} fontSize={15} color={T.primary}>{v.variation_name}</Text>
                  <GlassButton
                    icon="trash"
                    iconSize={14}
                    color={T.danger}
                    onPress={() => setExDraftVarIds((prev) => { const next = new Set(prev); next.delete(v.custom_variation_id); return next; })}
                  />
                </XStack>
              ))}
            </YStack>
          )}
          {exAvailableVars.length > 0 && (
            <DropdownSelect
              options={exAvailableVars.map((v) => ({ label: v.variation_name, value: v.custom_variation_id }))}
              multiSelect
              selectedValues={exSelection}
              onChangeMulti={setExSelection}
              placeholder="Add variations…"
              searchable
              confirmLabel={addLabel(exSelection.length, 'Variation', 'Variations')}
              onConfirm={() => {
                setExDraftVarIds((prev) => { const next = new Set(prev); exSelection.forEach((id) => next.add(id)); return next; });
                setExSelection([]);
              }}
            />
          )}
          <XStack gap={T.space.sm} justifyContent="center">
            <Button label="Cancel" onPress={() => setEditEx(null)} variant="danger-ghost" />
            <Button label="Save" onPress={saveEditEx} />
          </XStack>
          <YStack height={windowHeight * 0.15} />
        </YStack>
      </SlideUpModal>

      <SlideUpModal visible={varCreateVisible} onClose={() => setVarCreateVisible(false)} fitContent>
        <YStack padding={T.space.xl} gap={T.space.md}>
          <Text fontSize={T.fontSize.lg} fontWeight="700" color={T.primary}>New Variation</Text>
          <Input placeholder="Variation name" value={varName} onChangeText={setVarName} />
          <XStack gap={T.space.sm} justifyContent="center">
            <Button label="Cancel" onPress={() => setVarCreateVisible(false)} variant="danger-ghost" />
            <Button label="Create" onPress={createVar} loading={varCreating} />
          </XStack>
          <YStack height={windowHeight * 0.15} />
        </YStack>
      </SlideUpModal>

      {/* ── Edit Variation ── */}
      <SlideUpModal visible={!!editVar} onClose={() => setEditVar(null)} fitContent>
        <YStack padding={T.space.xl} gap={T.space.md}>
          <Text fontSize={T.fontSize.lg} fontWeight="700" color={T.primary}>Edit Variation</Text>
          <Input
            value={editVar?.variation_name ?? ''}
            onChangeText={(t) => setEditVar((v) => v ? { ...v, variation_name: t } : v)}
            placeholder="Variation name"
          />
          <Separator borderColor={T.border} />
          <Text fontSize={T.fontSize.md} fontWeight="600" color={T.primary}>
            Assigned Exercises
          </Text>
          {loadingVarExs ? (
            <Spinner size="small" color={T.accent} alignSelf="center" />
          ) : varAssignedExs.length === 0 ? (
            <Text color={T.muted} fontSize={T.fontSize.sm}>No exercises assigned yet.</Text>
          ) : (
            <YStack>
              {varAssignedExs.map((ex, i) => (
                <XStack
                  key={ex.custom_exercise_id}
                  alignItems="center"
                  paddingVertical={T.space.sm}
                  borderBottomWidth={i < varAssignedExs.length - 1 ? 0.5 : 0}
                  borderBottomColor={T.border}
                >
                  <YStack flex={1}>
                    <Text fontSize={15} color={T.primary}>{ex.exercise_name}</Text>
                    <Text fontSize={T.fontSize.xs} color={T.muted} marginTop={2}>{ex.exercise_volume_type}</Text>
                  </YStack>
                  <GlassButton
                    icon="trash"
                    iconSize={14}
                    color={T.danger}
                    onPress={() => setVarDraftExIds((prev) => { const next = new Set(prev); next.delete(ex.custom_exercise_id); return next; })}
                  />
                </XStack>
              ))}
            </YStack>
          )}
          {varAvailableExs.length > 0 && (
            <DropdownSelect
              options={varAvailableExs.map((ex) => ({ label: ex.exercise_name, value: ex.custom_exercise_id }))}
              multiSelect
              selectedValues={varSelection}
              onChangeMulti={setVarSelection}
              placeholder="Add exercises…"
              searchable
              confirmLabel={addLabel(varSelection.length, 'Exercise', 'Exercises')}
              onConfirm={() => {
                setVarDraftExIds((prev) => { const next = new Set(prev); varSelection.forEach((id) => next.add(id)); return next; });
                setVarSelection([]);
              }}
            />
          )}
          <XStack gap={T.space.sm} justifyContent="center">
            <Button label="Cancel" onPress={() => setEditVar(null)} variant="danger-ghost" />
            <Button label="Save" onPress={saveEditVar} />
          </XStack>
          <YStack height={windowHeight * 0.15} />
        </YStack>
      </SlideUpModal>

    </YStack>
  );
}

const s = StyleSheet.create({
  search: {
    color: T.primary,
    fontSize: T.fontSize.sm,
    flex: 1,
    tintColor: T.primary,
  } as any,
});
