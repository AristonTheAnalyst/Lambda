import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import supabase from '@/lib/supabase';
import { useAuthContext } from '@/lib/AuthContext';
import { useNetwork } from '@/hooks/useNetwork';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Exercise {
  custom_exercise_id: string;
  exercise_name: string;
  exercise_volume_type: string;
  is_active: boolean;
}

export interface AssignedVariation {
  custom_variation_id: string;
  variation_name: string;
}

export interface ExerciseDetail extends Exercise {
  assigned_variations: AssignedVariation[];
}

export interface Variation {
  custom_variation_id: string;
  variation_name: string;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface ExerciseDataContextValue {
  exercises: Exercise[];
  variations: Variation[];
  exerciseDetailMap: Record<string, ExerciseDetail>;
  loading: boolean;
  /** True when first-install cloud seed failed while local catalog was still empty (e.g. server unreachable). */
  catalogCloudPullFailed: boolean;
  refreshExercises: () => Promise<void>;
  refreshVariations: () => Promise<void>;
  refreshExerciseDetails: () => Promise<void>;
}

const ExerciseDataContext = createContext<ExerciseDataContextValue>({
  exercises: [],
  variations: [],
  exerciseDetailMap: {},
  loading: true,
  catalogCloudPullFailed: false,
  refreshExercises: async () => {},
  refreshVariations: async () => {},
  refreshExerciseDetails: async () => {},
});

export function useExerciseData() {
  return useContext(ExerciseDataContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface RawBridgeRow {
  custom_exercise_id: string;
  variation: AssignedVariation;
}

export function ExerciseDataProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const { user } = useAuthContext();
  const { isConnected } = useNetwork();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [rawBridge, setRawBridge] = useState<RawBridgeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogCloudPullFailed, setCatalogCloudPullFailed] = useState(false);

  const refreshExercises = useCallback(async () => {
    if (!user) return;
    const rows = await db.getAllAsync<{
      custom_exercise_id: string;
      exercise_name: string;
      exercise_volume_type: string;
      is_active: number;
    }>(
      `SELECT custom_exercise_id, exercise_name, exercise_volume_type, is_active
       FROM user_custom_exercise
       WHERE is_active = 1 AND user_id = ?
       ORDER BY exercise_name`,
      [user.id]
    );
    setExercises(rows.map((r) => ({ ...r, is_active: !!r.is_active })));
  }, [db, user]);

  const refreshVariations = useCallback(async () => {
    if (!user) return;
    const rows = await db.getAllAsync<Variation>(
      `SELECT custom_variation_id, variation_name
       FROM user_custom_variation
       WHERE is_active = 1 AND user_id = ?
       ORDER BY variation_name`,
      [user.id]
    );
    setVariations(rows);
  }, [db, user]);

  const refreshExerciseDetails = useCallback(async () => {
    if (!user) return;
    const rows = await db.getAllAsync<{
      custom_exercise_id: string;
      custom_variation_id: string;
      variation_name: string;
    }>(
      `SELECT b.custom_exercise_id, b.custom_variation_id, v.variation_name
       FROM user_custom_exercise_variation_bridge b
       JOIN user_custom_variation v ON v.custom_variation_id = b.custom_variation_id
       WHERE b.user_id = ? AND b.deleted_locally = 0 AND v.is_active = 1`,
      [user.id]
    );
    setRawBridge(
      rows.map((r) => ({
        custom_exercise_id: r.custom_exercise_id,
        variation: {
          custom_variation_id: r.custom_variation_id,
          variation_name: r.variation_name,
        },
      }))
    );
  }, [db, user]);

  const exerciseDetailMap = useMemo(() => {
    const map: Record<string, ExerciseDetail> = {};
    exercises.forEach((ex) => {
      map[ex.custom_exercise_id] = { ...ex, assigned_variations: [] };
    });
    rawBridge.forEach(({ custom_exercise_id, variation }) => {
      if (map[custom_exercise_id]) map[custom_exercise_id].assigned_variations.push(variation);
    });
    return map;
  }, [exercises, rawBridge]);

  // Initial load from SQLite (instant, works offline)
  useEffect(() => {
    if (!user) return;
    setCatalogCloudPullFailed(false);
    Promise.all([
      refreshExercises(),
      refreshVariations(),
      refreshExerciseDetails(),
    ]).finally(() => setLoading(false));
  }, [user?.id]);

  // Background seed from Supabase on first install (non-blocking)
  useEffect(() => {
    if (!user || !isConnected) return;
    let cancelled = false;
    seedFromSupabase(db, user.id)
      .then(async (result) => {
        if (cancelled) return;
        if (result === 'failed') {
          setCatalogCloudPullFailed(true);
          return;
        }
        setCatalogCloudPullFailed(false);
        if (result === 'seeded' || result === 'empty_remote') {
          await Promise.all([refreshExercises(), refreshVariations(), refreshExerciseDetails()]);
        }
      })
      .catch(() => {
        if (!cancelled) setCatalogCloudPullFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, isConnected, db, refreshExercises, refreshVariations, refreshExerciseDetails]);

  useEffect(() => {
    if (!catalogCloudPullFailed) return;
    if (exercises.length > 0 || variations.length > 0) {
      setCatalogCloudPullFailed(false);
    }
  }, [catalogCloudPullFailed, exercises.length, variations.length]);

  return (
    <ExerciseDataContext.Provider
      value={{
        exercises,
        variations,
        exerciseDetailMap,
        loading,
        catalogCloudPullFailed,
        refreshExercises,
        refreshVariations,
        refreshExerciseDetails,
      }}>
      {children}
    </ExerciseDataContext.Provider>
  );
}

// ─── Supabase seed helper ─────────────────────────────────────────────────────

type SeedCatalogResult = 'skipped' | 'seeded' | 'empty_remote' | 'failed';

async function seedFromSupabase(db: any, userId: string): Promise<SeedCatalogResult> {
  // Only seed if SQLite has no exercises for this user (i.e. first install)
  const existing = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM user_custom_exercise WHERE user_id = ?`,
    [userId]
  );
  if (existing && existing.n > 0) return 'skipped';

  const [exRes, varRes, bridgeRes] = await Promise.all([
    supabase
      .from('user_custom_exercise')
      .select('custom_exercise_id, user_id, exercise_name, exercise_volume_type, is_active')
      .eq('user_id', userId),
    supabase
      .from('user_custom_variation')
      .select('custom_variation_id, user_id, variation_name, is_active')
      .eq('user_id', userId),
    supabase
      .from('user_custom_exercise_variation_bridge')
      .select('custom_exercise_id, custom_variation_id, user_id')
      .eq('user_id', userId),
  ]);

  if (exRes.error || varRes.error || bridgeRes.error) {
    return 'failed';
  }

  const rowCount =
    (exRes.data?.length ?? 0) + (varRes.data?.length ?? 0) + (bridgeRes.data?.length ?? 0);
  const hadRemoteRows = rowCount > 0;

  for (const ex of exRes.data ?? []) {
    await db.runAsync(
      `INSERT OR IGNORE INTO user_custom_exercise
         (custom_exercise_id, user_id, exercise_name, exercise_volume_type, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [ex.custom_exercise_id, ex.user_id, ex.exercise_name, ex.exercise_volume_type, ex.is_active ? 1 : 0]
    );
  }
  for (const v of varRes.data ?? []) {
    await db.runAsync(
      `INSERT OR IGNORE INTO user_custom_variation
         (custom_variation_id, user_id, variation_name, is_active)
       VALUES (?, ?, ?, ?)`,
      [v.custom_variation_id, v.user_id, v.variation_name, v.is_active ? 1 : 0]
    );
  }
  for (const b of bridgeRes.data ?? []) {
    await db.runAsync(
      `INSERT OR IGNORE INTO user_custom_exercise_variation_bridge
         (custom_exercise_id, custom_variation_id, user_id)
       VALUES (?, ?, ?)`,
      [b.custom_exercise_id, b.custom_variation_id, b.user_id]
    );
  }

  return hadRemoteRows ? 'seeded' : 'empty_remote';
}
