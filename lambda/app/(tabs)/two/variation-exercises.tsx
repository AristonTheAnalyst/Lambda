import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Separator, Spinner, Text, XStack, YStack } from 'tamagui';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DropdownSelect } from '@/components/FormControls';
import { useExerciseData, Exercise } from '@/lib/ExerciseDataContext';
import { useAuthContext } from '@/lib/AuthContext';
import GlassButton from '@/components/GlassButton';
import Button from '@/components/Button';
import supabase from '@/lib/supabase';
import { useAsyncGuard } from '@/lib/asyncGuard';
import T from '@/constants/Theme';

// ─── Reusable row components ──────────────────────────────────────────────────

function ItemRow({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <XStack alignItems="center" paddingVertical={T.space.md}>
      <Text flex={1} fontSize={15} color={T.primary}>{label}</Text>
      <XStack marginLeft={T.space.sm}>
        <GlassButton icon="trash" iconSize={14} color={T.danger} onPress={onRemove} />
      </XStack>
    </XStack>
  );
}

function SectionList<Item extends { label: string; id: number }>({
  items, loading, emptyText, onRemove,
}: {
  items: Item[];
  loading: boolean;
  emptyText: string;
  onRemove: (item: Item) => void;
}) {
  if (loading) return <Spinner size="small" color={T.accent} alignSelf="center" marginBottom={T.space.lg} />;
  if (items.length === 0) return <Text color={T.muted} fontSize={T.fontSize.sm} marginBottom={T.space.lg}>{emptyText}</Text>;
  return (
    <YStack marginBottom={T.space.lg}>
      {items.map((item, i) => (
        <YStack key={item.id} borderBottomWidth={i < items.length - 1 ? 0.5 : 0} borderBottomColor={T.border}>
          <ItemRow label={item.label} onRemove={() => onRemove(item)} />
        </YStack>
      ))}
    </YStack>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function VariationExercisesScreen() {
  const guard = useAsyncGuard();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { exercises, variations, exerciseDetailMap, refreshExerciseDetails } = useExerciseData();
  const { user } = useAuthContext();

  const [selectedVarIds, setSelectedVarIds]               = useState<number[]>([]);
  const [assignedExes, setAssignedExes]                   = useState<Exercise[]>([]);
  const [commonExes, setCommonExes]                       = useState<Exercise[]>([]);
  const [loadingVar, setLoadingVar]                       = useState(false);
  const [existingExes, setExistingExes]                   = useState<Exercise[]>([]);
  const [selectedExistingExIds, setSelectedExistingExIds] = useState<number[]>([]);
  const [addingEx, setAddingEx]                           = useState(false);

  const singleVarId = selectedVarIds.length === 1 ? selectedVarIds[0] : null;

  const exercisesPerVariation = useMemo(() => {
    const counts: Record<number, number> = {};
    Object.values(exerciseDetailMap).forEach((ex) => {
      ex.assigned_variations.forEach((v) => {
        counts[v.custom_variation_id] = (counts[v.custom_variation_id] ?? 0) + 1;
      });
    });
    return counts;
  }, [exerciseDetailMap]);

  const loadForVariations = useCallback(async (varIds: number[], allExercises: Exercise[]) => {
    if (!varIds.length) { setAssignedExes([]); setCommonExes([]); setExistingExes([]); return; }
    setLoadingVar(true);

    if (varIds.length === 1) {
      const { data } = await supabase
        .from('user_custom_exercise_variation_bridge')
        .select('user_custom_exercise(custom_exercise_id, exercise_name, exercise_volume_type, is_active)')
        .eq('custom_variation_id', varIds[0]);
      const assigned: Exercise[] = (data ?? []).flatMap((r: any) =>
        r.user_custom_exercise ? [r.user_custom_exercise] : []
      );
      setAssignedExes(assigned);
      setCommonExes([]);
      const assignedIds = new Set(assigned.map((e) => e.custom_exercise_id));
      setExistingExes(allExercises.filter((e) => !assignedIds.has(e.custom_exercise_id)));
    } else {
      const { data } = await supabase
        .from('user_custom_exercise_variation_bridge')
        .select('custom_variation_id, user_custom_exercise(custom_exercise_id, exercise_name, exercise_volume_type, is_active)')
        .in('custom_variation_id', varIds);
      const countByEx = new Map<number, Exercise>();
      const varCount  = new Map<number, Set<number>>();
      (data ?? []).forEach((r: any) => {
        const e = r.user_custom_exercise; if (!e) return;
        if (!varCount.has(e.custom_exercise_id)) varCount.set(e.custom_exercise_id, new Set());
        varCount.get(e.custom_exercise_id)!.add(r.custom_variation_id);
        countByEx.set(e.custom_exercise_id, e);
      });
      const common = [...varCount.entries()]
        .filter(([, s]) => s.size === varIds.length)
        .map(([id]) => countByEx.get(id)!);
      setCommonExes(common);
      setAssignedExes([]);
      const commonIds = new Set(common.map((e) => e.custom_exercise_id));
      setExistingExes(allExercises.filter((e) => !commonIds.has(e.custom_exercise_id)));
    }
    setLoadingVar(false);
    setSelectedExistingExIds([]);
  }, []);

  useEffect(() => { loadForVariations(selectedVarIds, exercises); }, [selectedVarIds, exercises]);

  function addEx() { return guard(async () => {
    if (!selectedVarIds.length || !user) return;
    if (!selectedExistingExIds.length) return Alert.alert('Select an exercise');
    setAddingEx(true);

    for (const varId of selectedVarIds) {
      for (const exId of selectedExistingExIds) {
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

    setSelectedExistingExIds([]);
    setAddingEx(false);
    loadForVariations(selectedVarIds, exercises);
    refreshExerciseDetails();
  }); }

  function confirmRemoveEx(exId: number, fromAllVarIds: number[]) {
    Alert.alert(
      'Remove Exercise',
      fromAllVarIds.length > 1 ? 'Remove from all selected variations?' : 'Remove this exercise from the variation?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => guard(async () => {
          for (const varId of fromAllVarIds) {
            await supabase.from('user_custom_exercise_variation_bridge').delete()
              .eq('custom_exercise_id', exId).eq('custom_variation_id', varId);
          }
          loadForVariations(selectedVarIds, exercises);
          refreshExerciseDetails();
        })},
      ]
    );
  }

  return (
    <YStack flex={1} backgroundColor={T.bg}>
      <XStack
        style={{ height: insets.top + 52, paddingTop: insets.top }}
        paddingHorizontal={T.space.md}
        alignItems="center"
      >
        <XStack minWidth={80}>
          <GlassButton icon="chevron-left" label="Back" onPress={() => router.back()} />
        </XStack>
        <Text flex={1} textAlign="center" color={T.primary} fontSize={T.fontSize.xl} fontWeight="600">
          Variations
        </Text>
        <XStack width={80} />
      </XStack>
      <Separator borderColor={T.border} />
      <XStack justifyContent="center" paddingVertical={T.space.md}>
        <XStack backgroundColor={T.surface} borderRadius={T.radius.sm} padding={3} gap={3}>
          <XStack
            paddingHorizontal={T.space.md} paddingVertical={6} borderRadius={T.radius.sm - 1}
            pressStyle={{ opacity: 0.7 }} cursor="pointer"
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); router.back(); }}
          >
            <Text fontSize={T.fontSize.sm} fontWeight="600" color={T.muted}>Exercise</Text>
          </XStack>
          <XStack paddingHorizontal={T.space.md} paddingVertical={6} borderRadius={T.radius.sm - 1} backgroundColor={T.accent}>
            <Text fontSize={T.fontSize.sm} fontWeight="600" color={T.accentText}>Variation</Text>
          </XStack>
        </XStack>
      </XStack>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: T.space.lg, paddingBottom: T.space.lg }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text fontSize={T.fontSize.sm} fontWeight="500" color={T.primary} marginBottom={T.space.xs}>Variation</Text>
        <DropdownSelect
          options={variations.map((v) => {
            const count = exercisesPerVariation[v.custom_variation_id] ?? 0;
            const label = count === 0
              ? v.variation_name
              : `${v.variation_name} (${count} ${count === 1 ? 'Exercise' : 'Exercises'})`;
            return { label, value: v.custom_variation_id };
          })}
          multiSelect
          selectedValues={selectedVarIds}
          onChangeMulti={(ids) => { setSelectedVarIds(ids); setSelectedExistingExIds([]); }}
          placeholder="Select variation…"
          searchable
        />

        {selectedVarIds.length > 0 && (
          <YStack marginTop={T.space.xl}>

            {singleVarId && (
              <SectionList
                items={assignedExes.map((e) => ({ ...e, id: e.custom_exercise_id, label: e.exercise_name }))}
                loading={loadingVar}
                emptyText="No exercises yet. Add one below."
                onRemove={(item) => confirmRemoveEx(item.id, selectedVarIds)}
              />
            )}

            {selectedVarIds.length > 1 && (
              <YStack marginBottom={T.space.lg}>
                <Text fontSize={T.fontSize.sm} fontWeight="600" color={T.muted} marginBottom={T.space.sm}>
                  Common to all selected
                </Text>
                {loadingVar
                  ? <Spinner size="small" color={T.accent} alignSelf="center" />
                  : <SectionList
                      items={commonExes.map((e) => ({ ...e, id: e.custom_exercise_id, label: e.exercise_name }))}
                      loading={false}
                      emptyText="No shared exercises."
                      onRemove={(item) => confirmRemoveEx(item.id, selectedVarIds)}
                    />
                }
              </YStack>
            )}

            <Separator borderColor={T.border} marginBottom={T.space.lg} />
            {existingExes.length === 0
              ? <Text color={T.muted} fontSize={T.fontSize.sm} marginBottom={T.space.md}>
                  All exercises already assigned.
                </Text>
              : <DropdownSelect
                  options={existingExes.map((e) => ({ label: e.exercise_name, value: e.custom_exercise_id }))}
                  multiSelect
                  selectedValues={selectedExistingExIds}
                  onChangeMulti={setSelectedExistingExIds}
                  placeholder="Select exercises to add…"
                  searchable
                />
            }
            <YStack marginTop={T.space.sm}>
              <Button
                label={selectedExistingExIds.length > 1 || selectedVarIds.length > 1 ? 'Add Exercises' : 'Add Exercise'}
                onPress={addEx}
                loading={addingEx}
              />
            </YStack>
          </YStack>
        )}

        <YStack height={T.space.xxl} />
      </ScrollView>
    </YStack>
  );
}
