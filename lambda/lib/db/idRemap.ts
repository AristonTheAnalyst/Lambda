import { type SQLiteDatabase } from 'expo-sqlite';

/**
 * Records a mapping from a local negative ID to the server-assigned positive ID
 * after a successful INSERT sync.
 */
export async function setRemap(
  db: SQLiteDatabase,
  localId: number,
  serverId: number,
  tableName: string
): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO id_remap (local_id, server_id, table_name) VALUES (?, ?, ?)',
    [localId, serverId, tableName]
  );
}

/**
 * Returns the server ID for a given local ID, or null if not yet synced.
 */
export async function getRemap(
  db: SQLiteDatabase,
  localId: number
): Promise<{ serverId: number; tableName: string } | null> {
  const row = await db.getFirstAsync<{ server_id: number; table_name: string }>(
    'SELECT server_id, table_name FROM id_remap WHERE local_id = ?',
    [localId]
  );
  if (!row) return null;
  return { serverId: row.server_id, tableName: row.table_name };
}
