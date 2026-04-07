import { type SQLiteDatabase } from 'expo-sqlite';
import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from '@/lib/uuid';
import {
  type MutationRecord,
  type MutationOperation,
  insertMutationRecord,
  setMutationSyncing,
  setMutationSynced,
  setMutationConflict,
  resetMutationPending,
  getPendingMutations,
  getEntityLocalVersion,
  hasPendingMutation,
} from './sync-db';

// ─── Table → PK column map ────────────────────────────────────────────────────

// Supabase upsert requires knowing the conflict target column(s).
// These must match the PRIMARY KEY constraint on each Supabase table.
// Composite PKs use comma-separated column names (no spaces).
const TABLE_PK: Record<string, string> = {
  fact_user_workout:                     'user_workout_id',
  fact_workout_set:                      'workout_set_id',
  user_custom_exercise:                  'custom_exercise_id',
  user_custom_variation:                 'custom_variation_id',
  user_custom_exercise_variation_bridge: 'custom_exercise_id,custom_variation_id',
};

function getPkColumn(table: string): string {
  return TABLE_PK[table] ?? 'id';
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SyncResult {
  synced: number;
  conflicts: number;
  errors: number;
}

export interface ConflictResolution {
  shouldApply: boolean;
  resolution: 'local_wins' | 'server_wins';
}

// ─── Transient error detection ────────────────────────────────────────────────

const TRANSIENT_PATTERNS = [
  'Network request failed',
  'getValueWithKeyAsync',
  'User interaction is not allowed',
  'Failed to fetch',
];

function isTransientError(err: unknown): boolean {
  const msg = (err as any)?.message ?? '';
  return TRANSIENT_PATTERNS.some((p) => msg.includes(p));
}

// ─── Queue mutation ───────────────────────────────────────────────────────────

/**
 * Adds a mutation to the local SQLite queue and returns its UUID.
 *
 * This is the ONLY write path — never write directly to Supabase.
 * The entity must already exist in its local SQLite table.
 *
 * @param db       - Open SQLite database
 * @param table    - Supabase/SQLite table name
 * @param operation - 'CREATE' | 'UPDATE' | 'DELETE'
 * @param entityId - UUID of the entity (same UUID used as PK in SQLite + Supabase)
 * @param payload  - Full row data to send to Supabase
 * @returns        - The mutation UUID (for idempotent retry tracking)
 */
export async function queueMutation(
  db: SQLiteDatabase,
  table: string,
  operation: MutationOperation,
  entityId: string,
  payload: Record<string, unknown>
): Promise<string> {
  const mutationId = randomUUID();
  const nextVersion = (await getEntityLocalVersion(db, table, entityId)) + 1;

  await insertMutationRecord(db, {
    id: mutationId,
    table_name: table,
    operation,
    entity_id: entityId,
    payload: JSON.stringify(payload),
    local_version: nextVersion,
  });

  return mutationId;
}

// ─── Conflict resolution ──────────────────────────────────────────────────────

/**
 * Determines whether a local mutation should be applied given the server's
 * current version.
 *
 * Strategy: "local wins" — queued local mutations always take precedence.
 * Rationale: each user exclusively owns their own data (enforced by Supabase RLS),
 * so the only conflict scenario is multi-device use, where the most recent local
 * action represents what the user actually wanted.
 *
 * To switch to "server wins", return `shouldApply: localVersion > serverVersion`.
 */
export function handleConflict(
  localVersion: number,
  serverVersion: number,
  _payload: Record<string, unknown>
): ConflictResolution {
  // Local always wins — queue order is the source of truth
  void serverVersion;
  void localVersion;
  return { shouldApply: true, resolution: 'local_wins' };
}

// ─── Execute a single mutation ────────────────────────────────────────────────

async function executeMutation(
  supabase: SupabaseClient,
  mutation: MutationRecord
): Promise<{ serverVersion: number }> {
  const payload = JSON.parse(mutation.payload) as Record<string, unknown>;
  const table = mutation.table_name;

  if (mutation.operation === 'CREATE' || mutation.operation === 'UPDATE') {
    // UPSERT on entity UUID — idempotent: sending same mutation twice is safe
    const { error } = await supabase
      .from(table)
      .upsert(payload, { onConflict: getPkColumn(table) });

    if (error) throw new Error(error.message);
    return { serverVersion: mutation.local_version };
  }

  if (mutation.operation === 'DELETE') {
    // Soft-delete: Supabase rows use is_active / deleted_at flags via the payload.
    const { error } = await supabase
      .from(table)
      .upsert(payload, { onConflict: getPkColumn(table) });

    if (error) throw new Error(error.message);
    return { serverVersion: mutation.local_version };
  }

  throw new Error(`Unknown operation: ${mutation.operation}`);
}

// ─── Sync queue ───────────────────────────────────────────────────────────────

/**
 * Dequeues all pending mutations in chronological order and sends them to
 * Supabase. Handles retries for transient errors and marks permanent failures
 * as 'conflict'.
 *
 * Idempotent: safe to call concurrently (caller must enforce the lock) or
 * to retry after partial failure.
 */
export async function syncQueue(
  db: SQLiteDatabase,
  supabase: SupabaseClient
): Promise<SyncResult> {
  const pending = await getPendingMutations(db);
  const result: SyncResult = { synced: 0, conflicts: 0, errors: 0 };

  for (const mutation of pending) {
    await setMutationSyncing(db, mutation.id);
    try {
      const { serverVersion } = await executeMutation(supabase, mutation);
      await setMutationSynced(db, mutation.id, serverVersion);
      result.synced++;
    } catch (err: unknown) {
      result.errors++;
      if (isTransientError(err)) {
        // Leave as pending — will be retried on the next sync cycle
        await resetMutationPending(db, mutation.id, (err as any)?.message ?? 'Transient error');
        console.warn(`[SyncEngine] ${mutation.id} transient error (will retry):`, (err as any)?.message);
      } else {
        // Permanent failure — mark as conflict so it doesn't block the queue
        await setMutationConflict(db, mutation.id, (err as any)?.message ?? 'Unknown error');
        result.conflicts++;
        console.warn(`[SyncEngine] ${mutation.id} permanent conflict:`, (err as any)?.message);
      }
    }
  }

  return result;
}

// ─── Pull latest ──────────────────────────────────────────────────────────────

/**
 * Fetches the current server state for a table and writes it into SQLite,
 * SKIPPING any rows that have pending local mutations (to avoid clobbering
 * unsynced changes).
 *
 * Intended to be called by React Query's queryFn after a successful sync,
 * or on first install to seed local data.
 *
 * @param writeToLocal - Caller-provided function that inserts/replaces rows in SQLite.
 *                       Receives only the rows safe to overwrite.
 * @returns            - All rows fetched from the server (including skipped ones,
 *                       so React Query can populate its cache).
 */
export async function pullLatest<T extends Record<string, unknown>>(
  db: SQLiteDatabase,
  supabase: SupabaseClient,
  table: string,
  userId: string,
  getEntityId: (row: T) => string,
  writeToLocal: (rows: T[]) => Promise<void>
): Promise<T[]> {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  const rows = data as T[];

  // Only write rows with no pending local mutations — we don't overwrite in-flight changes
  const safeRows: T[] = [];
  for (const row of rows) {
    const blocked = await hasPendingMutation(db, table, getEntityId(row));
    if (!blocked) safeRows.push(row);
  }

  if (safeRows.length > 0) {
    await writeToLocal(safeRows);
  }

  return rows;
}
