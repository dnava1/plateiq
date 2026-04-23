BEGIN;

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS analytics_track text;

UPDATE public.exercises
SET analytics_track = COALESCE(analytics_track, 'standard');

ALTER TABLE public.exercises
  ALTER COLUMN analytics_track SET DEFAULT 'standard';

ALTER TABLE public.exercises
  ALTER COLUMN analytics_track SET NOT NULL;

ALTER TABLE public.exercises
  DROP CONSTRAINT IF EXISTS exercises_analytics_track_check;

ALTER TABLE public.exercises
  ADD CONSTRAINT exercises_analytics_track_check
  CHECK (analytics_track IN ('standard', 'bodyweight_review'));

ALTER TABLE public.exercises
  DROP CONSTRAINT IF EXISTS exercises_movement_pattern_check;

UPDATE public.exercises
SET movement_pattern = CASE
  WHEN lower(name) IN ('bench press', 'incline bench press', 'close-grip bench press', 'dumbbell bench press', 'dip', 'weighted dip', 'tricep pushdown') THEN 'horizontal_push'
  WHEN lower(name) IN ('overhead press', 'dumbbell shoulder press', 'push press', 'snatch press', 'lateral raise') THEN 'vertical_push'
  WHEN lower(name) IN ('pull-up', 'weighted pull-up', 'chin-up', 'weighted chin-up', 'lat pulldown') THEN 'vertical_pull'
  WHEN lower(name) IN ('barbell row', 'pendlay row', 'dumbbell row', 'cable row', 'face pull', 'band pull-apart', 'dumbbell curl', 'barbell curl') THEN 'horizontal_pull'
  WHEN lower(name) IN ('squat', 'front squat', 'leg press', 'leg extension') THEN 'squat'
  WHEN lower(name) IN ('bulgarian split squat') OR lower(name) LIKE '%lunge%' OR lower(name) LIKE '%step up%' OR lower(name) LIKE '%step-up%' THEN 'lunge'
  WHEN lower(name) IN ('deadlift', 'sumo deadlift', 'romanian deadlift', 'leg curl', 'hip thrust', 'power clean') THEN 'hinge'
  WHEN movement_pattern = 'push' THEN 'horizontal_push'
  WHEN movement_pattern = 'pull' THEN 'horizontal_pull'
  WHEN movement_pattern = 'single_leg' THEN 'lunge'
  ELSE movement_pattern
END;

ALTER TABLE public.exercises
	ADD CONSTRAINT exercises_movement_pattern_check
	CHECK (movement_pattern IN (
		'horizontal_push',
		'vertical_push',
		'horizontal_pull',
		'vertical_pull',
		'hinge',
		'squat',
		'lunge',
		'core',
		'other'
	));

INSERT INTO public.exercises (
  name,
  category,
  movement_pattern,
  is_main_lift,
  progression_increment_lbs,
  created_by_user_id,
  strength_lift_slug,
  analytics_track
)
VALUES
  ('Weighted Dip', 'accessory', 'horizontal_push', false, NULL, NULL, NULL, 'standard'),
  ('Weighted Chin-up', 'accessory', 'vertical_pull', false, NULL, NULL, NULL, 'standard'),
  ('Weighted Pull-up', 'accessory', 'vertical_pull', false, NULL, NULL, NULL, 'standard')
ON CONFLICT (name, created_by_user_id) DO UPDATE
SET category = EXCLUDED.category,
    movement_pattern = EXCLUDED.movement_pattern,
    is_main_lift = EXCLUDED.is_main_lift,
    progression_increment_lbs = EXCLUDED.progression_increment_lbs,
    strength_lift_slug = EXCLUDED.strength_lift_slug,
    analytics_track = EXCLUDED.analytics_track;

UPDATE public.exercises
SET analytics_track = 'bodyweight_review',
    strength_lift_slug = NULL,
    is_main_lift = false,
    movement_pattern = CASE
      WHEN lower(name) = 'dip' THEN 'horizontal_push'
      ELSE 'vertical_pull'
    END
WHERE created_by_user_id IS NULL
  AND lower(name) IN ('dip', 'chin-up', 'pull-up');

