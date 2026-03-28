import { type SQLiteDatabase } from 'expo-sqlite';

/**
 * Returns the next local ID (negative integer) and atomically decrements the counter.
 * Local IDs are always negative to distinguish them from server-generated positive IDs.
 */
export async function getNextLocalId(db: SQLiteDatabase): Promise<number> {
  let localId = -1;
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<{ next_val: number }>(
      'SELECT next_val FROM local_id_seq WHERE id = 1'
    );
    localId = row?.next_val ?? -1;
    await db.runAsync('UPDATE local_id_seq SET next_val = ? WHERE id = 1', [localId - 1]);
  });
  return localId;
}
