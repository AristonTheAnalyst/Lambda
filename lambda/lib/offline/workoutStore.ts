import { type SQLiteDatabase } from 'expo-sqlite';
import supabase from '@/lib/supabase';
import { getNextLocalId } from '@/lib/db/localIdSeq';
import { enqueueOperation } from '@/lib/sync/syncQueue';

export interface WorkoutRow {
  user_workout_id: number;
  user_id: string;
  user_pre_workout_notes: string | null;
  user_post_workout_notes: string | null;
  user_workout_created_date: string;
  synced: number;
  is_active: number;
}

export interface WorkoutWithSets {
  user_workout_id: number;
  user_workout_created_date: string;
  user_pre_workout_notes: string | null;
  user_post_workout_notes: string | null;
  sets: { custom_exercise_id: number; custom_variation_id: number | null }[];
}

// ─── Active workout ───────────────────────────────────────────────────────────

export async function getActiveWorkoutId(db: SQLiteDatabase): Promise<number | null> {
  const row = await db.getFirstAsync<{ user_workout_id: number }>(
    `SELECT user_workout_id FROM fact_user_workout WHERE is_active = 1 LIMIT 1`
  );
  return row?.user_workout_id ?? null;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createWorkout(
  db: SQLiteDatabase,
  userId: string,
  notes?: string | null
): Promise<number> {
  const localId = await getNextLocalId(db);
  const now = new Date().toISOString();
  const trimmedNotes = notes?.trim() || null;

  await db.runAsync(
    `INSERT INTO fact_user_workout
       (user_workout_id, user_id, user_pre_workout_notes, user_workout_created_date, is_active, synced)
     VALUES (?, ?, ?, ?, 1, 0)`,
    [localId, userId, trimmedNotes, now]
  );

  await enqueueOperation(db, {
    table_name: 'fact_user_workout',
    operation: 'INSERT',
    payload: {
      user_workout_id: localId,
      user_id: userId,
      user_pre_workout_notes: trimmedNotes,
      user_workout_created_date: now,
    },
    local_id: localId,
  });

  return localId;
}

// ─── End ──────────────────────────────────────────────────────────────────────

export async function endWorkout(
  db: SQLiteDatabase,
  workoutId: number,
  notes: string | null
): Promise<void> {
  const trimmedNotes = notes?.trim() || null;

  await db.runAsync(
    `UPDATE fact_user_workout SET is_active = 0, user_post_workout_notes = ? WHERE user_workout_id = ?`,
    [trimmedNotes, workoutId]
  );

  const row = await db.getFirstAsync<{ user_id: string; user_workout_created_date: string; user_pre_workout_notes: string | null }>(
    `SELECT user_id, user_workout_created_date, user_pre_workout_notes FROM fact_user_workout WHERE user_workout_id = ?`,
    [workoutId]
  );
  if (row) {
    await enqueueOperation(db, {
      table_name: 'fact_user_workout',
      operation: 'UPDATE',
      payload: {
        user_workout_id: workoutId,
        user_id: row.user_id,
        user_workout_created_date: row.user_workout_created_date,
        user_pre_workout_notes: row.user_pre_workout_notes,
        user_post_workout_notes: trimmedNotes,
      },
      // If workout was created offline, wait for its INSERT to sync first
      depends_on_local_id: workoutId < 0 ? workoutId : null,
    });
  }
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

/**
 * Discards an in-progress workout entirely.
 * - Removes all sets and the workout row from SQLite.
 * - Purges any pending sync_queue entries so nothing reaches Supabase.
 * - If the workout was already synced (positive ID), enqueues a DELETE.
 */
export async function cancelWorkout(
  db: SQLiteDatabase,
  workoutId: number
): Promise<void> {
  // Hard-delete sets locally
  await db.runAsync(`DELETE FROM fact_workout_set WHERE user_workout_id = ?`, [workoutId]);

  // Purge pending sync queue entries for this workout and its sets
  await db.runAsync(
    `DELETE FROM sync_queue WHERE (local_id = ? OR depends_on_local_id = ?) AND status = 'pending'`,
    [workoutId, workoutId]
  );

  if (workoutId > 0) {
    // Already synced — enqueue a DELETE so Supabase is cleaned up
    const row = await db.getFirstAsync<{ user_id: string }>(
      `SELECT user_id FROM fact_user_workout WHERE user_workout_id = ?`,
      [workoutId]
    );
    if (row) {
      await enqueueOperation(db, {
        table_name: 'fact_user_workout',
        operation: 'DELETE',
        payload: { user_workout_id: workoutId, user_id: row.user_id },
      });
    }
  }

  // Hard-delete the workout row
  await db.runAsync(`DELETE FROM fact_user_workout WHERE user_workout_id = ?`, [workoutId]);
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function loadWorkout(
  db: SQLiteDatabase,
  workoutId: number
): Promise<WorkoutRow | null> {
  return db.getFirstAsync<WorkoutRow>(
    `SELECT * FROM fact_user_workout WHERE user_workout_id = ? AND deleted_locally = 0`,
    [workoutId]
  );
}

export async function loadWorkoutsWithSets(
  db: SQLiteDatabase,
  userId: string
): Promise<WorkoutWithSets[]> {
  const workouts = await db.getAllAsync<WorkoutRow>(
    `SELECT * FROM fact_user_workout WHERE user_id = ? AND deleted_locally = 0 ORDER BY user_workout_created_date DESC`,
    [userId]
  );
  if (workouts.length === 0) return [];

  const ids = workouts.map((w) => w.user_workout_id);
  const placeholders = ids.map(() => '?').join(',');
  const sets = await db.getAllAsync<{
    user_workout_id: number;
    custom_exercise_id: number;
    custom_variation_id: number | null;
  }>(
    `SELECT user_workout_id, custom_exercise_id, custom_variation_id
     FROM fact_workout_set
     WHERE user_workout_id IN (${placeholders}) AND deleted_locally = 0`,
    ids
  );

  const setsByWorkout: Record<number, typeof sets> = {};
  for (const s of sets) {
    if (!setsByWorkout[s.user_workout_id]) setsByWorkout[s.user_workout_id] = [];
    setsByWorkout[s.user_workout_id].push(s);
  }

  return workouts.map((w) => ({
    user_workout_id: w.user_workout_id,
    user_workout_created_date: w.user_workout_created_date,
    user_pre_workout_notes: w.user_pre_workout_notes,
    user_post_workout_notes: w.user_post_workout_notes,
    sets: setsByWorkout[w.user_workout_id] ?? [],
  }));
}

// ─── Initial seed from Supabase ───────────────────────────────────────────────

/**
 * Seeds workouts and sets from Supabase into SQLite on first install.
 * Uses INSERT OR REPLACE so it's safe to call multiple times.
 * Only runs if no positive-ID (server-synced) workouts exist for the user.
 */
export async function seedWorkoutsFromSupabase(
  db: SQLiteDatabase,
  userId: string
): Promise<void> {
  const existing = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM fact_user_workout WHERE user_id = ? AND user_workout_id > 0`,
    [userId]
  );
  if (existing && existing.count > 0) return;

  const { data: workouts } = await supabase
    .from('fact_user_workout')
    .select('user_workout_id, user_id, user_pre_workout_notes, user_post_workout_notes, user_workout_created_date')
    .eq('user_id', userId)
    .order('user_workout_created_date', { ascending: false })
    .limit(100);

  if (!workouts || workouts.length === 0) return;

  const workoutIds = workouts.map((w: any) => w.user_workout_id);
  const { data: sets } = await supabase
    .from('fact_workout_set')
    .select('*')
    .in('user_workout_id', workoutIds);

  for (const w of workouts) {
    await db.runAsync(
      `INSERT OR REPLACE INTO fact_user_workout
         (user_workout_id, user_id, user_pre_workout_notes, user_post_workout_notes, user_workout_created_date, is_active, synced, deleted_locally)
       VALUES (?, ?, ?, ?, ?, 0, 1, 0)`,
      [w.user_workout_id, w.user_id, w.user_pre_workout_notes ?? null, w.user_post_workout_notes ?? null, w.user_workout_created_date]
    );
  }

  if (sets) {
    for (const s of sets as any[]) {
      await db.runAsync(
        `INSERT OR REPLACE INTO fact_workout_set
           (workout_set_id, user_workout_id, custom_exercise_id, custom_variation_id,
            workout_set_number, workout_set_weight, workout_set_reps, workout_set_duration_seconds,
            workout_set_notes, synced, deleted_locally)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`,
        [
          s.workout_set_id,
          s.user_workout_id,
          s.custom_exercise_id,
          s.custom_variation_id ?? null,
          s.workout_set_number,
          s.workout_set_weight ?? null,
          JSON.stringify(s.workout_set_reps ?? []),
          JSON.stringify(s.workout_set_duration_seconds ?? []),
          s.workout_set_notes ?? null,
        ]
      );
    }
  }
}
