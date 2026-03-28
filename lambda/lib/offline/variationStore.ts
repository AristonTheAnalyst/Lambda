import { type SQLiteDatabase } from 'expo-sqlite';
import { getNextLocalId } from '@/lib/db/localIdSeq';
import { enqueueOperation } from '@/lib/sync/syncQueue';

export async function findVariationByName(
  db: SQLiteDatabase,
  name: string
): Promise<{ custom_variation_id: number; is_active: number } | null> {
  return db.getFirstAsync<{ custom_variation_id: number; is_active: number }>(
    `SELECT custom_variation_id, is_active FROM user_custom_variation WHERE LOWER(variation_name) = LOWER(?) LIMIT 1`,
    [name.trim()]
  );
}

export async function createVariation(
  db: SQLiteDatabase,
  userId: string,
  name: string
): Promise<number> {
  const localId = await getNextLocalId(db);
  await db.runAsync(
    `INSERT INTO user_custom_variation
       (custom_variation_id, user_id, variation_name, is_active, synced)
     VALUES (?, ?, ?, 1, 0)`,
    [localId, userId, name.trim()]
  );
  await enqueueOperation(db, {
    table_name: 'user_custom_variation',
    operation: 'INSERT',
    payload: {
      custom_variation_id: localId,
      user_id: userId,
      variation_name: name.trim(),
    },
    local_id: localId,
  });
  return localId;
}

export async function reactivateVariation(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync(
    `UPDATE user_custom_variation SET is_active = 1, synced = 0 WHERE custom_variation_id = ?`,
    [id]
  );
  const row = await db.getFirstAsync<{ user_id: string; variation_name: string }>(
    `SELECT user_id, variation_name FROM user_custom_variation WHERE custom_variation_id = ?`,
    [id]
  );
  if (!row) return;
  await enqueueOperation(db, {
    table_name: 'user_custom_variation',
    operation: 'UPDATE',
    payload: {
      custom_variation_id: id,
      user_id: row.user_id,
      variation_name: row.variation_name,
      is_active: true,
    },
    depends_on_local_id: id < 0 ? id : null,
  });
}

export async function updateVariation(
  db: SQLiteDatabase,
  id: number,
  name: string
): Promise<void> {
  await db.runAsync(
    `UPDATE user_custom_variation SET variation_name = ?, synced = 0 WHERE custom_variation_id = ?`,
    [name.trim(), id]
  );
  const row = await db.getFirstAsync<{ user_id: string }>(
    `SELECT user_id FROM user_custom_variation WHERE custom_variation_id = ?`,
    [id]
  );
  if (!row) return;
  await enqueueOperation(db, {
    table_name: 'user_custom_variation',
    operation: 'UPDATE',
    payload: {
      custom_variation_id: id,
      user_id: row.user_id,
      variation_name: name.trim(),
    },
    depends_on_local_id: id < 0 ? id : null,
  });
}

export async function softDeleteVariation(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync(
    `UPDATE user_custom_variation SET is_active = 0, synced = 0 WHERE custom_variation_id = ?`,
    [id]
  );
  const row = await db.getFirstAsync<{ user_id: string; variation_name: string }>(
    `SELECT user_id, variation_name FROM user_custom_variation WHERE custom_variation_id = ?`,
    [id]
  );
  if (!row) return;
  await enqueueOperation(db, {
    table_name: 'user_custom_variation',
    operation: 'UPDATE',
    payload: {
      custom_variation_id: id,
      user_id: row.user_id,
      variation_name: row.variation_name,
      is_active: false,
    },
    depends_on_local_id: id < 0 ? id : null,
  });
}
