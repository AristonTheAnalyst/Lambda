import React, { ReactNode, useMemo } from 'react';
import { FontAwesome } from '@expo/vector-icons';
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
  const { colors, space, fontSize } = useAppTheme();
  const [collapsed, setCollapsed] = React.useState(false);
  const interactive = !!onEdit;

  return (
    <YStack paddingVertical={space.sm}>
      <XStack alignItems="center" marginBottom={space.xs}>
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
              paddingVertical={space.xs}
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
}: WorkoutSetsListProps) {
  const { colors, space, fontSize } = useAppTheme();
  const groupedSets = useMemo(() => buildGroupedSets(sets), [sets]);
  const effectiveMode = allowViewModeToggle ? viewMode : 'chrono';
  const onEdit = interactive ? onEditSet : undefined;

  return (
    <>
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
      ) : effectiveMode === 'grouped' ? (
        groupedSets.map(({ exId, sets: groupSets, startIdx }, groupIdx) => {
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
        })
      ) : (
        sets.map((s, idx) => {
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
          return (
            <XStack
              key={s.workout_set_id}
              paddingVertical={space.xs}
              borderBottomWidth={0.5}
              borderBottomColor={colors.border}
              alignItems="center"
              pressStyle={interactive ? { opacity: 0.6 } : undefined}
              onPress={interactive ? () => onEditSet(s) : undefined}
              cursor={interactive ? 'pointer' : undefined}
            >
              <Text flex={1} fontSize={fontSize.sm} color={colors.accent} numberOfLines={2}>
                <Text color={colors.primary}>{`#${idx + 1} :`}</Text>
                {` ${exerciseLabel}${s.workout_set_weight != null ? ` : ${s.workout_set_weight}kg x` : ' :'} ${volume}`}
                {s.workout_set_notes ? (
                  <Text color={colors.accent}>
                    {' · '}
                    <Text fontStyle="italic">{`"${s.workout_set_notes}"`}</Text>
                  </Text>
                ) : null}
              </Text>
              {interactive ? (
                <FontAwesome name="pencil" size={10} color={colors.muted} style={{ marginLeft: space.sm }} />
              ) : null}
            </XStack>
          );
        })
      )}
    </>
  );
}
