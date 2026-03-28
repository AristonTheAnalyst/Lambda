import React, { useState } from 'react';
import { Alert, ScrollView, TextInput } from 'react-native';
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
import { useSQLiteContext } from 'expo-sqlite';
import {
  findExerciseByName,
  createExercise,
  reactivateExercise,
  updateExercise,
  softDeleteExercise,
} from '@/lib/offline/exerciseStore';
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
  const db = useSQLiteContext();
  const { exercises, refreshExercises } = useExerciseData();
  const { user } = useAuthContext();
  const [name, setName]         = useState('');
  const [search, setSearch]     = useState('');
  const [volume, setVolume]     = useState('reps');
  const [creating, setCreating] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [editEx, setEditEx]     = useState<Exercise | null>(null);

  function create() { return guard(async () => {
    if (!name.trim()) return Alert.alert('Name required');
    if (!user) return;
    setCreating(true);

    const existing = await findExerciseByName(db, name.trim());

    if (existing) {
      if (existing.is_active) {
        setCreating(false);
        return Alert.alert('Already exists', 'An exercise with this name already exists.');
      }
      await reactivateExercise(db, existing.custom_exercise_id, volume);
      setCreating(false);
      setName('');
      setCreateVisible(false);
      return refreshExercises();
    }

    await createExercise(db, user.id, name.trim(), volume);
    setCreating(false);
    setName('');
    setCreateVisible(false);
    refreshExercises();
  }); }

  function saveEdit() { return guard(async () => {
    if (!editEx?.exercise_name.trim()) return;
    await updateExercise(db, editEx.custom_exercise_id, editEx.exercise_name, editEx.exercise_volume_type);
    setEditEx(null);
    refreshExercises();
  }); }

  function confirmDelete(id: number) {
    Alert.alert('Delete Exercise', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => guard(async () => {
        await softDeleteExercise(db, id);
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
        showsVerticalScrollIndicator={false}
      >
      {/* ── List ── */}
      <XStack alignItems="center" marginBottom={T.space.md}>
        <Text fontSize={T.fontSize.lg} fontWeight="700" color={T.primary} flex={1}>All Exercises</Text>
        {exercises.length > 0 && (
          <XStack backgroundColor={T.surface} borderRadius={T.radius.md} paddingHorizontal={T.space.sm} alignItems="center" height={34} minWidth={130} marginRight={T.space.sm}>
            <TextInput
              placeholder="Search…"
              placeholderTextColor={T.muted}
              value={search}
              onChangeText={setSearch}
              style={{ color: T.primary, fontSize: T.fontSize.sm, flex: 1 }}
            />
          </XStack>
        )}
        <GlassButton icon="plus" iconSize={14} onPress={() => { setName(''); setVolume('reps'); setCreateVisible(true); }} />
      </XStack>
      {exercises.length === 0 ? (
        <Text color={T.muted} padding={T.space.xs}>No exercises yet.</Text>
      ) : exercises.filter((ex) => ex.exercise_name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
        <Text color={T.muted} padding={T.space.xs}>No results.</Text>
      ) : (
        exercises.filter((ex) => ex.exercise_name.toLowerCase().includes(search.toLowerCase())).map((ex) => (
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

      {/* ── Create modal ── */}
      <SlideUpModal visible={createVisible} onClose={() => setCreateVisible(false)}>
        <YStack
          backgroundColor={T.surface}
          borderTopLeftRadius={T.radius.lg}
          borderTopRightRadius={T.radius.lg}
          padding={T.space.xl}
          paddingBottom={T.space.xxl}
        >
          <Text fontSize={T.fontSize.lg} fontWeight="700" color={T.primary} marginBottom={T.space.md}>New Exercise</Text>
          <Input placeholder="Exercise name" value={name} onChangeText={setName} />
          <Text fontSize={T.fontSize.sm} fontWeight="500" color={T.primary} marginTop={T.space.md} marginBottom={T.space.xs}>Volume type</Text>
          <SegmentedControl options={VOLUME_OPTIONS} value={volume} onChange={setVolume} />
          <XStack gap={T.space.sm} marginTop={T.space.md} justifyContent="center">
            <Button label="Create" onPress={create} loading={creating} />
            <Button label="Cancel" onPress={() => setCreateVisible(false)} variant="ghost" />
          </XStack>
        </YStack>
      </SlideUpModal>

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
