import { useState, useCallback } from 'react';
import { ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, XStack, YStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import GlassButton from '@/components/GlassButton';
import Button from '@/components/Button';
import { useAppTheme } from '@/lib/ThemeContext';

const PRESETS = [
  {
    label: 'Pending',
    sql: "SELECT id, table_name, operation, entity_id, status, local_version, error\nFROM mutation_queue\nWHERE status = 'pending'\nORDER BY created_at ASC",
  },
  {
    label: 'Queue',
    sql: "SELECT id, table_name, operation, entity_id, status, local_version, error, created_at\nFROM mutation_queue\nORDER BY created_at DESC\nLIMIT 50",
  },
  {
    label: 'Workouts',
    sql: 'SELECT * FROM fact_user_workout\nORDER BY user_workout_created_date DESC',
  },
  {
    label: 'Sets',
    sql: 'SELECT * FROM fact_workout_set\nORDER BY user_workout_id, workout_set_number',
  },
  {
    label: 'Version',
    sql: 'PRAGMA user_version',
  },
];

export default function SqlInspectorScreen() {
  const { colors, space, radius, fontSize } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();

  const [sql, setSql] = useState(PRESETS[0].sql);
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);

  const runQuery = useCallback(async () => {
    const trimmed = sql.trim();
    if (!trimmed) return;
    setError(null);
    setRows(null);
    setElapsed(null);
    const start = Date.now();
    try {
      const result = await db.getAllAsync<Record<string, unknown>>(trimmed);
      setElapsed(Date.now() - start);
      setRows(result);
    } catch (e: unknown) {
      setElapsed(Date.now() - start);
      setError((e as Error).message ?? String(e));
    }
  }, [db, sql]);

  return (
    <YStack flex={1} backgroundColor={colors.bg}>
      <YStack paddingTop={insets.top + space.sm} paddingBottom={space.md} paddingHorizontal={space.lg}>
        <XStack alignItems="center" gap={space.md}>
          <GlassButton icon="chevron-left" onPress={() => router.back()} />
          <Text fontSize={fontSize.xl} fontWeight="700" color={colors.primary} flex={1} textAlign="center" marginRight={44}>
            SQL Inspector
          </Text>
        </XStack>
      </YStack>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xxl }}>

        {/* Preset chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingBottom: space.md }}>
          {PRESETS.map((p) => (
            <TouchableOpacity key={p.label} activeOpacity={0.7} onPress={() => setSql(p.sql)}>
              <YStack
                paddingHorizontal={space.md}
                paddingVertical={space.xs}
                borderRadius={radius.md}
                backgroundColor={sql === p.sql ? colors.accentBg : colors.surface}
                borderWidth={1}
                borderColor={sql === p.sql ? colors.accent : colors.border}
              >
                <Text fontSize={fontSize.sm} color={sql === p.sql ? colors.accent : colors.muted}>
                  {p.label}
                </Text>
              </YStack>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* SQL input */}
        <TextInput
          value={sql}
          onChangeText={setSql}
          multiline
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            padding: space.md,
            color: colors.primary,
            fontSize: fontSize.sm,
            minHeight: 110,
            textAlignVertical: 'top',
            marginBottom: space.md,
          }}
          placeholderTextColor={colors.muted}
          placeholder="SELECT * FROM ..."
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          keyboardAppearance="dark"
        />

        <Button label="Run" onPress={runQuery} />

        {/* Results */}
        {error != null && (
          <YStack
            marginTop={space.lg}
            backgroundColor={colors.dangerBg}
            borderWidth={1}
            borderColor={colors.dangerBorder}
            borderRadius={radius.md}
            padding={space.md}
          >
            <Text color={colors.danger} fontSize={fontSize.sm}>
              {error}
            </Text>
          </YStack>
        )}

        {rows != null && (
          <YStack marginTop={space.lg} gap={space.sm}>
            <Text color={colors.muted} fontSize={fontSize.sm}>
              {rows.length} row{rows.length !== 1 ? 's' : ''}{elapsed != null ? `  ·  ${elapsed}ms` : ''}
            </Text>

            {rows.length === 0 ? (
              <Text color={colors.muted} fontSize={fontSize.sm}>(no rows)</Text>
            ) : (
              rows.map((row, i) => (
                <YStack
                  key={i}
                  backgroundColor={colors.surface}
                  borderRadius={radius.md}
                  padding={space.md}
                  borderWidth={1}
                  borderColor={colors.border}
                >
                  <Text color={colors.primary} fontSize={11} lineHeight={17}>
                    {JSON.stringify(row, null, 2)}
                  </Text>
                </YStack>
              ))
            )}
          </YStack>
        )}

      </ScrollView>
    </YStack>
  );
}
