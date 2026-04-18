import { type SQLiteDatabase } from 'expo-sqlite';
import { CREATE_TABLES_V2, SCHEMA_VERSION } from './schema';

/**
 * Called by SQLiteProvider's onInit prop.
 *
 * Migration strategy: PRAGMA user_version tracks the schema version.
 *
 * Pre-App-Store wipe (any version < 2):
 *   Drops all old tables and recreates with the v2 schema (TEXT UUID PKs +
 *   mutation_queue). Data loss is acceptable — these versions predate any
 *   App Store release.
 *
 * Incremental safe migrations (v2 → v3, v3 → v4, …):
 *   Each block uses ALTER TABLE ADD COLUMN for additive changes, or the
 *   create-copy-drop-rename pattern for structural changes.
 *   Never DROP TABLE in a migration numbered 3 or above.
 */
export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const versionRow = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  const currentVersion = versionRow?.user_version ?? 0;

  // ── Pre-App-Store destructive wipe ───────────────────────────────────────────
  // Versions 0 and 1 predate the App Store — safe to wipe and recreate.
  if (currentVersion < 2) {
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
    await db.execAsync('PRAGMA user_version = 2;');
  }

  // ── Incremental safe migrations ──────────────────────────────────────────────
  // v2 → v3: App Store baseline — no schema change.
  if (currentVersion < 3) {
    await db.execAsync(`PRAGMA user_version = 3;`);
  }

  // Template for future migrations:
  // if (currentVersion < 4) {
  //   await db.execAsync(`ALTER TABLE fact_workout_set ADD COLUMN foo TEXT;`);
  //   await db.execAsync(`PRAGMA user_version = 4;`);
  // }
}
