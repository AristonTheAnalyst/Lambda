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
}
