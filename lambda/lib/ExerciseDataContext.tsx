import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import supabase from '@/lib/supabase';
import { useAuthContext } from '@/lib/AuthContext';
import { useNetwork } from '@/hooks/useNetwork';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Exercise {
  custom_exercise_id: number;
  exercise_name: string;
  exercise_volume_type: string;
  is_active: boolean;
}

export interface AssignedVariation {
  custom_variation_id: number;
  variation_name: string;
}

export interface ExerciseDetail extends Exercise {
  assigned_variations: AssignedVariation[];
}

export interface Variation {
  custom_variation_id: number;
  variation_name: string;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface ExerciseDataContextValue {
  exercises: Exercise[];
  variations: Variation[];
  exerciseDetailMap: Record<number, ExerciseDetail>;
  loading: boolean;
  refreshExercises: () => Promise<void>;
  refreshVariations: () => Promise<void>;
  refreshExerciseDetails: () => Promise<void>;
}

const ExerciseDataContext = createContext<ExerciseDataContextValue>({
  exercises: [],
  variations: [],
  exerciseDetailMap: {},
  loading: true,
  refreshExercises: async () => {},
  refreshVariations: async () => {},
  refreshExerciseDetails: async () => {},
});

export function useExerciseData() {
  return useContext(ExerciseDataContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface RawBridgeRow {
  custom_exercise_id: number;
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

  const refreshExercises = useCallback(async () => {
    if (!user) return;
    const rows = await db.getAllAsync<{
      custom_exercise_id: number;
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
      custom_exercise_id: number;
      custom_variation_id: number;
      variation_name: string;
    }>(
      `SELECT b.custom_exercise_id, b.custom_variation_id, v.variation_name
       FROM user_custom_exercise_variation_bridge b
       JOIN user_custom_variation v ON v.custom_variation_id = b.custom_variation_id
       WHERE b.user_id = ?`,
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
    const map: Record<number, ExerciseDetail> = {};
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
    Promise.all([
      refreshExercises(),
      refreshVariations(),
      refreshExerciseDetails(),
    ]).finally(() => setLoading(false));
  }, [user?.id]);

  // Background seed from Supabase on first install (non-blocking)
  useEffect(() => {
    if (!user || !isConnected) return;
    seedFromSupabase(db, user.id)
      .then(() => Promise.all([refreshExercises(), refreshVariations(), refreshExerciseDetails()]))
      .catch(() => {}); // Silently fail — SQLite is source of truth
  }, [user?.id, isConnected]);

  return (
    <ExerciseDataContext.Provider
      value={{
        exercises,
        variations,
        exerciseDetailMap,
        loading,
        refreshExercises,
        refreshVariations,
        refreshExerciseDetails,
      }}>
      {children}
    </ExerciseDataContext.Provider>
  );
}

// ─── Supabase seed helper ─────────────────────────────────────────────────────

async function seedFromSupabase(db: any, userId: string): Promise<void> {
  // Only seed if SQLite has no positive-ID exercises (i.e. first install)
  const existing = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM user_custom_exercise WHERE user_id = ? AND custom_exercise_id > 0`,
    [userId]
  );
  if (existing && existing.n > 0) return;

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

  await db.withTransactionAsync(async () => {
    for (const ex of exRes.data ?? []) {
      await db.runAsync(
        `INSERT OR IGNORE INTO user_custom_exercise
           (custom_exercise_id, user_id, exercise_name, exercise_volume_type, is_active, synced)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [ex.custom_exercise_id, ex.user_id, ex.exercise_name, ex.exercise_volume_type, ex.is_active ? 1 : 0]
      );
    }
    for (const v of varRes.data ?? []) {
      await db.runAsync(
        `INSERT OR IGNORE INTO user_custom_variation
           (custom_variation_id, user_id, variation_name, is_active, synced)
         VALUES (?, ?, ?, ?, 1)`,
        [v.custom_variation_id, v.user_id, v.variation_name, v.is_active ? 1 : 0]
      );
    }
    for (const b of bridgeRes.data ?? []) {
      await db.runAsync(
        `INSERT OR IGNORE INTO user_custom_exercise_variation_bridge
           (custom_exercise_id, custom_variation_id, user_id, synced)
         VALUES (?, ?, ?, 1)`,
        [b.custom_exercise_id, b.custom_variation_id, b.user_id]
      );
    }
  });
}
