import { type SQLiteDatabase } from 'expo-sqlite';
import { queueMutation } from '@/lib/sync/sync-engine';
import { randomUUID } from '@/lib/uuid';
import { purgePendingMutations } from '@/lib/sync/sync-db';
import { useSyncStore } from '@/lib/sync/useSyncEngine';

export interface WorkoutSet {
  workout_set_id: string;
  workout_set_number: number;
  custom_exercise_id: string;
  custom_variation_id: string | null;
  workout_set_weight: number | null;
  workout_set_reps: number[] | null;
  workout_set_duration_seconds: number[] | null;
  workout_set_notes: string | null;
}

export interface InsertSetData {
  user_workout_id: string;
  custom_exercise_id: string;
  custom_variation_id: string | null;
  workout_set_number: number;
  workout_set_weight: number | null;
  workout_set_reps: number[];
  workout_set_duration_seconds: number[];
  workout_set_notes: string | null;
}

export interface UpdateSetData {
  custom_exercise_id?: string;
  workout_set_weight: number | null;
  workout_set_reps: number[];
  workout_set_duration_seconds: number[];
  workout_set_notes: string | null;
  custom_variation_id: string | null;
}

function parseJsonArray(val: string | null | undefined): number[] | null {
  if (!val) return null;
  try { return JSON.parse(val); } catch { return null; }
}

// ─── Insert ───────────────────────────────────────────────────────────────────

export async function insertSet(
  db: SQLiteDatabase,
  data: InsertSetData
): Promise<string> {
  const setId = randomUUID();

  await db.runAsync(
    `INSERT INTO fact_workout_set
       (workout_set_id, user_workout_id, custom_exercise_id, custom_variation_id,
        workout_set_number, workout_set_weight, workout_set_reps,
        workout_set_duration_seconds, workout_set_notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      setId, data.user_workout_id, data.custom_exercise_id, data.custom_variation_id,
      data.workout_set_number, data.workout_set_weight,
      JSON.stringify(data.workout_set_reps),
      JSON.stringify(data.workout_set_duration_seconds),
      data.workout_set_notes,
    ]
  );

  await queueMutation(db, 'fact_workout_set', 'CREATE', setId, {
    workout_set_id: setId,
    user_workout_id: data.user_workout_id,
    custom_exercise_id: data.custom_exercise_id,
    custom_variation_id: data.custom_variation_id,
    workout_set_number: data.workout_set_number,
    workout_set_weight: data.workout_set_weight,
    workout_set_reps: data.workout_set_reps,
    workout_set_duration_seconds: data.workout_set_duration_seconds,
    workout_set_notes: data.workout_set_notes,
  });
  useSyncStore.getState().requestSync();

  return setId;
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateSet(
  db: SQLiteDatabase,
  setId: string,
  data: UpdateSetData
): Promise<void> {
  await db.runAsync(
    `UPDATE fact_workout_set SET
       custom_exercise_id           = COALESCE(?, custom_exercise_id),
       workout_set_weight           = ?,
       workout_set_reps             = ?,
       workout_set_duration_seconds = ?,
       workout_set_notes            = ?,
       custom_variation_id          = ?
     WHERE workout_set_id = ?`,
    [
      data.custom_exercise_id ?? null,
      data.workout_set_weight,
      JSON.stringify(data.workout_set_reps),
      JSON.stringify(data.workout_set_duration_seconds),
      data.workout_set_notes,
      data.custom_variation_id,
      setId,
    ]
  );

  const row = await db.getFirstAsync<{
    user_workout_id: string;
    custom_exercise_id: string;
    workout_set_number: number;
  }>(
    `SELECT user_workout_id, custom_exercise_id, workout_set_number
     FROM fact_workout_set WHERE workout_set_id = ?`,
    [setId]
  );
  if (!row) return;

  await queueMutation(db, 'fact_workout_set', 'UPDATE', setId, {
    workout_set_id: setId,
    user_workout_id: row.user_workout_id,
    custom_exercise_id: data.custom_exercise_id ?? row.custom_exercise_id,
    workout_set_number: row.workout_set_number,
    workout_set_weight: data.workout_set_weight,
    workout_set_reps: data.workout_set_reps,
    workout_set_duration_seconds: data.workout_set_duration_seconds,
    workout_set_notes: data.workout_set_notes,
    custom_variation_id: data.custom_variation_id,
  });
  useSyncStore.getState().requestSync();
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteSet(
  db: SQLiteDatabase,
  setId: string
): Promise<void> {
  // Soft-delete locally
  await db.runAsync(
    `UPDATE fact_workout_set SET deleted_locally = 1 WHERE workout_set_id = ?`,
    [setId]
  );

  // Check if this set ever synced (has a 'synced' CREATE mutation)
  const syncedRow = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) as n FROM mutation_queue
     WHERE table_name = 'fact_workout_set' AND entity_id = ? AND status = 'synced'`,
    [setId]
  );
  const alreadySynced = (syncedRow?.n ?? 0) > 0;

  if (!alreadySynced) {
    // Never reached Supabase — cancel any pending mutations so nothing goes out
    await purgePendingMutations(db, 'fact_workout_set', setId);
    return;
  }

  // Already on Supabase — queue a DELETE
  await queueMutation(db, 'fact_workout_set', 'DELETE', setId, {
    workout_set_id: setId,
    deleted_locally: true,
  });
  useSyncStore.getState().requestSync();
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function loadSetsForWorkout(
  db: SQLiteDatabase,
  workoutId: string
): Promise<WorkoutSet[]> {
  const rows = await db.getAllAsync<{
    workout_set_id: string;
    workout_set_number: number;
    custom_exercise_id: string;
    custom_variation_id: string | null;
    workout_set_weight: number | null;
    workout_set_reps: string | null;
    workout_set_duration_seconds: string | null;
    workout_set_notes: string | null;
  }>(
    `SELECT workout_set_id, workout_set_number, custom_exercise_id, custom_variation_id,
            workout_set_weight, workout_set_reps, workout_set_duration_seconds, workout_set_notes
     FROM fact_workout_set
     WHERE user_workout_id = ? AND deleted_locally = 0
     ORDER BY workout_set_number`,
    [workoutId]
  );

  return rows.map((r) => ({
    workout_set_id: r.workout_set_id,
    workout_set_number: r.workout_set_number,
    custom_exercise_id: r.custom_exercise_id,
    custom_variation_id: r.custom_variation_id,
    workout_set_weight: r.workout_set_weight,
    workout_set_reps: parseJsonArray(r.workout_set_reps),
    workout_set_duration_seconds: parseJsonArray(r.workout_set_duration_seconds),
    workout_set_notes: r.workout_set_notes,
  }));
}
