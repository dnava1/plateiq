BEGIN;

CREATE TABLE IF NOT EXISTS private.ai_insight_daily_usage (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  usage_date date NOT NULL,
  request_count integer NOT NULL DEFAULT 1 CHECK (request_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  BEGIN;

  CREATE TABLE IF NOT EXISTS private.ai_insight_daily_usage (
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    usage_date date NOT NULL,
    request_count integer NOT NULL DEFAULT 1 CHECK (request_count >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, usage_date)
  );

  ALTER TABLE private.ai_insight_daily_usage ENABLE ROW LEVEL SECURITY;

  REVOKE ALL ON TABLE private.ai_insight_daily_usage FROM PUBLIC;
  REVOKE ALL ON TABLE private.ai_insight_daily_usage FROM anon;
  REVOKE ALL ON TABLE private.ai_insight_daily_usage FROM authenticated;

  CREATE OR REPLACE FUNCTION private.consume_ai_insight_daily_quota(
    p_daily_limit integer DEFAULT 3
  )
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
  DECLARE
    v_user_id uuid := auth.uid();
    v_usage_date date := timezone('utc', now())::date;
    v_reset_at timestamptz := (
      date_trunc('day', now() AT TIME ZONE 'utc') + interval '1 day'
    ) AT TIME ZONE 'utc';
    v_allowed boolean := false;
    v_used_count integer;
  BEGIN
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'You must be signed in to generate AI insights.';
    END IF;

    IF p_daily_limit IS NULL OR p_daily_limit < 1 THEN
      RAISE EXCEPTION 'Daily limit must be at least 1.';
    END IF;

    INSERT INTO private.ai_insight_daily_usage AS quota (
      user_id,
      usage_date,
      request_count
    )
    VALUES (
      v_user_id,
      v_usage_date,
      1
    )
    ON CONFLICT (user_id, usage_date) DO UPDATE
    SET request_count = quota.request_count + 1,
        updated_at = now()
    WHERE quota.request_count < p_daily_limit
    RETURNING request_count INTO v_used_count;

    v_allowed := FOUND;

    IF NOT v_allowed THEN
      SELECT usage.request_count
      INTO v_used_count
      FROM private.ai_insight_daily_usage AS usage
      WHERE usage.user_id = v_user_id
        AND usage.usage_date = v_usage_date;
    END IF;

    RETURN jsonb_build_object(
      'allowed', v_allowed,
      'limit', p_daily_limit,
      'used', v_used_count,
      'remaining', GREATEST(p_daily_limit - v_used_count, 0),
      'reset_at', v_reset_at
    );
  END;
  $$;

  CREATE OR REPLACE FUNCTION public.consume_ai_insight_daily_quota(
    p_daily_limit integer DEFAULT 3
  )
  RETURNS jsonb
  LANGUAGE sql
  SECURITY INVOKER
  SET search_path = ''
  AS $$
    SELECT private.consume_ai_insight_daily_quota(p_daily_limit);
  $$;

  REVOKE ALL ON FUNCTION private.consume_ai_insight_daily_quota(integer) FROM PUBLIC;
  REVOKE ALL ON FUNCTION private.consume_ai_insight_daily_quota(integer) FROM anon;
  REVOKE ALL ON FUNCTION public.consume_ai_insight_daily_quota(integer) FROM PUBLIC;
  REVOKE ALL ON FUNCTION public.consume_ai_insight_daily_quota(integer) FROM anon;

  GRANT EXECUTE ON FUNCTION private.consume_ai_insight_daily_quota(integer) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.consume_ai_insight_daily_quota(integer) TO authenticated;

  COMMIT;
