BEGIN;

CREATE OR REPLACE FUNCTION private.normalize_strength_lift_lookup_key(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_name IS NULL THEN NULL
    ELSE NULLIF(
      regexp_replace(
        regexp_replace(lower(btrim(p_name)), '[^a-z0-9]+', '_', 'g'),
        '^_+|_+$',
        '',
        'g'
      ),
      ''
    )
  END
$$;

CREATE OR REPLACE FUNCTION private.resolve_strength_lift_slug(p_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_normalized text;
  v_lookup_key text;
  v_lookup_keys text[];
BEGIN
  v_normalized := private.normalize_strength_lift_lookup_key(p_name);

  IF v_normalized IS NULL THEN
    RETURN NULL;
  END IF;

  v_lookup_keys := ARRAY[v_normalized];

  IF v_normalized LIKE '%_press' THEN
    v_lookup_keys := v_lookup_keys || regexp_replace(v_normalized, '_press$', '');
  END IF;

  FOREACH v_lookup_key IN ARRAY v_lookup_keys LOOP
    CASE v_lookup_key
      WHEN 'squat', 'back_squat' THEN
        RETURN 'back_squat';
      WHEN 'front_squat' THEN
        RETURN 'front_squat';
      WHEN 'deadlift' THEN
        RETURN 'deadlift';
      WHEN 'sumo_deadlift' THEN
        RETURN 'sumo_deadlift';
      WHEN 'power_clean' THEN
        RETURN 'power_clean';
      WHEN 'bench', 'bench_press' THEN
        RETURN 'bench_press';
      WHEN 'incline_bench', 'incline_bench_press' THEN
        RETURN 'incline_bench_press';
      WHEN 'dip' THEN
        RETURN 'dip';
      WHEN 'ohp', 'overhead_press' THEN
        RETURN 'overhead_press';
      WHEN 'push_press' THEN
        RETURN 'push_press';
      WHEN 'snatch_press' THEN
        RETURN 'snatch_press';
      WHEN 'chin_up' THEN
        RETURN 'chin_up';
      WHEN 'pull_up' THEN
        RETURN 'pull_up';
      WHEN 'barbell_row', 'pendlay_row' THEN
        RETURN 'pendlay_row';
      ELSE
        CONTINUE;
    END CASE;
  END LOOP;

  RETURN NULL;
END;
$$;

UPDATE public.exercises
SET strength_lift_slug = private.resolve_strength_lift_slug(name)
WHERE strength_lift_slug IS NULL
  AND private.resolve_strength_lift_slug(name) IS NOT NULL;

COMMIT;