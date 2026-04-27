ALTER TABLE public.workout_sets
  ADD COLUMN IF NOT EXISTS prescribed_weight_lbs decimal,
  ADD COLUMN IF NOT EXISTS prescribed_intensity decimal,
  ADD COLUMN IF NOT EXISTS prescription_base_weight_lbs decimal;
