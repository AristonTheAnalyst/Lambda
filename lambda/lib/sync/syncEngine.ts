import { type SQLiteDatabase } from 'expo-sqlite';
import supabase from '@/lib/supabase';
import { getPendingEntries, getPkColumn, markDone, markFailed } from './syncQueue';
import { getRemap, setRemap } from '@/lib/db/idRemap';

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
          // Dependency not yet synced — skip this entry for now
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
      const resolvedPayload: Record<string, any> = { ...payload };
      for (const [k, v] of Object.entries(resolvedPayload)) {
        if (k === pkCol) continue;
        if (typeof v === 'number' && v < 0) {
          const remap = await getRemap(db, v);
          if (remap) {
            resolvedPayload[k] = remap.serverId;
          } else {
            hasUnresolved = true;
            break;
          }
        }
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
          await setRemap(db, entry.local_id, serverId, tableName);
          await updateLocalRowId(db, tableName, entry.local_id, serverId);
        }

        await markDone(db, entry.id);

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
      console.warn(`[SyncEngine] Entry ${entry.id} failed: ${message}`);
      await markFailed(db, entry.id, message);
    }
  }
}
