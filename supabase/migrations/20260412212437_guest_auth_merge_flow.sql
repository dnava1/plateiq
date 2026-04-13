BEGIN;

CREATE TABLE IF NOT EXISTS public.account_merge_intents (
	id             bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	source_user_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
	target_user_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
	token_hash     text        NOT NULL UNIQUE,
	expires_at     timestamptz NOT NULL DEFAULT now() + INTERVAL '30 minutes',
	consumed_at    timestamptz,
	created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.account_merge_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select own merge intents" ON public.account_merge_intents;
CREATE POLICY "select own merge intents"
	ON public.account_merge_intents FOR SELECT
	USING (source_user_id = auth.uid());

DROP POLICY IF EXISTS "insert own merge intents" ON public.account_merge_intents;
CREATE POLICY "insert own merge intents"
	ON public.account_merge_intents FOR INSERT
	WITH CHECK (source_user_id = auth.uid());

DROP POLICY IF EXISTS "delete own merge intents" ON public.account_merge_intents;
CREATE POLICY "delete own merge intents"
	ON public.account_merge_intents FOR DELETE
	USING (source_user_id = auth.uid());

CREATE UNIQUE INDEX IF NOT EXISTS idx_account_merge_intents_active_source
	ON public.account_merge_intents (source_user_id)
	WHERE consumed_at IS NULL;

CREATE OR REPLACE FUNCTION private.resolve_merged_exercise_name(
	p_target_user_id uuid,
	p_base_name text
)
RETURNS text
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
	v_candidate text := p_base_name || ' (merged)';
	v_suffix int := 2;
BEGIN
	WHILE EXISTS (
		SELECT 1
		FROM public.exercises exercise_candidate
		WHERE exercise_candidate.created_by_user_id = p_target_user_id
			AND exercise_candidate.name = v_candidate
	) LOOP
		v_candidate := p_base_name || ' (merged ' || v_suffix || ')';
		v_suffix := v_suffix + 1;
	END LOOP;

	RETURN v_candidate;
END;
$$;

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
