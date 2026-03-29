import { SQLiteDatabase } from 'expo-sqlite';

export interface ExerciseDefault {
  last_weight_kg: number | null;
  last_variation_id: number | null;
}

export async function getExerciseDefault(db: SQLiteDatabase, exerciseId: number): Promise<ExerciseDefault | null> {
  return db.getFirstAsync<ExerciseDefault>(
    `SELECT last_weight_kg, last_variation_id FROM exercise_defaults WHERE custom_exercise_id = ?`,
    [exerciseId],
  );
}

export async function saveExerciseDefault(
  db: SQLiteDatabase,
  exerciseId: number,
  weightKg: number | null,
  variationId: number | null,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO exercise_defaults (custom_exercise_id, last_weight_kg, last_variation_id)
     VALUES (?, ?, ?)
     ON CONFLICT(custom_exercise_id) DO UPDATE SET
       last_weight_kg    = excluded.last_weight_kg,
       last_variation_id = excluded.last_variation_id`,
    [exerciseId, weightKg, variationId],
  );
}
