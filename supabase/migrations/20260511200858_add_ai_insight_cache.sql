BEGIN;

CREATE TABLE IF NOT EXISTS private.ai_insight_cache (
	user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
	scope_key text NOT NULL,
	date_from date NOT NULL,
	date_to date NOT NULL,
	exercise_id integer NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
	insight jsonb NOT NULL,
	generated_at timestamptz NOT NULL DEFAULT now(),
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	PRIMARY KEY (user_id, scope_key),
	CHECK (date_to >= date_from),
	CHECK (jsonb_typeof(insight) = 'object')
);

CREATE TABLE IF NOT EXISTS private.ai_insight_generation_reservations (
	id uuid NOT NULL,
	user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
	reservation_date date NOT NULL,
	expires_at timestamptz NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ai_insight_cache_user_generated_at_idx
	ON private.ai_insight_cache (user_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS ai_insight_generation_reservations_user_date_idx
	ON private.ai_insight_generation_reservations (user_id, reservation_date, expires_at);

ALTER TABLE private.ai_insight_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.ai_insight_generation_reservations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE private.ai_insight_cache FROM PUBLIC;
REVOKE ALL ON TABLE private.ai_insight_cache FROM anon;
REVOKE ALL ON TABLE private.ai_insight_cache FROM authenticated;
REVOKE ALL ON TABLE private.ai_insight_generation_reservations FROM PUBLIC;
REVOKE ALL ON TABLE private.ai_insight_generation_reservations FROM anon;
REVOKE ALL ON TABLE private.ai_insight_generation_reservations FROM authenticated;

CREATE OR REPLACE FUNCTION private.build_ai_insight_cache_scope_key(
	p_date_from date,
	p_date_to date,
	p_exercise_id integer DEFAULT NULL
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
	SELECT concat_ws(':', coalesce(p_exercise_id::text, 'all'), p_date_from::text, p_date_to::text);
$$;

CREATE OR REPLACE FUNCTION private.get_ai_insight_cache(
	p_date_from date,
	p_date_to date,
	p_exercise_id integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	v_user_id uuid := auth.uid();
	v_scope_key text;
	v_result jsonb;
BEGIN
	IF v_user_id IS NULL THEN
		RAISE EXCEPTION 'You must be signed in to view saved AI insights.';
	END IF;

	IF p_date_from IS NULL OR p_date_to IS NULL THEN
		RAISE EXCEPTION 'dateFrom and dateTo are required.';
	END IF;

	IF p_date_to < p_date_from THEN
		RAISE EXCEPTION 'dateTo must be on or after dateFrom.';
	END IF;

	v_scope_key := private.build_ai_insight_cache_scope_key(p_date_from, p_date_to, p_exercise_id);

	SELECT jsonb_build_object(
		'generated_at', cache.generated_at,
		'insight', cache.insight
	)
	INTO v_result
	FROM private.ai_insight_cache AS cache
	WHERE cache.user_id = v_user_id
		AND cache.scope_key = v_scope_key;

	RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION private.upsert_ai_insight_cache(
	p_date_from date,
	p_date_to date,
	p_exercise_id integer DEFAULT NULL,
	p_insight jsonb DEFAULT NULL,
	p_generated_at timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	v_user_id uuid := auth.uid();
	v_scope_key text;
	v_generated_at timestamptz := coalesce(p_generated_at, now());
	v_result jsonb;
BEGIN
	IF v_user_id IS NULL THEN
		RAISE EXCEPTION 'You must be signed in to save AI insights.';
	END IF;

	IF p_date_from IS NULL OR p_date_to IS NULL THEN
		RAISE EXCEPTION 'dateFrom and dateTo are required.';
	END IF;

	IF p_date_to < p_date_from THEN
		RAISE EXCEPTION 'dateTo must be on or after dateFrom.';
	END IF;

	IF p_insight IS NULL OR jsonb_typeof(p_insight) <> 'object' THEN
		RAISE EXCEPTION 'Insight payload must be a JSON object.';
	END IF;

	v_scope_key := private.build_ai_insight_cache_scope_key(p_date_from, p_date_to, p_exercise_id);

	INSERT INTO private.ai_insight_cache AS cache (
		user_id,
		scope_key,
		date_from,
		date_to,
		exercise_id,
		insight,
		generated_at
	)
	VALUES (
		v_user_id,
		v_scope_key,
		p_date_from,
		p_date_to,
		p_exercise_id,
		p_insight,
		v_generated_at
	)
	ON CONFLICT (user_id, scope_key) DO UPDATE
	SET date_from = EXCLUDED.date_from,
			date_to = EXCLUDED.date_to,
			exercise_id = EXCLUDED.exercise_id,
			insight = EXCLUDED.insight,
			generated_at = EXCLUDED.generated_at,
			updated_at = now()
	RETURNING jsonb_build_object(
		'scope_key', scope_key,
		'generated_at', generated_at
	)
	INTO v_result;

	RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION private.get_ai_insight_daily_quota(
	p_user_id uuid,
	p_daily_limit integer DEFAULT 3
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	v_usage_date date := timezone('utc', now())::date;
	v_reset_at timestamptz := (
		date_trunc('day', now() AT TIME ZONE 'utc') + interval '1 day'
	) AT TIME ZONE 'utc';
	v_committed_count integer := 0;
	v_reserved_count integer := 0;
	v_used_count integer := 0;
BEGIN
	IF p_user_id IS NULL THEN
		RAISE EXCEPTION 'User id is required.';
	END IF;

	IF p_daily_limit IS NULL OR p_daily_limit < 1 THEN
		RAISE EXCEPTION 'Daily limit must be at least 1.';
	END IF;

	DELETE FROM private.ai_insight_generation_reservations
	WHERE user_id = p_user_id
		AND reservation_date = v_usage_date
		AND expires_at <= now();

	SELECT usage.request_count
	INTO v_committed_count
	FROM private.ai_insight_daily_usage AS usage
	WHERE usage.user_id = p_user_id
		AND usage.usage_date = v_usage_date;

	SELECT count(*)::integer
	INTO v_reserved_count
	FROM private.ai_insight_generation_reservations AS reservation
	WHERE reservation.user_id = p_user_id
		AND reservation.reservation_date = v_usage_date
		AND reservation.expires_at > now();

	v_used_count := coalesce(v_committed_count, 0) + coalesce(v_reserved_count, 0);

	RETURN jsonb_build_object(
		'allowed', v_used_count < p_daily_limit,
		'limit', p_daily_limit,
		'used', v_used_count,
		'remaining', GREATEST(p_daily_limit - v_used_count, 0),
		'reset_at', v_reset_at
	);
END;
$$;

CREATE OR REPLACE FUNCTION private.reserve_ai_insight_generation_slot(
	p_user_id uuid,
	p_reservation_id uuid,
	p_daily_limit integer DEFAULT 3
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	v_usage_date date := timezone('utc', now())::date;
	v_reset_at timestamptz := (
		date_trunc('day', now() AT TIME ZONE 'utc') + interval '1 day'
	) AT TIME ZONE 'utc';
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

	IF p_daily_limit IS NULL OR p_daily_limit < 1 THEN
		RAISE EXCEPTION 'Daily limit must be at least 1.';
	END IF;

	PERFORM pg_advisory_xact_lock(
		hashtext(p_user_id::text),
		v_usage_date - DATE '2000-01-01'
	);

	DELETE FROM private.ai_insight_generation_reservations
	WHERE user_id = p_user_id
		AND reservation_date = v_usage_date
		AND expires_at <= now();

	SELECT usage.request_count
	INTO v_committed_count
	FROM private.ai_insight_daily_usage AS usage
	WHERE usage.user_id = p_user_id
		AND usage.usage_date = v_usage_date;

	SELECT count(*)::integer
	INTO v_reserved_count
	FROM private.ai_insight_generation_reservations AS reservation
	WHERE reservation.user_id = p_user_id
		AND reservation.reservation_date = v_usage_date
		AND reservation.expires_at > now();

	v_used_count := coalesce(v_committed_count, 0) + coalesce(v_reserved_count, 0);

	IF v_used_count >= p_daily_limit THEN
		RETURN jsonb_build_object(
			'allowed', false,
			'limit', p_daily_limit,
			'used', v_used_count,
			'remaining', GREATEST(p_daily_limit - v_used_count, 0),
			'reset_at', v_reset_at
		);
	END IF;

	INSERT INTO private.ai_insight_generation_reservations (
		id,
		user_id,
		reservation_date,
		expires_at
	)
	VALUES (
		p_reservation_id,
		p_user_id,
		v_usage_date,
		now() + interval '10 minutes'
	);

	v_used_count := v_used_count + 1;

	RETURN jsonb_build_object(
		'allowed', true,
		'limit', p_daily_limit,
		'used', v_used_count,
		'remaining', GREATEST(p_daily_limit - v_used_count, 0),
		'reset_at', v_reset_at
	);
END;
$$;

CREATE OR REPLACE FUNCTION private.release_ai_insight_generation_slot(
	p_user_id uuid,
	p_reservation_id uuid,
	p_daily_limit integer DEFAULT 3
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	v_usage_date date := timezone('utc', now())::date;
	v_reset_at timestamptz := (
		date_trunc('day', now() AT TIME ZONE 'utc') + interval '1 day'
	) AT TIME ZONE 'utc';
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

	IF p_daily_limit IS NULL OR p_daily_limit < 1 THEN
		RAISE EXCEPTION 'Daily limit must be at least 1.';
	END IF;

	SELECT reservation.reservation_date
	INTO v_usage_date
	FROM private.ai_insight_generation_reservations AS reservation
	WHERE reservation.id = p_reservation_id
		AND reservation.user_id = p_user_id
	LIMIT 1;

	v_usage_date := coalesce(v_usage_date, timezone('utc', now())::date);
	v_reset_at := (
		date_trunc('day', v_usage_date::timestamp) + interval '1 day'
	) AT TIME ZONE 'utc';

	PERFORM pg_advisory_xact_lock(
		hashtext(p_user_id::text),
		v_usage_date - DATE '2000-01-01'
	);

	DELETE FROM private.ai_insight_generation_reservations
	WHERE user_id = p_user_id
		AND reservation_date = v_usage_date
		AND expires_at <= now();

	DELETE FROM private.ai_insight_generation_reservations
	WHERE id = p_reservation_id
		AND user_id = p_user_id;

	SELECT usage.request_count
	INTO v_committed_count
	FROM private.ai_insight_daily_usage AS usage
	WHERE usage.user_id = p_user_id
		AND usage.usage_date = v_usage_date;

	SELECT count(*)::integer
	INTO v_reserved_count
	FROM private.ai_insight_generation_reservations AS reservation
	WHERE reservation.user_id = p_user_id
		AND reservation.reservation_date = v_usage_date
		AND reservation.expires_at > now();

	v_used_count := coalesce(v_committed_count, 0) + coalesce(v_reserved_count, 0);

	RETURN jsonb_build_object(
		'allowed', v_used_count < p_daily_limit,
		'limit', p_daily_limit,
		'used', v_used_count,
		'remaining', GREATEST(p_daily_limit - v_used_count, 0),
		'reset_at', v_reset_at
	);
END;
$$;

CREATE OR REPLACE FUNCTION private.commit_ai_insight_generation(
	p_user_id uuid,
	p_reservation_id uuid,
	p_date_from date,
	p_date_to date,
	p_exercise_id integer DEFAULT NULL,
	p_insight jsonb DEFAULT NULL,
	p_generated_at timestamptz DEFAULT now(),
	p_daily_limit integer DEFAULT 3
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	v_usage_date date;
	v_reset_at timestamptz;
	v_scope_key text;
	v_generated_at timestamptz := coalesce(p_generated_at, now());
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

	IF p_daily_limit IS NULL OR p_daily_limit < 1 THEN
		RAISE EXCEPTION 'Daily limit must be at least 1.';
	END IF;

	IF p_date_from IS NULL OR p_date_to IS NULL THEN
		RAISE EXCEPTION 'dateFrom and dateTo are required.';
	END IF;

	IF p_date_to < p_date_from THEN
		RAISE EXCEPTION 'dateTo must be on or after dateFrom.';
	END IF;

	IF p_insight IS NULL OR jsonb_typeof(p_insight) <> 'object' THEN
		RAISE EXCEPTION 'Insight payload must be a JSON object.';
	END IF;

	SELECT reservation.reservation_date
	INTO v_usage_date
	FROM private.ai_insight_generation_reservations AS reservation
	WHERE reservation.id = p_reservation_id
		AND reservation.user_id = p_user_id
		AND reservation.expires_at > now()
	LIMIT 1;

	IF v_usage_date IS NULL THEN
		RAISE EXCEPTION 'Insight generation reservation is missing or expired.';
	END IF;

	v_reset_at := (
		date_trunc('day', v_usage_date::timestamp) + interval '1 day'
	) AT TIME ZONE 'utc';

	PERFORM pg_advisory_xact_lock(
		hashtext(p_user_id::text),
		v_usage_date - DATE '2000-01-01'
	);

	DELETE FROM private.ai_insight_generation_reservations
	WHERE user_id = p_user_id
		AND reservation_date = v_usage_date
		AND expires_at <= now();

	PERFORM 1
	FROM private.ai_insight_generation_reservations AS reservation
	WHERE reservation.id = p_reservation_id
		AND reservation.user_id = p_user_id
		AND reservation.reservation_date = v_usage_date
		AND reservation.expires_at > now()
	FOR UPDATE;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'Insight generation reservation is missing or expired.';
	END IF;

	v_scope_key := private.build_ai_insight_cache_scope_key(p_date_from, p_date_to, p_exercise_id);

	INSERT INTO private.ai_insight_cache AS cache (
		user_id,
		scope_key,
		date_from,
		date_to,
		exercise_id,
		insight,
		generated_at
	)
	VALUES (
		p_user_id,
		v_scope_key,
		p_date_from,
		p_date_to,
		p_exercise_id,
		p_insight,
		v_generated_at
	)
	ON CONFLICT (user_id, scope_key) DO UPDATE
	SET date_from = EXCLUDED.date_from,
			date_to = EXCLUDED.date_to,
			exercise_id = EXCLUDED.exercise_id,
			insight = EXCLUDED.insight,
			generated_at = EXCLUDED.generated_at,
			updated_at = now();

	INSERT INTO private.ai_insight_daily_usage AS quota (
		user_id,
		usage_date,
		request_count
	)
	VALUES (
		p_user_id,
		v_usage_date,
		1
	)
	ON CONFLICT (user_id, usage_date) DO UPDATE
	SET request_count = quota.request_count + 1,
			updated_at = now()
	RETURNING request_count INTO v_committed_count;

	DELETE FROM private.ai_insight_generation_reservations
	WHERE id = p_reservation_id
		AND user_id = p_user_id;

	SELECT count(*)::integer
	INTO v_reserved_count
	FROM private.ai_insight_generation_reservations AS reservation
	WHERE reservation.user_id = p_user_id
		AND reservation.reservation_date = v_usage_date
		AND reservation.expires_at > now();

	v_used_count := coalesce(v_committed_count, 0) + coalesce(v_reserved_count, 0);

	RETURN jsonb_build_object(
		'allowed', true,
		'limit', p_daily_limit,
		'used', v_used_count,
		'remaining', GREATEST(p_daily_limit - v_used_count, 0),
		'reset_at', v_reset_at,
		'generated_at', v_generated_at
	);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_ai_insight_cache(
	p_date_from date,
	p_date_to date,
	p_exercise_id integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
	SELECT private.get_ai_insight_cache(p_date_from, p_date_to, p_exercise_id);
$$;

CREATE OR REPLACE FUNCTION public.upsert_ai_insight_cache(
	p_date_from date,
	p_date_to date,
	p_exercise_id integer DEFAULT NULL,
	p_insight jsonb DEFAULT NULL,
	p_generated_at timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
	SELECT private.upsert_ai_insight_cache(p_date_from, p_date_to, p_exercise_id, p_insight, p_generated_at);
$$;

CREATE OR REPLACE FUNCTION public.get_ai_insight_daily_quota(
	p_user_id uuid,
	p_daily_limit integer DEFAULT 3
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
	SELECT private.get_ai_insight_daily_quota(p_user_id, p_daily_limit);
$$;

CREATE OR REPLACE FUNCTION public.reserve_ai_insight_generation_slot(
	p_user_id uuid,
	p_reservation_id uuid,
	p_daily_limit integer DEFAULT 3
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
	SELECT private.reserve_ai_insight_generation_slot(p_user_id, p_reservation_id, p_daily_limit);
$$;

CREATE OR REPLACE FUNCTION public.release_ai_insight_generation_slot(
	p_user_id uuid,
	p_reservation_id uuid,
	p_daily_limit integer DEFAULT 3
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
	SELECT private.release_ai_insight_generation_slot(p_user_id, p_reservation_id, p_daily_limit);
$$;

CREATE OR REPLACE FUNCTION public.commit_ai_insight_generation(
	p_user_id uuid,
	p_reservation_id uuid,
	p_date_from date,
	p_date_to date,
	p_exercise_id integer DEFAULT NULL,
	p_insight jsonb DEFAULT NULL,
	p_generated_at timestamptz DEFAULT now(),
	p_daily_limit integer DEFAULT 3
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
	SELECT private.commit_ai_insight_generation(
		p_user_id,
		p_reservation_id,
		p_date_from,
		p_date_to,
		p_exercise_id,
		p_insight,
		p_generated_at,
		p_daily_limit
	);
$$;

REVOKE ALL ON FUNCTION private.build_ai_insight_cache_scope_key(date, date, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.build_ai_insight_cache_scope_key(date, date, integer) FROM anon;
REVOKE ALL ON FUNCTION private.build_ai_insight_cache_scope_key(date, date, integer) FROM authenticated;

REVOKE ALL ON FUNCTION private.get_ai_insight_cache(date, date, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.get_ai_insight_cache(date, date, integer) FROM anon;
REVOKE ALL ON FUNCTION public.get_ai_insight_cache(date, date, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_ai_insight_cache(date, date, integer) FROM anon;

REVOKE ALL ON FUNCTION private.upsert_ai_insight_cache(date, date, integer, jsonb, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.upsert_ai_insight_cache(date, date, integer, jsonb, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION private.upsert_ai_insight_cache(date, date, integer, jsonb, timestamptz) FROM authenticated;
REVOKE ALL ON FUNCTION public.upsert_ai_insight_cache(date, date, integer, jsonb, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_ai_insight_cache(date, date, integer, jsonb, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.upsert_ai_insight_cache(date, date, integer, jsonb, timestamptz) FROM authenticated;

REVOKE ALL ON FUNCTION private.get_ai_insight_daily_quota(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.get_ai_insight_daily_quota(uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION private.get_ai_insight_daily_quota(uuid, integer) FROM authenticated;
REVOKE ALL ON FUNCTION public.get_ai_insight_daily_quota(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_ai_insight_daily_quota(uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.get_ai_insight_daily_quota(uuid, integer) FROM authenticated;

REVOKE ALL ON FUNCTION private.reserve_ai_insight_generation_slot(uuid, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.reserve_ai_insight_generation_slot(uuid, uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION private.reserve_ai_insight_generation_slot(uuid, uuid, integer) FROM authenticated;
REVOKE ALL ON FUNCTION public.reserve_ai_insight_generation_slot(uuid, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reserve_ai_insight_generation_slot(uuid, uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.reserve_ai_insight_generation_slot(uuid, uuid, integer) FROM authenticated;

REVOKE ALL ON FUNCTION private.release_ai_insight_generation_slot(uuid, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.release_ai_insight_generation_slot(uuid, uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION private.release_ai_insight_generation_slot(uuid, uuid, integer) FROM authenticated;
REVOKE ALL ON FUNCTION public.release_ai_insight_generation_slot(uuid, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_ai_insight_generation_slot(uuid, uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.release_ai_insight_generation_slot(uuid, uuid, integer) FROM authenticated;

REVOKE ALL ON FUNCTION private.commit_ai_insight_generation(uuid, uuid, date, date, integer, jsonb, timestamptz, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.commit_ai_insight_generation(uuid, uuid, date, date, integer, jsonb, timestamptz, integer) FROM anon;
REVOKE ALL ON FUNCTION private.commit_ai_insight_generation(uuid, uuid, date, date, integer, jsonb, timestamptz, integer) FROM authenticated;
REVOKE ALL ON FUNCTION public.commit_ai_insight_generation(uuid, uuid, date, date, integer, jsonb, timestamptz, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.commit_ai_insight_generation(uuid, uuid, date, date, integer, jsonb, timestamptz, integer) FROM anon;
REVOKE ALL ON FUNCTION public.commit_ai_insight_generation(uuid, uuid, date, date, integer, jsonb, timestamptz, integer) FROM authenticated;

REVOKE ALL ON FUNCTION private.consume_ai_insight_daily_quota(integer) FROM authenticated;
REVOKE ALL ON FUNCTION public.consume_ai_insight_daily_quota(integer) FROM authenticated;

GRANT EXECUTE ON FUNCTION private.get_ai_insight_cache(date, date, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_insight_cache(date, date, integer) TO authenticated;
GRANT USAGE ON SCHEMA private TO service_role;
GRANT EXECUTE ON FUNCTION private.get_ai_insight_daily_quota(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION private.reserve_ai_insight_generation_slot(uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION private.release_ai_insight_generation_slot(uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION private.commit_ai_insight_generation(uuid, uuid, date, date, integer, jsonb, timestamptz, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_ai_insight_daily_quota(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_ai_insight_generation_slot(uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_ai_insight_generation_slot(uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.commit_ai_insight_generation(uuid, uuid, date, date, integer, jsonb, timestamptz, integer) TO service_role;

COMMIT;
