import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import supabase from '@/lib/supabase';

interface Exercise {
  exercise_id: number;
  exercise_name: string;
  exercise_volume_type: string;
  exercise_intensity_type: string;
  is_active: boolean;
}

interface Variation {
  exercise_variation_id: number;
  exercise_variation_name: string;
  variation_type_id: number;
  variation_type_name: string;
}

interface VariationType {
  variation_type_id: number;
  variation_type_name: string;
}

interface AdminDataContextValue {
  exercises: Exercise[];
  variations: Variation[];
  variationTypes: VariationType[];
  loading: boolean;
  refreshExercises: () => Promise<void>;
  refreshVariations: () => Promise<void>;
}

const AdminDataContext = createContext<AdminDataContextValue>({
  exercises: [],
  variations: [],
  variationTypes: [],
  loading: true,
  refreshExercises: async () => {},
  refreshVariations: async () => {},
});

export function useAdminData() {
  return useContext(AdminDataContext);
}

export function AdminDataProvider({ children }: { children: React.ReactNode }) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [variationTypes, setVariationTypes] = useState<VariationType[]>([]);
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

  useEffect(() => {
    Promise.all([refreshExercises(), refreshVariations(), refreshVariationTypes()])
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminDataContext.Provider value={{ exercises, variations, variationTypes, loading, refreshExercises, refreshVariations }}>
      {children}
    </AdminDataContext.Provider>
  );
}
