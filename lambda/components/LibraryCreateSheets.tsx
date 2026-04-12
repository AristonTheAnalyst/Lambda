import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, TextInput, View } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { useSQLiteContext } from 'expo-sqlite';
import Button from '@/components/Button';
import { SegmentedControl, SlideUpModal } from '@/components/FormControls';
import { useAsyncGuard } from '@/lib/asyncGuard';
import { useAppTheme } from '@/lib/ThemeContext';
import {
  findExerciseByName,
  createExercise,
  reactivateExercise,
} from '@/lib/offline/exerciseStore';
import {
  findVariationByName,
  createVariation,
  reactivateVariation,
} from '@/lib/offline/variationStore';

const VOLUME_OPTIONS = [
  { label: 'Reps', value: 'reps' },
  { label: 'Duration', value: 'duration' },
] as const;

type VolumeValue = (typeof VOLUME_OPTIONS)[number]['value'];

/** Uncontrolled: no React `value` during typing, so layout/sheet churn cannot revert keystrokes. */
function CreateSheetNameField({
  fieldKey,
  textRef,
  placeholder,
}: {
  fieldKey: number;
  textRef: React.MutableRefObject<string>;
  placeholder: string;
}) {
  const { colors, space, radius, fontSize } = useAppTheme();
  const style = useMemo(
    () =>
      StyleSheet.create({
        wrap: { gap: space.xs },
        input: {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          paddingHorizontal: space.md,
          paddingVertical: space.md,
          height: 48,
          color: colors.primary,
          fontSize: fontSize.md,
          fontWeight: '400',
          tintColor: colors.primary,
        } as const,
      }),
    [colors, space.md, space.xs, radius.md, fontSize.md],
  );

  return (
    <View style={style.wrap}>
      <TextInput
        key={fieldKey}
        defaultValue=""
        onChangeText={(t) => {
          textRef.current = t;
        }}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        autoCorrect={false}
        spellCheck={false}
        selectionColor={colors.primary}
        keyboardAppearance={Platform.OS === 'ios' ? 'dark' : undefined}
        returnKeyType="done"
        style={style.input as any}
      />
    </View>
  );
}

interface NewExerciseSheetProps {
  visible: boolean;
  onClose: () => void;
  userId: string | null;
  refreshExercises: () => Promise<void>;
}

/**
 * Create-exercise sheet with draft state owned here so parent list/context
 * re-renders do not re-render the name field while typing.
 */
export const LibraryNewExerciseCreateSheet = React.memo(function LibraryNewExerciseCreateSheet({
  visible,
  onClose,
  userId,
  refreshExercises,
}: NewExerciseSheetProps) {
  const { colors, space, fontSize } = useAppTheme();
  const db = useSQLiteContext();
  const guard = useAsyncGuard();
  const nameRef = useRef('');
  const [nameFieldKey, setNameFieldKey] = useState(0);
  const [volume, setVolume] = useState<VolumeValue>('reps');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (visible) {
      nameRef.current = '';
      setVolume('reps');
      setNameFieldKey((k) => k + 1);
    }
  }, [visible]);

  const handleCreate = useCallback(() => {
    return guard(async () => {
      const name = nameRef.current.trim();
      if (!name) return Alert.alert('Name required');
      if (!userId) return;
      setCreating(true);
      const existing = await findExerciseByName(db, name);
      if (existing) {
        if (existing.is_active) {
          setCreating(false);
          return Alert.alert('Already exists', 'An exercise with this name already exists.');
        }
        await reactivateExercise(db, existing.custom_exercise_id, volume);
        setCreating(false);
        onClose();
        return refreshExercises();
      }
      await createExercise(db, userId, name, volume);
      setCreating(false);
      onClose();
      refreshExercises();
    });
  }, [guard, userId, db, volume, onClose, refreshExercises]);

  return (
    <SlideUpModal visible={visible} onClose={onClose} fitContent keyboardAware zIndex={200_000}>
      <YStack padding={space.xl} gap={space.md}>
        <Text fontSize={fontSize.lg} fontWeight="700" color={colors.primary}>
          New Exercise
        </Text>
        <CreateSheetNameField fieldKey={nameFieldKey} textRef={nameRef} placeholder="Exercise name" />
        <YStack gap={space.xs}>
          <Text fontSize={fontSize.sm} fontWeight="500" color={colors.primary}>
            Volume type
          </Text>
          <SegmentedControl options={[...VOLUME_OPTIONS]} value={volume} onChange={(v) => setVolume(v as VolumeValue)} />
        </YStack>
        <XStack gap={space.sm} justifyContent="center">
          <Button label="Cancel" onPress={onClose} variant="danger-ghost" />
          <Button label="Create" onPress={handleCreate} loading={creating} />
        </XStack>
        <YStack height={space.xxl * 4} />
      </YStack>
    </SlideUpModal>
  );
});

interface NewVariationSheetProps {
  visible: boolean;
  onClose: () => void;
  userId: string | null;
  refreshVariations: () => Promise<void>;
}

export const LibraryNewVariationCreateSheet = React.memo(function LibraryNewVariationCreateSheet({
  visible,
  onClose,
  userId,
  refreshVariations,
}: NewVariationSheetProps) {
  const { colors, space, fontSize } = useAppTheme();
  const db = useSQLiteContext();
  const guard = useAsyncGuard();
  const nameRef = useRef('');
  const [nameFieldKey, setNameFieldKey] = useState(0);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (visible) {
      nameRef.current = '';
      setNameFieldKey((k) => k + 1);
    }
  }, [visible]);

  const handleCreate = useCallback(() => {
    return guard(async () => {
      const name = nameRef.current.trim();
      if (!name) return Alert.alert('Name required');
      if (!userId) return;
      setCreating(true);
      const existing = await findVariationByName(db, name);
      if (existing) {
        if (existing.is_active) {
          setCreating(false);
          return Alert.alert('Already exists', 'A variation with this name already exists.');
        }
        await reactivateVariation(db, existing.custom_variation_id);
        setCreating(false);
        onClose();
        return refreshVariations();
      }
      await createVariation(db, userId, name);
      setCreating(false);
      onClose();
      refreshVariations();
    });
  }, [guard, userId, db, onClose, refreshVariations]);

  return (
    <SlideUpModal visible={visible} onClose={onClose} fitContent keyboardAware zIndex={200_000}>
      <YStack padding={space.xl} gap={space.md}>
        <Text fontSize={fontSize.lg} fontWeight="700" color={colors.primary}>
          New Variation
        </Text>
        <CreateSheetNameField fieldKey={nameFieldKey} textRef={nameRef} placeholder="Variation name" />
        <XStack gap={space.sm} justifyContent="center">
          <Button label="Cancel" onPress={onClose} variant="danger-ghost" />
          <Button label="Create" onPress={handleCreate} loading={creating} />
        </XStack>
        <YStack height={space.xxl * 4} />
      </YStack>
    </SlideUpModal>
  );
});
