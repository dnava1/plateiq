BEGIN;

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
		ws.weight_lbs,
		ws.workout_id,
		w.completed_at,
		w.scheduled_date,
		e.is_main_lift,
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
external_load_sets AS (
	SELECT *
	FROM scoped_logged_sets
	WHERE intensity_type IS DISTINCT FROM 'bodyweight'
),
bodyweight_sets AS (
	SELECT *
	FROM scoped_logged_sets
	WHERE intensity_type = 'bodyweight'
),
main_lift_strength_sets AS (
	SELECT *
	FROM external_load_sets
	WHERE is_main_lift = true
		AND reps_actual > 0
),
historical_main_lift_strength_sets AS (
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
		AND ws.reps_actual IS NOT NULL
		AND ws.reps_actual > 0
		AND ws.intensity_type IS DISTINCT FROM 'bodyweight'
		AND e.is_main_lift = true
		AND (p_exercise_id IS NULL OR ws.exercise_id = p_exercise_id)
),
main_lift_strength_candidates AS (
	SELECT
		scheduled_date AS date,
		exercise_id,
		exercise_name,
		weight_lbs AS weight,
		reps_actual AS reps,
		ROUND(public.estimate_one_rep_max(weight_lbs, reps_actual), 1) AS e1rm
	FROM main_lift_strength_sets
),
historical_main_lift_strength_candidates AS (
	SELECT
		scheduled_date AS date,
		exercise_id,
		exercise_name,
		weight_lbs AS weight,
		reps_actual AS reps,
		ROUND(public.estimate_one_rep_max(weight_lbs, reps_actual), 1) AS e1rm
	FROM historical_main_lift_strength_sets
),
daily_best_main_lift_strength_rows AS (
	SELECT DISTINCT ON (date, exercise_id)
		date,
		exercise_id,
		exercise_name,
		weight,
		reps,
		e1rm
	FROM main_lift_strength_candidates
	ORDER BY date, exercise_id, e1rm DESC, weight DESC, reps DESC
),
historical_daily_best_main_lift_strength_rows AS (
	SELECT DISTINCT ON (date, exercise_id)
		date,
		exercise_id,
		exercise_name,
		weight,
		reps,
		e1rm
	FROM historical_main_lift_strength_candidates
	ORDER BY date, exercise_id, e1rm DESC, weight DESC, reps DESC
),
historical_main_lift_pr_rows AS (
	SELECT
		date,
		exercise_id,
		exercise_name,
		weight,
		reps,
		e1rm
	FROM (
		SELECT
			row_data.*,
			MAX(row_data.e1rm) OVER (
				PARTITION BY row_data.exercise_id
				ORDER BY row_data.date
				ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
			) AS prior_best_e1rm
		FROM historical_daily_best_main_lift_strength_rows row_data
	) ranked_prs
	WHERE prior_best_e1rm IS NULL OR e1rm > prior_best_e1rm
),
e1rm_trend_rows AS (
	SELECT
		date,
		exercise_id,
		exercise_name,
		weight,
		reps,
		e1rm
	FROM daily_best_main_lift_strength_rows
),
pr_history_rows AS (
	SELECT
		date,
		exercise_id,
		exercise_name,
		weight,
		reps,
		e1rm
	FROM daily_best_main_lift_strength_rows
),
volume_trend_rows AS (
	SELECT
		date_trunc('week', scheduled_date)::date AS week_start,
		exercise_id,
		exercise_name,
		SUM(weight_lbs * COALESCE(reps_actual, reps_prescribed)) AS total_volume,
		COUNT(*) AS total_sets
	FROM external_load_sets
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
		FROM external_load_sets
		GROUP BY movement_pattern
	) grouped_balance
),
stall_detection_rows AS (
	SELECT
		exercise_id,
		exercise_name,
		MAX(date) AS last_pr_date,
		((p_date_to - MAX(date))::int / 7) AS weeks_since_pr
	FROM historical_main_lift_pr_rows
	GROUP BY exercise_id, exercise_name
	HAVING MAX(date) < p_date_to - INTERVAL '4 weeks'
),
bodyweight_exercise_summary_rows AS (
	SELECT
		bw.exercise_id,
		bw.exercise_name,
		COUNT(DISTINCT bw.workout_id) FILTER (WHERE COALESCE(bw.weight_lbs, 0) <= 0) AS strict_session_count,
		COUNT(DISTINCT bw.workout_id) FILTER (WHERE COALESCE(bw.weight_lbs, 0) > 0) AS weighted_session_count,
		MAX(bw.scheduled_date) AS last_session_date,
		(
			SELECT MAX(strict_bw.reps_actual)
			FROM bodyweight_sets strict_bw
			WHERE strict_bw.exercise_id = bw.exercise_id
				AND COALESCE(strict_bw.weight_lbs, 0) <= 0
				AND strict_bw.scheduled_date = (
					SELECT MAX(latest_strict_bw.scheduled_date)
					FROM bodyweight_sets latest_strict_bw
					WHERE latest_strict_bw.exercise_id = bw.exercise_id
						AND COALESCE(latest_strict_bw.weight_lbs, 0) <= 0
				)
		) AS latest_strict_rep_best,
		(
			SELECT MAX(weighted_bw.weight_lbs)
			FROM bodyweight_sets weighted_bw
			WHERE weighted_bw.exercise_id = bw.exercise_id
				AND COALESCE(weighted_bw.weight_lbs, 0) > 0
				AND weighted_bw.scheduled_date = (
					SELECT MAX(latest_weighted_bw.scheduled_date)
					FROM bodyweight_sets latest_weighted_bw
					WHERE latest_weighted_bw.exercise_id = bw.exercise_id
						AND COALESCE(latest_weighted_bw.weight_lbs, 0) > 0
				)
		) AS latest_added_load_lbs
	FROM bodyweight_sets bw
	GROUP BY bw.exercise_id, bw.exercise_name
),
bodyweight_strict_rep_trend_rows AS (
	SELECT DISTINCT ON (bw.scheduled_date, bw.exercise_id)
		bw.scheduled_date AS date,
		bw.exercise_id,
		bw.exercise_name,
		bw.reps_actual AS best_reps
	FROM bodyweight_sets bw
	WHERE COALESCE(bw.weight_lbs, 0) <= 0
	ORDER BY bw.scheduled_date, bw.exercise_id, bw.reps_actual DESC
),
bodyweight_weighted_load_trend_rows AS (
	SELECT DISTINCT ON (bw.scheduled_date, bw.exercise_id)
		bw.scheduled_date AS date,
		bw.exercise_id,
		bw.exercise_name,
		bw.weight_lbs AS added_weight_lbs,
		bw.reps_actual AS reps
	FROM bodyweight_sets bw
	WHERE COALESCE(bw.weight_lbs, 0) > 0
	ORDER BY bw.scheduled_date, bw.exercise_id, bw.weight_lbs DESC, bw.reps_actual DESC
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
		(SELECT COUNT(*) FROM external_load_sets) AS external_load_set_count,
		(SELECT COUNT(*) FROM daily_best_main_lift_strength_rows) AS main_lift_strength_count,
		(SELECT COUNT(*) FROM external_load_sets WHERE is_main_lift = true) AS main_lift_set_count,
		(SELECT COUNT(*) FROM bodyweight_sets) AS bodyweight_set_count,
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
						WHEN cc.external_load_set_count > 1 THEN 'ready'
						WHEN cc.external_load_set_count = 1 THEN 'limited'
						WHEN cc.bodyweight_set_count > 0 THEN 'not_applicable'
						ELSE 'not_applicable'
					END,
					'signal_count', cc.external_load_set_count,
					'reason_codes', CASE
						WHEN cc.external_load_set_count = 1 THEN jsonb_build_array('limited_history')
						WHEN cc.external_load_set_count = 0 AND cc.bodyweight_set_count > 0 THEN jsonb_build_array('bodyweight_only_scope')
						WHEN cc.external_load_set_count = 0 THEN jsonb_build_array('no_external_load_sets')
						ELSE '[]'::jsonb
					END
				),
				'muscle_balance', jsonb_build_object(
					'family', 'general_logging',
					'status', CASE
						WHEN cc.external_load_set_count > 1 THEN 'ready'
						WHEN cc.external_load_set_count = 1 THEN 'limited'
						WHEN cc.bodyweight_set_count > 0 THEN 'not_applicable'
						ELSE 'not_applicable'
					END,
					'signal_count', cc.external_load_set_count,
					'reason_codes', CASE
						WHEN cc.external_load_set_count = 1 THEN jsonb_build_array('limited_history')
						WHEN cc.external_load_set_count = 0 AND cc.bodyweight_set_count > 0 THEN jsonb_build_array('bodyweight_only_scope')
						WHEN cc.external_load_set_count = 0 THEN jsonb_build_array('no_external_load_sets')
						ELSE '[]'::jsonb
					END
				),
				'e1rm_trend', jsonb_build_object(
					'family', 'main_lift_amrap',
					'status', CASE
						WHEN cc.main_lift_strength_count > 1 THEN 'ready'
						WHEN cc.main_lift_strength_count = 1 THEN 'limited'
						WHEN cc.external_load_set_count = 0 AND cc.bodyweight_set_count > 0 THEN 'not_applicable'
						ELSE 'not_applicable'
					END,
					'signal_count', cc.main_lift_strength_count,
					'reason_codes', CASE
						WHEN cc.main_lift_strength_count = 1 THEN jsonb_build_array('limited_history')
						WHEN cc.main_lift_strength_count = 0 AND cc.external_load_set_count = 0 AND cc.bodyweight_set_count > 0 THEN jsonb_build_array('bodyweight_only_scope')
						WHEN cc.main_lift_strength_count = 0 THEN jsonb_build_array('no_main_lift_sets')
						ELSE '[]'::jsonb
					END
				),
				'pr_history', jsonb_build_object(
					'family', 'main_lift_amrap',
					'status', CASE
						WHEN cc.main_lift_strength_count > 1 THEN 'ready'
						WHEN cc.main_lift_strength_count = 1 THEN 'limited'
						WHEN cc.external_load_set_count = 0 AND cc.bodyweight_set_count > 0 THEN 'not_applicable'
						ELSE 'not_applicable'
					END,
					'signal_count', cc.main_lift_strength_count,
					'reason_codes', CASE
						WHEN cc.main_lift_strength_count = 1 THEN jsonb_build_array('limited_history')
						WHEN cc.main_lift_strength_count = 0 AND cc.external_load_set_count = 0 AND cc.bodyweight_set_count > 0 THEN jsonb_build_array('bodyweight_only_scope')
						WHEN cc.main_lift_strength_count = 0 THEN jsonb_build_array('no_main_lift_sets')
						ELSE '[]'::jsonb
					END
				),
				'stall_detection', jsonb_build_object(
					'family', 'main_lift_amrap',
					'status', CASE
						WHEN cc.main_lift_strength_count > 1 THEN 'ready'
						WHEN cc.main_lift_strength_count = 1 THEN 'limited'
						WHEN cc.external_load_set_count = 0 AND cc.bodyweight_set_count > 0 THEN 'not_applicable'
						ELSE 'not_applicable'
					END,
					'signal_count', cc.main_lift_strength_count,
					'reason_codes', CASE
						WHEN cc.main_lift_strength_count = 1 THEN jsonb_build_array('limited_history')
						WHEN cc.main_lift_strength_count = 0 AND cc.external_load_set_count = 0 AND cc.bodyweight_set_count > 0 THEN jsonb_build_array('bodyweight_only_scope')
						WHEN cc.main_lift_strength_count = 0 THEN jsonb_build_array('no_main_lift_sets')
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
							'weighted_session_count', weighted_session_count,
							'latest_strict_rep_best', latest_strict_rep_best,
							'latest_added_load_lbs', latest_added_load_lbs,
							'last_session_date', last_session_date
						)
						ORDER BY last_session_date DESC NULLS LAST, exercise_name
					)
					FROM bodyweight_exercise_summary_rows
				),
				'[]'::jsonb
			),
			'strict_rep_trend', COALESCE(
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
					FROM bodyweight_strict_rep_trend_rows
				),
				'[]'::jsonb
			),
			'weighted_load_trend', COALESCE(
				(
					SELECT jsonb_agg(
						jsonb_build_object(
							'date', date,
							'exercise_id', exercise_id,
							'exercise_name', exercise_name,
							'added_weight_lbs', added_weight_lbs,
							'reps', reps
						)
						ORDER BY date
					)
					FROM bodyweight_weighted_load_trend_rows
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