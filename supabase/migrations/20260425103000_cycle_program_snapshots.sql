BEGIN;

ALTER TABLE public.cycles
  ADD COLUMN IF NOT EXISTS template_key text,
  ADD COLUMN IF NOT EXISTS config jsonb;

UPDATE public.cycles AS c
SET
  template_key = p.template_key,
  config = p.config
FROM public.training_programs AS p
WHERE p.id = c.program_id
  AND (c.template_key IS NULL OR c.config IS NULL);

ALTER TABLE public.cycles
  ALTER COLUMN template_key SET NOT NULL;

CREATE OR REPLACE FUNCTION public.create_program_with_cycle(
  p_name text,
  p_template_key text,
  p_config jsonb DEFAULT NULL,
  p_activate_on_save boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_program public.training_programs%ROWTYPE;
  v_cycle public.cycles%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to manage programs.';
  END IF;

  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'Program name is required.';
  END IF;

  IF p_template_key IS NULL OR btrim(p_template_key) = '' THEN
    RAISE EXCEPTION 'Program template is required.';
  END IF;

  INSERT INTO public.training_programs (
    user_id,
    name,
    template_key,
    config,
    start_date,
    is_active
  )
  VALUES (
    v_user_id,
    btrim(p_name),
    btrim(p_template_key),
    p_config,
    CURRENT_DATE,
    false
  )
  RETURNING * INTO v_program;

  INSERT INTO public.cycles (
    program_id,
    user_id,
    cycle_number,
    start_date,
    template_key,
    config
  )
  VALUES (
    v_program.id,
    v_user_id,
    1,
    v_program.start_date,
    v_program.template_key,
    v_program.config
  )
  RETURNING * INTO v_cycle;

  IF p_activate_on_save THEN
    UPDATE public.training_programs
    SET is_active = CASE WHEN id = v_program.id THEN true ELSE false END
    WHERE user_id = v_user_id
      AND (is_active = true OR id = v_program.id);

    SELECT *
    INTO v_program
    FROM public.training_programs
    WHERE id = v_program.id;
  END IF;

  RETURN jsonb_build_object(
    'program', to_jsonb(v_program),
    'cycle', to_jsonb(v_cycle)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_program_definition(
  p_program_id int,
  p_name text,
  p_template_key text,
  p_config jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_program public.training_programs%ROWTYPE;
  v_active_cycle_id int;
  v_active_cycle_has_workouts boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to manage programs.';
  END IF;

  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'Program name is required.';
  END IF;

  IF p_template_key IS NULL OR btrim(p_template_key) = '' THEN
    RAISE EXCEPTION 'Program template is required.';
  END IF;

  SELECT *
  INTO v_program
  FROM public.training_programs
  WHERE id = p_program_id
    AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Program not found.';
  END IF;

  SELECT c.id
  INTO v_active_cycle_id
  FROM public.cycles AS c
  WHERE c.program_id = p_program_id
    AND c.user_id = v_user_id
    AND c.completed_at IS NULL
  ORDER BY c.cycle_number DESC
  LIMIT 1
  FOR UPDATE;

  IF v_active_cycle_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.workouts AS w
      WHERE w.cycle_id = v_active_cycle_id
    )
    INTO v_active_cycle_has_workouts;
  END IF;

  UPDATE public.training_programs
  SET name = btrim(p_name),
      template_key = btrim(p_template_key),
      config = p_config
  WHERE id = p_program_id
    AND user_id = v_user_id
  RETURNING * INTO v_program;

  IF v_active_cycle_id IS NOT NULL AND NOT v_active_cycle_has_workouts THEN
    UPDATE public.cycles
    SET template_key = v_program.template_key,
        config = v_program.config
    WHERE id = v_active_cycle_id;
  END IF;

  RETURN to_jsonb(v_program);
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_cycle(
  p_cycle_id int,
  p_progression jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_program_id int;
  v_user_id uuid;
  v_cycle_number int;
  v_new_cycle_id int;
  v_result jsonb;
  v_next_template_key text;
  v_next_config jsonb;
BEGIN
  SELECT
    c.program_id,
    c.user_id,
    c.cycle_number,
    p.template_key,
    p.config
  INTO
    v_program_id,
    v_user_id,
    v_cycle_number,
    v_next_template_key,
    v_next_config
  FROM public.cycles AS c
  JOIN public.training_programs AS p
    ON p.id = c.program_id
  WHERE c.id = p_cycle_id
    AND c.user_id = auth.uid()
    AND c.completed_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cycle not found, not owned, or already completed';
  END IF;

  UPDATE public.cycles
  SET completed_at = now(),
      auto_progression_applied = true
  WHERE id = p_cycle_id;

  IF p_progression IS NOT NULL THEN
    INSERT INTO public.training_maxes (
      user_id,
      exercise_id,
      weight_lbs,
      tm_percentage,
      effective_date
    )
    SELECT
      v_user_id,
      (item ->> 'exercise_id')::int,
      tm.weight_lbs + (item ->> 'increment_lbs')::numeric,
      tm.tm_percentage,
      CURRENT_DATE
    FROM jsonb_array_elements(p_progression) AS item
    JOIN LATERAL (
      SELECT t.weight_lbs, t.tm_percentage
      FROM public.training_maxes AS t
      WHERE t.user_id = v_user_id
        AND t.exercise_id = (item ->> 'exercise_id')::int
      ORDER BY t.effective_date DESC
      LIMIT 1
    ) AS tm ON true;
  END IF;

  INSERT INTO public.cycles (
    program_id,
    user_id,
    cycle_number,
    start_date,
    template_key,
    config
  )
  VALUES (
    v_program_id,
    v_user_id,
    v_cycle_number + 1,
    CURRENT_DATE,
    v_next_template_key,
    v_next_config
  )
  RETURNING id INTO v_new_cycle_id;

  v_result := jsonb_build_object(
    'completed_cycle_id', p_cycle_id,
    'new_cycle_id', v_new_cycle_id,
    'new_cycle_number', v_cycle_number + 1
  );

  RETURN v_result;
END;
$$;

COMMIT;
