import { type SQLiteDatabase } from 'expo-sqlite';
import supabase from '@/lib/supabase';
import { getPendingEntries, getPkColumn, markDone, markFailed } from './syncQueue';
import { getRemap, setRemap } from '@/lib/db/idRemap';

// ─── Transient error detection ────────────────────────────────────────────────

/**
 * Transient errors are caused by temporary conditions (no network, device locked)
 * and should be retried on the next sync run rather than permanently failed.
 */
const TRANSIENT_PATTERNS = [
  'Network request failed',
  'getValueWithKeyAsync',
  'User interaction is not allowed',
];

function isTransientError(err: any): boolean {
  const msg: string = err?.message ?? '';
  return TRANSIENT_PATTERNS.some((p) => msg.includes(p));
}

/**
 * Resets failed queue entries that can be retried:
 * 1. Entries that failed transiently (network, SecureStore locked).
 * 2. Cascading dependency failures whose direct parent was just reset to pending.
 *
 * Called at the top of every processSyncQueue run.
 */
async function resetTransientFailures(db: SQLiteDatabase): Promise<void> {
  // Step 1: reset entries that failed due to transient conditions
  const patternClauses = TRANSIENT_PATTERNS.map(() => `last_error LIKE ?`).join(' OR ');
  const patternArgs = TRANSIENT_PATTERNS.map((p) => `%${p}%`);
  await db.runAsync(
    `UPDATE sync_queue SET status = 'pending', last_error = NULL
     WHERE status = 'failed' AND (${patternClauses})`,
    patternArgs
  );

  // Step 1b: RLS violations are often caused by unauthenticated requests (SecureStore locked
  // → token refresh failed → request went out without auth → auth.uid() was null).
  // Retry up to 3 times so they succeed once the session is valid. After 3 attempts we
  // give up in case it is a genuine data-ownership mismatch.
  await db.runAsync(
    `UPDATE sync_queue SET status = 'pending', last_error = NULL
     WHERE status = 'failed'
       AND last_error LIKE '%row-level security policy%'
       AND retry_count < 3`
  );

  // Step 2: reset cascading "Dependency X unresolvable" / "referenced local ID" failures
  // whose direct parent dependency is now pending (was just reset in step 1).
  // Only resets if the parent itself is recoverable — avoids resetting entries whose
  // parent failed permanently (e.g. RLS violation).
  await db.runAsync(
    `UPDATE sync_queue SET status = 'pending', last_error = NULL
     WHERE status = 'failed'
       AND depends_on_local_id IS NOT NULL
       AND (
         last_error LIKE '%Dependency%unresolvable%' OR
         last_error LIKE '%referenced local ID could not be resolved%'
       )
       AND EXISTS (
         SELECT 1 FROM sync_queue sq2
         WHERE sq2.local_id = sync_queue.depends_on_local_id
           AND sq2.status = 'pending'
       )`
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Replaces every value in payload equal to localId with serverId. */
function substituteLocalId(
  payload: Record<string, any>,
  localId: number,
  serverId: number
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(payload)) {
    result[k] = v === localId ? serverId : v;
  }
  return result;
}

/**
 * After a successful INSERT, updates the local row's PK to the server-assigned ID
 * and cascades the change to any child tables that reference the old local ID.
 */
async function updateLocalRowId(
  db: SQLiteDatabase,
  tableName: string,
  localId: number,
  serverId: number
): Promise<void> {
  const pkCol = getPkColumn(tableName);
  await db.runAsync(
    `UPDATE "${tableName}" SET "${pkCol}" = ?, synced = 1 WHERE "${pkCol}" = ?`,
    [serverId, localId]
  );

  // Cascade FK updates to child tables
  if (tableName === 'fact_user_workout') {
    await db.runAsync(
      `UPDATE fact_workout_set SET user_workout_id = ? WHERE user_workout_id = ?`,
      [serverId, localId]
    );
  } else if (tableName === 'user_custom_exercise') {
    await db.runAsync(
      `UPDATE fact_workout_set SET custom_exercise_id = ? WHERE custom_exercise_id = ?`,
      [serverId, localId]
    );
    await db.runAsync(
      `UPDATE user_custom_exercise_variation_bridge SET custom_exercise_id = ? WHERE custom_exercise_id = ?`,
      [serverId, localId]
    );
  } else if (tableName === 'user_custom_variation') {
    await db.runAsync(
      `UPDATE fact_workout_set SET custom_variation_id = ? WHERE custom_variation_id = ?`,
      [serverId, localId]
    );
    await db.runAsync(
      `UPDATE user_custom_exercise_variation_bridge SET custom_variation_id = ? WHERE custom_variation_id = ?`,
      [serverId, localId]
    );
  }
}

// ─── Local-only fields stripped before sending to Supabase ───────────────────

const LOCAL_ONLY_FIELDS = new Set(['synced', 'deleted_locally']);

function stripLocalFields(
  payload: Record<string, any>,
  ...extraKeys: string[]
): Record<string, any> {
  const result: Record<string, any> = {};
  const strip = new Set([...LOCAL_ONLY_FIELDS, ...extraKeys]);
  for (const [k, v] of Object.entries(payload)) {
    if (!strip.has(k)) result[k] = v;
  }
  return result;
}

// ─── Main processor ──────────────────────────────────────────────────────────

/**
 * Processes all pending sync queue entries in order.
 * Skips entries whose dependencies haven't been resolved yet — they'll be
 * picked up on the next sync run.
 */
export async function processSyncQueue(db: SQLiteDatabase): Promise<void> {
  await resetTransientFailures(db);

  const entries = await getPendingEntries(db);
  if (entries.length === 0) return;

  console.log(`[SyncEngine] Processing ${entries.length} queued operations`);

  for (const entry of entries) {
    try {
      let payload = JSON.parse(entry.payload) as Record<string, any>;
      const tableName = entry.table_name;
      const pkCol = getPkColumn(tableName);
      const isBridgeTable = tableName === 'user_custom_exercise_variation_bridge';

      // ── Resolve dependency ──────────────────────────────────────────────
      if (entry.depends_on_local_id != null) {
        const remap = await getRemap(db, entry.depends_on_local_id);
        if (!remap) {
          // If the parent entry is failed or gone entirely, this will never resolve
          const parentEntry = await db.getFirstAsync<{ status: string }>(
            `SELECT status FROM sync_queue WHERE local_id = ?`,
            [entry.depends_on_local_id]
          );
          if (!parentEntry || parentEntry.status === 'failed') {
            await markFailed(db, entry.id, `Dependency ${entry.depends_on_local_id} unresolvable`);
          }
          continue;
        }
        payload = substituteLocalId(payload, entry.depends_on_local_id, remap.serverId);
      }

      // ── Resolve PK if it's still a local ID ────────────────────────────
      if (!isBridgeTable) {
        const pkVal = payload[pkCol];
        if (pkVal != null && pkVal < 0) {
          const remap = await getRemap(db, pkVal);
          if (remap) {
            payload = { ...payload, [pkCol]: remap.serverId };
          }
        }
      }

      // ── Resolve any remaining negative FK values in non-PK fields ──────
      // Handles cases like the bridge table where both FKs may be local IDs
      let hasUnresolved = false;
      let hasFailedDep = false;
      const resolvedPayload: Record<string, any> = { ...payload };
      for (const [k, v] of Object.entries(resolvedPayload)) {
        if (k === pkCol) continue;
        if (typeof v === 'number' && v < 0) {
          const remap = await getRemap(db, v);
          if (remap) {
            resolvedPayload[k] = remap.serverId;
          } else {
            const depEntry = await db.getFirstAsync<{ status: string }>(
              `SELECT status FROM sync_queue WHERE local_id = ?`,
              [v]
            );
            if (!depEntry || depEntry.status === 'failed') hasFailedDep = true;
            hasUnresolved = true;
            break;
          }
        }
      }
      if (hasFailedDep) {
        await markFailed(db, entry.id, `A referenced local ID could not be resolved`);
      }
      if (hasUnresolved) continue;
      payload = resolvedPayload;

      // ── Execute operation ───────────────────────────────────────────────
      if (entry.operation === 'INSERT') {
        // Strip PK (server generates it) and local-only fields
        const insertPayload = isBridgeTable
          ? stripLocalFields(payload)
          : stripLocalFields(payload, pkCol);

        const { data, error } = await supabase
          .from(tableName)
          .insert(insertPayload)
          .select()
          .single();

        if (error) throw new Error(error.message);

        if (!isBridgeTable && entry.local_id != null) {
          const serverId: number = data[pkCol];
          await setRemap(db, entry.local_id!, serverId, tableName);
          await updateLocalRowId(db, tableName, entry.local_id!, serverId);
          await markDone(db, entry.id);
        } else {
          await markDone(db, entry.id);
        }

      } else if (entry.operation === 'UPDATE') {
        const pkValue = payload[pkCol];
        const updatePayload = stripLocalFields(payload, pkCol);

        const { error } = await supabase
          .from(tableName)
          .update(updatePayload)
          .eq(pkCol, pkValue);

        if (error) throw new Error(error.message);
        await markDone(db, entry.id);

      } else if (entry.operation === 'DELETE') {
        if (isBridgeTable) {
          const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('custom_exercise_id', payload.custom_exercise_id)
            .eq('custom_variation_id', payload.custom_variation_id);
          if (error) throw new Error(error.message);
        } else {
          const pkValue = payload[pkCol];
          if (pkValue == null) {
            // No PK — nothing to delete on server
            await markDone(db, entry.id);
            continue;
          }
          if (pkValue < 0) {
            // Record was created offline and never synced — nothing to delete on server
            await markDone(db, entry.id);
            continue;
          }
          const { error } = await supabase
            .from(tableName)
            .delete()
            .eq(pkCol, pkValue);
          if (error) throw new Error(error.message);
        }

        await markDone(db, entry.id);
      }
    } catch (err: any) {
      const message = err?.message ?? 'Unknown error';
      if (isTransientError(err)) {
        // Leave as pending — will be picked up on the next sync run
        console.warn(`[SyncEngine] Entry ${entry.id} transient error (will retry): ${message}`);
      } else {
        console.warn(`[SyncEngine] Entry ${entry.id} failed permanently: ${message}`);
        await markFailed(db, entry.id, message);
      }
    }
  }
}
