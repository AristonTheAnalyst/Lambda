import React, { useState, useEffect, useCallback } from 'react';
import { Alert, ScrollView } from 'react-native';
import { Separator, Spinner, Text, XStack, YStack } from 'tamagui';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DropdownSelect, SegmentedControl, SlideUpModal } from '@/components/FormControls';
import { useExerciseData } from '@/lib/ExerciseDataContext';
import { useAuthContext } from '@/lib/AuthContext';
import GlassButton from '@/components/GlassButton';
import Button from '@/components/Button';
import Input from '@/components/Input';
import supabase from '@/lib/supabase';
import { useAsyncGuard, useUIGuard } from '@/lib/asyncGuard';
import T from '@/constants/Theme';

interface Variation {
  custom_variation_id: number;
  variation_name: string;
}

export default function VariationsScreen() {
  const guard = useAsyncGuard();
  const openEdit = useUIGuard();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { exercises, exerciseDetailMap, refreshExerciseDetails, refreshVariations } = useExerciseData();
  const { user } = useAuthContext();

  const [selectedExIds, setSelectedExIds] = useState<number[]>([]);
  const [assignedVars, setAssignedVars]   = useState<Variation[]>([]);
  const [commonVars, setCommonVars]       = useState<Variation[]>([]);
  const [loadingVars, setLoadingVars]     = useState(false);
  const [addMode, setAddMode]             = useState<'existing' | 'new'>('existing');
  const [existingVars, setExistingVars]   = useState<Variation[]>([]);
  const [selectedExistingIds, setSelectedExistingIds] = useState<number[]>([]);
  const [newName, setNewName]             = useState('');
  const [adding, setAdding]               = useState(false);
  const [editVar, setEditVar]             = useState<Variation | null>(null);

  const singleExId = selectedExIds.length === 1 ? selectedExIds[0] : null;

  const loadForExercises = useCallback(async (exIds: number[]) => {
    if (!exIds.length) { setAssignedVars([]); setCommonVars([]); setExistingVars([]); return; }
    setLoadingVars(true);

    if (exIds.length === 1) {
      // Single exercise: show assigned + filtered existing
      const [assignedRes, allRes] = await Promise.all([
        supabase
          .from('user_custom_exercise_variation_bridge')
          .select('user_custom_variation(custom_variation_id, variation_name)')
          .eq('custom_exercise_id', exIds[0]),
        supabase
          .from('user_custom_variation')
          .select('custom_variation_id, variation_name')
          .eq('is_active', true),
      ]);
      const assigned: Variation[] = assignedRes.data
        ? assignedRes.data.flatMap((r: any) => r.user_custom_variation ? [r.user_custom_variation] : [])
        : [];
      setAssignedVars(assigned);
      setCommonVars([]);
      const assignedIds = new Set(assigned.map((v) => v.custom_variation_id));
      const seenNames = new Set<string>();
      setExistingVars(
        (allRes.data ?? []).filter((v: any) => {
          if (assignedIds.has(v.custom_variation_id)) return false;
          if (seenNames.has(v.variation_name)) return false;
          seenNames.add(v.variation_name);
          return true;
        })
      );
    } else {
      // Multiple exercises: compute intersection + show all active for existing picker
      const [bridgeRes, allRes] = await Promise.all([
        supabase
          .from('user_custom_exercise_variation_bridge')
          .select('custom_exercise_id, user_custom_variation(custom_variation_id, variation_name)')
          .in('custom_exercise_id', exIds),
        supabase
          .from('user_custom_variation')
          .select('custom_variation_id, variation_name')
          .eq('is_active', true),
      ]);

      // Group bridge rows by variation_id → count how many exercises have it
      const countByVar = new Map<number, Variation>();
      const exCount = new Map<number, Set<number>>(); // varId → set of exIds that have it
      (bridgeRes.data ?? []).forEach((r: any) => {
        const v = r.user_custom_variation;
        if (!v) return;
        if (!exCount.has(v.custom_variation_id)) exCount.set(v.custom_variation_id, new Set());
        exCount.get(v.custom_variation_id)!.add(r.custom_exercise_id);
        countByVar.set(v.custom_variation_id, v);
      });
      const common = [...exCount.entries()]
        .filter(([, exSet]) => exSet.size === exIds.length)
        .map(([varId]) => countByVar.get(varId)!);
      setCommonVars(common);

      const commonIds = new Set(common.map((v) => v.custom_variation_id));
      const seenNames = new Set<string>();
      setExistingVars(
        (allRes.data ?? []).filter((v: any) => {
          if (commonIds.has(v.custom_variation_id)) return false;
          if (seenNames.has(v.variation_name)) return false;
          seenNames.add(v.variation_name);
          return true;
        })
      );
      setAssignedVars([]);
    }

    setLoadingVars(false);
    setSelectedExistingIds([]);
  }, []);

  useEffect(() => {
    loadForExercises(selectedExIds);
  }, [selectedExIds]);

  function onSelectExercises(ids: number[]) {
    setSelectedExIds(ids);
    setNewName('');
    setSelectedExistingIds([]);
    setAddMode('existing');
  }

  function add() { return guard(async () => {
    if (!selectedExIds.length || !user) return;
    setAdding(true);

    let varIds: number[] = [];

    if (addMode === 'existing') {
      if (!selectedExistingIds.length) { setAdding(false); return Alert.alert('Select a variation'); }
      varIds = selectedExistingIds;
    } else {
      if (!newName.trim()) { setAdding(false); return Alert.alert('Name required'); }

      const { data: existingVar } = await supabase
        .from('user_custom_variation')
        .select('custom_variation_id, is_active')
        .eq('user_id', user.id)
        .ilike('variation_name', newName.trim())
        .maybeSingle();

      let varId: number;
      if (existingVar) {
        varId = existingVar.custom_variation_id;
        if (!existingVar.is_active) {
          await supabase.from('user_custom_variation')
            .update({ is_active: true })
            .eq('custom_variation_id', varId);
        }
      } else {
        const { data, error } = await supabase
          .from('user_custom_variation')
          .insert({ user_id: user.id, variation_name: newName.trim() })
          .select('custom_variation_id')
          .single();
        if (error || !data) { setAdding(false); return Alert.alert('Error', error?.message ?? 'Failed to create variation'); }
        varId = data.custom_variation_id;
      }
      varIds = [varId];
      setNewName('');
    }

    // Insert bridge rows for every exercise × variation combination, skipping existing ones
    for (const exId of selectedExIds) {
      for (const varId of varIds) {
        const { data: exists } = await supabase
          .from('user_custom_exercise_variation_bridge')
          .select('custom_exercise_id')
          .eq('custom_exercise_id', exId)
          .eq('custom_variation_id', varId)
          .maybeSingle();
        if (!exists) {
          await supabase.from('user_custom_exercise_variation_bridge').insert({
            custom_exercise_id: exId,
            custom_variation_id: varId,
            user_id: user.id,
          });
        }
      }
    }

    if (addMode === 'existing') setSelectedExistingIds([]);
    setAdding(false);
    loadForExercises(selectedExIds);
    refreshExerciseDetails();
    refreshVariations();
  }); }

  function saveEdit() { return guard(async () => {
    if (!editVar?.variation_name.trim() || !singleExId) return;
    const { error } = await supabase
      .from('user_custom_variation')
      .update({ variation_name: editVar.variation_name })
      .eq('custom_variation_id', editVar.custom_variation_id);
    if (error) return Alert.alert('Error', error.message);
    setEditVar(null);
    loadForExercises(selectedExIds);
    refreshExerciseDetails();
    refreshVariations();
  }); }

  function confirmRemove(varId: number) {
    Alert.alert('Remove Variation', 'Remove this variation from the exercise?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => guard(async () => {
        if (!singleExId) return;
        await supabase.from('user_custom_exercise_variation_bridge')
          .delete()
          .eq('custom_exercise_id', singleExId)
          .eq('custom_variation_id', varId);
        loadForExercises(selectedExIds);
        refreshExerciseDetails();
        refreshVariations();
      })},
    ]);
  }

  return (
    <YStack flex={1} backgroundColor={T.bg}>
      <XStack style={{ height: insets.top + 52, paddingTop: insets.top }} paddingHorizontal={T.space.md} alignItems="center">
        <XStack minWidth={80}><GlassButton icon="chevron-left" label="Back" onPress={() => router.back()} /></XStack>
        <Text flex={1} textAlign="center" color={T.primary} fontSize={T.fontSize.xl} fontWeight="600">Variations</Text>
        <XStack width={80} />
      </XStack>
      <Separator borderColor={T.border} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: T.space.lg }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Exercise selector ── */}
        <Text fontSize={T.fontSize.sm} fontWeight="500" color={T.primary} marginBottom={T.space.xs}>Exercise</Text>
        <DropdownSelect
          options={exercises.map((ex) => {
            const count = exerciseDetailMap[ex.custom_exercise_id]?.assigned_variations.length ?? 0;
            const label = count === 0 ? ex.exercise_name : `${ex.exercise_name} (${count} ${count === 1 ? 'Variation' : 'Variations'})`;
            return { label, value: ex.custom_exercise_id };
          })}
          multiSelect
          selectedValues={selectedExIds}
          onChangeMulti={onSelectExercises}
          placeholder="Select exercise…"
          searchable
        />

        {selectedExIds.length > 0 && (
          <YStack marginTop={T.space.xl}>

            {/* ── Assigned variations list — single exercise only ── */}
            {singleExId && (
              loadingVars ? (
                <Spinner size="small" color={T.accent} alignSelf="center" marginBottom={T.space.lg} />
              ) : assignedVars.length === 0 ? (
                <Text color={T.muted} fontSize={T.fontSize.sm} marginBottom={T.space.lg}>
                  No variations yet. Add one below.
                </Text>
              ) : (
                <YStack marginBottom={T.space.lg}>
                  {assignedVars.map((v, i) => (
                    <XStack
                      key={v.custom_variation_id}
                      alignItems="center"
                      paddingVertical={T.space.md}
                      borderBottomWidth={i < assignedVars.length - 1 ? 0.5 : 0}
                      borderBottomColor={T.border}
                    >
                      <Text flex={1} fontSize={15} color={T.primary}>{v.variation_name}</Text>
                      <XStack
                        paddingHorizontal={T.space.sm}
                        paddingVertical={T.space.xs + 2}
                        marginLeft={T.space.sm}
                        borderRadius={T.radius.sm}
                        backgroundColor={T.accentBg}
                        pressStyle={{ opacity: 0.7 }}
                        onPress={() => openEdit(() => setEditVar({ ...v }))}
                        cursor="pointer"
                      >
                        <Text fontSize={T.fontSize.sm} fontWeight="500" color={T.accent}>Edit</Text>
                      </XStack>
                      <XStack
                        paddingHorizontal={T.space.sm}
                        paddingVertical={T.space.xs + 2}
                        marginLeft={T.space.sm}
                        borderRadius={T.radius.sm}
                        backgroundColor={T.dangerBg}
                        pressStyle={{ opacity: 0.7 }}
                        onPress={() => confirmRemove(v.custom_variation_id)}
                        cursor="pointer"
                      >
                        <Text fontSize={T.fontSize.sm} fontWeight="500" color={T.danger}>Del</Text>
                      </XStack>
                    </XStack>
                  ))}
                </YStack>
              )
            )}

            {/* ── Common variations — multiple exercises only ── */}
            {selectedExIds.length > 1 && (
              <YStack marginBottom={T.space.lg}>
                {loadingVars ? (
                  <Spinner size="small" color={T.accent} alignSelf="center" />
                ) : (
                  <>
                    <Text fontSize={T.fontSize.sm} fontWeight="600" color={T.muted} marginBottom={T.space.sm}>
                      Common to all selected
                    </Text>
                    {commonVars.length === 0 ? (
                      <Text color={T.muted} fontSize={T.fontSize.sm}>No shared variations.</Text>
                    ) : (
                      commonVars.map((v, i) => (
                        <XStack
                          key={v.custom_variation_id}
                          alignItems="center"
                          paddingVertical={T.space.md}
                          borderBottomWidth={i < commonVars.length - 1 ? 0.5 : 0}
                          borderBottomColor={T.border}
                        >
                          <Text flex={1} fontSize={15} color={T.primary}>{v.variation_name}</Text>
                          <XStack
                            paddingHorizontal={T.space.sm}
                            paddingVertical={T.space.xs + 2}
                            marginLeft={T.space.sm}
                            borderRadius={T.radius.sm}
                            backgroundColor={T.dangerBg}
                            pressStyle={{ opacity: 0.7 }}
                            onPress={() => Alert.alert(
                              'Remove from all',
                              `Remove "${v.variation_name}" from all selected exercises?`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Remove', style: 'destructive', onPress: () => guard(async () => {
                                  for (const exId of selectedExIds) {
                                    await supabase.from('user_custom_exercise_variation_bridge')
                                      .delete()
                                      .eq('custom_exercise_id', exId)
                                      .eq('custom_variation_id', v.custom_variation_id);
                                  }
                                  loadForExercises(selectedExIds);
                                  refreshExerciseDetails();
                                })},
                              ]
                            )}
                            cursor="pointer"
                          >
                            <Text fontSize={T.fontSize.sm} fontWeight="500" color={T.danger}>Del</Text>
                          </XStack>
                        </XStack>
                      ))
                    )}
                  </>
                )}
              </YStack>
            )}

            {/* ── Add variation ── */}
            <Separator borderColor={T.border} marginBottom={T.space.lg} />
            <SegmentedControl
              options={[{ label: 'Existing', value: 'existing' }, { label: 'New', value: 'new' }]}
              value={addMode}
              onChange={(v) => { setAddMode(v as 'existing' | 'new'); setSelectedExistingIds([]); setNewName(''); }}
            />
            <YStack marginTop={T.space.md}>
              {addMode === 'existing' ? (
                existingVars.length === 0 ? (
                  <Text color={T.muted} fontSize={T.fontSize.sm}>No other variations available.</Text>
                ) : (
                  <DropdownSelect
                    options={existingVars.map((v) => ({ label: v.variation_name, value: v.custom_variation_id }))}
                    multiSelect
                    selectedValues={selectedExistingIds}
                    onChangeMulti={setSelectedExistingIds}
                    placeholder="Select existing variations…"
                    searchable
                  />
                )
              ) : (
                <Input placeholder="Variation name" value={newName} onChangeText={setNewName} />
              )}
            </YStack>
            <YStack marginTop={T.space.sm}>
              <Button
                label={
                  (addMode === 'existing' && selectedExistingIds.length > 1) || selectedExIds.length > 1
                    ? 'Add Variations'
                    : 'Add Variation'
                }
                onPress={add}
                loading={adding}
              />
            </YStack>
          </YStack>
        )}

        <YStack height={T.space.xxl} />
      </ScrollView>

      {/* ── Edit modal ── */}
      <SlideUpModal visible={!!editVar} onClose={() => setEditVar(null)}>
        <YStack
          backgroundColor={T.surface}
          borderTopLeftRadius={T.radius.lg}
          borderTopRightRadius={T.radius.lg}
          padding={T.space.xl}
          paddingBottom={T.space.xxl}
        >
          <Text fontSize={T.fontSize.lg} fontWeight="700" color={T.primary} marginBottom={T.space.md}>Edit Variation</Text>
          <Input
            value={editVar?.variation_name ?? ''}
            onChangeText={(t) => setEditVar((v) => v ? { ...v, variation_name: t } : v)}
            placeholder="Variation name"
          />
          <XStack gap={T.space.sm} marginTop={T.space.md}>
            <YStack flex={1}><Button label="Save" onPress={saveEdit} /></YStack>
            <YStack flex={1}><Button label="Cancel" onPress={() => setEditVar(null)} variant="ghost" /></YStack>
          </XStack>
        </YStack>
      </SlideUpModal>
    </YStack>
  );
}
