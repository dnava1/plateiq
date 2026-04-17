ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_weight_rounding_lbs_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_weight_rounding_lbs_check
  CHECK (weight_rounding_lbs IN (2.20462, 2.5, 5, 5.51156, 10, 11.02312));