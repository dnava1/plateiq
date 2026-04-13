BEGIN;

CREATE OR REPLACE FUNCTION private.estimate_one_rep_max(
  p_weight_lbs numeric,
  p_reps int
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_weight_lbs IS NULL OR p_reps IS NULL OR p_weight_lbs <= 0 THEN NULL
    WHEN p_reps <= 1 THEN p_weight_lbs
    WHEN p_reps > 10 THEN p_weight_lbs
    ELSE (100 * p_weight_lbs) / (48.8 + 53.8 * exp(-0.075 * p_reps))
  END
$$;

CREATE OR REPLACE FUNCTION public.estimate_one_rep_max(
  p_weight_lbs numeric,
  p_reps int
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_weight_lbs IS NULL OR p_reps IS NULL OR p_weight_lbs <= 0 THEN NULL
    WHEN p_reps <= 1 THEN p_weight_lbs
    WHEN p_reps > 10 THEN p_weight_lbs
    ELSE (100 * p_weight_lbs) / (48.8 + 53.8 * exp(-0.075 * p_reps))
  END
$$;

COMMIT;