BEGIN;

CREATE TABLE IF NOT EXISTS private.strength_lifts (
  lift_slug                 text    PRIMARY KEY,
  display_name              text    NOT NULL,
  category_key              text    NOT NULL,
  category_label            text    NOT NULL,
  sort_order                int     NOT NULL,
  bodyweight_load_fraction  numeric NOT NULL DEFAULT 0
                                   CHECK (bodyweight_load_fraction BETWEEN 0 AND 1),
  muscle_weights            jsonb   NOT NULL DEFAULT '{}'::jsonb
                                   CHECK (jsonb_typeof(muscle_weights) = 'object')
);

CREATE TABLE IF NOT EXISTS private.strength_benchmark_points (
  version              text        NOT NULL,
  sex                  text        NOT NULL CHECK (sex IN ('male', 'female')),
  lift_slug            text        NOT NULL REFERENCES private.strength_lifts(lift_slug) ON DELETE CASCADE,
  bodyweight_lbs       numeric     NOT NULL CHECK (bodyweight_lbs > 0),
  score                numeric     NOT NULL CHECK (score > 0),
  expected_one_rm_lbs  numeric     NOT NULL CHECK (expected_one_rm_lbs > 0),
  created_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (version, sex, lift_slug, bodyweight_lbs, score)
);

