BEGIN;

CREATE TABLE IF NOT EXISTS private.account_export_hourly_usage (
	user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
	usage_hour timestamptz NOT NULL,
	request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	PRIMARY KEY (user_id, usage_hour)
);

CREATE TABLE IF NOT EXISTS private.account_export_reservations (
	id uuid NOT NULL,
	user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
	reservation_hour timestamptz NOT NULL,
	expires_at timestamptz NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS account_export_reservations_user_hour_idx
	ON private.account_export_reservations (user_id, reservation_hour, expires_at);

ALTER TABLE private.account_export_hourly_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.account_export_reservations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE private.account_export_hourly_usage FROM PUBLIC;
REVOKE ALL ON TABLE private.account_export_hourly_usage FROM anon;
REVOKE ALL ON TABLE private.account_export_hourly_usage FROM authenticated;
REVOKE ALL ON TABLE private.account_export_reservations FROM PUBLIC;
REVOKE ALL ON TABLE private.account_export_reservations FROM anon;
REVOKE ALL ON TABLE private.account_export_reservations FROM authenticated;

CREATE OR REPLACE FUNCTION public.export_my_training_graph_v1(
	p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
	v_user_id uuid := p_user_id;
	v_snapshot_at timestamptz := timezone('utc', now());
	v_result jsonb;
BEGIN
	IF v_user_id IS NULL THEN
		RAISE EXCEPTION 'User id is required.';
	END IF;

	WITH program_rows AS (
		SELECT coalesce(jsonb_agg(to_jsonb(program_row) ORDER BY program_row.id), '[]'::jsonb) AS items
		FROM (
			SELECT
				program.id,
				program.name,
				program.template_key,
				program.start_date,
				program.is_active,
				program.config,
				program.created_at,
				program.updated_at
			FROM public.training_programs AS program
			WHERE program.user_id = v_user_id
			ORDER BY program.id
		) AS program_row
	), cycle_rows AS (
		SELECT coalesce(jsonb_agg(to_jsonb(cycle_row) ORDER BY cycle_row.program_id, cycle_row.cycle_number, cycle_row.id), '[]'::jsonb) AS items
		FROM (
			SELECT
				cycle.id,
				cycle.program_id,
				cycle.cycle_number,
				cycle.template_key,
				cycle.start_date,
				cycle.completed_at,
				cycle.auto_progression_applied,
				cycle.config,
				cycle.created_at
			FROM public.cycles AS cycle
			WHERE cycle.user_id = v_user_id
			ORDER BY cycle.program_id, cycle.cycle_number, cycle.id
		) AS cycle_row
	), workout_rows AS (
		SELECT coalesce(jsonb_agg(to_jsonb(workout_row) ORDER BY workout_row.cycle_id, workout_row.scheduled_date, workout_row.week_number, workout_row.id), '[]'::jsonb) AS items
		FROM (
			SELECT
				workout.id,
				workout.cycle_id,
				workout.primary_exercise_id,
				workout.week_number,
				workout.day_label,
				workout.scheduled_date,
				workout.started_at,
				workout.completed_at,
				workout.notes,
				workout.created_at
			FROM public.workouts AS workout
			WHERE workout.user_id = v_user_id
			ORDER BY workout.cycle_id, workout.scheduled_date, workout.week_number, workout.id
		) AS workout_row
	), workout_set_rows AS (
		SELECT coalesce(jsonb_agg(to_jsonb(workout_set_row) ORDER BY workout_set_row.workout_id, workout_set_row.set_order, workout_set_row.id), '[]'::jsonb) AS items
		FROM (
			SELECT
				workout_set.id,
				workout_set.workout_id,
				workout_set.exercise_id,
				workout_set.set_order,
				workout_set.set_type,
				workout_set.weight_lbs,
				workout_set.reps_prescribed,
				workout_set.reps_prescribed_max,
				workout_set.reps_actual,
				workout_set.is_amrap,
				workout_set.rpe,
				workout_set.intensity_type,
				workout_set.prescribed_weight_lbs,
				workout_set.prescribed_intensity,
				workout_set.prescription_base_weight_lbs,
				workout_set.logged_at,
				workout_set.updated_at
			FROM public.workout_sets AS workout_set
			WHERE workout_set.user_id = v_user_id
			ORDER BY workout_set.workout_id, workout_set.set_order, workout_set.id
		) AS workout_set_row
	), exercise_ids AS (
		SELECT DISTINCT exercise_reference.exercise_id
		FROM (
			SELECT workout.primary_exercise_id AS exercise_id
			FROM public.workouts AS workout
			WHERE workout.user_id = v_user_id
			UNION ALL
			SELECT workout_set.exercise_id
			FROM public.workout_sets AS workout_set
			WHERE workout_set.user_id = v_user_id
		) AS exercise_reference
	), exercise_rows AS (
		SELECT coalesce(jsonb_agg(to_jsonb(exercise_row) ORDER BY exercise_row.id), '[]'::jsonb) AS items
		FROM (
			SELECT
				exercise.id,
				exercise.name,
				exercise.movement_pattern,
				exercise.progression_increment_lbs,
				exercise.analytics_track,
				exercise.strength_lift_slug,
				exercise.created_at,
				(exercise.created_by_user_id IS NOT NULL) AS is_custom
			FROM public.exercises AS exercise
			INNER JOIN exercise_ids ON exercise_ids.exercise_id = exercise.id
			ORDER BY exercise.id
		) AS exercise_row
	)
	SELECT jsonb_build_object(
		'schemaVersion', 'plateiq-training-graph-v1',
		'snapshotAt', to_jsonb(v_snapshot_at),
		'ownerUserId', to_jsonb(v_user_id),
		'training_programs', (SELECT items FROM program_rows),
		'cycles', (SELECT items FROM cycle_rows),
		'workouts', (SELECT items FROM workout_rows),
		'workout_sets', (SELECT items FROM workout_set_rows),
		'exercises', (SELECT items FROM exercise_rows)
	)
	INTO v_result;

	RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION private.reserve_account_export_slot(
	p_user_id uuid,
	p_reservation_id uuid,
	p_hourly_limit integer DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	v_usage_hour timestamptz := date_trunc('hour', timezone('utc', now())) AT TIME ZONE 'utc';
	v_reset_at timestamptz := v_usage_hour + interval '1 hour';
	v_hour_lock_key integer := floor(extract(epoch FROM v_usage_hour) / 3600)::integer;
	v_committed_count integer := 0;
	v_reserved_count integer := 0;
	v_used_count integer := 0;
BEGIN
	IF p_user_id IS NULL THEN
		RAISE EXCEPTION 'User id is required.';
	END IF;

	IF p_reservation_id IS NULL THEN
		RAISE EXCEPTION 'Reservation id is required.';
	END IF;

	IF p_hourly_limit IS NULL OR p_hourly_limit < 1 THEN
		RAISE EXCEPTION 'Hourly limit must be at least 1.';
	END IF;

	PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text), v_hour_lock_key);

	DELETE FROM private.account_export_reservations
	WHERE user_id = p_user_id
		AND expires_at <= now();

	SELECT usage.request_count
	INTO v_committed_count
	FROM private.account_export_hourly_usage AS usage
	WHERE usage.user_id = p_user_id
		AND usage.usage_hour = v_usage_hour;

	SELECT count(*)::integer
	INTO v_reserved_count
	FROM private.account_export_reservations AS reservation
	WHERE reservation.user_id = p_user_id
		AND reservation.reservation_hour = v_usage_hour
		AND reservation.expires_at > now();

	v_used_count := coalesce(v_committed_count, 0) + coalesce(v_reserved_count, 0);

	IF v_used_count >= p_hourly_limit THEN
		RETURN jsonb_build_object(
			'allowed', false,
			'limit', p_hourly_limit,
			'used', v_used_count,
			'remaining', GREATEST(p_hourly_limit - v_used_count, 0),
			'reset_at', v_reset_at
		);
	END IF;

	INSERT INTO private.account_export_reservations (
		id,
		user_id,
		reservation_hour,
		expires_at
	)
	VALUES (
		p_reservation_id,
		p_user_id,
		v_usage_hour,
		now() + interval '2 minutes'
	);

	v_used_count := v_used_count + 1;

	RETURN jsonb_build_object(
		'allowed', true,
		'limit', p_hourly_limit,
		'used', v_used_count,
		'remaining', GREATEST(p_hourly_limit - v_used_count, 0),
		'reset_at', v_reset_at
	);
END;
$$;

CREATE OR REPLACE FUNCTION private.release_account_export_slot(
	p_user_id uuid,
	p_reservation_id uuid,
	p_hourly_limit integer DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	v_usage_hour timestamptz := date_trunc('hour', timezone('utc', now())) AT TIME ZONE 'utc';
	v_reset_at timestamptz := v_usage_hour + interval '1 hour';
	v_hour_lock_key integer := floor(extract(epoch FROM v_usage_hour) / 3600)::integer;
	v_committed_count integer := 0;
	v_reserved_count integer := 0;
	v_used_count integer := 0;
BEGIN
	IF p_user_id IS NULL THEN
		RAISE EXCEPTION 'User id is required.';
	END IF;

	IF p_reservation_id IS NULL THEN
		RAISE EXCEPTION 'Reservation id is required.';
	END IF;

	IF p_hourly_limit IS NULL OR p_hourly_limit < 1 THEN
		RAISE EXCEPTION 'Hourly limit must be at least 1.';
	END IF;

	SELECT reservation.reservation_hour
	INTO v_usage_hour
	FROM private.account_export_reservations AS reservation
	WHERE reservation.id = p_reservation_id
		AND reservation.user_id = p_user_id
	LIMIT 1;

	v_usage_hour := coalesce(v_usage_hour, date_trunc('hour', timezone('utc', now())) AT TIME ZONE 'utc');
	v_reset_at := v_usage_hour + interval '1 hour';
	v_hour_lock_key := floor(extract(epoch FROM v_usage_hour) / 3600)::integer;

	PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text), v_hour_lock_key);

	DELETE FROM private.account_export_reservations
	WHERE user_id = p_user_id
		AND expires_at <= now();

	DELETE FROM private.account_export_reservations
	WHERE id = p_reservation_id
		AND user_id = p_user_id;

	SELECT usage.request_count
	INTO v_committed_count
	FROM private.account_export_hourly_usage AS usage
	WHERE usage.user_id = p_user_id
		AND usage.usage_hour = v_usage_hour;

	SELECT count(*)::integer
	INTO v_reserved_count
	FROM private.account_export_reservations AS reservation
	WHERE reservation.user_id = p_user_id
		AND reservation.reservation_hour = v_usage_hour
		AND reservation.expires_at > now();

	v_used_count := coalesce(v_committed_count, 0) + coalesce(v_reserved_count, 0);

	RETURN jsonb_build_object(
		'allowed', v_used_count < p_hourly_limit,
		'limit', p_hourly_limit,
		'used', v_used_count,
		'remaining', GREATEST(p_hourly_limit - v_used_count, 0),
		'reset_at', v_reset_at
	);
