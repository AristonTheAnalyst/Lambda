import React, { useState, useEffect, useCallback } from 'react';
import { Alert, ScrollView } from 'react-native';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DropdownSelect, SlideUpModal } from '@/components/FormControls';
import { useExerciseData } from '@/lib/ExerciseDataContext';
import GlassButton from '@/components/GlassButton';
import Button from '@/components/Button';
import Input from '@/components/Input';
import supabase from '@/lib/supabase';
import { useAsyncGuard, useUIGuard } from '@/lib/asyncGuard';
import T from '@/constants/Theme';

interface Variation {
  exercise_variation_id: number;
  exercise_variation_name: string;
}

export default function VariationsScreen() {
  const guard = useAsyncGuard();
  const openEdit = useUIGuard();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { exercises, refreshExerciseDetails, refreshVariations } = useExerciseData();

  const [selectedExId, setSelectedExId] = useState<number | null>(null);
  const [assignedVars, setAssignedVars] = useState<Variation[]>([]);
  const [loadingVars, setLoadingVars]   = useState(false);
  const [newName, setNewName]           = useState('');
  const [adding, setAdding]             = useState(false);
  const [editVar, setEditVar]           = useState<Variation | null>(null);

  const loadAssigned = useCallback(async (exId: number) => {
    setLoadingVars(true);
    const { data } = await supabase
      .from('bridge_exercise_variation')
      .select('dim_exercise_variation(exercise_variation_id, exercise_variation_name)')
      .eq('exercise_id', exId);
    setLoadingVars(false);
    if (data) {
      setAssignedVars(
        data.flatMap((r: any) =>
          r.dim_exercise_variation ? [r.dim_exercise_variation] : []
        )
      );
    }
  }, []);

  useEffect(() => {
    if (!selectedExId) { setAssignedVars([]); return; }
    loadAssigned(selectedExId);
  }, [selectedExId]);

  function onSelectExercise(exId: number | null) {
    setSelectedExId(exId);
    setNewName('');
  }

  function add() { return guard(async () => {
    if (!selectedExId) return;
    if (!newName.trim()) return Alert.alert('Name required');
    setAdding(true);
    const { data, error } = await supabase
      .from('dim_exercise_variation')
      .insert({ exercise_variation_name: newName.trim() })
      .select('exercise_variation_id')
      .single();
    if (error || !data) { setAdding(false); return Alert.alert('Error', error?.message ?? 'Failed to create variation'); }
    await supabase.from('bridge_exercise_variation').insert({
      exercise_id: selectedExId,
      exercise_variation_id: data.exercise_variation_id,
    });
    setAdding(false);
    setNewName('');
    loadAssigned(selectedExId);
    refreshExerciseDetails();
    refreshVariations();
  }); }

  function saveEdit() { return guard(async () => {
    if (!editVar?.exercise_variation_name.trim() || !selectedExId) return;
    const { error } = await supabase
      .from('dim_exercise_variation')
      .update({ exercise_variation_name: editVar.exercise_variation_name })
      .eq('exercise_variation_id', editVar.exercise_variation_id);
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
        await supabase.from('bridge_exercise_variation')
          .delete()
          .eq('exercise_id', selectedExId)
          .eq('exercise_variation_id', varId);
        await supabase.from('dim_exercise_variation')
          .update({ is_active: false })
          .eq('exercise_variation_id', varId);
        loadAssigned(selectedExId);
        refreshExerciseDetails();
        refreshVariations();
      })},
    ]);
  }

  return (
    <YStack flex={1} backgroundColor={T.bg}>
      <XStack paddingTop={insets.top} paddingHorizontal={T.space.md} paddingBottom={T.space.sm} alignItems="center">
        <XStack minWidth={80}><GlassButton icon="chevron-left" label="Back" onPress={() => router.back()} /></XStack>
        <Text flex={1} textAlign="center" color={T.primary} fontSize={T.fontSize.xl} fontWeight="600">Variations</Text>
        <XStack width={80} />
      </XStack>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: T.space.lg }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Exercise selector ── */}
        <Text fontSize={T.fontSize.sm} fontWeight="500" color={T.primary} marginBottom={T.space.xs}>Exercise</Text>
        <DropdownSelect
          options={exercises.map((ex) => ({ label: ex.exercise_name, value: ex.exercise_id }))}
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
                    key={v.exercise_variation_id}
                    alignItems="center"
                    paddingVertical={T.space.md}
                    borderBottomWidth={i < assignedVars.length - 1 ? 0.5 : 0}
                    borderBottomColor={T.border}
                  >
                    <Text flex={1} fontSize={15} color={T.primary}>{v.exercise_variation_name}</Text>
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
                      onPress={() => confirmRemove(v.exercise_variation_id)}
                      cursor="pointer"
                    >
                      <Text fontSize={T.fontSize.sm} fontWeight="500" color={T.danger}>Del</Text>
                    </XStack>
                  </XStack>
                ))}
              </YStack>
            )}

            {/* ── Add variation ── */}
            <Text fontSize={T.fontSize.sm} fontWeight="500" color={T.primary} marginBottom={T.space.xs}>New Variation</Text>
            <Input placeholder="Variation name" value={newName} onChangeText={setNewName} />
            <YStack marginTop={T.space.sm}>
              <Button label="Add Variation" onPress={add} loading={adding} />
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
            value={editVar?.exercise_variation_name ?? ''}
            onChangeText={(t) => setEditVar((v) => v ? { ...v, exercise_variation_name: t } : v)}
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
