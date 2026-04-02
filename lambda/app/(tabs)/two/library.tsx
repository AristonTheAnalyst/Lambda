import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput } from 'react-native';
import { Separator, Text, XStack, YStack } from 'tamagui';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SegmentedControl, SlideUpModal } from '@/components/FormControls';
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
import { useAsyncGuard, useUIGuard } from '@/lib/asyncGuard';
import T from '@/constants/Theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Exercise {
  custom_exercise_id: number;
  exercise_name: string;
  exercise_volume_type: string;
  is_active: boolean;
}

interface Variation {
  custom_variation_id: number;
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

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LibraryScreen() {
  const guard   = useAsyncGuard();
  const openEdit = useUIGuard();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const db      = useSQLiteContext();
  const { user } = useAuthContext();
  const { exercises, variations, refreshExercises, refreshVariations, refreshExerciseDetails } = useExerciseData();

  const [tab, setTab] = useState<'exercises' | 'variations'>('exercises');

  // ── Exercises state ──────────────────────────────────────────────────────
  const [exSearch, setExSearch]         = useState('');
  const [exName, setExName]             = useState('');
  const [exVolume, setExVolume]         = useState('reps');
  const [exCreating, setExCreating]     = useState(false);
  const [exCreateVisible, setExCreateVisible] = useState(false);
  const [editEx, setEditEx]             = useState<Exercise | null>(null);

  // ── Variations state ─────────────────────────────────────────────────────
  const [varSearch, setVarSearch]       = useState('');
  const [varName, setVarName]           = useState('');
  const [varCreating, setVarCreating]   = useState(false);
  const [varCreateVisible, setVarCreateVisible] = useState(false);
  const [editVar, setEditVar]           = useState<Variation | null>(null);

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
    if (!editEx?.exercise_name.trim()) return;
    await updateExercise(db, editEx.custom_exercise_id, editEx.exercise_name, editEx.exercise_volume_type);
    setEditEx(null);
    refreshExercises();
  }); }

  function confirmDeleteEx(id: number) {
    Alert.alert('Delete Exercise', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => guard(async () => {
        await softDeleteExercise(db, id);
        refreshExercises();
      })},
    ]);
  }

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
    if (!editVar?.variation_name.trim()) return;
    await updateVariation(db, editVar.custom_variation_id, editVar.variation_name);
    setEditVar(null);
    await Promise.all([refreshVariations(), refreshExerciseDetails()]);
  }); }

  function confirmDeleteVar(id: number) {
    Alert.alert('Delete Variation', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => guard(async () => {
        await softDeleteVariation(db, id);
        await Promise.all([refreshVariations(), refreshExerciseDetails()]);
      })},
    ]);
  }

  // ── Filtered lists ───────────────────────────────────────────────────────

  const filteredEx  = exercises.filter((e) => e.exercise_name.toLowerCase().includes(exSearch.toLowerCase()));
  const filteredVar = variations.filter((v) => v.variation_name.toLowerCase().includes(varSearch.toLowerCase()));

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
            <Text color={T.muted} padding={T.space.xs}>No exercises yet.</Text>
          ) : filteredEx.length === 0 ? (
            <Text color={T.muted} padding={T.space.xs}>No results.</Text>
          ) : filteredEx.map((ex) => (
            <XStack key={ex.custom_exercise_id} alignItems="center" paddingVertical={T.space.md} borderBottomWidth={0.5} borderBottomColor={T.border}>
              <YStack flex={1}>
                <Text fontSize={15} color={T.primary}>{ex.exercise_name}</Text>
                <Text fontSize={T.fontSize.xs} color={T.muted} marginTop={T.space.xs}>{ex.exercise_volume_type}</Text>
              </YStack>
              <XStack marginLeft={T.space.sm}>
                <GlassButton icon="pencil" iconSize={14} onPress={() => openEdit(() => setEditEx({ ...ex }))} />
              </XStack>
              <XStack marginLeft={T.space.sm}>
                <GlassButton icon="trash" iconSize={14} color={T.danger} onPress={() => confirmDeleteEx(ex.custom_exercise_id)} />
              </XStack>
            </XStack>
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
            <Text color={T.muted} padding={T.space.xs}>No variations yet.</Text>
          ) : filteredVar.length === 0 ? (
            <Text color={T.muted} padding={T.space.xs}>No results.</Text>
          ) : filteredVar.map((v) => (
            <XStack key={v.custom_variation_id} alignItems="center" paddingVertical={T.space.md} borderBottomWidth={0.5} borderBottomColor={T.border}>
              <Text flex={1} fontSize={15} color={T.primary}>{v.variation_name}</Text>
              <XStack marginLeft={T.space.sm}>
                <GlassButton icon="pencil" iconSize={14} onPress={() => openEdit(() => setEditVar({ ...v, is_active: true }))} />
              </XStack>
              <XStack marginLeft={T.space.sm}>
                <GlassButton icon="trash" iconSize={14} color={T.danger} onPress={() => confirmDeleteVar(v.custom_variation_id)} />
              </XStack>
            </XStack>
          ))}
          <YStack height={T.space.xxl} />
        </ScrollView>
      )}

      {/* ── Modals — always mounted so Tamagui Sheet state is never lost on tab switch ── */}

      <SlideUpModal visible={exCreateVisible} onClose={() => setExCreateVisible(false)}>
        <YStack backgroundColor={T.surface} borderTopLeftRadius={T.radius.lg} borderTopRightRadius={T.radius.lg} padding={T.space.xl} paddingBottom={T.space.xxl}>
          <Text fontSize={T.fontSize.lg} fontWeight="700" color={T.primary} marginBottom={T.space.md}>New Exercise</Text>
          <Input placeholder="Exercise name" value={exName} onChangeText={setExName} />
          <Text fontSize={T.fontSize.sm} fontWeight="500" color={T.primary} marginTop={T.space.md} marginBottom={T.space.xs}>Volume type</Text>
          <SegmentedControl options={VOLUME_OPTIONS} value={exVolume} onChange={setExVolume} />
          <XStack gap={T.space.sm} marginTop={T.space.md} justifyContent="center">
            <Button label="Cancel" onPress={() => setExCreateVisible(false)} variant="danger-ghost" />
            <Button label="Create" onPress={createEx} loading={exCreating} />
          </XStack>
        </YStack>
      </SlideUpModal>

      <SlideUpModal visible={!!editEx} onClose={() => setEditEx(null)}>
        <YStack backgroundColor={T.surface} borderTopLeftRadius={T.radius.lg} borderTopRightRadius={T.radius.lg} padding={T.space.xl} paddingBottom={T.space.xxl}>
          <Text fontSize={T.fontSize.lg} fontWeight="700" color={T.primary} marginBottom={T.space.md}>Edit Exercise</Text>
          <Input
            value={editEx?.exercise_name ?? ''}
            onChangeText={(t) => setEditEx((e) => e ? { ...e, exercise_name: t } : e)}
            placeholder="Exercise name"
          />
          <Text fontSize={T.fontSize.sm} fontWeight="500" color={T.primary} marginTop={T.space.md} marginBottom={T.space.xs}>Volume type</Text>
          <SegmentedControl
            options={VOLUME_OPTIONS}
            value={editEx?.exercise_volume_type ?? 'reps'}
            onChange={(v) => setEditEx((e) => e ? { ...e, exercise_volume_type: v } : e)}
          />
          <XStack gap={T.space.sm} marginTop={T.space.md} justifyContent="center">
            <Button label="Cancel" onPress={() => setEditEx(null)} variant="danger-ghost" />
            <Button label="Save" onPress={saveEditEx} />
          </XStack>
        </YStack>
      </SlideUpModal>

      <SlideUpModal visible={varCreateVisible} onClose={() => setVarCreateVisible(false)}>
        <YStack backgroundColor={T.surface} borderTopLeftRadius={T.radius.lg} borderTopRightRadius={T.radius.lg} padding={T.space.xl} paddingBottom={T.space.xxl}>
          <Text fontSize={T.fontSize.lg} fontWeight="700" color={T.primary} marginBottom={T.space.md}>New Variation</Text>
          <Input placeholder="Variation name" value={varName} onChangeText={setVarName} />
          <XStack gap={T.space.sm} marginTop={T.space.md} justifyContent="center">
            <Button label="Cancel" onPress={() => setVarCreateVisible(false)} variant="danger-ghost" />
            <Button label="Create" onPress={createVar} loading={varCreating} />
          </XStack>
        </YStack>
      </SlideUpModal>

      <SlideUpModal visible={!!editVar} onClose={() => setEditVar(null)}>
        <YStack backgroundColor={T.surface} borderTopLeftRadius={T.radius.lg} borderTopRightRadius={T.radius.lg} padding={T.space.xl} paddingBottom={T.space.xxl}>
          <Text fontSize={T.fontSize.lg} fontWeight="700" color={T.primary} marginBottom={T.space.md}>Edit Variation</Text>
          <Input
            value={editVar?.variation_name ?? ''}
            onChangeText={(t) => setEditVar((v) => v ? { ...v, variation_name: t } : v)}
            placeholder="Variation name"
          />
          <XStack gap={T.space.sm} marginTop={T.space.md} justifyContent="center">
            <Button label="Cancel" onPress={() => setEditVar(null)} variant="danger-ghost" />
            <Button label="Save" onPress={saveEditVar} />
          </XStack>
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
