export const DATABASE_NAME = 'lambda.db';

// Bump this when adding new tables or columns
export const SCHEMA_VERSION = 1;

export const CREATE_TABLES = `
CREATE TABLE IF NOT EXISTS fact_user_workout (
  user_workout_id            INTEGER PRIMARY KEY,
  user_id                    TEXT NOT NULL,
  user_pre_workout_notes     TEXT,
  user_post_workout_notes    TEXT,
  user_workout_created_date  TEXT NOT NULL,
  is_active                  INTEGER NOT NULL DEFAULT 0,
  synced                     INTEGER NOT NULL DEFAULT 0,
  deleted_locally            INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS fact_workout_set (
  workout_set_id               INTEGER PRIMARY KEY,
  user_workout_id              INTEGER NOT NULL,
  custom_exercise_id           INTEGER NOT NULL,
  custom_variation_id          INTEGER,
  workout_set_number           INTEGER NOT NULL,
  workout_set_weight           REAL,
  workout_set_reps             TEXT,
  workout_set_duration_seconds TEXT,
  workout_set_notes            TEXT,
  synced                       INTEGER NOT NULL DEFAULT 0,
  deleted_locally              INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_custom_exercise (
  custom_exercise_id    INTEGER PRIMARY KEY,
  user_id               TEXT NOT NULL,
  exercise_name         TEXT NOT NULL,
  exercise_volume_type  TEXT NOT NULL DEFAULT 'reps',
  is_active             INTEGER NOT NULL DEFAULT 1,
  synced                INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_custom_variation (
  custom_variation_id  INTEGER PRIMARY KEY,
  user_id              TEXT NOT NULL,
  variation_name       TEXT NOT NULL,
  is_active            INTEGER NOT NULL DEFAULT 1,
  synced               INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_custom_exercise_variation_bridge (
  custom_exercise_id   INTEGER NOT NULL,
  custom_variation_id  INTEGER NOT NULL,
  user_id              TEXT NOT NULL,
  synced               INTEGER NOT NULL DEFAULT 0,
  deleted_locally      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (custom_exercise_id, custom_variation_id)
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at            INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  table_name            TEXT NOT NULL,
  operation             TEXT NOT NULL,
  payload               TEXT NOT NULL,
  local_id              INTEGER,
  depends_on_local_id   INTEGER,
  status                TEXT NOT NULL DEFAULT 'pending',
  retry_count           INTEGER NOT NULL DEFAULT 0,
  last_error            TEXT
);

CREATE TABLE IF NOT EXISTS id_remap (
  local_id   INTEGER PRIMARY KEY,
  server_id  INTEGER NOT NULL,
  table_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS local_id_seq (
  id       INTEGER PRIMARY KEY CHECK (id = 1),
  next_val INTEGER NOT NULL DEFAULT -1
);
`;

export const SEED_INITIAL = `
INSERT OR IGNORE INTO local_id_seq (id, next_val) VALUES (1, -1);
`;
