import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import supabase from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Exercise {
  exercise_id: number;
  exercise_name: string;
  exercise_volume_type: string;
  exercise_intensity_type: string;
  is_active: boolean;
}

export interface AssignedVariation {
  exercise_variation_id: number;
  exercise_variation_name: string;
  variation_type_id: number;
  variation_type_name: string;
}

export interface ExerciseDetail extends Exercise {
  assigned_variations: AssignedVariation[];
}

export interface Variation {
  exercise_variation_id: number;
  exercise_variation_name: string;
  variation_type_id: number;
  variation_type_name: string;
}

export interface VariationType {
  variation_type_id: number;
  variation_type_name: string;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface ExerciseDataContextValue {
  exercises: Exercise[];
  variations: Variation[];
  variationTypes: VariationType[];
  exerciseDetailMap: Record<number, ExerciseDetail>;
  loading: boolean;
  refreshExercises: () => Promise<void>;
  refreshVariations: () => Promise<void>;
  refreshExerciseDetails: () => Promise<void>;
}

const ExerciseDataContext = createContext<ExerciseDataContextValue>({
  exercises: [],
  variations: [],
  variationTypes: [],
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
  exercise_id: number;
  variation: AssignedVariation;
}

export function ExerciseDataProvider({ children }: { children: React.ReactNode }) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [variationTypes, setVariationTypes] = useState<VariationType[]>([]);
  const [rawBridge, setRawBridge] = useState<RawBridgeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshExercises = useCallback(async () => {
    const { data } = await supabase
      .from('dim_exercise')
      .select('*')
      .eq('is_active', true)
      .order('exercise_name');
    if (data) setExercises(data);
  }, []);

  const refreshVariations = useCallback(async () => {
    const { data } = await supabase
      .from('dim_exercise_variation')
      .select('*, dim_variation_type(variation_type_name)')
      .eq('is_active', true)
      .order('exercise_variation_name');
    if (data) {
      setVariations(
        data.map((v: any) => ({
          ...v,
          variation_type_name: v.dim_variation_type?.variation_type_name ?? '',
        }))
      );
    }
  }, []);

  const refreshVariationTypes = useCallback(async () => {
    const { data } = await supabase
      .from('dim_variation_type')
      .select('*')
      .eq('is_active', true)
      .order('variation_type_name');
    if (data) setVariationTypes(data);
  }, []);

  const refreshExerciseDetails = useCallback(async () => {
    const { data } = await supabase
      .from('bridge_exercise_variation')
      .select(
        'exercise_id, dim_exercise_variation(exercise_variation_id, exercise_variation_name, variation_type_id, dim_variation_type(variation_type_name))'
      );
    if (data) {
      setRawBridge(
        data.flatMap((b: any) => {
          const v = b.dim_exercise_variation;
          if (!v) return [];
          return [{
            exercise_id: b.exercise_id,
            variation: {
              exercise_variation_id: v.exercise_variation_id,
              exercise_variation_name: v.exercise_variation_name,
              variation_type_id: v.variation_type_id,
              variation_type_name: v.dim_variation_type?.variation_type_name ?? '',
            },
          }];
        })
      );
    }
  }, []);

  // exerciseDetailMap is derived — rebuilds automatically when exercises or bridge data changes
  const exerciseDetailMap = useMemo(() => {
    const map: Record<number, ExerciseDetail> = {};
    exercises.forEach((ex) => {
      map[ex.exercise_id] = { ...ex, assigned_variations: [] };
    });
    rawBridge.forEach(({ exercise_id, variation }) => {
      if (map[exercise_id]) map[exercise_id].assigned_variations.push(variation);
    });
    return map;
  }, [exercises, rawBridge]);

  useEffect(() => {
    Promise.all([
      refreshExercises(),
      refreshVariations(),
      refreshVariationTypes(),
      refreshExerciseDetails(),
    ]).finally(() => setLoading(false));
  }, []);

  return (
    <ExerciseDataContext.Provider
      value={{
        exercises,
        variations,
        variationTypes,
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
