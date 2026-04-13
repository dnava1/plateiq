BEGIN;

CREATE OR REPLACE FUNCTION public.get_analytics_data(
  p_exercise_id int  DEFAULT NULL,
  p_date_from   date DEFAULT CURRENT_DATE - INTERVAL '6 months',
  p_date_to     date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(

    'e1rm_trend', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'date',          w.scheduled_date,
            'exercise_id',   ws.exercise_id,
            'exercise_name', e.name,
            'weight',        ws.weight_lbs,
            'reps',          ws.reps_actual,
            'e1rm',          ROUND(public.estimate_one_rep_max(ws.weight_lbs, ws.reps_actual), 1)
          )
          ORDER BY w.scheduled_date
        ),
        '[]'::jsonb
      )
      FROM   public.workout_sets ws
      JOIN   public.workouts    w  ON w.id = ws.workout_id
      JOIN   public.exercises   e  ON e.id = ws.exercise_id
      WHERE  ws.user_id = auth.uid()
        AND  ws.is_amrap = true
        AND  ws.reps_actual IS NOT NULL
        AND  ws.reps_actual > 0
        AND  w.scheduled_date BETWEEN p_date_from AND p_date_to
        AND  (p_exercise_id IS NULL OR ws.exercise_id = p_exercise_id)
    ),

    'volume_trend', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'week_start',    week_start,
            'exercise_id',   exercise_id,
            'exercise_name', exercise_name,
            'total_volume',  total_volume,
            'total_sets',    total_sets
          )
          ORDER BY week_start
        ),
        '[]'::jsonb
      )
      FROM (
        SELECT
          date_trunc('week', w.scheduled_date)::date AS week_start,
          ws.exercise_id,
          e.name AS exercise_name,
          SUM(ws.weight_lbs * COALESCE(ws.reps_actual, ws.reps_prescribed)) AS total_volume,
          COUNT(*) AS total_sets
        FROM   public.workout_sets ws
        JOIN   public.workouts    w ON w.id = ws.workout_id
        JOIN   public.exercises   e ON e.id = ws.exercise_id
        WHERE  ws.user_id = auth.uid()
          AND  w.scheduled_date BETWEEN p_date_from AND p_date_to
          AND  ws.reps_actual IS NOT NULL
          AND  (p_exercise_id IS NULL OR ws.exercise_id = p_exercise_id)
        GROUP  BY week_start, ws.exercise_id, e.name
      ) vol
    ),

    'pr_history', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'date',          scheduled_date,
            'exercise_id',   exercise_id,
            'exercise_name', exercise_name,
            'weight',        weight_lbs,
            'reps',          reps_actual,
            'e1rm',          e1rm
          )
          ORDER BY scheduled_date
        ),
        '[]'::jsonb
      )
      FROM (
        SELECT DISTINCT ON (ws.exercise_id, w.scheduled_date)
          w.scheduled_date,
          ws.exercise_id,
          e.name AS exercise_name,
          ws.weight_lbs,
          ws.reps_actual,
          ROUND(public.estimate_one_rep_max(ws.weight_lbs, ws.reps_actual), 1) AS e1rm
        FROM   public.workout_sets ws
        JOIN   public.workouts    w ON w.id = ws.workout_id
        JOIN   public.exercises   e ON e.id = ws.exercise_id
        WHERE  ws.user_id = auth.uid()
          AND  ws.is_amrap = true
          AND  ws.reps_actual IS NOT NULL
          AND  w.scheduled_date BETWEEN p_date_from AND p_date_to
          AND  (p_exercise_id IS NULL OR ws.exercise_id = p_exercise_id)
        ORDER  BY ws.exercise_id, w.scheduled_date, e1rm DESC
      ) prs
    ),

    'consistency', (
      SELECT jsonb_build_object(
        'total_sessions', COUNT(DISTINCT w.id),
        'weeks_active',   COUNT(DISTINCT date_trunc('week', w.scheduled_date)),
        'first_session',  MIN(w.scheduled_date),
        'last_session',   MAX(w.scheduled_date)
      )
      FROM public.workouts w
      WHERE w.user_id = auth.uid()
        AND w.completed_at IS NOT NULL
        AND w.scheduled_date BETWEEN p_date_from AND p_date_to
    ),

    'muscle_balance', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'movement_pattern', movement_pattern,
            'total_volume',     total_volume,
            'volume_pct',       volume_pct
          )
        ),
        '[]'::jsonb
      )
      FROM (
        SELECT
          movement_pattern,
          total_volume,
          ROUND((total_volume * 100.0 / NULLIF(SUM(total_volume) OVER (), 0))::numeric, 1) AS volume_pct
        FROM (
          SELECT
            e.movement_pattern,
            SUM(ws.weight_lbs * COALESCE(ws.reps_actual, ws.reps_prescribed)) AS total_volume
          FROM   public.workout_sets ws
          JOIN   public.exercises   e ON e.id = ws.exercise_id
          JOIN   public.workouts    w ON w.id = ws.workout_id
          WHERE  ws.user_id = auth.uid()
            AND  w.scheduled_date BETWEEN p_date_from AND p_date_to
            AND  ws.reps_actual IS NOT NULL
          GROUP  BY e.movement_pattern
        ) grouped_balance
      ) balance
    ),

    'tm_progression', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'effective_date', tm.effective_date,
            'exercise_id',    tm.exercise_id,
            'exercise_name',  e.name,
            'weight_lbs',     tm.weight_lbs
          )
          ORDER BY tm.effective_date
        ),
        '[]'::jsonb
      )
      FROM   public.training_maxes tm
      JOIN   public.exercises e ON e.id = tm.exercise_id
      WHERE  tm.user_id = auth.uid()
        AND  tm.effective_date BETWEEN p_date_from AND p_date_to
        AND  (p_exercise_id IS NULL OR tm.exercise_id = p_exercise_id)
    ),

    'stall_detection', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'exercise_id',    exercise_id,
            'exercise_name',  exercise_name,
            'last_pr_date',   last_pr_date,
            'weeks_since_pr', ((CURRENT_DATE - last_pr_date)::int / 7)
          )
        ),
        '[]'::jsonb
      )
      FROM (
        SELECT
          ws.exercise_id,
          e.name AS exercise_name,
          MAX(w.scheduled_date) AS last_pr_date
        FROM   public.workout_sets ws
        JOIN   public.workouts    w ON w.id = ws.workout_id
        JOIN   public.exercises   e ON e.id = ws.exercise_id
        WHERE  ws.user_id = auth.uid()
          AND  ws.is_amrap = true
          AND  ws.reps_actual IS NOT NULL
          AND  e.is_main_lift = true
        GROUP  BY ws.exercise_id, e.name
        HAVING MAX(w.scheduled_date) < CURRENT_DATE - INTERVAL '4 weeks'
      ) stalls
    ),

    'strength_profile', private.get_strength_profile(p_date_from, p_date_to)

  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_analytics_data(int, date, date) TO authenticated;

COMMIT;