WITH exercise_pairs AS (
  SELECT strict_exercise.id AS strict_id, weighted_exercise.id AS weighted_id
  FROM (VALUES
    ('dip', 'weighted dip'),
    ('chin-up', 'weighted chin-up'),
    ('pull-up', 'weighted pull-up')
  ) AS names(strict_name, weighted_name)
  JOIN public.exercises strict_exercise
    ON lower(strict_exercise.name) = names.strict_name
   AND strict_exercise.created_by_user_id IS NULL
  JOIN public.exercises weighted_exercise
    ON lower(weighted_exercise.name) = names.weighted_name
   AND weighted_exercise.created_by_user_id IS NULL
)
UPDATE public.workout_sets ws
SET exercise_id = exercise_pairs.weighted_id,
    intensity_type = 'fixed_weight'
FROM exercise_pairs
WHERE ws.exercise_id = exercise_pairs.strict_id
  AND COALESCE(ws.weight_lbs, 0) > 0;

WITH exercise_pairs AS (
  SELECT strict_exercise.id AS strict_id, weighted_exercise.id AS weighted_id
  FROM (VALUES
    ('dip', 'weighted dip'),
    ('chin-up', 'weighted chin-up'),
    ('pull-up', 'weighted pull-up')
  ) AS names(strict_name, weighted_name)
  JOIN public.exercises strict_exercise
    ON lower(strict_exercise.name) = names.strict_name
   AND strict_exercise.created_by_user_id IS NULL
  JOIN public.exercises weighted_exercise
    ON lower(weighted_exercise.name) = names.weighted_name
   AND weighted_exercise.created_by_user_id IS NULL
), workout_primary_updates AS (
  SELECT DISTINCT w.id AS workout_id, exercise_pairs.weighted_id
  FROM public.workouts w
  JOIN exercise_pairs
    ON w.primary_exercise_id = exercise_pairs.strict_id
  WHERE EXISTS (
    SELECT 1
    FROM public.workout_sets moved_sets
    WHERE moved_sets.workout_id = w.id
      AND moved_sets.exercise_id = exercise_pairs.weighted_id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.workout_sets remaining_strict_sets
    WHERE remaining_strict_sets.workout_id = w.id
      AND remaining_strict_sets.exercise_id = exercise_pairs.strict_id
  )
)
UPDATE public.workouts w
SET primary_exercise_id = workout_primary_updates.weighted_id
FROM workout_primary_updates
WHERE w.id = workout_primary_updates.workout_id;

