export const DATABASE_NAME = 'lambda.db';

/**
 * Bump when the schema changes.
 * Stored in SQLite's PRAGMA user_version.
 * v1 → v2: switched all PKs to TEXT UUID, replaced sync_queue/id_remap/local_id_seq
 *           with mutation_queue.
 */
export const SCHEMA_VERSION = 2;

export const CREATE_TABLES_V2 = `
-- ─── Entity tables (UUID TEXT PKs, matching Supabase column names) ─────────────

CREATE TABLE IF NOT EXISTS fact_user_workout (
  user_workout_id           TEXT PRIMARY KEY,
  user_id                   TEXT NOT NULL,
  user_pre_workout_notes    TEXT,
  user_post_workout_notes   TEXT,
  user_workout_created_date TEXT NOT NULL,
  is_active                 INTEGER NOT NULL DEFAULT 0,
  deleted_locally           INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS fact_workout_set (
  workout_set_id               TEXT PRIMARY KEY,
  user_workout_id              TEXT NOT NULL,
  custom_exercise_id           TEXT NOT NULL,
  custom_variation_id          TEXT,
  workout_set_number           INTEGER NOT NULL,
  workout_set_weight           REAL,
  workout_set_reps             TEXT,
  workout_set_duration_seconds TEXT,
  workout_set_notes            TEXT,
  deleted_locally              INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_custom_exercise (
  custom_exercise_id   TEXT PRIMARY KEY,
  user_id              TEXT NOT NULL,
  exercise_name        TEXT NOT NULL,
  exercise_volume_type TEXT NOT NULL DEFAULT 'reps',
  is_active            INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS user_custom_variation (
  custom_variation_id TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL,
  variation_name      TEXT NOT NULL,
  is_active           INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS user_custom_exercise_variation_bridge (
  custom_exercise_id  TEXT NOT NULL,
  custom_variation_id TEXT NOT NULL,
  user_id             TEXT NOT NULL,
  deleted_locally     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (custom_exercise_id, custom_variation_id)
);

-- ─── Sync infrastructure ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mutation_queue (
  id             TEXT PRIMARY KEY,
  table_name     TEXT    NOT NULL,
  operation      TEXT    NOT NULL CHECK(operation IN ('CREATE','UPDATE','DELETE')),
  entity_id      TEXT    NOT NULL,
  payload        TEXT    NOT NULL,
  local_version  INTEGER NOT NULL DEFAULT 1,
  status         TEXT    NOT NULL DEFAULT 'pending'
                   CHECK(status IN ('pending','syncing','synced','conflict')),
  created_at     TEXT    NOT NULL,
  synced_at      TEXT,
  server_version INTEGER,
  error          TEXT
);
CREATE INDEX IF NOT EXISTS idx_mq_status ON mutation_queue(status);
CREATE INDEX IF NOT EXISTS idx_mq_entity ON mutation_queue(entity_id, table_name);

-- ─── Local-only ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS exercise_defaults (
  custom_exercise_id TEXT PRIMARY KEY,
  last_weight_kg     REAL,
  last_variation_id  TEXT
);
`;
