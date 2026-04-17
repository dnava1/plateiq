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
		start_date
	)
	VALUES (
		v_program.id,
		v_user_id,
		1,
		v_program.start_date
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
	v_has_workout_history boolean;
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

	PERFORM 1
	FROM public.cycles
	WHERE program_id = p_program_id
		AND user_id = v_user_id
	FOR UPDATE;

	SELECT EXISTS (
		SELECT 1
		FROM public.workouts AS w
		INNER JOIN public.cycles AS c
			ON c.id = w.cycle_id
		WHERE c.program_id = p_program_id
			AND c.user_id = v_user_id
	)
	INTO v_has_workout_history;

	IF v_has_workout_history THEN
		RAISE EXCEPTION 'This program already has workout history. Reopen it to save a new revision instead.';
	END IF;

	UPDATE public.training_programs
	SET name = btrim(p_name),
			template_key = btrim(p_template_key),
			config = p_config
	WHERE id = p_program_id
		AND user_id = v_user_id
	RETURNING * INTO v_program;

	RETURN to_jsonb(v_program);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_active_program(
	p_program_id int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
	v_user_id uuid := auth.uid();
	v_program public.training_programs%ROWTYPE;
BEGIN
	IF v_user_id IS NULL THEN
		RAISE EXCEPTION 'You must be signed in to manage programs.';
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

	UPDATE public.training_programs
	SET is_active = CASE WHEN id = p_program_id THEN true ELSE false END
	WHERE user_id = v_user_id
		AND (is_active = true OR id = p_program_id);

	SELECT *
	INTO v_program
	FROM public.training_programs
	WHERE id = p_program_id;

	RETURN to_jsonb(v_program);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_inactive_program(
	p_program_id int
)
RETURNS int
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
	v_user_id uuid := auth.uid();
	v_deleted_program_id int;
BEGIN
	IF v_user_id IS NULL THEN
		RAISE EXCEPTION 'You must be signed in to manage programs.';
	END IF;

	DELETE FROM public.training_programs
	WHERE id = p_program_id
		AND user_id = v_user_id
		AND is_active = false
	RETURNING id INTO v_deleted_program_id;

	IF v_deleted_program_id IS NULL THEN
		RAISE EXCEPTION 'This program could not be deleted. It may already be active or unavailable.';
	END IF;

	RETURN v_deleted_program_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_program_with_cycle(text, text, jsonb, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_program_definition(int, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_active_program(int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_inactive_program(int) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_program_with_cycle(text, text, jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_program_definition(int, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_active_program(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_inactive_program(int) TO authenticated;
