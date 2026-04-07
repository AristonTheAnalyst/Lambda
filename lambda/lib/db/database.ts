import { type SQLiteDatabase } from 'expo-sqlite';
import { CREATE_TABLES_V2, SCHEMA_VERSION } from './schema';

/**
 * Called by SQLiteProvider's onInit prop.
 *
 * Migration strategy: PRAGMA user_version tracks the schema version.
 * v1 → v2 drops all old tables (sync_queue, id_remap, local_id_seq and all entity
 * tables with INTEGER PKs) and recreates them with TEXT UUID PKs + mutation_queue.
 * Existing local data is lost — acceptable during development; add row-level
 * data migration here if needed before App Store release.
 */
export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const versionRow = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion < SCHEMA_VERSION) {
    // Drop everything from the old schema before recreating
    await db.execAsync(`
      DROP TABLE IF EXISTS sync_queue;
      DROP TABLE IF EXISTS id_remap;
      DROP TABLE IF EXISTS local_id_seq;
      DROP TABLE IF EXISTS fact_workout_set;
      DROP TABLE IF EXISTS fact_user_workout;
      DROP TABLE IF EXISTS user_custom_exercise_variation_bridge;
      DROP TABLE IF EXISTS user_custom_exercise;
      DROP TABLE IF EXISTS user_custom_variation;
      DROP TABLE IF EXISTS exercise_defaults;
      DROP TABLE IF EXISTS mutation_queue;
    `);
    await db.execAsync(CREATE_TABLES_V2);
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
  }
}
