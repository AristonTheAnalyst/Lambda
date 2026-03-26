import React, { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { DropdownSelect, SlideUpModal } from '@/components/FormControls';
import { useExerciseData } from '@/lib/ExerciseDataContext';
import Button from '@/components/Button';
import Input from '@/components/Input';
import supabase from '@/lib/supabase';
import T from '@/constants/Theme';

interface Variation {
  exercise_variation_id: number;
  exercise_variation_name: string;
  variation_type_id: number;
  variation_type_name?: string;
}

export default function VariationsScreen() {
  const { variations, variationTypes, refreshVariations } = useExerciseData();
  const [name, setName]     = useState('');
  const [typeId, setTypeId] = useState<number | null>(variationTypes[0]?.variation_type_id ?? null);
  const [creating, setCreating] = useState(false);
  const [editVar, setEditVar]   = useState<Variation | null>(null);

  const typeOptions = variationTypes.map((vt) => ({ label: vt.variation_type_name, value: vt.variation_type_id }));

  async function create() {
    if (!name.trim()) return Alert.alert('Name required');
    if (!typeId) return Alert.alert('Select a variation type');
    setCreating(true);
    const { error } = await supabase.from('dim_exercise_variation').insert({
      exercise_variation_name: name.trim(),
      variation_type_id: typeId,
    });
    setCreating(false);
    if (error) return Alert.alert('Error', error.message);
    setName('');
    refreshVariations();
  }

  async function saveEdit() {
    if (!editVar?.exercise_variation_name.trim()) return;
    const { error } = await supabase
      .from('dim_exercise_variation')
      .update({
        exercise_variation_name: editVar.exercise_variation_name,
        variation_type_id: editVar.variation_type_id,
      })
      .eq('exercise_variation_id', editVar.exercise_variation_id);
    if (error) return Alert.alert('Error', error.message);
    setEditVar(null);
    refreshVariations();
  }

  function confirmDelete(id: number) {
    Alert.alert('Delete Variation', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('dim_exercise_variation').update({ is_active: false }).eq('exercise_variation_id', id);
        refreshVariations();
      }},
    ]);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: T.bg }}
      contentContainerStyle={{ padding: T.space.lg }}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Create form ── */}
      <Text fontSize="$lg" fontWeight="700" color="$color" marginBottom="$md">New Variation</Text>
      <Input placeholder="Variation name" value={name} onChangeText={setName} />

      <Text fontSize="$sm" fontWeight="500" color="$color" marginTop="$md" marginBottom="$xs">Variation type</Text>
      <DropdownSelect options={typeOptions} value={typeId} onChange={setTypeId} placeholder="Select type…" />

      <YStack marginTop="$md">
        <Button label="Add Variation" onPress={create} loading={creating} />
      </YStack>

      {/* ── List ── */}
      <Text fontSize="$lg" fontWeight="700" color="$color" marginTop="$xxl" marginBottom="$md">All Variations</Text>
      {variations.length === 0 ? (
        <Text color="$muted" padding="$xs">No variations yet.</Text>
      ) : (
        variations.map((v) => (
          <XStack
            key={v.exercise_variation_id}
            alignItems="center"
            paddingVertical="$md"
            borderBottomWidth={0.5}
            borderBottomColor="$borderColor"
          >
            <YStack flex={1}>
              <Text fontSize={15} color="$color">{v.exercise_variation_name}</Text>
              <Text fontSize="$xs" color="$muted" marginTop="$xs">{v.variation_type_name}</Text>
            </YStack>
            <XStack
              paddingHorizontal="$sm"
              paddingVertical={T.space.xs + 2}
              marginLeft="$sm"
              borderRadius="$sm"
              backgroundColor="$accentBg"
              pressStyle={{ opacity: 0.7 }}
              onPress={() => setEditVar({ ...v })}
              cursor="pointer"
            >
              <Text fontSize="$sm" fontWeight="500" color="$accent">Edit</Text>
            </XStack>
            <XStack
              paddingHorizontal="$sm"
              paddingVertical={T.space.xs + 2}
              marginLeft="$sm"
              borderRadius="$sm"
              backgroundColor="$dangerBg"
              pressStyle={{ opacity: 0.7 }}
              onPress={() => confirmDelete(v.exercise_variation_id)}
              cursor="pointer"
            >
              <Text fontSize="$sm" fontWeight="500" color="$danger">Del</Text>
            </XStack>
          </XStack>
        ))
      )}
      <YStack height={T.space.xxl} />

      {/* ── Edit modal ── */}
      <SlideUpModal visible={!!editVar} onClose={() => setEditVar(null)}>
        <YStack
          backgroundColor="$surface"
          borderTopLeftRadius="$lg"
          borderTopRightRadius="$lg"
          padding="$xl"
          paddingBottom="$xxl"
        >
          <Text fontSize="$lg" fontWeight="700" color="$color" marginBottom="$md">Edit Variation</Text>
          <Input
            value={editVar?.exercise_variation_name ?? ''}
            onChangeText={(t) => setEditVar((v) => v ? { ...v, exercise_variation_name: t } : v)}
            placeholder="Variation name"
          />
          <Text fontSize="$sm" fontWeight="500" color="$color" marginTop="$md" marginBottom="$xs">Variation type</Text>
          <DropdownSelect
            options={typeOptions}
            value={editVar?.variation_type_id ?? null}
            onChange={(v) => setEditVar((e) => e ? { ...e, variation_type_id: v } : e)}
            placeholder="Select type…"
          />
          <XStack gap="$sm" marginTop="$sm">
            <YStack flex={1}><Button label="Save" onPress={saveEdit} /></YStack>
            <YStack flex={1}><Button label="Cancel" onPress={() => setEditVar(null)} variant="ghost" /></YStack>
          </XStack>
        </YStack>
      </SlideUpModal>
    </ScrollView>
  );
}
