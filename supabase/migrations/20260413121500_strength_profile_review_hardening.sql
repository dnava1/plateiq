BEGIN;

UPDATE public.exercises
SET strength_lift_slug = CASE lower(name)
  WHEN 'squat' THEN 'back_squat'
  WHEN 'back squat' THEN 'back_squat'
  WHEN 'front squat' THEN 'front_squat'
  WHEN 'deadlift' THEN 'deadlift'
  WHEN 'sumo deadlift' THEN 'sumo_deadlift'
  WHEN 'power clean' THEN 'power_clean'
  WHEN 'bench press' THEN 'bench_press'
  WHEN 'incline bench press' THEN 'incline_bench_press'
  WHEN 'dip' THEN 'dip'
  WHEN 'overhead press' THEN 'overhead_press'
  WHEN 'push press' THEN 'push_press'
  WHEN 'snatch press' THEN 'snatch_press'
  WHEN 'chin-up' THEN 'chin_up'
  WHEN 'pull-up' THEN 'pull_up'
  WHEN 'barbell row' THEN 'pendlay_row'
  WHEN 'pendlay row' THEN 'pendlay_row'
  ELSE strength_lift_slug
END
WHERE strength_lift_slug IS NULL
  AND lower(name) IN (
    'squat',
    'back squat',
    'front squat',
    'deadlift',
    'sumo deadlift',
    'power clean',
    'bench press',
    'incline bench press',
    'dip',
    'overhead press',
    'push press',
    'snatch press',
    'chin-up',
    'pull-up',
    'barbell row',
    'pendlay row'
  );

CREATE OR REPLACE FUNCTION public.merge_guest_account(
  p_source_user_id uuid,
  p_target_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_source_profile public.profiles%ROWTYPE;
  v_target_profile public.profiles%ROWTYPE;
  v_target_has_active_program boolean;
  v_exercises_renamed int := 0;
  v_exercises_moved int := 0;
  v_training_maxes_moved int := 0;
  v_programs_deactivated int := 0;
  v_programs_moved int := 0;
  v_cycles_moved int := 0;
  v_workouts_moved int := 0;
  v_workout_sets_moved int := 0;
BEGIN
  IF p_source_user_id IS NULL OR p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'source and target user ids are required';
  END IF;

  IF p_source_user_id = p_target_user_id THEN
    RAISE EXCEPTION 'source and target user ids must differ';
  END IF;

  SELECT *
  INTO v_source_profile
  FROM public.profiles
  WHERE id = p_source_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'source profile not found';
  END IF;

  SELECT *
  INTO v_target_profile
  FROM public.profiles
  WHERE id = p_target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'target profile not found';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.training_programs
    WHERE user_id = p_target_user_id
      AND is_active = true
  )
  INTO v_target_has_active_program;

  UPDATE public.profiles
  SET preferred_unit = CASE
        WHEN public.profiles.preferred_unit = 'lbs' AND v_source_profile.preferred_unit = 'kg'
          THEN 'kg'
        ELSE public.profiles.preferred_unit
      END,
      avatar_url = COALESCE(public.profiles.avatar_url, v_source_profile.avatar_url),
      strength_profile_sex = COALESCE(public.profiles.strength_profile_sex, v_source_profile.strength_profile_sex),
      strength_profile_age_years = COALESCE(public.profiles.strength_profile_age_years, v_source_profile.strength_profile_age_years),
      strength_profile_bodyweight_lbs = COALESCE(public.profiles.strength_profile_bodyweight_lbs, v_source_profile.strength_profile_bodyweight_lbs),
      updated_at = now()
  WHERE id = p_target_user_id;

  UPDATE public.exercises source_exercise
  SET name = private.resolve_merged_exercise_name(p_target_user_id, source_exercise.name)
  WHERE source_exercise.created_by_user_id = p_source_user_id
    AND EXISTS (
      SELECT 1
      FROM public.exercises target_exercise
      WHERE target_exercise.created_by_user_id = p_target_user_id
        AND target_exercise.name = source_exercise.name
    );
  GET DIAGNOSTICS v_exercises_renamed = ROW_COUNT;

  UPDATE public.exercises
  SET created_by_user_id = p_target_user_id
  WHERE created_by_user_id = p_source_user_id;
  GET DIAGNOSTICS v_exercises_moved = ROW_COUNT;

  UPDATE public.training_maxes
  SET user_id = p_target_user_id
  WHERE user_id = p_source_user_id;
  GET DIAGNOSTICS v_training_maxes_moved = ROW_COUNT;

  IF v_target_has_active_program THEN
    UPDATE public.training_programs
    SET is_active = false,
        updated_at = now()
    WHERE user_id = p_source_user_id
      AND is_active = true;
    GET DIAGNOSTICS v_programs_deactivated = ROW_COUNT;
  END IF;

  UPDATE public.training_programs
  SET user_id = p_target_user_id,
      updated_at = now()
  WHERE user_id = p_source_user_id;
  GET DIAGNOSTICS v_programs_moved = ROW_COUNT;

  UPDATE public.cycles
  SET user_id = p_target_user_id
  WHERE user_id = p_source_user_id;
  GET DIAGNOSTICS v_cycles_moved = ROW_COUNT;

  UPDATE public.workouts
  SET user_id = p_target_user_id
  WHERE user_id = p_source_user_id;
  GET DIAGNOSTICS v_workouts_moved = ROW_COUNT;

  UPDATE public.workout_sets
  SET user_id = p_target_user_id
  WHERE user_id = p_source_user_id;
  GET DIAGNOSTICS v_workout_sets_moved = ROW_COUNT;

  RETURN jsonb_build_object(
    'target_has_active_program', v_target_has_active_program,
    'exercises_renamed', v_exercises_renamed,
    'exercises_moved', v_exercises_moved,
    'training_maxes_moved', v_training_maxes_moved,
    'programs_deactivated', v_programs_deactivated,
    'programs_moved', v_programs_moved,
    'cycles_moved', v_cycles_moved,
    'workouts_moved', v_workouts_moved,
    'workout_sets_moved', v_workout_sets_moved
  );
END;
$$;

REVOKE ALL ON FUNCTION public.merge_guest_account(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.merge_guest_account(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.merge_guest_account(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.merge_guest_account(uuid, uuid) TO service_role;

COMMIT;