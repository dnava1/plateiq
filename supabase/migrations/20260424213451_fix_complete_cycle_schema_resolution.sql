BEGIN;

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
BEGIN
  SELECT c.program_id, c.user_id, c.cycle_number
  INTO v_program_id, v_user_id, v_cycle_number
  FROM public.cycles AS c
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
    start_date
  )
  VALUES (
    v_program_id,
    v_user_id,
    v_cycle_number + 1,
    CURRENT_DATE
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
