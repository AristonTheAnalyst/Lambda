import { type SQLiteDatabase } from 'expo-sqlite';
import { queueMutation } from '@/lib/sync/sync-engine';

export interface BridgeRow {
  custom_exercise_id: string;
  custom_variation_id: string;
}

export async function getBridgeForExercises(
  db: SQLiteDatabase,
  exerciseIds: string[]
): Promise<BridgeRow[]> {
  if (exerciseIds.length === 0) return [];
  const placeholders = exerciseIds.map(() => '?').join(',');
  return db.getAllAsync<BridgeRow>(
    `SELECT custom_exercise_id, custom_variation_id
     FROM user_custom_exercise_variation_bridge
     WHERE custom_exercise_id IN (${placeholders}) AND deleted_locally = 0`,
    exerciseIds
  );
}

export async function getBridgeForVariations(
  db: SQLiteDatabase,
  variationIds: string[]
): Promise<BridgeRow[]> {
  if (variationIds.length === 0) return [];
  const placeholders = variationIds.map(() => '?').join(',');
  return db.getAllAsync<BridgeRow>(
    `SELECT custom_exercise_id, custom_variation_id
     FROM user_custom_exercise_variation_bridge
     WHERE custom_variation_id IN (${placeholders}) AND deleted_locally = 0`,
    variationIds
  );
}

export async function checkBridgeExists(
  db: SQLiteDatabase,
  exerciseId: string,
  variationId: string
): Promise<boolean> {
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT 1 AS n FROM user_custom_exercise_variation_bridge
     WHERE custom_exercise_id = ? AND custom_variation_id = ? AND deleted_locally = 0 LIMIT 1`,
    [exerciseId, variationId]
  );
  return row != null;
}

export async function addBridgeRow(
  db: SQLiteDatabase,
  userId: string,
  exerciseId: string,
  variationId: string
): Promise<void> {
  await db.runAsync(
    `INSERT OR IGNORE INTO user_custom_exercise_variation_bridge
       (custom_exercise_id, custom_variation_id, user_id, deleted_locally)
     VALUES (?, ?, ?, 0)`,
    [exerciseId, variationId, userId]
  );

  // Composite entity_id for the bridge — unique per pair
  const entityId = `${exerciseId}|${variationId}`;
  await queueMutation(db, 'user_custom_exercise_variation_bridge', 'CREATE', entityId, {
    custom_exercise_id: exerciseId,
    custom_variation_id: variationId,
    user_id: userId,
  });
}

export async function removeBridgeRow(
  db: SQLiteDatabase,
  exerciseId: string,
  variationId: string
): Promise<void> {
  await db.runAsync(
    `UPDATE user_custom_exercise_variation_bridge
       SET deleted_locally = 1
     WHERE custom_exercise_id = ? AND custom_variation_id = ?`,
    [exerciseId, variationId]
  );

  const entityId = `${exerciseId}|${variationId}`;
  await queueMutation(db, 'user_custom_exercise_variation_bridge', 'DELETE', entityId, {
    custom_exercise_id: exerciseId,
    custom_variation_id: variationId,
    deleted_locally: true,
  });
}
