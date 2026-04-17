ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS weight_rounding_lbs numeric NOT NULL DEFAULT 5;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_weight_rounding_lbs_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_weight_rounding_lbs_check
  CHECK (weight_rounding_lbs IN (2.5, 5, 10));

WITH preferred_program_rounding AS (
  SELECT DISTINCT ON (tp.user_id)
    tp.user_id,
    (tp.config ->> 'rounding')::numeric AS rounding_lbs
  FROM public.training_programs AS tp
  WHERE jsonb_typeof(tp.config) = 'object'
    AND (tp.config ->> 'rounding') IN ('2.5', '5', '10')
  ORDER BY tp.user_id, tp.is_active DESC, tp.updated_at DESC NULLS LAST, tp.created_at DESC NULLS LAST
)
UPDATE public.profiles AS profiles
SET weight_rounding_lbs = preferred_program_rounding.rounding_lbs
FROM preferred_program_rounding
WHERE profiles.id = preferred_program_rounding.user_id
  AND profiles.weight_rounding_lbs = 5;