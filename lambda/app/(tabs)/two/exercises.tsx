import React, { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SegmentedControl, SlideUpModal } from '@/components/FormControls';
import { Separator } from 'tamagui';
import { useExerciseData } from '@/lib/ExerciseDataContext';
import { useAuthContext } from '@/lib/AuthContext';
import GlassButton from '@/components/GlassButton';
import Button from '@/components/Button';
import Input from '@/components/Input';
import supabase from '@/lib/supabase';
import { useAsyncGuard, useUIGuard } from '@/lib/asyncGuard';
import T from '@/constants/Theme';

interface Exercise {
  custom_exercise_id: number;
  exercise_name: string;
  exercise_volume_type: string;
  is_active: boolean;
}

const VOLUME_OPTIONS = [{ label: 'Reps', value: 'reps' }, { label: 'Duration', value: 'duration' }];

export default function ExercisesScreen() {
  const guard = useAsyncGuard();
  const openEdit = useUIGuard();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { exercises, refreshExercises } = useExerciseData();
  const { user } = useAuthContext();
  const [name, setName]         = useState('');
  const [volume, setVolume]     = useState('reps');
  const [creating, setCreating] = useState(false);
  const [editEx, setEditEx]     = useState<Exercise | null>(null);

  function create() { return guard(async () => {
    if (!name.trim()) return Alert.alert('Name required');
    if (!user) return;
    setCreating(true);

    const { data: existing } = await supabase
      .from('user_custom_exercise')
      .select('custom_exercise_id, is_active')
      .eq('user_id', user.id)
      .ilike('exercise_name', name.trim())
      .maybeSingle();

    if (existing) {
      if (existing.is_active) {
        setCreating(false);
        return Alert.alert('Already exists', 'An exercise with this name already exists.');
      }
      await supabase.from('user_custom_exercise')
        .update({ is_active: true, exercise_volume_type: volume })
        .eq('custom_exercise_id', existing.custom_exercise_id);
      setCreating(false);
      setName('');
      return refreshExercises();
    }

    const { error } = await supabase.from('user_custom_exercise').insert({
      user_id: user.id,
      exercise_name: name.trim(),
      exercise_volume_type: volume,
    });
    setCreating(false);
    if (error) return Alert.alert('Error', error.message);
    setName('');
    refreshExercises();
  }); }

  function saveEdit() { return guard(async () => {
    if (!editEx?.exercise_name.trim()) return;
    const { error } = await supabase
      .from('user_custom_exercise')
      .update({
        exercise_name: editEx.exercise_name,
        exercise_volume_type: editEx.exercise_volume_type,
      })
      .eq('custom_exercise_id', editEx.custom_exercise_id);
    if (error) return Alert.alert('Error', error.message);
    setEditEx(null);
    refreshExercises();
  }); }

  function confirmDelete(id: number) {
    Alert.alert('Delete Exercise', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => guard(async () => {
        await supabase.from('user_custom_exercise').update({ is_active: false }).eq('custom_exercise_id', id);
        refreshExercises();
      })},
    ]);
  }

  return (
    <YStack flex={1} backgroundColor={T.bg}>
      <XStack style={{ height: insets.top + 52, paddingTop: insets.top }} paddingHorizontal={T.space.md} alignItems="center">
        <XStack minWidth={80}><GlassButton icon="chevron-left" label="Back" onPress={() => router.back()} /></XStack>
        <Text flex={1} textAlign="center" color={T.primary} fontSize={T.fontSize.xl} fontWeight="600">Exercises</Text>
        <XStack width={80} />
      </XStack>
      <Separator borderColor={T.border} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: T.space.lg }}
        keyboardShouldPersistTaps="handled"
      >
      {/* ── Create form ── */}
      <Text fontSize={T.fontSize.lg} fontWeight="700" color={T.primary} marginBottom={T.space.md}>New Exercise</Text>
      <Input placeholder="Exercise name" value={name} onChangeText={setName} />

      <Text fontSize={T.fontSize.sm} fontWeight="500" color={T.primary} marginTop={T.space.md} marginBottom={T.space.xs}>Volume type</Text>
      <SegmentedControl options={VOLUME_OPTIONS} value={volume} onChange={setVolume} />

      <YStack marginTop={T.space.md}>
        <Button label="Create Exercise" onPress={create} loading={creating} />
      </YStack>

      {/* ── List ── */}
      <Text fontSize={T.fontSize.lg} fontWeight="700" color={T.primary} marginTop={T.space.xxl} marginBottom={T.space.md}>All Exercises</Text>
      {exercises.length === 0 ? (
        <Text color={T.muted} padding={T.space.xs}>No exercises yet.</Text>
      ) : (
        exercises.map((ex) => (
          <XStack
            key={ex.custom_exercise_id}
            alignItems="center"
            paddingVertical={T.space.md}
            borderBottomWidth={0.5}
            borderBottomColor={T.border}
          >
            <YStack flex={1}>
              <Text fontSize={15} color={T.primary}>{ex.exercise_name}</Text>
              <Text fontSize={T.fontSize.xs} color={T.muted} marginTop={T.space.xs}>{ex.exercise_volume_type}</Text>
            </YStack>
            <XStack marginLeft={T.space.sm}>
              <GlassButton icon="pencil" iconSize={14} onPress={() => openEdit(() => setEditEx({ ...ex }))} />
            </XStack>
            <XStack marginLeft={T.space.sm}>
              <GlassButton icon="trash" iconSize={14} color={T.danger} onPress={() => confirmDelete(ex.custom_exercise_id)} />
            </XStack>
          </XStack>
        ))
      )}
      <YStack height={T.space.xxl} />

      {/* ── Edit modal ── */}
      <SlideUpModal visible={!!editEx} onClose={() => setEditEx(null)}>
        <YStack
          backgroundColor={T.surface}
          borderTopLeftRadius={T.radius.lg}
          borderTopRightRadius={T.radius.lg}
          padding={T.space.xl}
          paddingBottom={T.space.xxl}
        >
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
            <Button label="Save" onPress={saveEdit} />
            <Button label="Cancel" onPress={() => setEditEx(null)} variant="ghost" />
          </XStack>
        </YStack>
      </SlideUpModal>
    </ScrollView>
    </YStack>
  );
}
