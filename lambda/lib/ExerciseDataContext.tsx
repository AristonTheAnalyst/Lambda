import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import supabase from '@/lib/supabase';

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
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [rawBridge, setRawBridge] = useState<RawBridgeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshExercises = useCallback(async () => {
    const { data } = await supabase
      .from('user_custom_exercise')
      .select('custom_exercise_id, exercise_name, exercise_volume_type, is_active')
      .eq('is_active', true)
      .order('exercise_name');
    if (data) setExercises(data);
  }, []);

  const refreshVariations = useCallback(async () => {
    const { data } = await supabase
      .from('user_custom_variation')
      .select('custom_variation_id, variation_name')
      .eq('is_active', true)
      .order('variation_name');
    if (data) setVariations(data);
  }, []);

  const refreshExerciseDetails = useCallback(async () => {
    const { data } = await supabase
      .from('user_custom_exercise_variation_bridge')
      .select('custom_exercise_id, user_custom_variation(custom_variation_id, variation_name)');
    if (data) {
      setRawBridge(
        data.flatMap((b: any) => {
          const v = b.user_custom_variation;
          if (!v) return [];
          return [{
            custom_exercise_id: b.custom_exercise_id,
            variation: {
              custom_variation_id: v.custom_variation_id,
              variation_name: v.variation_name,
            },
          }];
        })
      );
    }
  }, []);

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

  useEffect(() => {
    Promise.all([
      refreshExercises(),
      refreshVariations(),
      refreshExerciseDetails(),
    ]).finally(() => setLoading(false));
  }, []);

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
