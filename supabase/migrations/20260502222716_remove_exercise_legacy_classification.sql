BEGIN;

CREATE OR REPLACE FUNCTION public.update_exercise_definition(
  p_exercise_id int,
  p_name text,
  p_movement_pattern text,
  p_analytics_track text,
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
      movement_pattern = btrim(p_movement_pattern),
      analytics_track = btrim(p_analytics_track),
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
BEGIN
  RETURN public.update_exercise_definition(
    p_exercise_id,
    p_name,
    p_movement_pattern,
    p_analytics_track,
    p_strength_lift_slug
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_exercise_definition(int, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_exercise_definition(int, text, text, text, text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_exercise_definition(int, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_exercise_definition(int, text, text, text, text, boolean, text) TO authenticated;

ALTER TABLE public.exercises
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS is_main_lift;

COMMIT;
