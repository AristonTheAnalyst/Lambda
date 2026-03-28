import React, { useState, useCallback } from 'react';
import { Alert, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Separator, Spinner, Text, XStack, YStack } from 'tamagui';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DropdownSelect, SlideUpModal } from '@/components/FormControls';
import { useExerciseData } from '@/lib/ExerciseDataContext';
import { useAuthContext } from '@/lib/AuthContext';
import GlassButton from '@/components/GlassButton';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { useSQLiteContext } from 'expo-sqlite';
import {
  getBridgeForExercises,
  checkBridgeExists,
  addBridgeRow,
  removeBridgeRow,
} from '@/lib/offline/bridgeStore';
import {
  updateVariation,
} from '@/lib/offline/variationStore';
import { useAsyncGuard, useUIGuard } from '@/lib/asyncGuard';
import T from '@/constants/Theme';

interface Variation {
  custom_variation_id: number;
  variation_name: string;
}

// ─── Reusable row components ──────────────────────────────────────────────────

function ItemRow({ label, onEdit, onRemove }: { label: string; onEdit?: () => void; onRemove: () => void }) {
  return (
    <XStack alignItems="center" paddingVertical={T.space.md}>
      <Text flex={1} fontSize={15} color={T.primary}>{label}</Text>
      {onEdit && (
        <XStack marginLeft={T.space.sm}>
          <GlassButton icon="pencil" iconSize={14} onPress={onEdit} />
        </XStack>
      )}
      <XStack marginLeft={T.space.sm}>
        <GlassButton icon="trash" iconSize={14} color={T.danger} onPress={onRemove} />
      </XStack>
    </XStack>
  );
}

