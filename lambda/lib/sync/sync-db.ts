import { type SQLiteDatabase } from 'expo-sqlite';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MutationOperation = 'CREATE' | 'UPDATE' | 'DELETE';
export type MutationStatus = 'pending' | 'syncing' | 'synced' | 'conflict';

export interface MutationRecord {
  id: string;              // UUID — client-generated, used for idempotency
  table_name: string;
  operation: MutationOperation;
  entity_id: string;       // UUID of the entity being mutated
  payload: string;         // JSON-serialised data
  local_version: number;   // increments per mutation on this entity
  status: MutationStatus;
  created_at: string;      // ISO timestamp
  synced_at: string | null;
  server_version: number | null;
  error: string | null;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

/** SQLite DDL for the mutation queue. Applied during v2 schema init. */
export const MUTATION_QUEUE_DDL = `
CREATE TABLE IF NOT EXISTS mutation_queue (
  id             TEXT PRIMARY KEY,
  table_name     TEXT    NOT NULL,
  operation      TEXT    NOT NULL CHECK(operation IN ('CREATE','UPDATE','DELETE')),
  entity_id      TEXT    NOT NULL,
  payload        TEXT    NOT NULL,
  local_version  INTEGER NOT NULL DEFAULT 1,
  status         TEXT    NOT NULL DEFAULT 'pending'
                   CHECK(status IN ('pending','syncing','synced','conflict')),
  created_at     TEXT    NOT NULL,
  synced_at      TEXT,
  server_version INTEGER,
  error          TEXT
);
CREATE INDEX IF NOT EXISTS idx_mq_status ON mutation_queue(status);
CREATE INDEX IF NOT EXISTS idx_mq_entity ON mutation_queue(entity_id, table_name);
`;

// ─── Write helpers ────────────────────────────────────────────────────────────

export async function insertMutationRecord(
  db: SQLiteDatabase,
  record: Pick<MutationRecord, 'id' | 'table_name' | 'operation' | 'entity_id' | 'payload' | 'local_version'>
): Promise<void> {
  await db.runAsync(
    `INSERT INTO mutation_queue
       (id, table_name, operation, entity_id, payload, local_version, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [record.id, record.table_name, record.operation, record.entity_id,
     record.payload, record.local_version, new Date().toISOString()]
  );
}

export async function setMutationSyncing(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(
    `UPDATE mutation_queue SET status = 'syncing' WHERE id = ?`, [id]
  );
}

export async function setMutationSynced(
  db: SQLiteDatabase,
  id: string,
  serverVersion: number
): Promise<void> {
  await db.runAsync(
    `UPDATE mutation_queue
       SET status = 'synced', synced_at = ?, server_version = ?, error = NULL
     WHERE id = ?`,
    [new Date().toISOString(), serverVersion, id]
  );
}

/**
 * Marks a mutation as conflicted (permanent failure — data integrity issue or
 * deterministic conflict resolution decided not to apply it).
 */
export async function setMutationConflict(
  db: SQLiteDatabase,
  id: string,
  reason: string
): Promise<void> {
  await db.runAsync(
    `UPDATE mutation_queue SET status = 'conflict', error = ? WHERE id = ?`,
    [reason, id]
  );
}

/**
 * Resets a mutation back to pending (transient error — network down, SecureStore
 * locked, etc.). It will be retried on the next sync run.
 */
export async function resetMutationPending(
  db: SQLiteDatabase,
  id: string,
  error: string
): Promise<void> {
  await db.runAsync(
    `UPDATE mutation_queue SET status = 'pending', error = ? WHERE id = ?`,
    [error, id]
  );
}

// ─── Read helpers ─────────────────────────────────────────────────────────────

export async function getPendingMutations(
  db: SQLiteDatabase
): Promise<MutationRecord[]> {
  return db.getAllAsync<MutationRecord>(
    `SELECT * FROM mutation_queue WHERE status = 'pending' ORDER BY created_at ASC`
  );
}

export async function getPendingCount(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM mutation_queue
     WHERE status IN ('pending', 'syncing', 'conflict')`
  );
  return row?.count ?? 0;
}

/**
 * Returns the highest local_version for any mutation on this entity, or 0 if none.
 * Used to assign monotonically increasing versions to sequential mutations.
 */
export async function getEntityLocalVersion(
  db: SQLiteDatabase,
  tableName: string,
  entityId: string
): Promise<number> {
  const row = await db.getFirstAsync<{ v: number | null }>(
    `SELECT MAX(local_version) as v FROM mutation_queue
     WHERE table_name = ? AND entity_id = ?`,
    [tableName, entityId]
  );
  return row?.v ?? 0;
}

/**
 * Returns true if there are any pending/syncing mutations for this entity.
 * Used by pullLatest to avoid overwriting unsynced local changes.
 */
export async function hasPendingMutation(
  db: SQLiteDatabase,
  tableName: string,
  entityId: string
): Promise<boolean> {
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) as n FROM mutation_queue
     WHERE table_name = ? AND entity_id = ? AND status IN ('pending','syncing')`,
    [tableName, entityId]
  );
  return (row?.n ?? 0) > 0;
}

/**
 * Resets all 'conflict' mutations back to 'pending' so they are retried.
 * Called on sync engine mount to recover from bugs that incorrectly marked
 * mutations as permanent failures.
 */
export async function resetConflictedMutations(db: SQLiteDatabase): Promise<void> {
  await db.runAsync(
    `UPDATE mutation_queue SET status = 'pending', error = NULL WHERE status = 'conflict'`
  );
}

/**
 * Deletes all pending/syncing mutations for a given entity.
 * Used when the user cancels an operation before it syncs (e.g. cancel workout).
 */
export async function purgePendingMutations(
  db: SQLiteDatabase,
  tableName: string,
  entityId: string
): Promise<void> {
  await db.runAsync(
    `DELETE FROM mutation_queue
     WHERE table_name = ? AND entity_id = ? AND status IN ('pending','syncing')`,
    [tableName, entityId]
  );
}
