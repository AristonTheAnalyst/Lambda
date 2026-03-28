import { type SQLiteDatabase } from 'expo-sqlite';
import { CREATE_TABLES, SEED_INITIAL } from './schema';

/**
 * Called by SQLiteProvider's onInit prop.
 * Runs schema migrations and seeds required initial rows.
 * Safe to call multiple times — all statements use IF NOT EXISTS / INSERT OR IGNORE.
 */
export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync(CREATE_TABLES);
  await db.execAsync(SEED_INITIAL);

  // Migration: split user_workout_notes into pre/post columns (existing installs only)
  // Guard on the NEW column — user_workout_notes can't be dropped so it stays forever
  const hasNewColumn = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM pragma_table_info('fact_user_workout') WHERE name = 'user_pre_workout_notes'`
  );
  if (!hasNewColumn || hasNewColumn.count === 0) {
    await db.execAsync(`ALTER TABLE fact_user_workout ADD COLUMN user_pre_workout_notes TEXT`);
    await db.execAsync(`ALTER TABLE fact_user_workout ADD COLUMN user_post_workout_notes TEXT`);
    await db.execAsync(`UPDATE fact_user_workout SET user_post_workout_notes = user_workout_notes WHERE user_workout_notes IS NOT NULL`);
  }
}
