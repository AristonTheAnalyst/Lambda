import { type SQLiteDatabase } from 'expo-sqlite';
import { getNextLocalId } from '@/lib/db/localIdSeq';
import { enqueueOperation } from '@/lib/sync/syncQueue';

export async function findExerciseByName(
  db: SQLiteDatabase,
  name: string
): Promise<{ custom_exercise_id: number; is_active: number } | null> {
  return db.getFirstAsync<{ custom_exercise_id: number; is_active: number }>(
    `SELECT custom_exercise_id, is_active FROM user_custom_exercise WHERE LOWER(exercise_name) = LOWER(?) LIMIT 1`,
    [name.trim()]
  );
}

export async function createExercise(
  db: SQLiteDatabase,
  userId: string,
  name: string,
  volumeType: string
): Promise<number> {
  const localId = await getNextLocalId(db);
  await db.runAsync(
    `INSERT INTO user_custom_exercise
       (custom_exercise_id, user_id, exercise_name, exercise_volume_type, is_active, synced)
     VALUES (?, ?, ?, ?, 1, 0)`,
    [localId, userId, name.trim(), volumeType]
  );
  await enqueueOperation(db, {
    table_name: 'user_custom_exercise',
    operation: 'INSERT',
    payload: {
      custom_exercise_id: localId,
      user_id: userId,
      exercise_name: name.trim(),
      exercise_volume_type: volumeType,
    },
    local_id: localId,
  });
  return localId;
}

export async function reactivateExercise(
  db: SQLiteDatabase,
  id: number,
  volumeType: string
): Promise<void> {
  await db.runAsync(
    `UPDATE user_custom_exercise SET is_active = 1, exercise_volume_type = ?, synced = 0 WHERE custom_exercise_id = ?`,
    [volumeType, id]
  );
  const row = await db.getFirstAsync<{ user_id: string; exercise_name: string }>(
    `SELECT user_id, exercise_name FROM user_custom_exercise WHERE custom_exercise_id = ?`,
    [id]
  );
  if (!row) return;
  await enqueueOperation(db, {
    table_name: 'user_custom_exercise',
    operation: 'UPDATE',
    payload: {
      custom_exercise_id: id,
      user_id: row.user_id,
      exercise_name: row.exercise_name,
      exercise_volume_type: volumeType,
      is_active: true,
    },
    depends_on_local_id: id < 0 ? id : null,
  });
}

export async function updateExercise(
  db: SQLiteDatabase,
  id: number,
  name: string,
  volumeType: string
): Promise<void> {
  await db.runAsync(
    `UPDATE user_custom_exercise SET exercise_name = ?, exercise_volume_type = ?, synced = 0 WHERE custom_exercise_id = ?`,
    [name.trim(), volumeType, id]
  );
  const row = await db.getFirstAsync<{ user_id: string }>(
    `SELECT user_id FROM user_custom_exercise WHERE custom_exercise_id = ?`,
    [id]
  );
  if (!row) return;
  await enqueueOperation(db, {
    table_name: 'user_custom_exercise',
    operation: 'UPDATE',
    payload: {
      custom_exercise_id: id,
      user_id: row.user_id,
      exercise_name: name.trim(),
      exercise_volume_type: volumeType,
    },
    depends_on_local_id: id < 0 ? id : null,
  });
}

export async function softDeleteExercise(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync(
    `UPDATE user_custom_exercise SET is_active = 0, synced = 0 WHERE custom_exercise_id = ?`,
    [id]
  );
  const row = await db.getFirstAsync<{
    user_id: string;
    exercise_name: string;
    exercise_volume_type: string;
  }>(
    `SELECT user_id, exercise_name, exercise_volume_type FROM user_custom_exercise WHERE custom_exercise_id = ?`,
    [id]
  );
  if (!row) return;
  await enqueueOperation(db, {
    table_name: 'user_custom_exercise',
    operation: 'UPDATE',
    payload: {
      custom_exercise_id: id,
      user_id: row.user_id,
      exercise_name: row.exercise_name,
      exercise_volume_type: row.exercise_volume_type,
      is_active: false,
    },
    depends_on_local_id: id < 0 ? id : null,
  });
}
