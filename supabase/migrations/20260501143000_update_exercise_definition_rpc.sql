INSERT INTO public.exercises (
  name,
  category,
  movement_pattern,
  is_main_lift,
  progression_increment_lbs,
  created_by_user_id,
  strength_lift_slug,
  analytics_track
)
VALUES
  ('Board Press', 'accessory', 'horizontal_push', false, NULL, NULL, NULL, 'standard'),
  ('Box Squat', 'accessory', 'squat', false, NULL, NULL, NULL, 'standard'),
  ('Good Morning', 'accessory', 'hinge', false, NULL, NULL, NULL, 'standard'),
  ('Lunge', 'accessory', 'lunge', false, NULL, NULL, NULL, 'standard'),
  ('Tricep Extension', 'accessory', 'horizontal_push', false, NULL, NULL, NULL, 'standard')
ON CONFLICT (name, created_by_user_id) DO UPDATE
SET category = EXCLUDED.category,
    movement_pattern = EXCLUDED.movement_pattern,
    analytics_track = EXCLUDED.analytics_track;

CREATE OR REPLACE FUNCTION private.rewrite_custom_program_exercise_blocks(
  p_blocks jsonb,
  p_exercise_id int,
  p_previous_name text,
  p_next_name text
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_previous_name text := lower(btrim(COALESCE(p_previous_name, '')));
  v_result jsonb := '[]'::jsonb;
  v_block jsonb;
  v_matches boolean;
BEGIN
  IF p_blocks IS NULL OR jsonb_typeof(p_blocks) <> 'array' THEN
    RETURN p_blocks;
  END IF;

  FOR v_block IN
    SELECT value
    FROM jsonb_array_elements(p_blocks)
  LOOP
    v_matches :=
      jsonb_typeof(v_block) = 'object'
      AND (
        (
          NULLIF(v_block ->> 'exercise_id', '') IS NOT NULL
          AND (v_block ->> 'exercise_id') ~ '^[0-9]+$'
          AND (v_block ->> 'exercise_id')::int = p_exercise_id
        )
        OR (
          NULLIF(v_block ->> 'exercise_id', '') IS NULL
          AND lower(btrim(COALESCE(v_block ->> 'exercise_key', ''))) = v_previous_name
        )
      );

    IF v_matches THEN
      v_block := jsonb_set(v_block, '{exercise_id}', to_jsonb(p_exercise_id), true);
      v_block := jsonb_set(v_block, '{exercise_key}', to_jsonb(p_next_name), true);
    END IF;

    v_result := v_result || jsonb_build_array(v_block);
  END LOOP;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION private.rewrite_custom_program_exercise_days(
  p_days jsonb,
  p_exercise_id int,
  p_previous_name text,
  p_next_name text
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_result jsonb := '[]'::jsonb;
  v_day jsonb;
BEGIN
  IF p_days IS NULL OR jsonb_typeof(p_days) <> 'array' THEN
    RETURN p_days;
  END IF;

  FOR v_day IN
    SELECT value
    FROM jsonb_array_elements(p_days)
  LOOP
    IF jsonb_typeof(v_day) = 'object' AND v_day ? 'exercise_blocks' THEN
      v_day := jsonb_set(
        v_day,
        '{exercise_blocks}',
        private.rewrite_custom_program_exercise_blocks(
          v_day -> 'exercise_blocks',
          p_exercise_id,
          p_previous_name,
          p_next_name
        ),
        true
      );
    END IF;

    v_result := v_result || jsonb_build_array(v_day);
  END LOOP;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION private.rewrite_custom_program_week_schemes(
  p_week_schemes jsonb,
  p_exercise_id int,
  p_previous_name text,
  p_next_name text
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_result jsonb := '{}'::jsonb;
  v_week_key text;
  v_scheme jsonb;
BEGIN
  IF p_week_schemes IS NULL OR jsonb_typeof(p_week_schemes) <> 'object' THEN
    RETURN p_week_schemes;
  END IF;

  FOR v_week_key, v_scheme IN
    SELECT key, value
    FROM jsonb_each(p_week_schemes)
  LOOP
    IF jsonb_typeof(v_scheme) = 'object' AND v_scheme ? 'days' THEN
      v_scheme := jsonb_set(
        v_scheme,
        '{days}',
        private.rewrite_custom_program_exercise_days(
          v_scheme -> 'days',
          p_exercise_id,
          p_previous_name,
          p_next_name
        ),
        true
      );
    END IF;

    v_result := v_result || jsonb_build_object(v_week_key, v_scheme);
  END LOOP;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION private.rewrite_custom_program_exercise_references(
  p_config jsonb,
  p_exercise_id int,
  p_previous_name text,
  p_next_name text
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_config jsonb := p_config;
BEGIN
  IF p_config IS NULL OR jsonb_typeof(p_config) <> 'object' THEN
    RETURN p_config;
  END IF;

  IF COALESCE(p_config ->> 'type', '') <> 'custom' THEN
    RETURN p_config;
  END IF;

  IF v_config ? 'days' THEN
    v_config := jsonb_set(
      v_config,
      '{days}',
      private.rewrite_custom_program_exercise_days(v_config -> 'days', p_exercise_id, p_previous_name, p_next_name),
      true
    );
  END IF;

  IF v_config ? 'week_schemes' THEN
    v_config := jsonb_set(
      v_config,
      '{week_schemes}',
      private.rewrite_custom_program_week_schemes(v_config -> 'week_schemes', p_exercise_id, p_previous_name, p_next_name),
      true
    );
  END IF;

  RETURN v_config;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_exercise_definition(
  p_exercise_id int,
  p_name text,
  p_category text,
  p_movement_pattern text,
  p_analytics_track text,
  p_is_main_lift boolean,
  p_strength_lift_slug text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_previous_name text;
  v_next_name text := btrim(p_name);
  v_exercise public.exercises%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to update an exercise.';
  END IF;

  IF p_exercise_id IS NULL THEN
    RAISE EXCEPTION 'Exercise id is required.';
  END IF;

  IF v_next_name IS NULL OR v_next_name = '' THEN
    RAISE EXCEPTION 'Exercise name is required.';
  END IF;

  SELECT *
  INTO v_exercise
  FROM public.exercises
  WHERE id = p_exercise_id
    AND created_by_user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exercise not found.';
  END IF;

  v_previous_name := v_exercise.name;

  UPDATE public.exercises
  SET name = v_next_name,
      category = btrim(p_category),
      movement_pattern = btrim(p_movement_pattern),
      analytics_track = btrim(p_analytics_track),
      is_main_lift = p_is_main_lift,
      strength_lift_slug = NULLIF(btrim(COALESCE(p_strength_lift_slug, '')), '')
  WHERE id = p_exercise_id
    AND created_by_user_id = v_user_id
  RETURNING * INTO v_exercise;

  IF v_previous_name IS DISTINCT FROM v_next_name THEN
    UPDATE public.training_programs
    SET config = private.rewrite_custom_program_exercise_references(config, p_exercise_id, v_previous_name, v_next_name)
    WHERE user_id = v_user_id
      AND COALESCE(config ->> 'type', '') = 'custom'
      AND private.rewrite_custom_program_exercise_references(config, p_exercise_id, v_previous_name, v_next_name) IS DISTINCT FROM config;

    UPDATE public.cycles
    SET config = private.rewrite_custom_program_exercise_references(config, p_exercise_id, v_previous_name, v_next_name)
    WHERE user_id = v_user_id
      AND COALESCE(config ->> 'type', '') = 'custom'
      AND private.rewrite_custom_program_exercise_references(config, p_exercise_id, v_previous_name, v_next_name) IS DISTINCT FROM config;
  END IF;

  RETURN to_jsonb(v_exercise);
END;
$$;

REVOKE ALL ON FUNCTION public.update_exercise_definition(int, text, text, text, text, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.rewrite_custom_program_exercise_blocks(jsonb, int, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.rewrite_custom_program_exercise_days(jsonb, int, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.rewrite_custom_program_week_schemes(jsonb, int, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.rewrite_custom_program_exercise_references(jsonb, int, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.update_exercise_definition(int, text, text, text, text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.rewrite_custom_program_exercise_blocks(jsonb, int, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.rewrite_custom_program_exercise_days(jsonb, int, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.rewrite_custom_program_week_schemes(jsonb, int, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.rewrite_custom_program_exercise_references(jsonb, int, text, text) TO authenticated;
