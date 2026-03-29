import React, { useState } from 'react';
import { Alert, ScrollView, TextInput } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SlideUpModal } from '@/components/FormControls';
import { Separator } from 'tamagui';
import { useExerciseData } from '@/lib/ExerciseDataContext';
import { useAuthContext } from '@/lib/AuthContext';
import GlassButton from '@/components/GlassButton';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { useSQLiteContext } from 'expo-sqlite';
import {
  findVariationByName,
  createVariation,
  reactivateVariation,
  updateVariation,
  softDeleteVariation,
} from '@/lib/offline/variationStore';
import { useAsyncGuard, useUIGuard } from '@/lib/asyncGuard';
import T from '@/constants/Theme';

interface Variation {
  custom_variation_id: number;
  variation_name: string;
  is_active: boolean;
}

export default function ManageVariationsScreen() {
  const guard = useAsyncGuard();
  const openEdit = useUIGuard();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const { variations, refreshVariations, refreshExerciseDetails } = useExerciseData();
  const { user } = useAuthContext();
  const [name, setName]         = useState('');
  const [search, setSearch]     = useState('');
  const [creating, setCreating] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [editVar, setEditVar]   = useState<Variation | null>(null);

  function create() { return guard(async () => {
    if (!name.trim()) return Alert.alert('Name required');
    if (!user) return;
    setCreating(true);

    const existing = await findVariationByName(db, name.trim());

    if (existing) {
      if (existing.is_active) {
        setCreating(false);
        return Alert.alert('Already exists', 'A variation with this name already exists.');
      }
      await reactivateVariation(db, existing.custom_variation_id);
      setCreating(false);
      setName('');
      setCreateVisible(false);
      return refreshVariations();
    }

    await createVariation(db, user.id, name.trim());
    setCreating(false);
    setName('');
    setCreateVisible(false);
    refreshVariations();
  }); }

  function saveEdit() { return guard(async () => {
    if (!editVar?.variation_name.trim()) return;
    await updateVariation(db, editVar.custom_variation_id, editVar.variation_name);
    setEditVar(null);
    await Promise.all([refreshVariations(), refreshExerciseDetails()]);
  }); }

  function confirmDelete(id: number) {
    Alert.alert('Delete Variation', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => guard(async () => {
        await softDeleteVariation(db, id);
        await Promise.all([refreshVariations(), refreshExerciseDetails()]);
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
        showsVerticalScrollIndicator={false}
      >
        {/* ── List ── */}
        <XStack alignItems="center" marginBottom={T.space.md}>
          <Text fontSize={T.fontSize.lg} fontWeight="700" color={T.primary} flex={1}>All Variations</Text>
          {variations.length > 0 && (
            <XStack backgroundColor={T.surface} borderRadius={T.radius.md} paddingHorizontal={T.space.sm} alignItems="center" height={34} minWidth={130} marginRight={T.space.sm}>
              <TextInput
                placeholder="Search…"
                placeholderTextColor={T.muted}
                value={search}
                onChangeText={setSearch}
                spellCheck={false}
                selectionColor={T.primary}
                style={{ color: T.primary, fontSize: T.fontSize.sm, flex: 1, tintColor: T.primary } as any}
              />
            </XStack>
          )}
          <GlassButton icon="plus" iconSize={14} onPress={() => { setName(''); setCreateVisible(true); }} />
        </XStack>
        {variations.length === 0 ? (
          <Text color={T.muted} padding={T.space.xs}>No variations yet.</Text>
        ) : variations.filter((v) => v.variation_name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
          <Text color={T.muted} padding={T.space.xs}>No results.</Text>
        ) : (
          variations.filter((v) => v.variation_name.toLowerCase().includes(search.toLowerCase())).map((v) => (
            <XStack
              key={v.custom_variation_id}
              alignItems="center"
              paddingVertical={T.space.md}
              borderBottomWidth={0.5}
              borderBottomColor={T.border}
            >
              <Text flex={1} fontSize={15} color={T.primary}>{v.variation_name}</Text>
              <XStack marginLeft={T.space.sm}>
                <GlassButton icon="pencil" iconSize={14} onPress={() => openEdit(() => setEditVar({ ...v, is_active: true }))} />
              </XStack>
              <XStack marginLeft={T.space.sm}>
                <GlassButton icon="trash" iconSize={14} color={T.danger} onPress={() => confirmDelete(v.custom_variation_id)} />
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
            <Text fontSize={T.fontSize.lg} fontWeight="700" color={T.primary} marginBottom={T.space.md}>New Variation</Text>
            <Input placeholder="Variation name" value={name} onChangeText={setName} />
            <XStack gap={T.space.sm} marginTop={T.space.md} justifyContent="center">
              <Button label="Cancel" onPress={() => setCreateVisible(false)} variant="danger-ghost" />
              <Button label="Create" onPress={create} loading={creating} />
            </XStack>
          </YStack>
        </SlideUpModal>

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
            <XStack gap={T.space.sm} marginTop={T.space.md} justifyContent="center">
              <Button label="Cancel" onPress={() => setEditVar(null)} variant="danger-ghost" />
              <Button label="Save" onPress={saveEdit} />
            </XStack>
          </YStack>
        </SlideUpModal>
      </ScrollView>
    </YStack>
  );
}
