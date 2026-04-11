BEGIN;

-- Keep the newest logged row if duplicate workout/set-order pairs slipped in before the
-- idempotent upsert guarantee was fully enforced.
WITH ranked_workout_sets AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY workout_id, set_order
      ORDER BY COALESCE(logged_at, updated_at) DESC, id DESC
    ) AS set_rank
  FROM workout_sets
)
DELETE FROM workout_sets ws
USING ranked_workout_sets ranked
WHERE ws.id = ranked.id
  AND ranked.set_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_sets_idempotent
  ON workout_sets (workout_id, set_order);

DROP INDEX IF EXISTS idx_workout_sets_workout;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workout_sets_workout_id_set_order_key'
      AND conrelid = 'workout_sets'::regclass
  ) THEN
    ALTER TABLE workout_sets
      ADD CONSTRAINT workout_sets_workout_id_set_order_key
      UNIQUE USING INDEX idx_workout_sets_idempotent;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION private.estimate_one_rep_max(
  p_weight_lbs numeric,
  p_reps int
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_weight_lbs IS NULL OR p_reps IS NULL THEN NULL
    WHEN p_reps <= 1 OR p_reps >= 37 THEN p_weight_lbs
    ELSE (p_weight_lbs * 36) / (37 - p_reps)
  END
$$;

CREATE OR REPLACE FUNCTION get_analytics_data(
  p_exercise_id int  DEFAULT NULL,
  p_date_from   date DEFAULT CURRENT_DATE - INTERVAL '6 months',
  p_date_to     date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(

    -- Brzycki estimated 1RM for every AMRAP set in the date window.
    'e1rm_trend', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'date',          w.scheduled_date,
            'exercise_id',   ws.exercise_id,
            'exercise_name', e.name,
            'weight',        ws.weight_lbs,
            'reps',          ws.reps_actual,
            'e1rm',          ROUND(private.estimate_one_rep_max(ws.weight_lbs, ws.reps_actual), 1)
          )
          ORDER BY w.scheduled_date
        ),
        '[]'::jsonb
      )
      FROM   workout_sets ws
      JOIN   workouts    w  ON w.id  = ws.workout_id
      JOIN   exercises   e  ON e.id  = ws.exercise_id
      WHERE  ws.user_id     = auth.uid()
        AND  ws.is_amrap    = true
        AND  ws.reps_actual IS NOT NULL
        AND  ws.reps_actual > 0
        AND  w.scheduled_date BETWEEN p_date_from AND p_date_to
        AND  (p_exercise_id IS NULL OR ws.exercise_id = p_exercise_id)
    ),

    -- Weekly volume (lbs × reps) per exercise.
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
          e.name                                     AS exercise_name,
          SUM(ws.weight_lbs * COALESCE(ws.reps_actual, ws.reps_prescribed)) AS total_volume,
          COUNT(*)                                   AS total_sets
        FROM   workout_sets ws
        JOIN   workouts    w ON w.id  = ws.workout_id
        JOIN   exercises   e ON e.id  = ws.exercise_id
        WHERE  ws.user_id     = auth.uid()
          AND  w.scheduled_date BETWEEN p_date_from AND p_date_to
          AND  ws.reps_actual IS NOT NULL
          AND  (p_exercise_id IS NULL OR ws.exercise_id = p_exercise_id)
        GROUP  BY week_start, ws.exercise_id, e.name
      ) vol
    ),

    -- Best estimated 1RM per exercise per day (used to surface PR history).
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
          ROUND(private.estimate_one_rep_max(ws.weight_lbs, ws.reps_actual), 1) AS e1rm
        FROM   workout_sets ws
        JOIN   workouts    w ON w.id  = ws.workout_id
        JOIN   exercises   e ON e.id  = ws.exercise_id
        WHERE  ws.user_id     = auth.uid()
          AND  ws.is_amrap    = true
          AND  ws.reps_actual IS NOT NULL
          AND  w.scheduled_date BETWEEN p_date_from AND p_date_to
          AND  (p_exercise_id IS NULL OR ws.exercise_id = p_exercise_id)
        ORDER  BY ws.exercise_id, w.scheduled_date, e1rm DESC
      ) prs
    ),

    -- Session and week-level consistency counters.
    'consistency', (
      SELECT jsonb_build_object(
        'total_sessions', COUNT(DISTINCT w.id),
        'weeks_active',   COUNT(DISTINCT date_trunc('week', w.scheduled_date)),
        'first_session',  MIN(w.scheduled_date),
        'last_session',   MAX(w.scheduled_date)
      )
      FROM workouts w
      WHERE w.user_id      = auth.uid()
        AND w.completed_at IS NOT NULL
        AND w.scheduled_date BETWEEN p_date_from AND p_date_to
    ),

    -- Volume distribution by movement pattern (push / pull / squat / …).
    'muscle_balance', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'movement_pattern', movement_pattern,
            'total_volume',     total_volume,
            'volume_pct',       ROUND(
                                  (total_volume * 100.0 /
                                   NULLIF(SUM(total_volume) OVER (), 0)
                                  )::numeric, 1
                                )
          )
        ),
        '[]'::jsonb
      )
      FROM (
        SELECT
          e.movement_pattern,
          SUM(ws.weight_lbs * COALESCE(ws.reps_actual, ws.reps_prescribed)) AS total_volume
        FROM   workout_sets ws
        JOIN   exercises    e ON e.id  = ws.exercise_id
        JOIN   workouts     w ON w.id  = ws.workout_id
        WHERE  ws.user_id     = auth.uid()
          AND  w.scheduled_date BETWEEN p_date_from AND p_date_to
          AND  ws.reps_actual IS NOT NULL
        GROUP  BY e.movement_pattern
      ) balance
    ),

    -- Main lifts that haven't had an AMRAP PR in the last 4 weeks.
    'stall_detection', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'exercise_id',    exercise_id,
            'exercise_name',  exercise_name,
            'last_pr_date',   last_pr_date,
            'weeks_since_pr', EXTRACT(days FROM (CURRENT_DATE - last_pr_date))::int / 7
          )
        ),
        '[]'::jsonb
      )
      FROM (
        SELECT
          ws.exercise_id,
          e.name             AS exercise_name,
          MAX(w.scheduled_date) AS last_pr_date
        FROM   workout_sets ws
        JOIN   workouts     w ON w.id  = ws.workout_id
        JOIN   exercises    e ON e.id  = ws.exercise_id
        WHERE  ws.user_id     = auth.uid()
          AND  ws.is_amrap    = true
          AND  ws.reps_actual IS NOT NULL
          AND  e.is_main_lift = true
        GROUP  BY ws.exercise_id, e.name
        HAVING MAX(w.scheduled_date) < CURRENT_DATE - INTERVAL '4 weeks'
      ) stalls
    )

  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMIT;