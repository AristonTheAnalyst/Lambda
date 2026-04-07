import { type SQLiteDatabase } from 'expo-sqlite';
import { queueMutation } from '@/lib/sync/sync-engine';
import { randomUUID } from '@/lib/uuid';

export async function findExerciseByName(
  db: SQLiteDatabase,
  name: string
): Promise<{ custom_exercise_id: string; is_active: number } | null> {
  return db.getFirstAsync<{ custom_exercise_id: string; is_active: number }>(
    `SELECT custom_exercise_id, is_active
     FROM user_custom_exercise WHERE LOWER(exercise_name) = LOWER(?) LIMIT 1`,
    [name.trim()]
  );
}

export async function createExercise(
  db: SQLiteDatabase,
  userId: string,
  name: string,
  volumeType: string
): Promise<string> {
  const id = randomUUID();
  await db.runAsync(
    `INSERT INTO user_custom_exercise
       (custom_exercise_id, user_id, exercise_name, exercise_volume_type, is_active)
     VALUES (?, ?, ?, ?, 1)`,
    [id, userId, name.trim(), volumeType]
  );
  await queueMutation(db, 'user_custom_exercise', 'CREATE', id, {
    custom_exercise_id: id, user_id: userId,
    exercise_name: name.trim(), exercise_volume_type: volumeType, is_active: true,
  });
  return id;
}

export async function reactivateExercise(
  db: SQLiteDatabase,
  id: string,
  volumeType: string
): Promise<void> {
  await db.runAsync(
    `UPDATE user_custom_exercise SET is_active = 1, exercise_volume_type = ? WHERE custom_exercise_id = ?`,
    [volumeType, id]
  );
  const row = await db.getFirstAsync<{ user_id: string; exercise_name: string }>(
    `SELECT user_id, exercise_name FROM user_custom_exercise WHERE custom_exercise_id = ?`, [id]
  );
  if (!row) return;
  await queueMutation(db, 'user_custom_exercise', 'UPDATE', id, {
    custom_exercise_id: id, user_id: row.user_id,
    exercise_name: row.exercise_name, exercise_volume_type: volumeType, is_active: true,
  });
}

export async function updateExercise(
  db: SQLiteDatabase,
  id: string,
  name: string,
  volumeType: string
): Promise<void> {
  await db.runAsync(
    `UPDATE user_custom_exercise SET exercise_name = ?, exercise_volume_type = ? WHERE custom_exercise_id = ?`,
    [name.trim(), volumeType, id]
  );
  const row = await db.getFirstAsync<{ user_id: string }>(
    `SELECT user_id FROM user_custom_exercise WHERE custom_exercise_id = ?`, [id]
  );
  if (!row) return;
  await queueMutation(db, 'user_custom_exercise', 'UPDATE', id, {
    custom_exercise_id: id, user_id: row.user_id,
    exercise_name: name.trim(), exercise_volume_type: volumeType,
  });
}

export async function softDeleteExercise(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync(
    `UPDATE user_custom_exercise SET is_active = 0 WHERE custom_exercise_id = ?`, [id]
  );
  const row = await db.getFirstAsync<{
    user_id: string; exercise_name: string; exercise_volume_type: string;
  }>(
    `SELECT user_id, exercise_name, exercise_volume_type FROM user_custom_exercise WHERE custom_exercise_id = ?`, [id]
  );
  if (!row) return;
  await queueMutation(db, 'user_custom_exercise', 'UPDATE', id, {
    custom_exercise_id: id, user_id: row.user_id,
    exercise_name: row.exercise_name, exercise_volume_type: row.exercise_volume_type, is_active: false,
  });
}