function SectionList<Item extends { label: string; id: number }>({
  items, loading, emptyText, onEdit, onRemove,
}: {
  items: Item[];
  loading: boolean;
  emptyText: string;
  onEdit?: (item: Item) => void;
  onRemove: (item: Item) => void;
}) {
  if (loading) return <Spinner size="small" color={T.accent} alignSelf="center" marginBottom={T.space.lg} />;
  if (items.length === 0) return <Text color={T.muted} fontSize={T.fontSize.sm} marginBottom={T.space.lg}>{emptyText}</Text>;
  return (
    <YStack marginBottom={T.space.lg}>
      {items.map((item, i) => (
        <YStack key={item.id} borderBottomWidth={i < items.length - 1 ? 0.5 : 0} borderBottomColor={T.border}>
          <ItemRow label={item.label} onEdit={onEdit ? () => onEdit(item) : undefined} onRemove={() => onRemove(item)} />
        </YStack>
      ))}
    </YStack>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function VariationsScreen() {
  const guard = useAsyncGuard();
  const openEdit = useUIGuard();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const { exercises, variations, exerciseDetailMap, refreshExerciseDetails, refreshVariations } = useExerciseData();
  const { user } = useAuthContext();

  const [selectedExIds, setSelectedExIds]                   = useState<number[]>([]);
  const [assignedVars, setAssignedVars]                     = useState<Variation[]>([]);
  const [commonVars, setCommonVars]                         = useState<Variation[]>([]);
  const [loadingEx, setLoadingEx]                           = useState(false);
  const [existingVars, setExistingVars]                     = useState<Variation[]>([]);
  const [selectedExistingVarIds, setSelectedExistingVarIds] = useState<number[]>([]);
  const [addingVar, setAddingVar]                           = useState(false);
  const [editVar, setEditVar]                               = useState<Variation | null>(null);

  const singleExId = selectedExIds.length === 1 ? selectedExIds[0] : null;

  const loadForExercises = useCallback(async (exIds: number[]) => {
    if (!exIds.length) { setAssignedVars([]); setCommonVars([]); setExistingVars([]); return; }
    setLoadingEx(true);

    const bridgeRows = await getBridgeForExercises(db, exIds);

    // Build a variation lookup from context (no extra DB query needed)
    const varById = new Map(variations.map((v) => [v.custom_variation_id, v]));

    if (exIds.length === 1) {
      const assigned: Variation[] = bridgeRows
        .filter((r) => r.custom_exercise_id === exIds[0])
        .flatMap((r) => {
          const v = varById.get(r.custom_variation_id);
          return v ? [v] : [];
        });
      setAssignedVars(assigned);
      setCommonVars([]);
      const assignedIds = new Set(assigned.map((v) => v.custom_variation_id));
      setExistingVars(variations.filter((v) => !assignedIds.has(v.custom_variation_id)));
    } else {
      const exCount = new Map<number, Set<number>>();
      bridgeRows.forEach((r) => {
        if (!exCount.has(r.custom_variation_id)) exCount.set(r.custom_variation_id, new Set());
        exCount.get(r.custom_variation_id)!.add(r.custom_exercise_id);
      });
      const common = [...exCount.entries()]
        .filter(([, s]) => s.size === exIds.length)
        .flatMap(([id]) => { const v = varById.get(id); return v ? [v] : []; });
      setCommonVars(common);
      setAssignedVars([]);
      const commonIds = new Set(common.map((v) => v.custom_variation_id));
      setExistingVars(variations.filter((v) => !commonIds.has(v.custom_variation_id)));
    }
    setLoadingEx(false);
    setSelectedExistingVarIds([]);
  }, [db, variations]);

  React.useEffect(() => { loadForExercises(selectedExIds); }, [selectedExIds]);

  function addVar() { return guard(async () => {
    if (!selectedExIds.length || !user) return;
    if (!selectedExistingVarIds.length) return Alert.alert('Select a variation');
    setAddingVar(true);

    for (const exId of selectedExIds) {
      for (const varId of selectedExistingVarIds) {
        const exists = await checkBridgeExists(db, exId, varId);
        if (!exists) {
          await addBridgeRow(db, user.id, exId, varId);
        }
      }
    }

    setSelectedExistingVarIds([]);
    setAddingVar(false);
    await Promise.all([loadForExercises(selectedExIds), refreshExerciseDetails()]);
  }); }

  function saveEdit() { return guard(async () => {
    if (!editVar?.variation_name.trim()) return;
    await updateVariation(db, editVar.custom_variation_id, editVar.variation_name);
    setEditVar(null);
    await Promise.all([loadForExercises(selectedExIds), refreshExerciseDetails(), refreshVariations()]);
  }); }

  function confirmRemoveVar(varId: number, fromAllExIds: number[]) {
    Alert.alert(
      'Remove Variation',
      fromAllExIds.length > 1 ? 'Remove from all selected exercises?' : 'Remove this variation from the exercise?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => guard(async () => {
          for (const exId of fromAllExIds) {
            await removeBridgeRow(db, exId, varId);
          }
          await Promise.all([loadForExercises(selectedExIds), refreshExerciseDetails()]);
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
          <XStack paddingHorizontal={T.space.md} paddingVertical={6} borderRadius={T.radius.sm - 1} backgroundColor={T.accent}>
            <Text fontSize={T.fontSize.sm} fontWeight="600" color={T.accentText}>Exercise</Text>
          </XStack>
          <XStack
            paddingHorizontal={T.space.md} paddingVertical={6} borderRadius={T.radius.sm - 1}
            pressStyle={{ opacity: 0.7 }} cursor="pointer"
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); router.push('/two/variation-exercises'); }}
          >
            <Text fontSize={T.fontSize.sm} fontWeight="600" color={T.muted}>Variation</Text>
          </XStack>
        </XStack>
      </XStack>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: T.space.lg, paddingBottom: T.space.lg }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text fontSize={T.fontSize.sm} fontWeight="500" color={T.primary} marginBottom={T.space.xs}>Exercise</Text>
        <DropdownSelect
          options={exercises.map((ex) => {
            const count = exerciseDetailMap[ex.custom_exercise_id]?.assigned_variations.length ?? 0;
            const label = count === 0
              ? ex.exercise_name
              : `${ex.exercise_name} (${count} ${count === 1 ? 'Variation' : 'Variations'})`;
            return { label, value: ex.custom_exercise_id };
          })}
          multiSelect
          selectedValues={selectedExIds}
          onChangeMulti={(ids) => { setSelectedExIds(ids); setSelectedExistingVarIds([]); }}
          placeholder="Select exercise…"
          searchable
        />

        {selectedExIds.length > 0 && (
          <YStack marginTop={T.space.xl}>

            {singleExId && (
              <SectionList
                items={assignedVars.map((v) => ({ ...v, id: v.custom_variation_id, label: v.variation_name }))}
                loading={loadingEx}
                emptyText="No variations yet. Add one below."
                onEdit={(item) => openEdit(() => setEditVar({ custom_variation_id: item.id, variation_name: item.label }))}
                onRemove={(item) => confirmRemoveVar(item.id, selectedExIds)}
              />
            )}

            {selectedExIds.length > 1 && (
              <YStack marginBottom={T.space.lg}>
                <Text fontSize={T.fontSize.sm} fontWeight="600" color={T.muted} marginBottom={T.space.sm}>
                  Common to all selected
                </Text>
                {loadingEx
                  ? <Spinner size="small" color={T.accent} alignSelf="center" />
                  : <SectionList
                      items={commonVars.map((v) => ({ ...v, id: v.custom_variation_id, label: v.variation_name }))}
                      loading={false}
                      emptyText="No shared variations."
                      onRemove={(item) => confirmRemoveVar(item.id, selectedExIds)}
                    />
                }
              </YStack>
            )}

            <Separator borderColor={T.border} marginBottom={T.space.lg} />
            {existingVars.length === 0
              ? <Text color={T.muted} fontSize={T.fontSize.sm}>No other variations available.</Text>
              : <DropdownSelect
                  options={existingVars.map((v) => ({ label: v.variation_name, value: v.custom_variation_id }))}
                  multiSelect
                  selectedValues={selectedExistingVarIds}
                  onChangeMulti={setSelectedExistingVarIds}
                  placeholder="Select variations to add…"
                  searchable
                />
            }
            <YStack marginTop={T.space.sm}>
              <Button
                label={selectedExistingVarIds.length > 1 || selectedExIds.length > 1 ? 'Add Variations' : 'Add Variation'}
                onPress={addVar}
                loading={addingVar}
              />
            </YStack>
          </YStack>
        )}

        <YStack height={T.space.xxl} />
      </ScrollView>

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
          <XStack gap={T.space.sm} marginTop={T.space.md} justifyContent="center">
            <Button label="Save" onPress={saveEdit} />
            <Button label="Cancel" onPress={() => setEditVar(null)} variant="ghost" />
          </XStack>
        </YStack>
      </SlideUpModal>
    </YStack>
  );
}
