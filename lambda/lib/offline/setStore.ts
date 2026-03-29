import { type SQLiteDatabase } from 'expo-sqlite';
import { getNextLocalId } from '@/lib/db/localIdSeq';
import { enqueueOperation } from '@/lib/sync/syncQueue';

export interface WorkoutSet {
  workout_set_id: number;
  workout_set_number: number;
  custom_exercise_id: number;
  custom_variation_id: number | null;
  workout_set_weight: number | null;
  workout_set_reps: number[] | null;
  workout_set_duration_seconds: number[] | null;
  workout_set_notes: string | null;
}

export interface InsertSetData {
  user_workout_id: number;
  custom_exercise_id: number;
  custom_variation_id: number | null;
  workout_set_number: number;
  workout_set_weight: number | null;
  workout_set_reps: number[];
  workout_set_duration_seconds: number[];
  workout_set_notes: string | null;
}

export interface UpdateSetData {
  custom_exercise_id?: number;
  workout_set_weight: number | null;
  workout_set_reps: number[];
  workout_set_duration_seconds: number[];
  workout_set_notes: string | null;
  custom_variation_id: number | null;
}

function parseJsonArray(val: string | null | undefined): number[] | null {
  if (!val) return null;
  try { return JSON.parse(val); } catch { return null; }
}

// ─── Insert ───────────────────────────────────────────────────────────────────

export async function insertSet(
  db: SQLiteDatabase,
  data: InsertSetData
): Promise<number> {
  const localId = await getNextLocalId(db);

  await db.runAsync(
    `INSERT INTO fact_workout_set
       (workout_set_id, user_workout_id, custom_exercise_id, custom_variation_id,
        workout_set_number, workout_set_weight, workout_set_reps, workout_set_duration_seconds,
        workout_set_notes, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      localId,
      data.user_workout_id,
      data.custom_exercise_id,
      data.custom_variation_id,
      data.workout_set_number,
      data.workout_set_weight,
      JSON.stringify(data.workout_set_reps),
      JSON.stringify(data.workout_set_duration_seconds),
      data.workout_set_notes,
    ]
  );

  // If the workout was created offline, wait for its INSERT to sync first
  const dependsOnLocalId = data.user_workout_id < 0 ? data.user_workout_id : null;

  await enqueueOperation(db, {
    table_name: 'fact_workout_set',
    operation: 'INSERT',
    payload: {
      workout_set_id: localId,
      user_workout_id: data.user_workout_id,
      custom_exercise_id: data.custom_exercise_id,
      custom_variation_id: data.custom_variation_id,
      workout_set_number: data.workout_set_number,
      workout_set_weight: data.workout_set_weight,
      workout_set_reps: data.workout_set_reps,
      workout_set_duration_seconds: data.workout_set_duration_seconds,
      workout_set_notes: data.workout_set_notes,
    },
    local_id: localId,
    depends_on_local_id: dependsOnLocalId,
  });

  return localId;
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateSet(
  db: SQLiteDatabase,
  setId: number,
  data: UpdateSetData
): Promise<void> {
  await db.runAsync(
    `UPDATE fact_workout_set SET
       custom_exercise_id = COALESCE(?, custom_exercise_id),
       workout_set_weight = ?,
       workout_set_reps = ?,
       workout_set_duration_seconds = ?,
       workout_set_notes = ?,
       custom_variation_id = ?,
       synced = 0
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
    user_workout_id: number;
    custom_exercise_id: number;
    workout_set_number: number;
  }>(
    `SELECT user_workout_id, custom_exercise_id, workout_set_number FROM fact_workout_set WHERE workout_set_id = ?`,
    [setId]
  );
  if (!row) return;

  // If the set was created offline, wait for its INSERT to sync before sending this UPDATE
  const dependsOnLocalId = setId < 0 ? setId : null;

  await enqueueOperation(db, {
    table_name: 'fact_workout_set',
    operation: 'UPDATE',
    payload: {
      workout_set_id: setId,
      user_workout_id: row.user_workout_id,
      custom_exercise_id: data.custom_exercise_id ?? row.custom_exercise_id,
      workout_set_number: row.workout_set_number,
      workout_set_weight: data.workout_set_weight,
      workout_set_reps: data.workout_set_reps,
      workout_set_duration_seconds: data.workout_set_duration_seconds,
      workout_set_notes: data.workout_set_notes,
      custom_variation_id: data.custom_variation_id,
    },
    depends_on_local_id: dependsOnLocalId,
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteSet(
  db: SQLiteDatabase,
  setId: number
): Promise<void> {
  await db.runAsync(
    `UPDATE fact_workout_set SET deleted_locally = 1 WHERE workout_set_id = ?`,
    [setId]
  );

  if (setId < 0) {
    // Cancel the pending INSERT — nothing to delete on server for an unsynced record
    await db.runAsync(
      `UPDATE sync_queue SET status = 'done'
       WHERE status = 'pending' AND operation = 'INSERT' AND table_name = 'fact_workout_set' AND local_id = ?`,
      [setId]
    );
    await db.runAsync(
      `UPDATE sync_queue SET status = 'done'
       WHERE status = 'pending' AND operation = 'UPDATE' AND table_name = 'fact_workout_set'
         AND json_extract(payload, '$.workout_set_id') = ?`,
      [setId]
    );
    return;
  }

  await enqueueOperation(db, {
    table_name: 'fact_workout_set',
    operation: 'DELETE',
    payload: { workout_set_id: setId },
  });
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function loadSetsForWorkout(
  db: SQLiteDatabase,
  workoutId: number
): Promise<WorkoutSet[]> {
  const rows = await db.getAllAsync<{
    workout_set_id: number;
    workout_set_number: number;
    custom_exercise_id: number;
    custom_variation_id: number | null;
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
