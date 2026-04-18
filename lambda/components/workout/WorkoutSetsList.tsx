import React, { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { Separator, Spinner, Text, XStack, YStack } from 'tamagui';
import GlassButton from '@/components/GlassButton';
import { useAppTheme } from '@/lib/ThemeContext';
import { buildGroupedSets, formatValues } from '@/lib/workoutSetFormat';
import type { WorkoutSet } from '@/lib/offline/setStore';

type ExerciseDetailMap = Record<
  string,
  | {
      exercise_name?: string;
      assigned_variations?: { custom_variation_id: string; variation_name: string }[];
    }
  | undefined
>;

interface CompactGroupProps {
  exName: string;
  sets: WorkoutSet[];
  exerciseDetailMap: ExerciseDetailMap;
  startIdx: number;
  onEdit?: (s: WorkoutSet) => void;
}

const CompactGroup = React.memo(function CompactGroup({
  exName,
  sets,
  exerciseDetailMap,
  startIdx,
  onEdit,
}: CompactGroupProps) {
  const { colors, space, radius, fontSize } = useAppTheme();
  const [collapsed, setCollapsed] = React.useState(false);
  const interactive = !!onEdit;

  return (
    <YStack paddingVertical={space.sm}>
      <XStack alignItems="center" marginBottom={space.sm}>
        <Text fontSize={15} fontWeight="600" color={colors.primary} flex={1}>
          {exName}
        </Text>
        <GlassButton
          icon={collapsed ? 'chevron-down' : 'chevron-up'}
          iconSize={11}
          onPress={() => setCollapsed((c) => !c)}
        />
      </XStack>
      {!collapsed &&
        sets.map((s, idx) => {
          const varName = s.custom_variation_id
            ? exerciseDetailMap[s.custom_exercise_id]?.assigned_variations?.find(
                (v) => v.custom_variation_id === s.custom_variation_id
              )?.variation_name ?? null
            : null;
          const repsStr = s.workout_set_reps?.length
            ? `${formatValues(s.workout_set_reps)} reps`
            : s.workout_set_duration_seconds?.length
              ? `${formatValues(s.workout_set_duration_seconds)}s`
              : '—';
          const subParts: string[] = [
            `#${startIdx + idx + 1}`,
            ...(s.workout_set_weight != null ? [`${s.workout_set_weight}kg`] : []),
            ...(varName ? [varName] : []),
            repsStr,
          ];
          return (
            <XStack
              key={s.workout_set_id}
              paddingVertical={space.md}
              paddingHorizontal={space.md}
              marginBottom={space.xs}
              borderRadius={radius.sm}
              borderWidth={1}
              borderColor={colors.border}
              backgroundColor={colors.surface}
              alignItems="center"
              pressStyle={interactive ? { opacity: 0.6 } : undefined}
              onPress={interactive ? () => onEdit!(s) : undefined}
              cursor={interactive ? 'pointer' : undefined}
            >
              <Text flex={1} fontSize={fontSize.sm} color={colors.accent} numberOfLines={2}>
                <Text color={colors.primary}>{subParts[0]} :</Text>
                {subParts.length > 1 ? ` ${subParts.slice(1).join(' · ')}` : ''}
                {s.workout_set_notes ? ` · "${s.workout_set_notes}"` : ''}
              </Text>
              {interactive ? (
                <FontAwesome name="pencil" size={10} color={colors.muted} style={{ marginLeft: space.sm }} />
              ) : null}
            </XStack>
          );
        })}
    </YStack>
  );
});

export interface WorkoutSetsListProps {
  sets: WorkoutSet[];
  exerciseDetailMap: ExerciseDetailMap;
  setsLoading: boolean;
  viewMode: 'grouped' | 'chrono';
  onToggleViewMode: () => void;
  onEditSet: (s: WorkoutSet) => void;
  /** Title row above the list (e.g. “Sets” + grouped/full hint). */
  title: ReactNode;
  allowViewModeToggle: boolean;
  interactive: boolean;
  emptyHint?: string;
  /** Persist new global order (workout_set_number 1..n). Only active in Chronological view. */
  onReorderSets?: (reorderedSets: WorkoutSet[], orderedIds: string[]) => void | Promise<void>;
  /** Rendered above the chrono list (e.g. session date row). */
  listTopSlot?: ReactNode;
}

function chronoLineParts(
  s: WorkoutSet,
  _idx: number,
  exerciseDetailMap: ExerciseDetailMap,
): { label: string; notes: string | null } {
  const exName = exerciseDetailMap[s.custom_exercise_id]?.exercise_name ?? `#${s.custom_exercise_id}`;
  const varName = s.custom_variation_id
    ? exerciseDetailMap[s.custom_exercise_id]?.assigned_variations?.find(
        (v) => v.custom_variation_id === s.custom_variation_id
      )?.variation_name ?? null
    : null;
  const volume = s.workout_set_reps?.length
    ? `${formatValues(s.workout_set_reps)} reps`
    : s.workout_set_duration_seconds?.length
      ? `${formatValues(s.workout_set_duration_seconds)}s`
      : '—';
  const exerciseLabel = varName ? `${exName} (${varName})` : exName;
  const label = `${exerciseLabel}${s.workout_set_weight != null ? ` : ${s.workout_set_weight}kg x` : ' :'} ${volume}`;
  return { label, notes: s.workout_set_notes };
}

/**
 * Sets list for Training Session (live session) and past-session detail — grouped / chrono + loading / empty.
 */
export default function WorkoutSetsList({
  sets,
  exerciseDetailMap,
  setsLoading,
  viewMode,
  onToggleViewMode,
  onEditSet,
  title,
  allowViewModeToggle,
  interactive,
  emptyHint = 'Log your first set below.',
  onReorderSets,
  listTopSlot,
}: WorkoutSetsListProps) {
  const { colors, space, fontSize } = useAppTheme();
  const groupedSets = useMemo(() => buildGroupedSets(sets), [sets]);
  const effectiveMode = allowViewModeToggle ? viewMode : 'chrono';
  const onEdit = interactive ? onEditSet : undefined;
  const useDraggable =
    Platform.OS !== 'web' && interactive && !!onReorderSets && sets.length > 1 && effectiveMode === 'chrono';

  // Local copy of sets for the draggable list. Updated instantly on drag end
  // so DraggableFlatList never receives a prop change after a reorder — no flicker.
  // Syncs from the sets prop only when items are added or removed (id set changes).
  const [localData, setLocalData] = useState<WorkoutSet[]>(sets);
  useEffect(() => {
    setLocalData((prev) => {
      const prevIds = new Set(prev.map((s) => s.workout_set_id));
      const nextIds = new Set(sets.map((s) => s.workout_set_id));
      const sameIds =
        prevIds.size === nextIds.size && [...nextIds].every((id) => prevIds.has(id));
      if (!sameIds) {
        // Items added or removed — reset to the canonical order from the parent.
        return sets;
      }
      // Same items: update content in-place (handles edits) but keep local drag order.
      const contentMap = new Map(sets.map((s) => [s.workout_set_id, s]));
      return prev.map((s) => contentMap.get(s.workout_set_id) ?? s);
    });
  }, [sets]);

  const renderChronoRowStatic = useCallback(
    (s: WorkoutSet, idx: number) => {
      const { label, notes } = chronoLineParts(s, idx, exerciseDetailMap);
      return (
        <XStack
          key={s.workout_set_id}
          paddingVertical={space.md}
          borderBottomWidth={0.5}
          borderBottomColor={colors.border}
          alignItems="center"
          pressStyle={interactive ? { opacity: 0.6 } : undefined}
          onPress={interactive ? () => onEditSet(s) : undefined}
          cursor={interactive ? 'pointer' : undefined}
        >
          <Text flex={1} fontSize={fontSize.sm} color={colors.accent} numberOfLines={2}>
            <Text color={colors.primary}>{`#${idx + 1} :`}</Text>
            {` ${label}`}
            {notes ? (
              <Text color={colors.accent}>
                {' · '}
                <Text fontStyle="italic">{`"${notes}"`}</Text>
              </Text>
            ) : null}
          </Text>
          {interactive ? (
            <FontAwesome name="pencil" size={10} color={colors.muted} style={{ marginLeft: space.sm }} />
          ) : null}
        </XStack>
      );
    },
    [colors.border, colors.accent, colors.primary, colors.muted, exerciseDetailMap, fontSize.sm, interactive, onEditSet, space.sm, space.md],
  );

  const renderDraggableItem = useCallback(
    ({ item: s, getIndex, drag }: RenderItemParams<WorkoutSet>) => {
      const idx = getIndex() ?? 0;

      let bodyText: React.ReactNode;
      if (effectiveMode === 'grouped') {
        const varName = s.custom_variation_id
          ? exerciseDetailMap[s.custom_exercise_id]?.assigned_variations?.find(
              (v) => v.custom_variation_id === s.custom_variation_id
            )?.variation_name ?? null
          : null;
        const repsStr = s.workout_set_reps?.length
          ? `${formatValues(s.workout_set_reps)} reps`
          : s.workout_set_duration_seconds?.length
            ? `${formatValues(s.workout_set_duration_seconds)}s`
            : '—';
        const subParts: string[] = [
          `#${idx + 1}`,
          ...(s.workout_set_weight != null ? [`${s.workout_set_weight}kg`] : []),
          ...(varName ? [varName] : []),
          repsStr,
        ];
        bodyText = (
          <Text flex={1} fontSize={fontSize.sm} color={colors.accent} numberOfLines={2}>
            <Text color={colors.primary}>{subParts[0]} :</Text>
            {subParts.length > 1 ? ` ${subParts.slice(1).join(' · ')}` : ''}
            {s.workout_set_notes ? ` · "${s.workout_set_notes}"` : ''}
          </Text>
        );
      } else {
        const { label, notes } = chronoLineParts(s, idx, exerciseDetailMap);
        bodyText = (
          <Text flex={1} fontSize={fontSize.sm} color={colors.accent} numberOfLines={2}>
            {label}
            {notes ? (
              <Text color={colors.accent}>
                {' · '}
                <Text fontStyle="italic">{`"${notes}"`}</Text>
              </Text>
            ) : null}
          </Text>
        );
      }

      const row = (
        <Pressable
          onLongPress={drag}
          onPress={() => onEditSet(s)}
          delayLongPress={180}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: space.md,
            borderBottomWidth: 0.5,
            borderBottomColor: colors.border,
            backgroundColor: colors.bg,
          }}
        >
          <FontAwesome name="bars" size={14} color={colors.muted} style={{ marginRight: space.sm }} />
          {bodyText}
          <FontAwesome name="pencil" size={10} color={colors.muted} style={{ marginLeft: space.sm }} />
        </Pressable>
      );

      if (effectiveMode === 'chrono') {
        return <ScaleDecorator>{row}</ScaleDecorator>;
      }

      const showHeader = idx === 0 || sets[idx - 1]?.custom_exercise_id !== s.custom_exercise_id;
      const exName = exerciseDetailMap[s.custom_exercise_id]?.exercise_name ?? `#${s.custom_exercise_id}`;

      return (
        <ScaleDecorator>
          <YStack backgroundColor={colors.bg}>
            {showHeader ? (
              <YStack paddingTop={idx > 0 ? space.sm : 0}>
                {idx > 0 ? <Separator marginBottom={space.sm} borderColor={colors.border} /> : null}
                <Text fontSize={15} fontWeight="600" color={colors.primary} marginBottom={space.xs}>
                  {exName}
                </Text>
              </YStack>
            ) : null}
            {row}
          </YStack>
        </ScaleDecorator>
      );
    },
    [
      colors.bg,
      colors.border,
      colors.accent,
      colors.primary,
      colors.muted,
      effectiveMode,
      exerciseDetailMap,
      fontSize.sm,
      onEditSet,
      sets,
      space.sm,
      space.md,
    ],
  );

  const onDragEnd = useCallback(
    async ({ data, from, to }: { data: WorkoutSet[]; from: number; to: number }) => {
      if (!onReorderSets || from === to) return;
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setLocalData(data); // instant — no parent re-render, no flicker
      const ids = data.map((x) => x.workout_set_id);
      await Promise.resolve(onReorderSets(data, ids));
    },
    [onReorderSets],
  );

  return (
    <YStack flex={1}>
      <XStack alignItems="center" marginBottom={space.sm}>
        <YStack flex={1}>{title}</YStack>
        {allowViewModeToggle && sets.length > 0 ? (
          <GlassButton
            icon={viewMode === 'grouped' ? 'list-ol' : 'th-list'}
            iconSize={13}
            onPress={onToggleViewMode}
          />
        ) : null}
      </XStack>

      {setsLoading ? (
        <Spinner size="large" color={colors.accent} marginTop={space.md} />
      ) : sets.length === 0 ? (
        <Text color={colors.muted} fontSize={fontSize.sm}>
          {emptyHint}
        </Text>
      ) : useDraggable ? (
        <DraggableFlatList
          data={localData}
          keyExtractor={(s) => s.workout_set_id}
          onDragEnd={onDragEnd}
          renderItem={renderDraggableItem}
          activationDistance={14}
          animationConfig={{ duration: 200, useNativeDriver: true }}
          containerStyle={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: space.md }}
          ListHeaderComponent={listTopSlot ? <YStack>{listTopSlot}</YStack> : undefined}
          keyboardShouldPersistTaps="handled"
        />
      ) : effectiveMode === 'grouped' ? (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {listTopSlot}
          {groupedSets.map(({ exId, sets: groupSets, startIdx }, groupIdx) => {
            const exName = exerciseDetailMap[exId]?.exercise_name ?? `#${exId}`;
            return (
              <React.Fragment key={`${exId}-${groupIdx}`}>
                {groupIdx > 0 && <Separator marginVertical={space.sm} borderColor={colors.border} />}
                <CompactGroup
                  exName={exName}
                  sets={groupSets}
                  startIdx={startIdx}
                  exerciseDetailMap={exerciseDetailMap}
                  onEdit={onEdit}
                />
              </React.Fragment>
            );
          })}
        </ScrollView>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {listTopSlot}
          {sets.map((s, idx) => renderChronoRowStatic(s, idx))}
        </ScrollView>
      )}
    </YStack>
  );
}
