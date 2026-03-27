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
  const { exercises, refreshExerciseDetails, refreshVariations } = useExerciseData();
  const { user } = useAuthContext();

  const [selectedExId, setSelectedExId] = useState<number | null>(null);
  const [assignedVars, setAssignedVars] = useState<Variation[]>([]);
  const [loadingVars, setLoadingVars]   = useState(false);
  const [addMode, setAddMode]           = useState<'existing' | 'new'>('existing');
  const [existingVars, setExistingVars] = useState<Variation[]>([]);
  const [selectedExistingIds, setSelectedExistingIds] = useState<number[]>([]);
  const [newName, setNewName]           = useState('');
  const [adding, setAdding]             = useState(false);
  const [editVar, setEditVar]           = useState<Variation | null>(null);

  const loadAssigned = useCallback(async (exId: number) => {
    setLoadingVars(true);
    const [assignedRes, allRes] = await Promise.all([
      supabase
        .from('user_custom_exercise_variation_bridge')
        .select('user_custom_variation(custom_variation_id, variation_name)')
        .eq('custom_exercise_id', exId),
      supabase
        .from('user_custom_variation')
        .select('custom_variation_id, variation_name')
        .eq('is_active', true),
    ]);
    setLoadingVars(false);

    const assigned: Variation[] = assignedRes.data
      ? assignedRes.data.flatMap((r: any) => r.user_custom_variation ? [r.user_custom_variation] : [])
      : [];
    setAssignedVars(assigned);

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
    setSelectedExistingIds([]);
  }, []);

  useEffect(() => {
    if (!selectedExId) { setAssignedVars([]); return; }
    loadAssigned(selectedExId);
  }, [selectedExId]);

  function onSelectExercise(exId: number | null) {
    setSelectedExId(exId);
    setNewName('');
    setSelectedExistingIds([]);
    setAddMode('existing');
  }

  function add() { return guard(async () => {
    if (!selectedExId || !user) return;
    setAdding(true);

    if (addMode === 'existing') {
      if (!selectedExistingIds.length) { setAdding(false); return Alert.alert('Select a variation'); }
      const rows = selectedExistingIds.map((id) => ({
        custom_exercise_id: selectedExId,
        custom_variation_id: id,
        user_id: user.id,
      }));
      const { error } = await supabase.from('user_custom_exercise_variation_bridge').insert(rows);
      if (error) { setAdding(false); return Alert.alert('Error', error.message); }
      setSelectedExistingIds([]);
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

      const { data: bridgeExists } = await supabase
        .from('user_custom_exercise_variation_bridge')
        .select('custom_exercise_id')
        .eq('custom_exercise_id', selectedExId)
        .eq('custom_variation_id', varId)
        .maybeSingle();

      if (!bridgeExists) {
        await supabase.from('user_custom_exercise_variation_bridge').insert({
          custom_exercise_id: selectedExId,
          custom_variation_id: varId,
          user_id: user.id,
        });
      }
      setNewName('');
    }

    setAdding(false);
    loadAssigned(selectedExId);
    refreshExerciseDetails();
    refreshVariations();
  }); }

  function saveEdit() { return guard(async () => {
    if (!editVar?.variation_name.trim() || !selectedExId) return;
    const { error } = await supabase
      .from('user_custom_variation')
      .update({ variation_name: editVar.variation_name })
      .eq('custom_variation_id', editVar.custom_variation_id);
    if (error) return Alert.alert('Error', error.message);
    setEditVar(null);
    loadAssigned(selectedExId);
    refreshExerciseDetails();
    refreshVariations();
  }); }

  function confirmRemove(varId: number) {
    Alert.alert('Remove Variation', 'Remove this variation from the exercise?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => guard(async () => {
        if (!selectedExId) return;
        await supabase.from('user_custom_exercise_variation_bridge')
          .delete()
          .eq('custom_exercise_id', selectedExId)
          .eq('custom_variation_id', varId);
        loadAssigned(selectedExId);
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
          options={exercises.map((ex) => ({ label: ex.exercise_name, value: ex.custom_exercise_id }))}
          value={selectedExId}
          onChange={onSelectExercise}
          placeholder="Select exercise…"
        />

        {selectedExId && (
          <YStack marginTop={T.space.xl}>

            {/* ── Assigned variations list ── */}
            {loadingVars ? (
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
                label={addMode === 'existing' && selectedExistingIds.length > 1 ? 'Add Variations' : 'Add Variation'}
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