CREATE TABLE IF NOT EXISTS private.strength_age_adjustments (
  version     text        NOT NULL,
  age_years   int         NOT NULL CHECK (age_years BETWEEN 13 AND 100),
  multiplier  numeric     NOT NULL CHECK (multiplier > 0),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (version, age_years)
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS strength_profile_sex text
  CHECK (strength_profile_sex IN ('male', 'female'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS strength_profile_age_years int
  CHECK (strength_profile_age_years BETWEEN 13 AND 100);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS strength_profile_bodyweight_lbs numeric
  CHECK (strength_profile_bodyweight_lbs BETWEEN 50 AND 600);

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS strength_lift_slug text
  REFERENCES private.strength_lifts(lift_slug) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_exercises_strength_lift_slug
  ON public.exercises (strength_lift_slug)
  WHERE strength_lift_slug IS NOT NULL;

INSERT INTO private.strength_lifts (
  lift_slug,
  display_name,
  category_key,
  category_label,
  sort_order,
  bodyweight_load_fraction,
  muscle_weights
)
VALUES
  ('back_squat', 'Back Squat', 'squat', 'Squat', 10, 0, '{"quads": 0.4, "glutes": 0.3, "hamstrings": 0.15, "core": 0.15}'::jsonb),
  ('front_squat', 'Front Squat', 'squat', 'Squat', 20, 0, '{"quads": 0.45, "glutes": 0.2, "upper_back": 0.2, "core": 0.15}'::jsonb),
  ('deadlift', 'Deadlift', 'deadlift', 'Deadlift', 30, 0, '{"hamstrings": 0.25, "glutes": 0.25, "lower_back": 0.15, "traps": 0.15, "upper_back": 0.1, "core": 0.1}'::jsonb),
  ('sumo_deadlift', 'Sumo Deadlift', 'deadlift', 'Deadlift', 40, 0, '{"glutes": 0.3, "quads": 0.2, "hamstrings": 0.2, "lower_back": 0.1, "adductors": 0.1, "core": 0.1}'::jsonb),
  ('power_clean', 'Power Clean', 'olympic', 'Olympic', 50, 0, '{"quads": 0.25, "glutes": 0.2, "hamstrings": 0.15, "traps": 0.2, "upper_back": 0.1, "core": 0.1}'::jsonb),
  ('bench_press', 'Bench Press', 'bench', 'Bench', 60, 0, '{"chest": 0.45, "shoulders": 0.2, "triceps": 0.25, "upper_back": 0.1}'::jsonb),
  ('incline_bench_press', 'Incline Bench Press', 'bench', 'Bench', 70, 0, '{"upper_chest": 0.35, "chest": 0.2, "shoulders": 0.25, "triceps": 0.2}'::jsonb),
  ('dip', 'Dip', 'bench', 'Bench', 80, 1, '{"chest": 0.3, "triceps": 0.4, "shoulders": 0.2, "core": 0.1}'::jsonb),
  ('overhead_press', 'Overhead Press', 'overhead', 'Overhead', 90, 0, '{"shoulders": 0.4, "triceps": 0.25, "upper_chest": 0.1, "upper_back": 0.1, "core": 0.15}'::jsonb),
  ('push_press', 'Push Press', 'overhead', 'Overhead', 100, 0, '{"shoulders": 0.3, "triceps": 0.2, "quads": 0.15, "glutes": 0.15, "upper_back": 0.1, "core": 0.1}'::jsonb),
  ('snatch_press', 'Snatch Press', 'overhead', 'Overhead', 110, 0, '{"shoulders": 0.35, "upper_back": 0.2, "triceps": 0.15, "core": 0.15, "traps": 0.15}'::jsonb),
  ('chin_up', 'Chin-Up', 'pull', 'Pull', 120, 1, '{"lats": 0.35, "upper_back": 0.2, "biceps": 0.2, "forearms": 0.1, "core": 0.15}'::jsonb),
  ('pull_up', 'Pull-Up', 'pull', 'Pull', 130, 1, '{"lats": 0.4, "upper_back": 0.25, "biceps": 0.1, "forearms": 0.1, "core": 0.15}'::jsonb),
  ('pendlay_row', 'Pendlay Row', 'pull', 'Pull', 140, 0, '{"upper_back": 0.3, "lats": 0.25, "biceps": 0.15, "lower_back": 0.15, "forearms": 0.05, "core": 0.1}'::jsonb)
ON CONFLICT (lift_slug) DO UPDATE
SET display_name = EXCLUDED.display_name,
    category_key = EXCLUDED.category_key,
    category_label = EXCLUDED.category_label,
    sort_order = EXCLUDED.sort_order,
    bodyweight_load_fraction = EXCLUDED.bodyweight_load_fraction,
    muscle_weights = EXCLUDED.muscle_weights;

WITH benchmark_points (version, sex, lift_slug, bodyweight_lbs, score, expected_one_rm_lbs) AS (
  VALUES
    ('2026_public_v1', 'male', 'back_squat', 110, 100, 242),
    ('2026_public_v1', 'male', 'back_squat', 148, 100, 318),
    ('2026_public_v1', 'male', 'back_squat', 181, 100, 380),
    ('2026_public_v1', 'male', 'back_squat', 220, 100, 440),
    ('2026_public_v1', 'male', 'back_squat', 275, 100, 523),
    ('2026_public_v1', 'male', 'front_squat', 110, 100, 206),
    ('2026_public_v1', 'male', 'front_squat', 148, 100, 270),
    ('2026_public_v1', 'male', 'front_squat', 181, 100, 323),
    ('2026_public_v1', 'male', 'front_squat', 220, 100, 374),
    ('2026_public_v1', 'male', 'front_squat', 275, 100, 444),
    ('2026_public_v1', 'male', 'deadlift', 110, 100, 292),
    ('2026_public_v1', 'male', 'deadlift', 148, 100, 377),
    ('2026_public_v1', 'male', 'deadlift', 181, 100, 443),
    ('2026_public_v1', 'male', 'deadlift', 220, 100, 517),
    ('2026_public_v1', 'male', 'deadlift', 275, 100, 619),
    ('2026_public_v1', 'male', 'sumo_deadlift', 110, 100, 286),
    ('2026_public_v1', 'male', 'sumo_deadlift', 148, 100, 370),
    ('2026_public_v1', 'male', 'sumo_deadlift', 181, 100, 434),
    ('2026_public_v1', 'male', 'sumo_deadlift', 220, 100, 507),
    ('2026_public_v1', 'male', 'sumo_deadlift', 275, 100, 607),
    ('2026_public_v1', 'male', 'power_clean', 110, 100, 160),
    ('2026_public_v1', 'male', 'power_clean', 148, 100, 204),
    ('2026_public_v1', 'male', 'power_clean', 181, 100, 239),
    ('2026_public_v1', 'male', 'power_clean', 220, 100, 279),
    ('2026_public_v1', 'male', 'power_clean', 275, 100, 336),
    ('2026_public_v1', 'male', 'bench_press', 110, 100, 182),
    ('2026_public_v1', 'male', 'bench_press', 148, 100, 229),
    ('2026_public_v1', 'male', 'bench_press', 181, 100, 272),
    ('2026_public_v1', 'male', 'bench_press', 220, 100, 312),
    ('2026_public_v1', 'male', 'bench_press', 275, 100, 371),
    ('2026_public_v1', 'male', 'incline_bench_press', 110, 100, 167),
    ('2026_public_v1', 'male', 'incline_bench_press', 148, 100, 211),
    ('2026_public_v1', 'male', 'incline_bench_press', 181, 100, 250),
    ('2026_public_v1', 'male', 'incline_bench_press', 220, 100, 287),
    ('2026_public_v1', 'male', 'incline_bench_press', 275, 100, 341),
    ('2026_public_v1', 'male', 'dip', 110, 100, 176),
    ('2026_public_v1', 'male', 'dip', 148, 100, 240),
    ('2026_public_v1', 'male', 'dip', 181, 100, 290),
    ('2026_public_v1', 'male', 'dip', 220, 100, 348),
    ('2026_public_v1', 'male', 'dip', 275, 100, 413),
    ('2026_public_v1', 'male', 'overhead_press', 110, 100, 121),
    ('2026_public_v1', 'male', 'overhead_press', 148, 100, 155),
    ('2026_public_v1', 'male', 'overhead_press', 181, 100, 181),
    ('2026_public_v1', 'male', 'overhead_press', 220, 100, 209),
    ('2026_public_v1', 'male', 'overhead_press', 275, 100, 248),
    ('2026_public_v1', 'male', 'push_press', 110, 100, 143),
    ('2026_public_v1', 'male', 'push_press', 148, 100, 181),
    ('2026_public_v1', 'male', 'push_press', 181, 100, 214),
    ('2026_public_v1', 'male', 'push_press', 220, 100, 249),
    ('2026_public_v1', 'male', 'push_press', 275, 100, 303),
    ('2026_public_v1', 'male', 'snatch_press', 110, 100, 105),
    ('2026_public_v1', 'male', 'snatch_press', 148, 100, 133),
    ('2026_public_v1', 'male', 'snatch_press', 181, 100, 156),
    ('2026_public_v1', 'male', 'snatch_press', 220, 100, 182),
    ('2026_public_v1', 'male', 'snatch_press', 275, 100, 215),
    ('2026_public_v1', 'male', 'chin_up', 110, 100, 171),
    ('2026_public_v1', 'male', 'chin_up', 148, 100, 229),
    ('2026_public_v1', 'male', 'chin_up', 181, 100, 284),
    ('2026_public_v1', 'male', 'chin_up', 220, 100, 330),
    ('2026_public_v1', 'male', 'chin_up', 275, 100, 399),
    ('2026_public_v1', 'male', 'pull_up', 110, 100, 160),
    ('2026_public_v1', 'male', 'pull_up', 148, 100, 214),
    ('2026_public_v1', 'male', 'pull_up', 181, 100, 267),
    ('2026_public_v1', 'male', 'pull_up', 220, 100, 319),
    ('2026_public_v1', 'male', 'pull_up', 275, 100, 385),
    ('2026_public_v1', 'male', 'pendlay_row', 110, 100, 149),
    ('2026_public_v1', 'male', 'pendlay_row', 148, 100, 200),
    ('2026_public_v1', 'male', 'pendlay_row', 181, 100, 244),
    ('2026_public_v1', 'male', 'pendlay_row', 220, 100, 286),
    ('2026_public_v1', 'male', 'pendlay_row', 275, 100, 344),
    ('2026_public_v1', 'female', 'back_squat', 97, 100, 179),
    ('2026_public_v1', 'female', 'back_squat', 132, 100, 238),
    ('2026_public_v1', 'female', 'back_squat', 165, 100, 289),
    ('2026_public_v1', 'female', 'back_squat', 198, 100, 333),
    ('2026_public_v1', 'female', 'back_squat', 242, 100, 387),
    ('2026_public_v1', 'female', 'front_squat', 97, 100, 152),
    ('2026_public_v1', 'female', 'front_squat', 132, 100, 202),
    ('2026_public_v1', 'female', 'front_squat', 165, 100, 246),
    ('2026_public_v1', 'female', 'front_squat', 198, 100, 283),
    ('2026_public_v1', 'female', 'front_squat', 242, 100, 329),
    ('2026_public_v1', 'female', 'deadlift', 97, 100, 218),
    ('2026_public_v1', 'female', 'deadlift', 132, 100, 288),
    ('2026_public_v1', 'female', 'deadlift', 165, 100, 347),
    ('2026_public_v1', 'female', 'deadlift', 198, 100, 396),
    ('2026_public_v1', 'female', 'deadlift', 242, 100, 460),
    ('2026_public_v1', 'female', 'sumo_deadlift', 97, 100, 214),
    ('2026_public_v1', 'female', 'sumo_deadlift', 132, 100, 282),
    ('2026_public_v1', 'female', 'sumo_deadlift', 165, 100, 340),
    ('2026_public_v1', 'female', 'sumo_deadlift', 198, 100, 388),
    ('2026_public_v1', 'female', 'sumo_deadlift', 242, 100, 451),
    ('2026_public_v1', 'female', 'power_clean', 97, 100, 112),
    ('2026_public_v1', 'female', 'power_clean', 132, 100, 152),
    ('2026_public_v1', 'female', 'power_clean', 165, 100, 195),
    ('2026_public_v1', 'female', 'power_clean', 198, 100, 231),
    ('2026_public_v1', 'female', 'power_clean', 242, 100, 278),
    ('2026_public_v1', 'female', 'bench_press', 97, 100, 116),
    ('2026_public_v1', 'female', 'bench_press', 132, 100, 152),
    ('2026_public_v1', 'female', 'bench_press', 165, 100, 182),
    ('2026_public_v1', 'female', 'bench_press', 198, 100, 208),
    ('2026_public_v1', 'female', 'bench_press', 242, 100, 242),
    ('2026_public_v1', 'female', 'incline_bench_press', 97, 100, 107),
    ('2026_public_v1', 'female', 'incline_bench_press', 132, 100, 140),
    ('2026_public_v1', 'female', 'incline_bench_press', 165, 100, 167),
    ('2026_public_v1', 'female', 'incline_bench_press', 198, 100, 191),
    ('2026_public_v1', 'female', 'incline_bench_press', 242, 100, 223),
    ('2026_public_v1', 'female', 'dip', 97, 100, 126),
    ('2026_public_v1', 'female', 'dip', 132, 100, 172),
    ('2026_public_v1', 'female', 'dip', 165, 100, 218),
    ('2026_public_v1', 'female', 'dip', 198, 100, 257),
    ('2026_public_v1', 'female', 'dip', 242, 100, 302),
    ('2026_public_v1', 'female', 'overhead_press', 97, 100, 78),
    ('2026_public_v1', 'female', 'overhead_press', 132, 100, 100),
    ('2026_public_v1', 'female', 'overhead_press', 165, 100, 120),
    ('2026_public_v1', 'female', 'overhead_press', 198, 100, 139),
    ('2026_public_v1', 'female', 'overhead_press', 242, 100, 160),
    ('2026_public_v1', 'female', 'push_press', 97, 100, 92),
    ('2026_public_v1', 'female', 'push_press', 132, 100, 118),
    ('2026_public_v1', 'female', 'push_press', 165, 100, 144),
    ('2026_public_v1', 'female', 'push_press', 198, 100, 164),
    ('2026_public_v1', 'female', 'push_press', 242, 100, 190),
    ('2026_public_v1', 'female', 'snatch_press', 97, 100, 69),
    ('2026_public_v1', 'female', 'snatch_press', 132, 100, 88),
    ('2026_public_v1', 'female', 'snatch_press', 165, 100, 106),
    ('2026_public_v1', 'female', 'snatch_press', 198, 100, 123),
    ('2026_public_v1', 'female', 'snatch_press', 242, 100, 141),
    ('2026_public_v1', 'female', 'chin_up', 97, 100, 116),
    ('2026_public_v1', 'female', 'chin_up', 132, 100, 158),
    ('2026_public_v1', 'female', 'chin_up', 165, 100, 193),
    ('2026_public_v1', 'female', 'chin_up', 198, 100, 218),
    ('2026_public_v1', 'female', 'chin_up', 242, 100, 254),
    ('2026_public_v1', 'female', 'pull_up', 97, 100, 107),
    ('2026_public_v1', 'female', 'pull_up', 132, 100, 145),
    ('2026_public_v1', 'female', 'pull_up', 165, 100, 182),
    ('2026_public_v1', 'female', 'pull_up', 198, 100, 208),
    ('2026_public_v1', 'female', 'pull_up', 242, 100, 242),
    ('2026_public_v1', 'female', 'pendlay_row', 97, 100, 102),
    ('2026_public_v1', 'female', 'pendlay_row', 132, 100, 139),
    ('2026_public_v1', 'female', 'pendlay_row', 165, 100, 173),
    ('2026_public_v1', 'female', 'pendlay_row', 198, 100, 194),
    ('2026_public_v1', 'female', 'pendlay_row', 242, 100, 230)
)
INSERT INTO private.strength_benchmark_points (
  version,
  sex,
  lift_slug,
  bodyweight_lbs,
  score,
  expected_one_rm_lbs
)
SELECT
  version,
  sex,
  lift_slug,
  bodyweight_lbs,
  score,
  expected_one_rm_lbs
FROM benchmark_points
ON CONFLICT (version, sex, lift_slug, bodyweight_lbs, score) DO UPDATE
SET expected_one_rm_lbs = EXCLUDED.expected_one_rm_lbs;

WITH age_adjustments (version, age_years, multiplier) AS (
  VALUES
    ('2026_public_v1', 13, 0.72),
    ('2026_public_v1', 15, 0.80),
    ('2026_public_v1', 17, 0.90),
    ('2026_public_v1', 20, 0.98),
    ('2026_public_v1', 23, 1.00),
    ('2026_public_v1', 30, 1.00),
    ('2026_public_v1', 40, 0.95),
    ('2026_public_v1', 50, 0.88),
    ('2026_public_v1', 60, 0.78),
    ('2026_public_v1', 70, 0.67),
    ('2026_public_v1', 80, 0.56)
)
INSERT INTO private.strength_age_adjustments (
  version,
  age_years,
  multiplier
)
SELECT version, age_years, multiplier
FROM age_adjustments
ON CONFLICT (version, age_years) DO UPDATE
SET multiplier = EXCLUDED.multiplier;

INSERT INTO public.exercises (
  name,
  category,
  movement_pattern,
  is_main_lift,
  progression_increment_lbs,
  strength_lift_slug
)
VALUES
  ('Push Press', 'main', 'push', true, 5, 'push_press'),
  ('Snatch Press', 'accessory', 'push', false, NULL, 'snatch_press'),
  ('Pendlay Row', 'accessory', 'pull', false, NULL, 'pendlay_row')
ON CONFLICT (name, created_by_user_id) DO UPDATE
SET strength_lift_slug = EXCLUDED.strength_lift_slug;

UPDATE public.exercises
SET strength_lift_slug = CASE lower(name)
  WHEN 'squat' THEN 'back_squat'
  WHEN 'front squat' THEN 'front_squat'
  WHEN 'deadlift' THEN 'deadlift'
  WHEN 'sumo deadlift' THEN 'sumo_deadlift'
  WHEN 'power clean' THEN 'power_clean'
  WHEN 'bench press' THEN 'bench_press'
  WHEN 'incline bench press' THEN 'incline_bench_press'
  WHEN 'dip' THEN 'dip'
  WHEN 'overhead press' THEN 'overhead_press'
  WHEN 'chin-up' THEN 'chin_up'
  WHEN 'pull-up' THEN 'pull_up'
  WHEN 'barbell row' THEN 'pendlay_row'
  WHEN 'push press' THEN 'push_press'
  WHEN 'snatch press' THEN 'snatch_press'
  WHEN 'pendlay row' THEN 'pendlay_row'
  ELSE strength_lift_slug
END
WHERE created_by_user_id IS NULL
  AND lower(name) IN (
    'squat',
    'front squat',
    'deadlift',
    'sumo deadlift',
    'power clean',
    'bench press',
    'incline bench press',
    'dip',
    'overhead press',
    'chin-up',
    'pull-up',
    'barbell row',
    'push press',
    'snatch press',
    'pendlay row'
  );

CREATE OR REPLACE FUNCTION private.interpolate_numeric(
  p_x numeric,
  p_x0 numeric,
  p_y0 numeric,
  p_x1 numeric,
  p_y1 numeric
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_x0 IS NULL OR p_y0 IS NULL THEN p_y1
    WHEN p_x1 IS NULL OR p_y1 IS NULL THEN p_y0
    WHEN p_x1 = p_x0 THEN p_y0
    ELSE p_y0 + ((p_x - p_x0) * (p_y1 - p_y0) / NULLIF(p_x1 - p_x0, 0))
  END
$$;

CREATE OR REPLACE FUNCTION private.strength_estimate_one_rep_max(
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
    WHEN p_reps < 1 OR p_reps > 10 THEN NULL
    ELSE (100 * p_weight_lbs) / (48.8 + 53.8 * exp(-0.075 * p_reps))
  END
$$;

CREATE OR REPLACE FUNCTION private.strength_multi_rep_max(
  p_reps int,
  p_one_rm_lbs numeric
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_one_rm_lbs IS NULL OR p_reps IS NULL OR p_one_rm_lbs <= 0 THEN NULL
    WHEN p_reps < 1 OR p_reps > 10 THEN NULL
    ELSE p_one_rm_lbs * (48.8 + 53.8 * exp(-0.075 * p_reps)) / 100
  END
$$;

CREATE OR REPLACE FUNCTION private.get_strength_age_multiplier(
  p_age_years int,
  p_version text DEFAULT '2026_public_v1'
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_lower_age int;
  v_upper_age int;
  v_lower_multiplier numeric;
  v_upper_multiplier numeric;
BEGIN
  IF p_age_years IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT age_years, multiplier
  INTO v_lower_age, v_lower_multiplier
  FROM private.strength_age_adjustments
  WHERE version = p_version
    AND age_years <= p_age_years
  ORDER BY age_years DESC
  LIMIT 1;

  SELECT age_years, multiplier
  INTO v_upper_age, v_upper_multiplier
  FROM private.strength_age_adjustments
  WHERE version = p_version
    AND age_years >= p_age_years
  ORDER BY age_years ASC
  LIMIT 1;

  IF v_lower_multiplier IS NULL AND v_upper_multiplier IS NULL THEN
    RETURN 1;
  END IF;

  IF v_lower_multiplier IS NULL THEN
    RETURN v_upper_multiplier;
  END IF;

  IF v_upper_multiplier IS NULL THEN
    RETURN v_lower_multiplier;
  END IF;

  RETURN private.interpolate_numeric(
    p_age_years,
    v_lower_age,
    v_lower_multiplier,
    v_upper_age,
    v_upper_multiplier
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.get_strength_benchmark_one_rm(
  p_lift_slug text,
  p_sex text,
  p_bodyweight_lbs numeric,
  p_age_years int,
  p_version text DEFAULT '2026_public_v1'
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_lower_bodyweight numeric;
  v_upper_bodyweight numeric;
  v_lower_expected numeric;
  v_upper_expected numeric;
  v_age_multiplier numeric;
  v_expected numeric;
BEGIN
  IF p_lift_slug IS NULL OR p_sex IS NULL OR p_bodyweight_lbs IS NULL OR p_age_years IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT bodyweight_lbs, expected_one_rm_lbs
  INTO v_lower_bodyweight, v_lower_expected
  FROM private.strength_benchmark_points
  WHERE version = p_version
    AND sex = p_sex
    AND lift_slug = p_lift_slug
    AND score = 100
    AND bodyweight_lbs <= p_bodyweight_lbs
  ORDER BY bodyweight_lbs DESC
  LIMIT 1;

  SELECT bodyweight_lbs, expected_one_rm_lbs
  INTO v_upper_bodyweight, v_upper_expected
  FROM private.strength_benchmark_points
  WHERE version = p_version
    AND sex = p_sex
    AND lift_slug = p_lift_slug
    AND score = 100
    AND bodyweight_lbs >= p_bodyweight_lbs
  ORDER BY bodyweight_lbs ASC
  LIMIT 1;

  IF v_lower_expected IS NULL AND v_upper_expected IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_lower_expected IS NULL THEN
    v_expected := v_upper_expected;
  ELSIF v_upper_expected IS NULL THEN
    v_expected := v_lower_expected;
  ELSE
    v_expected := private.interpolate_numeric(
      p_bodyweight_lbs,
      v_lower_bodyweight,
      v_lower_expected,
      v_upper_bodyweight,
      v_upper_expected
    );
  END IF;

  v_age_multiplier := private.get_strength_age_multiplier(p_age_years, p_version);

  RETURN ROUND(v_expected * COALESCE(v_age_multiplier, 1), 1);
END;
$$;

CREATE OR REPLACE FUNCTION private.get_strength_profile(
  p_date_from date,
  p_date_to date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'profile', jsonb_build_object(
        'sex', NULL,
        'age_years', NULL,
        'bodyweight_lbs', NULL
      ),
      'minimum_lift_count', 3,
      'minimum_category_count', 2,
      'lifts', '[]'::jsonb
    );
  END IF;

  SELECT *
  INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'profile', jsonb_build_object(
        'sex', NULL,
        'age_years', NULL,
        'bodyweight_lbs', NULL
      ),
      'minimum_lift_count', 3,
      'minimum_category_count', 2,
      'lifts', '[]'::jsonb
    );
  END IF;

  IF v_profile.strength_profile_sex IS NULL
     OR v_profile.strength_profile_age_years IS NULL
     OR v_profile.strength_profile_bodyweight_lbs IS NULL THEN
    RETURN jsonb_build_object(
      'profile', jsonb_build_object(
        'sex', v_profile.strength_profile_sex,
        'age_years', v_profile.strength_profile_age_years,
        'bodyweight_lbs', v_profile.strength_profile_bodyweight_lbs
      ),
      'minimum_lift_count', 3,
      'minimum_category_count', 2,
      'lifts', '[]'::jsonb
    );
  END IF;

  WITH candidate_sets AS (
    SELECT
      sl.lift_slug,
      sl.display_name,
      sl.category_key,
      sl.category_label,
      sl.sort_order,
      sl.muscle_weights,
      ws.exercise_id AS source_exercise_id,
      e.name AS source_exercise_name,
      w.scheduled_date AS best_date,
      ws.reps_actual AS best_reps,
      ws.weight_lbs AS best_external_weight_lbs,
      ROUND(
        ws.weight_lbs + (v_profile.strength_profile_bodyweight_lbs * sl.bodyweight_load_fraction),
        1
      ) AS best_total_load_lbs,
      ROUND(
        private.strength_estimate_one_rep_max(
          ws.weight_lbs + (v_profile.strength_profile_bodyweight_lbs * sl.bodyweight_load_fraction),
          ws.reps_actual
        ),
        1
      ) AS best_one_rm_lbs
    FROM public.workout_sets ws
    JOIN public.workouts w
      ON w.id = ws.workout_id
    JOIN public.exercises e
      ON e.id = ws.exercise_id
    JOIN private.strength_lifts sl
      ON sl.lift_slug = e.strength_lift_slug
    WHERE ws.user_id = v_user_id
      AND ws.reps_actual BETWEEN 1 AND 10
      AND w.scheduled_date BETWEEN p_date_from AND p_date_to
      AND ws.weight_lbs + (v_profile.strength_profile_bodyweight_lbs * sl.bodyweight_load_fraction) > 0
  ),
  best_lifts AS (
    SELECT DISTINCT ON (candidate_sets.lift_slug)
      candidate_sets.lift_slug,
      candidate_sets.display_name,
      candidate_sets.category_key,
      candidate_sets.category_label,
      candidate_sets.sort_order,
      candidate_sets.muscle_weights,
      candidate_sets.source_exercise_id,
      candidate_sets.source_exercise_name,
      candidate_sets.best_date,
      candidate_sets.best_reps,
      candidate_sets.best_external_weight_lbs,
      candidate_sets.best_total_load_lbs,
      candidate_sets.best_one_rm_lbs,
      private.get_strength_benchmark_one_rm(
        candidate_sets.lift_slug,
        v_profile.strength_profile_sex,
        v_profile.strength_profile_bodyweight_lbs,
        v_profile.strength_profile_age_years
      ) AS benchmark_one_rm_lbs
    FROM candidate_sets
    ORDER BY candidate_sets.lift_slug, candidate_sets.best_one_rm_lbs DESC, candidate_sets.best_date DESC
  ),
  lift_rows AS (
    SELECT
      best_lifts.lift_slug,
      best_lifts.display_name,
      best_lifts.category_key,
      best_lifts.category_label,
      best_lifts.sort_order,
      best_lifts.muscle_weights,
      best_lifts.source_exercise_id,
      best_lifts.source_exercise_name,
      best_lifts.best_date,
      best_lifts.best_reps,
      best_lifts.best_external_weight_lbs,
      best_lifts.best_total_load_lbs,
      best_lifts.best_one_rm_lbs,
      best_lifts.benchmark_one_rm_lbs,
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'reps', rep_count,
            'weight_lbs', ROUND(private.strength_multi_rep_max(rep_count, best_lifts.best_one_rm_lbs), 1)
          )
          ORDER BY rep_count
        )
        FROM generate_series(1, 10) AS reps(rep_count)
      ) AS actual_rep_maxes,
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'reps', rep_count,
            'weight_lbs', ROUND(private.strength_multi_rep_max(rep_count, best_lifts.benchmark_one_rm_lbs), 1)
          )
          ORDER BY rep_count
        )
        FROM generate_series(1, 10) AS reps(rep_count)
      ) AS benchmark_rep_maxes
    FROM best_lifts
    WHERE best_lifts.benchmark_one_rm_lbs IS NOT NULL
  )
  SELECT jsonb_build_object(
    'profile', jsonb_build_object(
      'sex', v_profile.strength_profile_sex,
      'age_years', v_profile.strength_profile_age_years,
      'bodyweight_lbs', v_profile.strength_profile_bodyweight_lbs
    ),
    'minimum_lift_count', 3,
    'minimum_category_count', 2,
    'lifts', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'lift_slug', lift_rows.lift_slug,
            'display_name', lift_rows.display_name,
            'category_key', lift_rows.category_key,
            'category_label', lift_rows.category_label,
            'source_exercise_id', lift_rows.source_exercise_id,
            'source_exercise_name', lift_rows.source_exercise_name,
            'best_date', lift_rows.best_date,
            'best_reps', lift_rows.best_reps,
            'best_external_weight_lbs', lift_rows.best_external_weight_lbs,
            'best_total_load_lbs', lift_rows.best_total_load_lbs,
            'best_one_rm_lbs', lift_rows.best_one_rm_lbs,
            'benchmark_one_rm_lbs', lift_rows.benchmark_one_rm_lbs,
            'muscle_weights', lift_rows.muscle_weights,
            'actual_rep_maxes', lift_rows.actual_rep_maxes,
            'benchmark_rep_maxes', lift_rows.benchmark_rep_maxes
          )
          ORDER BY lift_rows.sort_order, lift_rows.display_name
        )
        FROM lift_rows
      ),
      '[]'::jsonb
    )
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_strength_profile(
  p_sex text DEFAULT NULL,
  p_age_years int DEFAULT NULL,
  p_bodyweight_lbs numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_normalized_sex text;
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to update the strength profile.';
  END IF;

  v_normalized_sex := CASE
    WHEN p_sex IS NULL OR btrim(p_sex) = '' THEN NULL
    ELSE lower(btrim(p_sex))
  END;

  IF v_normalized_sex IS NOT NULL AND v_normalized_sex NOT IN ('male', 'female') THEN
    RAISE EXCEPTION 'Sex must be male or female.';
  END IF;

  IF p_age_years IS NOT NULL AND (p_age_years < 13 OR p_age_years > 100) THEN
    RAISE EXCEPTION 'Age must be between 13 and 100.';
  END IF;

  IF p_bodyweight_lbs IS NOT NULL AND (p_bodyweight_lbs < 50 OR p_bodyweight_lbs > 600) THEN
    RAISE EXCEPTION 'Bodyweight must be between 50 and 600 lbs.';
  END IF;

  UPDATE public.profiles
  SET strength_profile_sex = v_normalized_sex,
      strength_profile_age_years = p_age_years,
      strength_profile_bodyweight_lbs = CASE
        WHEN p_bodyweight_lbs IS NULL THEN NULL
        ELSE ROUND(p_bodyweight_lbs, 1)
      END
  WHERE id = v_user_id
  RETURNING jsonb_build_object(
    'id', id,
    'strength_profile_sex', strength_profile_sex,
    'strength_profile_age_years', strength_profile_age_years,
    'strength_profile_bodyweight_lbs', strength_profile_bodyweight_lbs
  ) INTO v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Profile not found.';
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_analytics_data(
  p_exercise_id int  DEFAULT NULL,
  p_date_from   date DEFAULT CURRENT_DATE - INTERVAL '6 months',
  p_date_to     date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(

    'e1rm_trend', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'date',          w.scheduled_date,
            'exercise_id',   ws.exercise_id,
            'exercise_name', e.name,
            'weight',        ws.weight_lbs,
            'reps',          ws.reps_actual,
            'e1rm',          ROUND(private.estimate_one_rep_max(ws.weight_lbs, ws.reps_actual), 1)
          )
          ORDER BY w.scheduled_date
        ),
        '[]'::jsonb
      )
      FROM   public.workout_sets ws
      JOIN   public.workouts    w  ON w.id = ws.workout_id
      JOIN   public.exercises   e  ON e.id = ws.exercise_id
      WHERE  ws.user_id = auth.uid()
        AND  ws.is_amrap = true
        AND  ws.reps_actual IS NOT NULL
        AND  ws.reps_actual > 0
        AND  w.scheduled_date BETWEEN p_date_from AND p_date_to
        AND  (p_exercise_id IS NULL OR ws.exercise_id = p_exercise_id)
    ),

    'volume_trend', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'week_start',    week_start,
            'exercise_id',   exercise_id,
            'exercise_name', exercise_name,
            'total_volume',  total_volume,
            'total_sets',    total_sets
          )
          ORDER BY week_start
        ),
        '[]'::jsonb
      )
      FROM (
        SELECT
          date_trunc('week', w.scheduled_date)::date AS week_start,
          ws.exercise_id,
          e.name AS exercise_name,
          SUM(ws.weight_lbs * COALESCE(ws.reps_actual, ws.reps_prescribed)) AS total_volume,
          COUNT(*) AS total_sets
        FROM   public.workout_sets ws
        JOIN   public.workouts    w ON w.id = ws.workout_id
        JOIN   public.exercises   e ON e.id = ws.exercise_id
        WHERE  ws.user_id = auth.uid()
          AND  w.scheduled_date BETWEEN p_date_from AND p_date_to
          AND  ws.reps_actual IS NOT NULL
          AND  (p_exercise_id IS NULL OR ws.exercise_id = p_exercise_id)
        GROUP  BY week_start, ws.exercise_id, e.name
      ) vol
    ),

    'pr_history', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'date',          scheduled_date,
            'exercise_id',   exercise_id,
            'exercise_name', exercise_name,
            'weight',        weight_lbs,
            'reps',          reps_actual,
            'e1rm',          e1rm
          )
          ORDER BY scheduled_date
        ),
        '[]'::jsonb
      )
      FROM (
        SELECT DISTINCT ON (ws.exercise_id, w.scheduled_date)
          w.scheduled_date,
          ws.exercise_id,
          e.name AS exercise_name,
          ws.weight_lbs,
          ws.reps_actual,
          ROUND(private.estimate_one_rep_max(ws.weight_lbs, ws.reps_actual), 1) AS e1rm
        FROM   public.workout_sets ws
        JOIN   public.workouts    w ON w.id = ws.workout_id
        JOIN   public.exercises   e ON e.id = ws.exercise_id
        WHERE  ws.user_id = auth.uid()
          AND  ws.is_amrap = true
          AND  ws.reps_actual IS NOT NULL
          AND  w.scheduled_date BETWEEN p_date_from AND p_date_to
          AND  (p_exercise_id IS NULL OR ws.exercise_id = p_exercise_id)
        ORDER  BY ws.exercise_id, w.scheduled_date, e1rm DESC
      ) prs
    ),

    'consistency', (
      SELECT jsonb_build_object(
        'total_sessions', COUNT(DISTINCT w.id),
        'weeks_active',   COUNT(DISTINCT date_trunc('week', w.scheduled_date)),
        'first_session',  MIN(w.scheduled_date),
        'last_session',   MAX(w.scheduled_date)
      )
      FROM public.workouts w
      WHERE w.user_id = auth.uid()
        AND w.completed_at IS NOT NULL
        AND w.scheduled_date BETWEEN p_date_from AND p_date_to
    ),

    'muscle_balance', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'movement_pattern', movement_pattern,
            'total_volume',     total_volume,
            'volume_pct',       ROUND(
                                  (total_volume * 100.0 /
                                   NULLIF(SUM(total_volume) OVER (), 0)
                                  )::numeric, 1
                                )
          )
        ),
        '[]'::jsonb
      )
      FROM (
        SELECT
          e.movement_pattern,
          SUM(ws.weight_lbs * COALESCE(ws.reps_actual, ws.reps_prescribed)) AS total_volume
        FROM   public.workout_sets ws
        JOIN   public.exercises   e ON e.id = ws.exercise_id
        JOIN   public.workouts    w ON w.id = ws.workout_id
        WHERE  ws.user_id = auth.uid()
          AND  w.scheduled_date BETWEEN p_date_from AND p_date_to
          AND  ws.reps_actual IS NOT NULL
        GROUP  BY e.movement_pattern
      ) balance
    ),

    'tm_progression', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'effective_date', tm.effective_date,
            'exercise_id',   tm.exercise_id,
            'exercise_name', e.name,
            'weight_lbs',    tm.weight_lbs
          )
          ORDER BY tm.effective_date
        ),
        '[]'::jsonb
      )
      FROM   public.training_maxes tm
      JOIN   public.exercises e ON e.id = tm.exercise_id
      WHERE  tm.user_id = auth.uid()
        AND  tm.effective_date BETWEEN p_date_from AND p_date_to
        AND  (p_exercise_id IS NULL OR tm.exercise_id = p_exercise_id)
    ),

    'stall_detection', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'exercise_id',    exercise_id,
            'exercise_name',  exercise_name,
            'last_pr_date',   last_pr_date,
            'weeks_since_pr', EXTRACT(days FROM (CURRENT_DATE - last_pr_date))::int / 7
          )
        ),
        '[]'::jsonb
      )
      FROM (
        SELECT
          ws.exercise_id,
          e.name AS exercise_name,
          MAX(w.scheduled_date) AS last_pr_date
        FROM   public.workout_sets ws
        JOIN   public.workouts    w ON w.id = ws.workout_id
        JOIN   public.exercises   e ON e.id = ws.exercise_id
        WHERE  ws.user_id = auth.uid()
          AND  ws.is_amrap = true
          AND  ws.reps_actual IS NOT NULL
          AND  e.is_main_lift = true
        GROUP  BY ws.exercise_id, e.name
        HAVING MAX(w.scheduled_date) < CURRENT_DATE - INTERVAL '4 weeks'
      ) stalls
    ),

    'strength_profile', private.get_strength_profile(p_date_from, p_date_to)

  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_analytics_data(int, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_strength_profile(text, int, numeric) TO authenticated;

COMMIT;