END;
$$;

CREATE OR REPLACE FUNCTION private.commit_account_export(
	p_user_id uuid,
	p_reservation_id uuid,
	p_hourly_limit integer DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	v_usage_hour timestamptz;
	v_reset_at timestamptz;
	v_hour_lock_key integer;
	v_committed_count integer := 0;
	v_reserved_count integer := 0;
	v_used_count integer := 0;
BEGIN
	IF p_user_id IS NULL THEN
		RAISE EXCEPTION 'User id is required.';
	END IF;

	IF p_reservation_id IS NULL THEN
		RAISE EXCEPTION 'Reservation id is required.';
	END IF;

	IF p_hourly_limit IS NULL OR p_hourly_limit < 1 THEN
		RAISE EXCEPTION 'Hourly limit must be at least 1.';
	END IF;

	SELECT reservation.reservation_hour
	INTO v_usage_hour
	FROM private.account_export_reservations AS reservation
	WHERE reservation.id = p_reservation_id
		AND reservation.user_id = p_user_id
		AND reservation.expires_at > now()
	LIMIT 1;

	IF v_usage_hour IS NULL THEN
		RAISE EXCEPTION 'Account export reservation is missing or expired.';
	END IF;

	v_reset_at := v_usage_hour + interval '1 hour';
	v_hour_lock_key := floor(extract(epoch FROM v_usage_hour) / 3600)::integer;

	PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text), v_hour_lock_key);

	DELETE FROM private.account_export_reservations
	WHERE user_id = p_user_id
		AND expires_at <= now();

	PERFORM 1
	FROM private.account_export_reservations AS reservation
	WHERE reservation.id = p_reservation_id
		AND reservation.user_id = p_user_id
		AND reservation.reservation_hour = v_usage_hour
		AND reservation.expires_at > now()
	FOR UPDATE;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'Account export reservation is missing or expired.';
	END IF;

	INSERT INTO private.account_export_hourly_usage AS quota (
		user_id,
		usage_hour,
		request_count
	)
	VALUES (
		p_user_id,
		v_usage_hour,
		1
	)
	ON CONFLICT (user_id, usage_hour) DO UPDATE
	SET request_count = quota.request_count + 1,
			updated_at = now()
	RETURNING request_count INTO v_committed_count;

	DELETE FROM private.account_export_reservations
	WHERE id = p_reservation_id
		AND user_id = p_user_id;

	SELECT count(*)::integer
	INTO v_reserved_count
	FROM private.account_export_reservations AS reservation
	WHERE reservation.user_id = p_user_id
		AND reservation.reservation_hour = v_usage_hour
		AND reservation.expires_at > now();

	v_used_count := coalesce(v_committed_count, 0) + coalesce(v_reserved_count, 0);

	RETURN jsonb_build_object(
		'allowed', true,
		'limit', p_hourly_limit,
		'used', v_used_count,
		'remaining', GREATEST(p_hourly_limit - v_used_count, 0),
		'reset_at', v_reset_at
	);
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_account_export_slot(
	p_user_id uuid,
	p_reservation_id uuid,
	p_hourly_limit integer DEFAULT 5
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
	SELECT private.reserve_account_export_slot(p_user_id, p_reservation_id, p_hourly_limit);
$$;

CREATE OR REPLACE FUNCTION public.release_account_export_slot(
	p_user_id uuid,
	p_reservation_id uuid,
	p_hourly_limit integer DEFAULT 5
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
	SELECT private.release_account_export_slot(p_user_id, p_reservation_id, p_hourly_limit);
$$;

CREATE OR REPLACE FUNCTION public.commit_account_export(
	p_user_id uuid,
	p_reservation_id uuid,
	p_hourly_limit integer DEFAULT 5
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
	SELECT private.commit_account_export(p_user_id, p_reservation_id, p_hourly_limit);
$$;

REVOKE ALL ON FUNCTION public.export_my_training_graph_v1(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.export_my_training_graph_v1(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.export_my_training_graph_v1(uuid) FROM authenticated;

REVOKE ALL ON FUNCTION private.reserve_account_export_slot(uuid, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.reserve_account_export_slot(uuid, uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION private.reserve_account_export_slot(uuid, uuid, integer) FROM authenticated;
REVOKE ALL ON FUNCTION public.reserve_account_export_slot(uuid, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reserve_account_export_slot(uuid, uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.reserve_account_export_slot(uuid, uuid, integer) FROM authenticated;

REVOKE ALL ON FUNCTION private.release_account_export_slot(uuid, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.release_account_export_slot(uuid, uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION private.release_account_export_slot(uuid, uuid, integer) FROM authenticated;
REVOKE ALL ON FUNCTION public.release_account_export_slot(uuid, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_account_export_slot(uuid, uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.release_account_export_slot(uuid, uuid, integer) FROM authenticated;

REVOKE ALL ON FUNCTION private.commit_account_export(uuid, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.commit_account_export(uuid, uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION private.commit_account_export(uuid, uuid, integer) FROM authenticated;
REVOKE ALL ON FUNCTION public.commit_account_export(uuid, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.commit_account_export(uuid, uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.commit_account_export(uuid, uuid, integer) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.export_my_training_graph_v1(uuid) TO service_role;
GRANT USAGE ON SCHEMA private TO service_role;
GRANT EXECUTE ON FUNCTION private.reserve_account_export_slot(uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION private.release_account_export_slot(uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION private.commit_account_export(uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_account_export_slot(uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_account_export_slot(uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.commit_account_export(uuid, uuid, integer) TO service_role;

COMMIT;
