-- Applied to project Lambda (dybluaeowmpdwsweawcq) as four remote migrations:
-- add_fk_support_indexes, rls_initplan_dim_user_and_weight,
-- rls_initplan_workouts_and_sets, rls_initplan_custom_exercise_variation
-- (Supabase assigns version timestamps on apply.)
--
-- Idempotent: safe to run on a fresh clone if merged with prior history.

CREATE INDEX IF NOT EXISTS idx_fact_user_workout_user_id ON public.fact_user_workout (user_id);
CREATE INDEX IF NOT EXISTS idx_fact_workout_set_user_workout_id ON public.fact_workout_set (user_workout_id);
CREATE INDEX IF NOT EXISTS idx_fact_workout_set_custom_exercise_id ON public.fact_workout_set (custom_exercise_id);
CREATE INDEX IF NOT EXISTS idx_fact_workout_set_custom_variation_id ON public.fact_workout_set (custom_variation_id);
CREATE INDEX IF NOT EXISTS idx_user_custom_exercise_user_id ON public.user_custom_exercise (user_id);
CREATE INDEX IF NOT EXISTS idx_user_custom_variation_user_id ON public.user_custom_variation (user_id);
CREATE INDEX IF NOT EXISTS idx_user_custom_exercise_variation_bridge_user_id ON public.user_custom_exercise_variation_bridge (user_id);
CREATE INDEX IF NOT EXISTS idx_user_custom_exercise_variation_bridge_custom_variation_id ON public.user_custom_exercise_variation_bridge (custom_variation_id);

DROP POLICY IF EXISTS "Users can view own profile" ON public.dim_user;
CREATE POLICY "Users can view own profile" ON public.dim_user FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.dim_user;
CREATE POLICY "Users can insert own profile" ON public.dim_user FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.dim_user;
CREATE POLICY "Users can update own profile" ON public.dim_user FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own weight entries" ON public.fact_user_weight;
CREATE POLICY "Users can view own weight entries" ON public.fact_user_weight FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert own weight entries" ON public.fact_user_weight;
CREATE POLICY "Users can insert own weight entries" ON public.fact_user_weight FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update own weight entries" ON public.fact_user_weight;
CREATE POLICY "Users can update own weight entries" ON public.fact_user_weight FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete own weight entries" ON public.fact_user_weight;
CREATE POLICY "Users can delete own weight entries" ON public.fact_user_weight FOR DELETE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own workouts" ON public.fact_user_workout;
CREATE POLICY "Users can view own workouts" ON public.fact_user_workout FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert own workouts" ON public.fact_user_workout;
CREATE POLICY "Users can insert own workouts" ON public.fact_user_workout FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update own workouts" ON public.fact_user_workout;
CREATE POLICY "Users can update own workouts" ON public.fact_user_workout FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete own workouts" ON public.fact_user_workout;
CREATE POLICY "Users can delete own workouts" ON public.fact_user_workout FOR DELETE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own workout sets" ON public.fact_workout_set;
CREATE POLICY "Users can view own workout sets" ON public.fact_workout_set FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.fact_user_workout w
    WHERE w.user_workout_id = fact_workout_set.user_workout_id
      AND w.user_id = (select auth.uid())
  )
);
DROP POLICY IF EXISTS "Users can insert own workout sets" ON public.fact_workout_set;
CREATE POLICY "Users can insert own workout sets" ON public.fact_workout_set FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.fact_user_workout w
    WHERE w.user_workout_id = fact_workout_set.user_workout_id
      AND w.user_id = (select auth.uid())
  )
);
DROP POLICY IF EXISTS "Users can update own workout sets" ON public.fact_workout_set;
CREATE POLICY "Users can update own workout sets" ON public.fact_workout_set FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.fact_user_workout w
    WHERE w.user_workout_id = fact_workout_set.user_workout_id
      AND w.user_id = (select auth.uid())
  )
);
DROP POLICY IF EXISTS "Users can delete own workout sets" ON public.fact_workout_set;
CREATE POLICY "Users can delete own workout sets" ON public.fact_workout_set FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.fact_user_workout w
    WHERE w.user_workout_id = fact_workout_set.user_workout_id
      AND w.user_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can view own custom exercises" ON public.user_custom_exercise;
CREATE POLICY "Users can view own custom exercises" ON public.user_custom_exercise FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can create custom exercises" ON public.user_custom_exercise;
CREATE POLICY "Users can create custom exercises" ON public.user_custom_exercise FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update own custom exercises" ON public.user_custom_exercise;
CREATE POLICY "Users can update own custom exercises" ON public.user_custom_exercise FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete own custom exercises" ON public.user_custom_exercise;
CREATE POLICY "Users can delete own custom exercises" ON public.user_custom_exercise FOR DELETE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own custom variations" ON public.user_custom_variation;
CREATE POLICY "Users can view own custom variations" ON public.user_custom_variation FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can create custom variations" ON public.user_custom_variation;
CREATE POLICY "Users can create custom variations" ON public.user_custom_variation FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update own custom variations" ON public.user_custom_variation;
CREATE POLICY "Users can update own custom variations" ON public.user_custom_variation FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete own custom variations" ON public.user_custom_variation;
CREATE POLICY "Users can delete own custom variations" ON public.user_custom_variation FOR DELETE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own exercise-variation links" ON public.user_custom_exercise_variation_bridge;
CREATE POLICY "Users can view own exercise-variation links" ON public.user_custom_exercise_variation_bridge FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can create exercise-variation links" ON public.user_custom_exercise_variation_bridge;
CREATE POLICY "Users can create exercise-variation links" ON public.user_custom_exercise_variation_bridge FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update own exercise-variation links" ON public.user_custom_exercise_variation_bridge;
CREATE POLICY "Users can update own exercise-variation links" ON public.user_custom_exercise_variation_bridge FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete own exercise-variation links" ON public.user_custom_exercise_variation_bridge;
CREATE POLICY "Users can delete own exercise-variation links" ON public.user_custom_exercise_variation_bridge FOR DELETE USING ((select auth.uid()) = user_id);
