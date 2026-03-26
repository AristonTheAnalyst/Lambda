import React, { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { SegmentedControl, SlideUpModal } from '@/components/FormControls';
import { useExerciseData } from '@/lib/ExerciseDataContext';
import Button from '@/components/Button';
import Input from '@/components/Input';
import supabase from '@/lib/supabase';
import T from '@/constants/Theme';

interface Exercise {
  exercise_id: number;
  exercise_name: string;
  exercise_volume_type: string;
  exercise_intensity_type: string;
  is_active: boolean;
}

const VOLUME_OPTIONS    = [{ label: 'Reps', value: 'reps' }, { label: 'Duration', value: 'duration' }];
const INTENSITY_OPTIONS = [{ label: 'Weight', value: 'weight' }, { label: 'Distance', value: 'distance' }];

export default function ExercisesScreen() {
  const { exercises, refreshExercises } = useExerciseData();
  const [name, setName]       = useState('');
  const [volume, setVolume]   = useState('reps');
  const [intensity, setIntensity] = useState('weight');
  const [creating, setCreating]   = useState(false);
  const [editEx, setEditEx]       = useState<Exercise | null>(null);

  async function create() {
    if (!name.trim()) return Alert.alert('Name required');
    setCreating(true);
    const { error } = await supabase.from('dim_exercise').insert({
      exercise_name: name.trim(),
      exercise_volume_type: volume,
      exercise_intensity_type: intensity,
    });
    setCreating(false);
    if (error) return Alert.alert('Error', error.message);
    setName('');
    refreshExercises();
  }

  async function saveEdit() {
    if (!editEx?.exercise_name.trim()) return;
    const { error } = await supabase
      .from('dim_exercise')
      .update({
        exercise_name: editEx.exercise_name,
        exercise_volume_type: editEx.exercise_volume_type,
        exercise_intensity_type: editEx.exercise_intensity_type,
      })
      .eq('exercise_id', editEx.exercise_id);
    if (error) return Alert.alert('Error', error.message);
    setEditEx(null);
    refreshExercises();
  }

  function confirmDelete(id: number) {
    Alert.alert('Delete Exercise', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('dim_exercise').update({ is_active: false }).eq('exercise_id', id);
        refreshExercises();
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
      <Text fontSize="$lg" fontWeight="700" color="$color" marginBottom="$md">New Exercise</Text>
      <Input placeholder="Exercise name" value={name} onChangeText={setName} />

      <Text fontSize="$sm" fontWeight="500" color="$color" marginTop="$md" marginBottom="$xs">Volume type</Text>
      <SegmentedControl options={VOLUME_OPTIONS} value={volume} onChange={setVolume} />

      <Text fontSize="$sm" fontWeight="500" color="$color" marginTop="$md" marginBottom="$xs">Intensity type</Text>
      <SegmentedControl options={INTENSITY_OPTIONS} value={intensity} onChange={setIntensity} />

      <YStack marginTop="$md">
        <Button label="Create Exercise" onPress={create} loading={creating} />
      </YStack>

      {/* ── List ── */}
      <Text fontSize="$lg" fontWeight="700" color="$color" marginTop="$xxl" marginBottom="$md">All Exercises</Text>
      {exercises.length === 0 ? (
        <Text color="$muted" padding="$xs">No exercises yet.</Text>
      ) : (
        exercises.map((ex) => (
          <XStack
            key={ex.exercise_id}
            alignItems="center"
            paddingVertical="$md"
            borderBottomWidth={0.5}
            borderBottomColor="$borderColor"
          >
            <YStack flex={1}>
              <Text fontSize={15} color="$color">{ex.exercise_name}</Text>
              <Text fontSize="$xs" color="$muted" marginTop="$xs">
                {ex.exercise_volume_type} · {ex.exercise_intensity_type}
              </Text>
            </YStack>
            <XStack
              paddingHorizontal="$sm"
              paddingVertical={T.space.xs + 2}
              marginLeft="$sm"
              borderRadius="$sm"
              backgroundColor="$accentBg"
              pressStyle={{ opacity: 0.7 }}
              onPress={() => setEditEx({ ...ex })}
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
              onPress={() => confirmDelete(ex.exercise_id)}
              cursor="pointer"
            >
              <Text fontSize="$sm" fontWeight="500" color="$danger">Del</Text>
            </XStack>
          </XStack>
        ))
      )}
      <YStack height={T.space.xxl} />

      {/* ── Edit modal ── */}
      <SlideUpModal visible={!!editEx} onClose={() => setEditEx(null)}>
        <YStack
          backgroundColor="$surface"
          borderTopLeftRadius="$lg"
          borderTopRightRadius="$lg"
          padding="$xl"
          paddingBottom="$xxl"
        >
          <Text fontSize="$lg" fontWeight="700" color="$color" marginBottom="$md">Edit Exercise</Text>
          <Input
            value={editEx?.exercise_name ?? ''}
            onChangeText={(t) => setEditEx((e) => e ? { ...e, exercise_name: t } : e)}
            placeholder="Exercise name"
          />
          <Text fontSize="$sm" fontWeight="500" color="$color" marginTop="$md" marginBottom="$xs">Volume type</Text>
          <SegmentedControl
            options={VOLUME_OPTIONS}
            value={editEx?.exercise_volume_type ?? 'reps'}
            onChange={(v) => setEditEx((e) => e ? { ...e, exercise_volume_type: v } : e)}
          />
          <Text fontSize="$sm" fontWeight="500" color="$color" marginTop="$md" marginBottom="$xs">Intensity type</Text>
          <SegmentedControl
            options={INTENSITY_OPTIONS}
            value={editEx?.exercise_intensity_type ?? 'weight'}
            onChange={(v) => setEditEx((e) => e ? { ...e, exercise_intensity_type: v } : e)}
          />
          <XStack gap="$sm" marginTop="$sm">
            <YStack flex={1}><Button label="Save" onPress={saveEdit} /></YStack>
            <YStack flex={1}><Button label="Cancel" onPress={() => setEditEx(null)} variant="ghost" /></YStack>
          </XStack>
        </YStack>
      </SlideUpModal>
    </ScrollView>
  );
}
