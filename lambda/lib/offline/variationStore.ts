import { type SQLiteDatabase } from 'expo-sqlite';
import { queueMutation } from '@/lib/sync/sync-engine';
import { randomUUID } from '@/lib/uuid';

export async function findVariationByName(
  db: SQLiteDatabase,
  name: string
): Promise<{ custom_variation_id: string; is_active: number } | null> {
  return db.getFirstAsync<{ custom_variation_id: string; is_active: number }>(
    `SELECT custom_variation_id, is_active
     FROM user_custom_variation WHERE LOWER(variation_name) = LOWER(?) LIMIT 1`,
    [name.trim()]
  );
}

export async function createVariation(
  db: SQLiteDatabase,
  userId: string,
  name: string
): Promise<string> {
  const id = randomUUID();
  await db.runAsync(
    `INSERT INTO user_custom_variation
       (custom_variation_id, user_id, variation_name, is_active)
     VALUES (?, ?, ?, 1)`,
    [id, userId, name.trim()]
  );
  await queueMutation(db, 'user_custom_variation', 'CREATE', id, {
    custom_variation_id: id, user_id: userId, variation_name: name.trim(), is_active: true,
  });
  return id;
}

export async function reactivateVariation(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync(
    `UPDATE user_custom_variation SET is_active = 1 WHERE custom_variation_id = ?`, [id]
  );
  const row = await db.getFirstAsync<{ user_id: string; variation_name: string }>(
    `SELECT user_id, variation_name FROM user_custom_variation WHERE custom_variation_id = ?`, [id]
  );
  if (!row) return;
  await queueMutation(db, 'user_custom_variation', 'UPDATE', id, {
    custom_variation_id: id, user_id: row.user_id,
    variation_name: row.variation_name, is_active: true,
  });
}

export async function updateVariation(
  db: SQLiteDatabase,
  id: string,
  name: string
): Promise<void> {
  await db.runAsync(
    `UPDATE user_custom_variation SET variation_name = ? WHERE custom_variation_id = ?`,
    [name.trim(), id]
  );
  const row = await db.getFirstAsync<{ user_id: string }>(
    `SELECT user_id FROM user_custom_variation WHERE custom_variation_id = ?`, [id]
  );
  if (!row) return;
  await queueMutation(db, 'user_custom_variation', 'UPDATE', id, {
    custom_variation_id: id, user_id: row.user_id, variation_name: name.trim(),
  });
}

export async function softDeleteVariation(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync(
    `UPDATE user_custom_variation SET is_active = 0 WHERE custom_variation_id = ?`, [id]
  );
  const row = await db.getFirstAsync<{ user_id: string; variation_name: string }>(
    `SELECT user_id, variation_name FROM user_custom_variation WHERE custom_variation_id = ?`, [id]
  );
  if (!row) return;
  await queueMutation(db, 'user_custom_variation', 'UPDATE', id, {
    custom_variation_id: id, user_id: row.user_id,
    variation_name: row.variation_name, is_active: false,
  });
}
