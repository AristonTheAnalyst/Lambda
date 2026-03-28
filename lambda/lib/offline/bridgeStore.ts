import { type SQLiteDatabase } from 'expo-sqlite';
import { enqueueOperation } from '@/lib/sync/syncQueue';

export interface BridgeRow {
  custom_exercise_id: number;
  custom_variation_id: number;
}

/**
 * Returns all bridge rows where custom_exercise_id is in the given list.
 * Used by the exercise-centric view to load assigned variations.
 */
export async function getBridgeForExercises(
  db: SQLiteDatabase,
  exerciseIds: number[]
): Promise<BridgeRow[]> {
  if (exerciseIds.length === 0) return [];
  const placeholders = exerciseIds.map(() => '?').join(',');
  return db.getAllAsync<BridgeRow>(
    `SELECT custom_exercise_id, custom_variation_id
     FROM user_custom_exercise_variation_bridge
     WHERE custom_exercise_id IN (${placeholders})`,
    exerciseIds
  );
}

/**
 * Returns all bridge rows where custom_variation_id is in the given list.
 * Used by the variation-centric view to load assigned exercises.
 */
export async function getBridgeForVariations(
  db: SQLiteDatabase,
  variationIds: number[]
): Promise<BridgeRow[]> {
  if (variationIds.length === 0) return [];
  const placeholders = variationIds.map(() => '?').join(',');
  return db.getAllAsync<BridgeRow>(
    `SELECT custom_exercise_id, custom_variation_id
     FROM user_custom_exercise_variation_bridge
     WHERE custom_variation_id IN (${placeholders})`,
    variationIds
  );
}

export async function checkBridgeExists(
  db: SQLiteDatabase,
  exerciseId: number,
  variationId: number
): Promise<boolean> {
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT 1 AS n FROM user_custom_exercise_variation_bridge
     WHERE custom_exercise_id = ? AND custom_variation_id = ? LIMIT 1`,
    [exerciseId, variationId]
  );
  return row != null;
}

export async function addBridgeRow(
  db: SQLiteDatabase,
  userId: string,
  exerciseId: number,
  variationId: number
): Promise<void> {
  await db.runAsync(
    `INSERT OR IGNORE INTO user_custom_exercise_variation_bridge
       (custom_exercise_id, custom_variation_id, user_id, synced)
     VALUES (?, ?, ?, 0)`,
    [exerciseId, variationId, userId]
  );
  await enqueueOperation(db, {
    table_name: 'user_custom_exercise_variation_bridge',
    operation: 'INSERT',
    payload: {
      custom_exercise_id: exerciseId,
      custom_variation_id: variationId,
      user_id: userId,
    },
    depends_on_local_id: exerciseId < 0 ? exerciseId : variationId < 0 ? variationId : null,
  });
}

export async function removeBridgeRow(
  db: SQLiteDatabase,
  exerciseId: number,
  variationId: number
): Promise<void> {
  await db.runAsync(
    `DELETE FROM user_custom_exercise_variation_bridge
     WHERE custom_exercise_id = ? AND custom_variation_id = ?`,
    [exerciseId, variationId]
  );
  await enqueueOperation(db, {
    table_name: 'user_custom_exercise_variation_bridge',
    operation: 'DELETE',
    payload: {
      custom_exercise_id: exerciseId,
      custom_variation_id: variationId,
    },
  });
}