CREATE OR REPLACE FUNCTION public.get_analytics_data(
	p_exercise_id int DEFAULT NULL,
	p_date_from date DEFAULT CURRENT_DATE - INTERVAL '6 months',
	p_date_to date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
WITH scoped_logged_sets AS (
	SELECT
		ws.exercise_id,
		ws.intensity_type,
		ws.is_amrap,
		ws.reps_actual,
		ws.reps_prescribed,
		ws.set_type,
		ws.weight_lbs,
		ws.workout_id,
		w.completed_at,
		w.scheduled_date,
		e.analytics_track,
		e.movement_pattern,
		e.name AS exercise_name
	FROM public.workout_sets ws
	JOIN public.workouts w ON w.id = ws.workout_id
	JOIN public.exercises e ON e.id = ws.exercise_id
	WHERE ws.user_id = auth.uid()
		AND ws.reps_actual IS NOT NULL
		AND w.scheduled_date BETWEEN p_date_from AND p_date_to
		AND (p_exercise_id IS NULL OR ws.exercise_id = p_exercise_id)
),
completed_scoped_workouts AS (
	SELECT DISTINCT
		workout_id,
		scheduled_date
	FROM scoped_logged_sets
	WHERE completed_at IS NOT NULL
),
standard_strength_sets AS (
	SELECT *
	FROM scoped_logged_sets
	WHERE analytics_track = 'standard'
		AND set_type IS DISTINCT FROM 'warmup'
		AND COALESCE(weight_lbs, 0) > 0
),
historical_standard_strength_sets AS (
	SELECT
		ws.exercise_id,
		ws.reps_actual,
		ws.weight_lbs,
		w.scheduled_date,
		e.name AS exercise_name
	FROM public.workout_sets ws
	JOIN public.workouts w ON w.id = ws.workout_id
	JOIN public.exercises e ON e.id = ws.exercise_id
	WHERE ws.user_id = auth.uid()
		AND ws.reps_actual BETWEEN 1 AND 10
		AND COALESCE(ws.weight_lbs, 0) > 0
		AND ws.set_type IS DISTINCT FROM 'warmup'
		AND e.analytics_track = 'standard'
		AND (p_exercise_id IS NULL OR ws.exercise_id = p_exercise_id)
),
bodyweight_review_sets AS (
	SELECT *
	FROM scoped_logged_sets
	WHERE analytics_track = 'bodyweight_review'
		AND set_type IS DISTINCT FROM 'warmup'
),
e1rm_trend_rows AS (
	SELECT
		scheduled_date AS date,
		exercise_id,
		exercise_name,
		weight_lbs AS weight,
		reps_actual AS reps,
		ROUND(public.estimate_one_rep_max(weight_lbs, reps_actual), 1) AS e1rm
	FROM standard_strength_sets
	WHERE reps_actual BETWEEN 1 AND 10
),
pr_history_rows AS (
	SELECT DISTINCT ON (exercise_id, date)
		date,
		exercise_id,
		exercise_name,
		weight,
		reps,
		e1rm
	FROM e1rm_trend_rows
	ORDER BY exercise_id, date, e1rm DESC
),
volume_trend_rows AS (
	SELECT
		date_trunc('week', scheduled_date)::date AS week_start,
		exercise_id,
		exercise_name,
		SUM(weight_lbs * COALESCE(reps_actual, reps_prescribed)) AS total_volume,
		COUNT(*) AS total_sets
	FROM standard_strength_sets
	GROUP BY 1, 2, 3
),
muscle_balance_rows AS (
	SELECT
		movement_pattern,
		total_volume,
		ROUND((total_volume * 100.0 / NULLIF(SUM(total_volume) OVER (), 0))::numeric, 1) AS volume_pct
	FROM (
		SELECT
			movement_pattern,
			SUM(weight_lbs * COALESCE(reps_actual, reps_prescribed)) AS total_volume
		FROM standard_strength_sets
		WHERE movement_pattern IN (
			'squat',
			'lunge',
			'hinge',
			'vertical_push',
			'horizontal_push',
			'vertical_pull',
			'horizontal_pull'
		)
		GROUP BY movement_pattern
	) grouped_balance
),
stall_detection_rows AS (
	SELECT
		exercise_id,
		exercise_name,
		MAX(scheduled_date) AS last_pr_date,
		((p_date_to - MAX(scheduled_date))::int / 7) AS weeks_since_pr
	FROM (
		SELECT DISTINCT ON (exercise_id, scheduled_date)
			exercise_id,
			exercise_name,
			scheduled_date,
			ROUND(public.estimate_one_rep_max(weight_lbs, reps_actual), 1) AS e1rm
		FROM historical_standard_strength_sets
		ORDER BY exercise_id, scheduled_date, e1rm DESC
	) historical_prs
	GROUP BY exercise_id, exercise_name
	HAVING MAX(scheduled_date) < p_date_to - INTERVAL '4 weeks'
),
bodyweight_exercise_summary_rows AS (
	SELECT
		bw.exercise_id,
		bw.exercise_name,
		COUNT(DISTINCT bw.workout_id) AS strict_session_count,
		MAX(bw.scheduled_date) AS last_session_date,
		MAX(bw.reps_actual) FILTER (
			WHERE bw.scheduled_date = (
				SELECT MAX(latest_bw.scheduled_date)
				FROM bodyweight_review_sets latest_bw
				WHERE latest_bw.exercise_id = bw.exercise_id
			)
		) AS latest_strict_rep_best,
		SUM(bw.reps_actual) AS total_logged_reps
	FROM bodyweight_review_sets bw
	GROUP BY bw.exercise_id, bw.exercise_name
),
bodyweight_rep_trend_rows AS (
	SELECT DISTINCT ON (bw.scheduled_date, bw.exercise_id)
		bw.scheduled_date AS date,
		bw.exercise_id,
		bw.exercise_name,
		bw.reps_actual AS best_reps
	FROM bodyweight_review_sets bw
	ORDER BY bw.scheduled_date, bw.exercise_id, bw.reps_actual DESC
),
bodyweight_weekly_volume_rows AS (
	SELECT
		date_trunc('week', bw.scheduled_date)::date AS week_start,
		SUM(bw.reps_actual) AS total_reps,
		COUNT(DISTINCT bw.workout_id) AS total_sessions
	FROM bodyweight_review_sets bw
	GROUP BY 1
),
consistency_summary AS (
	SELECT
		COUNT(*) AS total_sessions,
		COUNT(DISTINCT date_trunc('week', scheduled_date)) AS weeks_active,
		MIN(scheduled_date) AS first_session,
		MAX(scheduled_date) AS last_session
	FROM completed_scoped_workouts
),
tm_progression_rows AS (
	SELECT
		tm.effective_date,
		tm.exercise_id,
		e.name AS exercise_name,
		tm.weight_lbs
	FROM public.training_maxes tm
	JOIN public.exercises e ON e.id = tm.exercise_id
	WHERE tm.user_id = auth.uid()
		AND tm.effective_date BETWEEN p_date_from AND p_date_to
		AND (p_exercise_id IS NULL OR tm.exercise_id = p_exercise_id)
),
coverage_counts AS (
	SELECT
		(SELECT COALESCE(total_sessions, 0) FROM consistency_summary) AS completed_session_count,
		(SELECT COUNT(*) FROM standard_strength_sets) AS standard_strength_set_count,
		(SELECT COUNT(*) FROM bodyweight_review_sets) AS bodyweight_set_count,
		(SELECT COUNT(*) FROM tm_progression_rows) AS training_max_count
),
strength_profile_source AS (
	SELECT private.get_strength_profile(p_date_from, p_date_to) AS data
),
strength_profile_metrics AS (
	SELECT
		data,
		COALESCE(jsonb_array_length(COALESCE(data -> 'lifts', '[]'::jsonb)), 0) AS lift_count,
		COALESCE((data ->> 'minimum_lift_count')::int, 3) AS minimum_lift_count,
		COALESCE((data ->> 'minimum_category_count')::int, 2) AS minimum_category_count,
		COALESCE(
			(
				SELECT COUNT(DISTINCT lift ->> 'category_key')
				FROM jsonb_array_elements(COALESCE(data -> 'lifts', '[]'::jsonb)) AS lift
			),
			0
		) AS category_count,
		(data -> 'profile' ->> 'sex') IS NOT NULL AS has_sex,
		(data -> 'profile' ->> 'age_years') IS NOT NULL AS has_age_years,
		(data -> 'profile' ->> 'bodyweight_lbs') IS NOT NULL AS has_bodyweight
	FROM strength_profile_source
)
SELECT jsonb_build_object(
	'e1rm_trend', (
		SELECT COALESCE(
			jsonb_agg(
				jsonb_build_object(
					'date', date,
					'exercise_id', exercise_id,
					'exercise_name', exercise_name,
					'weight', weight,
					'reps', reps,
					'e1rm', e1rm
				)
				ORDER BY date
			),
			'[]'::jsonb
		)
		FROM e1rm_trend_rows
	),
	'volume_trend', (
		SELECT COALESCE(
			jsonb_agg(
				jsonb_build_object(
					'week_start', week_start,
					'exercise_id', exercise_id,
					'exercise_name', exercise_name,
					'total_volume', total_volume,
					'total_sets', total_sets
				)
				ORDER BY week_start
			),
			'[]'::jsonb
		)
		FROM volume_trend_rows
	),
	'pr_history', (
		SELECT COALESCE(
			jsonb_agg(
				jsonb_build_object(
					'date', date,
					'exercise_id', exercise_id,
					'exercise_name', exercise_name,
					'weight', weight,
					'reps', reps,
					'e1rm', e1rm
				)
				ORDER BY date
			),
			'[]'::jsonb
		)
		FROM pr_history_rows
	),
	'consistency', (
		SELECT jsonb_build_object(
			'total_sessions', COALESCE(total_sessions, 0),
			'weeks_active', COALESCE(weeks_active, 0),
			'first_session', first_session,
			'last_session', last_session
		)
		FROM consistency_summary
	),
	'muscle_balance', (
		SELECT COALESCE(
			jsonb_agg(
				jsonb_build_object(
					'movement_pattern', movement_pattern,
					'total_volume', total_volume,
					'volume_pct', volume_pct
				)
				ORDER BY total_volume DESC
			),
			'[]'::jsonb
		)
		FROM muscle_balance_rows
	),
	'tm_progression', (
		SELECT COALESCE(
			jsonb_agg(
				jsonb_build_object(
					'effective_date', effective_date,
					'exercise_id', exercise_id,
					'exercise_name', exercise_name,
					'weight_lbs', weight_lbs
				)
				ORDER BY effective_date
			),
			'[]'::jsonb
		)
		FROM tm_progression_rows
	),
	'stall_detection', (
		SELECT COALESCE(
			jsonb_agg(
				jsonb_build_object(
					'exercise_id', exercise_id,
					'exercise_name', exercise_name,
					'last_pr_date', last_pr_date,
					'weeks_since_pr', weeks_since_pr
				)
				ORDER BY last_pr_date
			),
			'[]'::jsonb
		)
		FROM stall_detection_rows
	),
	'strength_profile', (SELECT data FROM strength_profile_metrics),
	'coverage', (
		SELECT jsonb_build_object(
			'metrics', jsonb_build_object(
				'consistency', jsonb_build_object(
					'family', 'general_logging',
					'status', CASE
						WHEN cc.completed_session_count > 1 THEN 'ready'
						WHEN cc.completed_session_count = 1 THEN 'limited'
						ELSE 'not_applicable'
					END,
					'signal_count', cc.completed_session_count,
					'reason_codes', CASE
						WHEN cc.completed_session_count = 1 THEN jsonb_build_array('limited_history')
						WHEN cc.completed_session_count = 0 THEN jsonb_build_array('no_completed_sessions')
						ELSE '[]'::jsonb
					END
				),
				'volume_trend', jsonb_build_object(
					'family', 'general_logging',
					'status', CASE
						WHEN cc.standard_strength_set_count > 1 THEN 'ready'
						WHEN cc.standard_strength_set_count = 1 THEN 'limited'
						WHEN cc.bodyweight_set_count > 0 THEN 'not_applicable'
						ELSE 'not_applicable'
					END,
					'signal_count', cc.standard_strength_set_count,
					'reason_codes', CASE
						WHEN cc.standard_strength_set_count = 1 THEN jsonb_build_array('limited_history')
						WHEN cc.standard_strength_set_count = 0 AND cc.bodyweight_set_count > 0 THEN jsonb_build_array('bodyweight_only_scope')
						WHEN cc.standard_strength_set_count = 0 THEN jsonb_build_array('no_external_load_sets')
						ELSE '[]'::jsonb
					END
				),
				'muscle_balance', jsonb_build_object(
					'family', 'general_logging',
					'status', CASE
						WHEN cc.standard_strength_set_count > 1 THEN 'ready'
						WHEN cc.standard_strength_set_count = 1 THEN 'limited'
						WHEN cc.bodyweight_set_count > 0 THEN 'not_applicable'
						ELSE 'not_applicable'
					END,
					'signal_count', cc.standard_strength_set_count,
					'reason_codes', CASE
						WHEN cc.standard_strength_set_count = 1 THEN jsonb_build_array('limited_history')
						WHEN cc.standard_strength_set_count = 0 AND cc.bodyweight_set_count > 0 THEN jsonb_build_array('bodyweight_only_scope')
						WHEN cc.standard_strength_set_count = 0 THEN jsonb_build_array('no_external_load_sets')
						ELSE '[]'::jsonb
					END
				),
				'e1rm_trend', jsonb_build_object(
					'family', 'loaded_strength',
					'status', CASE
						WHEN cc.standard_strength_set_count > 1 THEN 'ready'
						WHEN cc.standard_strength_set_count = 1 THEN 'limited'
						WHEN cc.bodyweight_set_count > 0 THEN 'not_applicable'
						ELSE 'not_applicable'
					END,
					'signal_count', cc.standard_strength_set_count,
					'reason_codes', CASE
						WHEN cc.standard_strength_set_count = 1 THEN jsonb_build_array('limited_history')
						WHEN cc.standard_strength_set_count = 0 AND cc.bodyweight_set_count > 0 THEN jsonb_build_array('bodyweight_only_scope')
						WHEN cc.standard_strength_set_count = 0 THEN jsonb_build_array('no_strength_sets')
						ELSE '[]'::jsonb
					END
				),
				'pr_history', jsonb_build_object(
					'family', 'loaded_strength',
					'status', CASE
						WHEN cc.standard_strength_set_count > 1 THEN 'ready'
						WHEN cc.standard_strength_set_count = 1 THEN 'limited'
						WHEN cc.bodyweight_set_count > 0 THEN 'not_applicable'
						ELSE 'not_applicable'
					END,
					'signal_count', cc.standard_strength_set_count,
					'reason_codes', CASE
						WHEN cc.standard_strength_set_count = 1 THEN jsonb_build_array('limited_history')
						WHEN cc.standard_strength_set_count = 0 AND cc.bodyweight_set_count > 0 THEN jsonb_build_array('bodyweight_only_scope')
						WHEN cc.standard_strength_set_count = 0 THEN jsonb_build_array('no_strength_sets')
						ELSE '[]'::jsonb
					END
				),
				'stall_detection', jsonb_build_object(
					'family', 'loaded_strength',
					'status', CASE
						WHEN cc.standard_strength_set_count > 1 THEN 'ready'
						WHEN cc.standard_strength_set_count = 1 THEN 'limited'
						WHEN cc.bodyweight_set_count > 0 THEN 'not_applicable'
						ELSE 'not_applicable'
					END,
					'signal_count', cc.standard_strength_set_count,
					'reason_codes', CASE
						WHEN cc.standard_strength_set_count = 1 THEN jsonb_build_array('limited_history')
						WHEN cc.standard_strength_set_count = 0 AND cc.bodyweight_set_count > 0 THEN jsonb_build_array('bodyweight_only_scope')
						WHEN cc.standard_strength_set_count = 0 THEN jsonb_build_array('no_strength_sets')
						ELSE '[]'::jsonb
					END
				),
				'tm_progression', jsonb_build_object(
					'family', 'training_max',
					'status', CASE
						WHEN cc.training_max_count > 1 THEN 'ready'
						WHEN cc.training_max_count = 1 THEN 'limited'
						ELSE 'not_applicable'
					END,
					'signal_count', cc.training_max_count,
					'reason_codes', CASE
						WHEN cc.training_max_count = 1 THEN jsonb_build_array('limited_history')
						WHEN cc.training_max_count = 0 THEN jsonb_build_array('no_training_max_history')
						ELSE '[]'::jsonb
					END
				),
				'strength_profile', jsonb_build_object(
					'family', 'benchmark_profile',
					'status', CASE
						WHEN spm.has_sex = true
							AND spm.has_age_years = true
							AND spm.has_bodyweight = true
							AND spm.lift_count >= spm.minimum_lift_count
							AND spm.category_count >= spm.minimum_category_count
							THEN 'ready'
						ELSE 'limited'
					END,
					'signal_count', spm.lift_count,
					'reason_codes', CASE
						WHEN spm.has_sex = false OR spm.has_age_years = false OR spm.has_bodyweight = false THEN jsonb_build_array('strength_profile_missing_profile')
						WHEN spm.lift_count < spm.minimum_lift_count OR spm.category_count < spm.minimum_category_count THEN jsonb_build_array('strength_profile_insufficient_data')
						ELSE '[]'::jsonb
					END
				),
				'bodyweight_lane', jsonb_build_object(
					'family', 'bodyweight_specific',
					'status', CASE
						WHEN cc.bodyweight_set_count > 1 THEN 'ready'
						WHEN cc.bodyweight_set_count = 1 THEN 'limited'
						ELSE 'not_applicable'
					END,
					'signal_count', cc.bodyweight_set_count,
					'reason_codes', CASE
						WHEN cc.bodyweight_set_count = 1 THEN jsonb_build_array('limited_history')
						WHEN cc.bodyweight_set_count = 0 THEN jsonb_build_array('no_bodyweight_sets')
						ELSE '[]'::jsonb
					END
				)
			)
		)
		FROM coverage_counts cc
		CROSS JOIN strength_profile_metrics spm
	),
	'bodyweight_lane', (
		SELECT jsonb_build_object(
			'relevant', cc.bodyweight_set_count > 0,
			'exercise_summaries', COALESCE(
				(
					SELECT jsonb_agg(
						jsonb_build_object(
							'exercise_id', exercise_id,
							'exercise_name', exercise_name,
							'strict_session_count', strict_session_count,
							'latest_strict_rep_best', latest_strict_rep_best,
							'total_logged_reps', total_logged_reps,
							'last_session_date', last_session_date
						)
						ORDER BY last_session_date DESC NULLS LAST, exercise_name
					)
					FROM bodyweight_exercise_summary_rows
				),
				'[]'::jsonb
			),
			'rep_trend', COALESCE(
				(
					SELECT jsonb_agg(
						jsonb_build_object(
							'date', date,
							'exercise_id', exercise_id,
							'exercise_name', exercise_name,
							'best_reps', best_reps
						)
						ORDER BY date
					)
					FROM bodyweight_rep_trend_rows
				),
				'[]'::jsonb
			),
			'weekly_volume_trend', COALESCE(
				(
					SELECT jsonb_agg(
						jsonb_build_object(
							'week_start', week_start,
							'total_reps', total_reps,
							'total_sessions', total_sessions
						)
						ORDER BY week_start
					)
					FROM bodyweight_weekly_volume_rows
				),
				'[]'::jsonb
			)
		)
		FROM coverage_counts cc
	)
)
FROM coverage_counts
CROSS JOIN strength_profile_metrics;
$$;

GRANT EXECUTE ON FUNCTION public.get_analytics_data(int, date, date) TO authenticated;

COMMIT;
