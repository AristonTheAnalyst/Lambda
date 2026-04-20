import React, { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import GlassButton from '@/components/GlassButton';
import { useAppTheme } from '@/lib/ThemeContext';
import { buildGroupedSets, formatValues, toProperCase } from '@/lib/workoutSetFormat';
import type { WorkoutSet } from '@/lib/offline/setStore';

export type ExerciseDetailMap = Record<
  string,
  | {
      exercise_name?: string;
      assigned_variations?: { custom_variation_id: string; variation_name: string }[];
    }
  | undefined
>;

// ─── Shared display helper ────────────────────────────────────────────────────

export interface SetDisplay {
  exName: string;
  varName: string | null;
  volumeStr: string;
  weightStr: string | null;
  notes: string | null;
}

export function parseSetDisplay(s: WorkoutSet, exerciseDetailMap: ExerciseDetailMap): SetDisplay {
  const exName = toProperCase(exerciseDetailMap[s.custom_exercise_id]?.exercise_name ?? '—');
  const rawVarName =
    s.custom_variation_id
      ? exerciseDetailMap[s.custom_exercise_id]?.assigned_variations?.find(
          (v) => v.custom_variation_id === s.custom_variation_id,
        )?.variation_name
      : undefined;
  const varName = rawVarName ? toProperCase(rawVarName) : null;
  const baseVolume = s.workout_set_reps?.length
    ? `${formatValues(s.workout_set_reps)} reps`
    : s.workout_set_duration_seconds?.length
      ? `${formatValues(s.workout_set_duration_seconds)}s`
      : '—';
  const weightStr = s.workout_set_weight != null ? `${s.workout_set_weight}kg` : null;
  const volumeStr = weightStr ? `${weightStr} × ${baseVolume}` : baseVolume;
  return { exName, varName, volumeStr, weightStr, notes: s.workout_set_notes ?? null };
}

// ─── Grouped view ─────────────────────────────────────────────────────────────

interface CompactGroupProps {
  exName: string;
  sets: WorkoutSet[];
  exerciseDetailMap: ExerciseDetailMap;
  startIdx: number;
  onEdit?: (s: WorkoutSet) => void;
  isLast: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const CompactGroup = React.memo(function CompactGroup({
  exName,
  sets,
  exerciseDetailMap,
  startIdx,
  onEdit,
  isLast,
  collapsed,
  onToggleCollapse,
}: CompactGroupProps) {
  const { colors, space, radius, fontSize } = useAppTheme();
  const interactive = !!onEdit;

  return (
    <YStack
      paddingTop={space.sm}
      paddingBottom={isLast ? 0 : space.sm}
      marginBottom={isLast ? 0 : (collapsed ? space.xs : space.md)}
      borderBottomWidth={isLast ? 0 : 0.5}
      borderBottomColor={colors.border}
    >
      {/* Group header */}
      <XStack alignItems="center" marginBottom={space.sm}>
        <Text fontSize={fontSize.md} fontWeight="700" color={colors.primary} flex={1}>
          {exName}
        </Text>
        <Text fontSize={fontSize.xs} color={colors.muted} marginRight={space.sm}>
          {sets.length} {sets.length === 1 ? 'set' : 'sets'}
        </Text>
        <GlassButton
          icon={collapsed ? 'chevron-down' : 'chevron-up'}
          iconSize={11}
          onPress={onToggleCollapse}
        />
      </XStack>

      {/* Set rows */}
      {!collapsed &&
        sets.map((s) => {
          const { varName, volumeStr, notes } = parseSetDisplay(s, exerciseDetailMap);

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
              {/* Variation + notes */}
              <YStack flex={1}>
                <Text fontSize={fontSize.sm} fontWeight="600" color={varName ? colors.primary : colors.muted} numberOfLines={1}>
                  {varName ?? 'No variation'}
                </Text>
                {notes ? (
                  <Text fontSize={fontSize.xs} color={colors.muted} fontStyle="italic" numberOfLines={1}>
                    {`"${notes}"`}
                  </Text>
                ) : null}
              </YStack>

              {/* Volume — the key number */}
              <Text
                fontSize={fontSize.sm}
                fontWeight="700"
                color={colors.accent}
                marginLeft={space.sm}
              >
                {volumeStr}
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

// ─── Chronological row (shared: session chrono + training logs Sets tab) ─────

export interface ChronologicalSetRowProps {
  set: WorkoutSet;
  /** Displayed in the left column as `#${index + 1}` (global order in the list). */
  index: number;
  exerciseDetailMap: ExerciseDetailMap;
  onPress: () => void;
  /** Training session: show pencil affordance when edits are allowed. */
  showEditAffordance?: boolean;
  /** Optional muted line under the title (e.g. workout date on cross-workout lists). */
  contextLine?: string | null;
  /** When false, row is not pressable (e.g. past session view-only chrono). */
  pressable?: boolean;
}

/** Same row chrome as chronological view in `WorkoutSetsList` / live session. */
export const ChronologicalSetRow = React.memo(function ChronologicalSetRow({
  set: s,
  index,
  exerciseDetailMap,
  onPress,
  showEditAffordance = false,
  contextLine,
  pressable = true,
}: ChronologicalSetRowProps) {
  const { colors, space, fontSize } = useAppTheme();
  const { exName, varName, volumeStr, notes } = parseSetDisplay(s, exerciseDetailMap);
  const exerciseLabel = varName ? `${exName} (${varName})` : exName;
  const secondary = notes ? `"${notes}"` : null;

  return (
    <XStack
      paddingVertical={space.md}
      borderBottomWidth={0.5}
      borderBottomColor={colors.border}
      alignItems="flex-start"
      pressStyle={pressable ? { opacity: 0.6 } : undefined}
      onPress={pressable ? onPress : undefined}
      cursor={pressable ? 'pointer' : undefined}
    >
      <Text
        fontSize={fontSize.xs}
        color={colors.muted}
        width={28}
        flexShrink={0}
        paddingTop={2}
      >
        {`#${index + 1}`}
      </Text>

      <YStack flex={1}>
        <Text fontSize={fontSize.sm} fontWeight="600" color={colors.primary} numberOfLines={2}>
          {exerciseLabel}
        </Text>
        {contextLine ? (
          <Text fontSize={fontSize.xs} color={colors.muted} marginTop={2}>
            {contextLine}
          </Text>
        ) : null}
        {secondary ? (
          <Text fontSize={fontSize.xs} color={colors.muted} marginTop={2}>
            {secondary}
          </Text>
        ) : null}
      </YStack>

      <Text
        fontSize={fontSize.md}
        fontWeight="700"
        color={colors.accent}
        marginLeft={space.sm}
        paddingTop={1}
      >
        {volumeStr}
      </Text>

      {showEditAffordance ? (
        <FontAwesome
          name="pencil"
          size={10}
          color={colors.muted}
          style={{ marginLeft: space.sm, marginTop: 4 }}
        />
      ) : null}
    </XStack>
  );
});

function ChronoRow({
  s,
  idx,
  exerciseDetailMap,
  interactive,
  onEditSet,
}: {
  s: WorkoutSet;
  idx: number;
  exerciseDetailMap: ExerciseDetailMap;
  interactive: boolean;
  onEditSet: (s: WorkoutSet) => void;
}) {
  return (
    <ChronologicalSetRow
      set={s}
      index={idx}
      exerciseDetailMap={exerciseDetailMap}
      onPress={() => onEditSet(s)}
      showEditAffordance={interactive}
      pressable={interactive}
    />
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface WorkoutSetsListProps {
  sets: WorkoutSet[];
  exerciseDetailMap: ExerciseDetailMap;
  setsLoading: boolean;
  viewMode: 'grouped' | 'chrono';
  onToggleViewMode: () => void;
  onEditSet: (s: WorkoutSet) => void;
  /** Title row above the list. */
  title: ReactNode;
  allowViewModeToggle: boolean;
  interactive: boolean;
  emptyHint?: string;
  /** Persist new global order. Only active in Chronological view. */
  onReorderSets?: (reorderedSets: WorkoutSet[], orderedIds: string[]) => void | Promise<void>;
  /** Rendered above the list. */
  listTopSlot?: ReactNode;
}

// ─── Main component ───────────────────────────────────────────────────────────

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

  // Collapse state per exercise group — persists across view mode toggles.
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});
  const toggleCollapsed = useCallback((exId: string) => {
    setCollapsedMap((prev) => ({ ...prev, [exId]: !prev[exId] }));
  }, []);
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
        return sets;
      }
      const contentMap = new Map(sets.map((s) => [s.workout_set_id, s]));
      return prev.map((s) => contentMap.get(s.workout_set_id) ?? s);
    });
  }, [sets]);

  // ── Draggable row ───────────────────────────────────────────────────────────

  const renderDraggableItem = useCallback(
    ({ item: s, drag }: RenderItemParams<WorkoutSet>) => {
      const { exName, varName, volumeStr, notes } = parseSetDisplay(s, exerciseDetailMap);
      const exerciseLabel = varName ? `${exName} (${varName})` : exName;
      const secondary = notes ? `"${notes}"` : null;

      return (
        <ScaleDecorator>
          <Pressable
            onLongPress={drag}
            onPress={() => onEditSet(s)}
            delayLongPress={180}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              paddingVertical: space.md,
              borderBottomWidth: 0.5,
              borderBottomColor: colors.border,
              backgroundColor: colors.bg,
            }}
          >
            {/* Drag handle */}
            <FontAwesome
              name="bars"
              size={12}
              color={colors.muted}
              style={{ marginRight: space.sm, marginTop: 3 }}
            />

            {/* Name + secondary */}
            <YStack flex={1}>
              <Text fontSize={fontSize.sm} fontWeight="600" color={colors.primary} numberOfLines={2}>
                {exerciseLabel}
              </Text>
              {secondary ? (
                <Text fontSize={fontSize.xs} color={colors.muted} marginTop={2}>
                  {secondary}
                </Text>
              ) : null}
            </YStack>

            {/* Volume */}
            <Text
              fontSize={fontSize.md}
              fontWeight="700"
              color={colors.accent}
              marginLeft={space.sm}
              paddingTop={1}
            >
              {volumeStr}
            </Text>

            <FontAwesome
              name="pencil"
              size={10}
              color={colors.muted}
              style={{ marginLeft: space.sm, marginTop: 4 }}
            />
          </Pressable>
        </ScaleDecorator>
      );
    },
    [colors.bg, colors.border, colors.accent, colors.primary, colors.muted, exerciseDetailMap, fontSize.sm, fontSize.md, fontSize.xs, onEditSet, space.sm, space.md],
  );

  // ── Drag end ────────────────────────────────────────────────────────────────

  const onDragEnd = useCallback(
    async ({ data, from, to }: { data: WorkoutSet[]; from: number; to: number }) => {
      if (!onReorderSets || from === to) return;
      setLocalData(data);
      const ids = data.map((x) => x.workout_set_id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Promise.resolve(onReorderSets(data, ids));
    },
    [onReorderSets],
  );

  // ── Render ──────────────────────────────────────────────────────────────────

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
            const exName = toProperCase(exerciseDetailMap[exId]?.exercise_name ?? `#${exId}`);
            return (
              <CompactGroup
                key={exId}
                exName={exName}
                sets={groupSets}
                startIdx={startIdx}
                exerciseDetailMap={exerciseDetailMap}
                onEdit={onEdit}
                isLast={groupIdx === groupedSets.length - 1}
                collapsed={!!collapsedMap[exId]}
                onToggleCollapse={() => toggleCollapsed(exId)}
              />
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
          {sets.map((s, idx) => (
            <ChronoRow
              key={s.workout_set_id}
              s={s}
              idx={idx}
              exerciseDetailMap={exerciseDetailMap}
              interactive={interactive}
              onEditSet={onEditSet}
            />
          ))}
        </ScrollView>
      )}
    </YStack>
  );
}
