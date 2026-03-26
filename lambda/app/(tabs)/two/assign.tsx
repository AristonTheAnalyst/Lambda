import React, { useState, useEffect } from 'react';
import { Alert, ScrollView } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, XStack, YStack } from 'tamagui';
import { DropdownSelect } from '@/components/FormControls';
import { useExerciseData } from '@/lib/ExerciseDataContext';
import Button from '@/components/Button';
import supabase from '@/lib/supabase';
import { useAsyncGuard } from '@/lib/asyncGuard';
import T from '@/constants/Theme';

export default function AssignVariationsScreen() {
  const guard = useAsyncGuard();
  const { exercises, variations, refreshExerciseDetails } = useExerciseData();
  const [assignExId, setAssignExId]         = useState<number | null>(null);
  const [selectedVarIds, setSelectedVarIds] = useState<number[]>([]);
  const [expandedTypes, setExpandedTypes]   = useState<Set<string>>(new Set());
  const [saving, setSaving]                 = useState(false);

  useEffect(() => {
    if (!assignExId) { setSelectedVarIds([]); setExpandedTypes(new Set()); return; }
    (async () => {
      const { data } = await supabase
        .from('bridge_exercise_variation')
        .select('exercise_variation_id')
        .eq('exercise_id', assignExId);
      if (data) setSelectedVarIds(data.map((r: any) => r.exercise_variation_id));
    })();
  }, [assignExId]);

  function toggleType(typeName: string) {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      next.has(typeName) ? next.delete(typeName) : next.add(typeName);
      return next;
    });
  }

  function toggle(varId: number) {
    setSelectedVarIds((prev) =>
      prev.includes(varId) ? prev.filter((id) => id !== varId) : [...prev, varId]
    );
  }

  function save() { return guard(async () => {
    if (!assignExId) return Alert.alert('Select an exercise first');
    setSaving(true);
    await supabase.from('bridge_exercise_variation').delete().eq('exercise_id', assignExId);
    if (selectedVarIds.length > 0) {
      await supabase.from('bridge_exercise_variation').insert(
        selectedVarIds.map((vid) => ({ exercise_id: assignExId, exercise_variation_id: vid }))
      );
    }
    setSaving(false);
    refreshExerciseDetails();
    Alert.alert('Saved', 'Variations assigned successfully.');
  }); }

  const grouped = variations.reduce<Record<string, typeof variations>>((acc, v) => {
    if (!acc[v.variation_type_name]) acc[v.variation_type_name] = [];
    acc[v.variation_type_name].push(v);
    return acc;
  }, {});

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: T.bg }}
        contentContainerStyle={{ padding: T.space.lg }}
        keyboardShouldPersistTaps="handled"
      >
      <Text fontSize={T.fontSize.sm} fontWeight="500" color={T.primary} marginTop={T.space.xs} marginBottom={T.space.xs}>Exercise</Text>
      <DropdownSelect
        options={exercises.map((ex) => ({ label: ex.exercise_name, value: ex.exercise_id }))}
        value={assignExId}
        onChange={setAssignExId}
        placeholder="Choose exercise…"
      />

      {assignExId && (
        <>
          <Text fontSize={T.fontSize.lg} fontWeight="700" color={T.primary} marginTop={T.space.xl} marginBottom={T.space.sm}>
            Select Variations
          </Text>

          {Object.entries(grouped).map(([typeName, vars]) => {
            const isExpanded    = expandedTypes.has(typeName);
            const selectedCount = vars.filter((v) => selectedVarIds.includes(v.exercise_variation_id)).length;

            return (
              <YStack
                key={typeName}
                borderWidth={1}
                borderColor={T.border}
                borderRadius={T.radius.md}
                marginBottom={T.space.sm}
                overflow="hidden"
              >
                {/* Type header row */}
                <XStack
                  alignItems="center"
                  paddingVertical={T.space.md}
                  paddingHorizontal={T.space.md}
                  backgroundColor={T.surface}
                  pressStyle={{ opacity: 0.7 }}
                  onPress={() => toggleType(typeName)}
                  cursor="pointer"
                >
                  <YStack flex={1}>
                    <Text fontSize={15} fontWeight="600" color={T.primary}>{typeName}</Text>
                    {!isExpanded && selectedCount > 0 && (
                      <Text fontSize={T.fontSize.xs} color={T.accent} marginTop={T.space.xs}>{selectedCount} selected</Text>
                    )}
                  </YStack>
                  <FontAwesome
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={12}
                    color={T.muted}
                  />
                </XStack>

                {/* Variation rows */}
                {isExpanded && (
                  <YStack paddingHorizontal={T.space.md} paddingBottom={T.space.xs} backgroundColor={T.bg}>
                    {vars.map((v) => {
                      const checked = selectedVarIds.includes(v.exercise_variation_id);
                      return (
                        <XStack
                          key={v.exercise_variation_id}
                          alignItems="center"
                          paddingVertical={T.space.sm}
                          gap={T.space.md}
                          pressStyle={{ opacity: 0.7 }}
                          onPress={() => toggle(v.exercise_variation_id)}
                          cursor="pointer"
                        >
                          <XStack
                            width={22}
                            height={22}
                            borderRadius={T.radius.sm}
                            borderWidth={2}
                            borderColor={T.accent}
                            alignItems="center"
                            justifyContent="center"
                            backgroundColor={checked ? T.accent : 'transparent'}
                          >
                            {checked && <Text color={T.accentText} fontSize={T.fontSize.xs}>✓</Text>}
                          </XStack>
                          <Text fontSize={15} color={T.primary}>{v.exercise_variation_name}</Text>
                        </XStack>
                      );
                    })}
                  </YStack>
                )}
              </YStack>
            );
          })}

          <YStack marginTop={T.space.lg}>
            <Button label="Save Assignments" onPress={save} loading={saving} />
          </YStack>
        </>
      )}

      <YStack height={T.space.xxl} />
    </ScrollView>
  );
}
