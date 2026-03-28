import { type SQLiteDatabase } from 'expo-sqlite';

export type SyncOperation = 'INSERT' | 'UPDATE' | 'DELETE';

export interface SyncEntry {
  table_name: string;
  operation: SyncOperation;
  payload: Record<string, any>;
  /** The local negative ID this INSERT created. Null for UPDATE/DELETE. */
  local_id?: number | null;
  /** Block this entry until the given local ID has been remapped to a server ID. */
  depends_on_local_id?: number | null;
}

interface SyncRow {
  id: number;
  table_name: string;
  operation: SyncOperation;
  payload: string;
  local_id: number | null;
  depends_on_local_id: number | null;
  status: string;
  retry_count: number;
  last_error: string | null;
}

export type { SyncRow };

/** The primary key column for each synced table. */
export function getPkColumn(tableName: string): string {
  const map: Record<string, string> = {
    fact_user_workout: 'user_workout_id',
    fact_workout_set: 'workout_set_id',
    user_custom_exercise: 'custom_exercise_id',
    user_custom_variation: 'custom_variation_id',
  };
  return map[tableName] ?? 'id';
}

/**
 * Adds an operation to the sync queue.
 * UPDATEs are collapsed: if a pending UPDATE already exists for the same row,
 * its payload is replaced rather than a new entry appended.
 */
export async function enqueueOperation(db: SQLiteDatabase, entry: SyncEntry): Promise<void> {
  const payloadJson = JSON.stringify(entry.payload);

  if (entry.operation === 'UPDATE') {
    const pkCol = getPkColumn(entry.table_name);
    const pkVal = entry.payload[pkCol];
    if (pkVal != null) {
      const existing = await db.getFirstAsync<{ id: number }>(
        `SELECT id FROM sync_queue
         WHERE status = 'pending' AND operation = 'UPDATE' AND table_name = ?
           AND json_extract(payload, '$.' || ?) = ?`,
        [entry.table_name, pkCol, pkVal]
      );
      if (existing) {
        await db.runAsync('UPDATE sync_queue SET payload = ? WHERE id = ?', [
          payloadJson,
          existing.id,
        ]);
        return;
      }
    }
  }

  await db.runAsync(
    `INSERT INTO sync_queue (table_name, operation, payload, local_id, depends_on_local_id)
     VALUES (?, ?, ?, ?, ?)`,
    [
      entry.table_name,
      entry.operation,
      payloadJson,
      entry.local_id ?? null,
      entry.depends_on_local_id ?? null,
    ]
  );
}

export async function getPendingEntries(db: SQLiteDatabase): Promise<SyncRow[]> {
  return db.getAllAsync<SyncRow>(
    `SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC, id ASC`
  );
}

export async function getPendingCount(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending'`
  );
  return row?.count ?? 0;
}

export async function markDone(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`UPDATE sync_queue SET status = 'done' WHERE id = ?`, [id]);
}

export async function markFailed(db: SQLiteDatabase, id: number, error: string): Promise<void> {
  await db.runAsync(
    `UPDATE sync_queue SET status = 'failed', last_error = ?, retry_count = retry_count + 1 WHERE id = ?`,
    [error, id]
  );
}
