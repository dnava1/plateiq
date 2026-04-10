-- =============================================================================
-- PlateIQ — Migration 001: Complete Schema
-- Run this in the Supabase SQL editor (dashboard > SQL Editor > New query).
-- This file is idempotent where possible (CREATE … IF NOT EXISTS, ON CONFLICT DO NOTHING).
-- DO NOT drop any tables or functions before running.
-- =============================================================================


-- =============================================================================
-- 1. PRIVATE SCHEMA + UTILITY FUNCTIONS
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS private;

-- Reusable trigger function that stamps updated_at on every UPDATE.
CREATE OR REPLACE FUNCTION private.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- =============================================================================
-- 2. TABLES  (in FK dependency order)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- profiles  — one row per auth.users row; created automatically via trigger
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id               uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name     text        NOT NULL,
  avatar_url       text,
  preferred_unit   text        NOT NULL DEFAULT 'lbs'
                               CHECK (preferred_unit IN ('lbs', 'kg')),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- exercises  — system exercises (created_by_user_id IS NULL) + user-created
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exercises (
  id                          int         GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name                        text        NOT NULL,
  category                    text        NOT NULL
                                          CHECK (category IN ('main', 'accessory')),
  movement_pattern            text        NOT NULL
                                          CHECK (movement_pattern IN (
                                            'push', 'pull', 'hinge', 'squat',
                                            'single_leg', 'core', 'other'
                                          )),
  is_main_lift                boolean     NOT NULL DEFAULT false,
  progression_increment_lbs   decimal,
  created_by_user_id          uuid        REFERENCES profiles(id) ON DELETE CASCADE,
  created_at                  timestamptz DEFAULT now(),
  -- Prevent duplicate exercise names per user (NULL = system, treats each NULL as distinct)
  UNIQUE NULLS NOT DISTINCT (name, created_by_user_id)
);

-- ---------------------------------------------------------------------------
-- training_maxes  — per-user, per-exercise, time-series of training max values
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS training_maxes (
  id               int         GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id          uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id      int         NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  weight_lbs       decimal     NOT NULL,
  tm_percentage    decimal     NOT NULL DEFAULT 0.90,
  effective_date   date        NOT NULL DEFAULT CURRENT_DATE,
  created_at       timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- training_programs  — a user's program instance (bound to a template)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS training_programs (
  id           int         GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  template_key text        NOT NULL,
  config       jsonb,
  start_date   date        NOT NULL DEFAULT CURRENT_DATE,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- cycles  — numbered cycles within a program
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cycles (
  id                       int         GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  program_id               int         NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  user_id                  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cycle_number             int         NOT NULL DEFAULT 1,
  start_date               date        NOT NULL DEFAULT CURRENT_DATE,
  completed_at             timestamptz,
  auto_progression_applied boolean     NOT NULL DEFAULT false,
  created_at               timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- workouts  — individual training sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workouts (
  id                   int         GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cycle_id             int         NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  user_id              uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  primary_exercise_id  int         NOT NULL REFERENCES exercises(id),
  week_number          int         NOT NULL,
  day_label            text,
  scheduled_date       date        NOT NULL DEFAULT CURRENT_DATE,
  started_at           timestamptz,
  completed_at         timestamptz,
  notes                text,
  created_at           timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- workout_sets  — individual sets within a workout
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workout_sets (
  id                    int         GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workout_id            int         NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id           int         NOT NULL REFERENCES exercises(id),
  user_id               uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  set_order             int         NOT NULL,
  set_type              text        NOT NULL
                                    CHECK (set_type IN (
                                      'warmup', 'main', 'amrap',
                                      'supplement', 'accessory'
                                    )),
  weight_lbs            decimal     NOT NULL,
  reps_prescribed       int         NOT NULL,
  reps_prescribed_max   int,
  reps_actual           int,
  is_amrap              boolean     NOT NULL DEFAULT false,
  rpe                   decimal     CHECK (rpe >= 1.0 AND rpe <= 10.0),
  intensity_type        text        NOT NULL
                                    CHECK (intensity_type IN (
                                      'percentage_tm', 'percentage_1rm',
                                      'rpe', 'fixed_weight', 'bodyweight'
                                    )),
  logged_at             timestamptz,
  updated_at            timestamptz DEFAULT now()
);


-- =============================================================================
-- 3. ROW LEVEL SECURITY  — enable on every table
-- =============================================================================

ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises         ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_maxes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets      ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 4. RLS POLICIES
-- =============================================================================

-- profiles ---------------------------------------------------------------
CREATE POLICY "select own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- exercises --------------------------------------------------------------
-- System exercises (created_by_user_id IS NULL) are visible to everyone.
-- Custom exercises are scoped to the creator only.
CREATE POLICY "read exercises"
  ON exercises FOR SELECT
  USING (created_by_user_id IS NULL OR created_by_user_id = auth.uid());

CREATE POLICY "insert own exercises"
  ON exercises FOR INSERT
  WITH CHECK (created_by_user_id = auth.uid());

CREATE POLICY "update own exercises"
  ON exercises FOR UPDATE
  USING (created_by_user_id = auth.uid());

CREATE POLICY "delete own exercises"
  ON exercises FOR DELETE
  USING (created_by_user_id = auth.uid());

-- training_maxes ---------------------------------------------------------
CREATE POLICY "all own data"
  ON training_maxes FOR ALL
  USING (user_id = auth.uid());

-- training_programs ------------------------------------------------------
CREATE POLICY "all own data"
  ON training_programs FOR ALL
  USING (user_id = auth.uid());

-- cycles -----------------------------------------------------------------
CREATE POLICY "all own data"
  ON cycles FOR ALL
  USING (user_id = auth.uid());

-- workouts ---------------------------------------------------------------
CREATE POLICY "all own data"
  ON workouts FOR ALL
  USING (user_id = auth.uid());

-- workout_sets -----------------------------------------------------------
CREATE POLICY "all own data"
  ON workout_sets FOR ALL
  USING (user_id = auth.uid());


-- =============================================================================
-- 5. INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_training_maxes_lookup
  ON training_maxes (user_id, exercise_id, effective_date DESC);

CREATE INDEX IF NOT EXISTS idx_workouts_user_date
  ON workouts (user_id, scheduled_date DESC);

CREATE INDEX IF NOT EXISTS idx_workouts_cycle
  ON workouts (cycle_id);

CREATE INDEX IF NOT EXISTS idx_workout_sets_workout
  ON workout_sets (workout_id, set_order);

CREATE INDEX IF NOT EXISTS idx_workout_sets_amrap
  ON workout_sets (user_id, exercise_id)
  WHERE is_amrap = true;

CREATE INDEX IF NOT EXISTS idx_cycles_program
  ON cycles (program_id, cycle_number);

CREATE INDEX IF NOT EXISTS idx_training_programs_active
  ON training_programs (user_id)
  WHERE is_active = true;


-- =============================================================================
-- 6. TRIGGERS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Auto-create a profile row whenever a new auth.users row is inserted.
-- Uses SECURITY DEFINER so it can write to public.profiles from auth schema.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      'User'
    ),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Drop-and-recreate pattern is safe — trigger may not exist on first run.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

-- ---------------------------------------------------------------------------
-- updated_at stamps
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_profiles_updated_at ON profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS set_training_programs_updated_at ON training_programs;
CREATE TRIGGER set_training_programs_updated_at
  BEFORE UPDATE ON training_programs
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS set_workout_sets_updated_at ON workout_sets;
CREATE TRIGGER set_workout_sets_updated_at
  BEFORE UPDATE ON workout_sets
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();


-- =============================================================================
-- 7. SEED DATA — System Exercises
-- The UNIQUE NULLS NOT DISTINCT constraint on (name, created_by_user_id) drives
-- the ON CONFLICT DO NOTHING clause below.
-- =============================================================================

INSERT INTO exercises
  (name, category, movement_pattern, is_main_lift, progression_increment_lbs)
VALUES
  -- Main lifts
  ('Squat',                    'main',      'squat',      true,  10),
  ('Bench Press',              'main',      'push',       true,   5),
  ('Overhead Press',           'main',      'push',       true,   5),
  ('Deadlift',                 'main',      'hinge',      true,  10),
  ('Front Squat',              'main',      'squat',      true,  10),
  ('Sumo Deadlift',            'main',      'hinge',      true,  10),
  ('Power Clean',              'main',      'other',      true,   5),
  -- Accessories — pull
  ('Barbell Row',              'accessory', 'pull',       false, NULL),
  ('Chin-up',                  'accessory', 'pull',       false, NULL),
  ('Pull-up',                  'accessory', 'pull',       false, NULL),
  ('Dumbbell Row',             'accessory', 'pull',       false, NULL),
  ('Lat Pulldown',             'accessory', 'pull',       false, NULL),
  ('Cable Row',                'accessory', 'pull',       false, NULL),
  ('Dumbbell Curl',            'accessory', 'pull',       false, NULL),
  ('Barbell Curl',             'accessory', 'pull',       false, NULL),
  ('Face Pull',                'accessory', 'pull',       false, NULL),
  ('Band Pull-Apart',          'accessory', 'pull',       false, NULL),
  -- Accessories — push
  ('Dip',                      'accessory', 'push',       false, NULL),
  ('Incline Bench Press',      'accessory', 'push',       false, NULL),
  ('Close-Grip Bench Press',   'accessory', 'push',       false, NULL),
  ('Dumbbell Bench Press',     'accessory', 'push',       false, NULL),
  ('Dumbbell Shoulder Press',  'accessory', 'push',       false, NULL),
  ('Tricep Pushdown',          'accessory', 'push',       false, NULL),
  ('Lateral Raise',            'accessory', 'push',       false, NULL),
  -- Accessories — squat
  ('Leg Press',                'accessory', 'squat',      false, NULL),
  ('Leg Extension',            'accessory', 'squat',      false, NULL),
  -- Accessories — hinge
  ('Romanian Deadlift',        'accessory', 'hinge',      false, NULL),
  ('Leg Curl',                 'accessory', 'hinge',      false, NULL),
  ('Hip Thrust',               'accessory', 'hinge',      false, NULL),
  -- Accessories — single_leg
  ('Bulgarian Split Squat',    'accessory', 'single_leg', false, NULL),
  -- Accessories — core
  ('Plank',                    'accessory', 'core',       false, NULL),
  ('Hanging Leg Raise',        'accessory', 'core',       false, NULL),
  ('Ab Wheel Rollout',         'accessory', 'core',       false, NULL),
  -- Accessories — other
  ('Calf Raise',               'accessory', 'other',      false, NULL)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 8. POSTGRESQL FUNCTIONS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- complete_cycle(p_cycle_id, p_progression)
--
-- Atomically:
--   1. Marks the current cycle as completed.
--   2. Optionally inserts new training_maxes rows based on p_progression JSONB.
--   3. Creates the next cycle.
--
-- p_progression format (array):
--   [{"exercise_id": 1, "increment_lbs": 5}, ...]
--
-- Returns: {"completed_cycle_id": int, "new_cycle_id": int, "new_cycle_number": int}
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION complete_cycle(
  p_cycle_id   int,
  p_progression jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_program_id   int;
  v_user_id      uuid;
  v_cycle_number int;
  v_new_cycle_id int;
  v_result       jsonb;
BEGIN
  -- Verify ownership and that the cycle is not already completed.
  SELECT c.program_id, c.user_id, c.cycle_number
  INTO   v_program_id, v_user_id, v_cycle_number
  FROM   cycles c
  WHERE  c.id = p_cycle_id
    AND  c.user_id = auth.uid()
    AND  c.completed_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cycle not found, not owned, or already completed';
  END IF;

  -- Mark the cycle complete.
  UPDATE cycles
  SET    completed_at             = now(),
         auto_progression_applied = true
  WHERE  id = p_cycle_id;

  -- Insert new training maxes for each exercise specified in the progression array.
  IF p_progression IS NOT NULL THEN
    INSERT INTO training_maxes (user_id, exercise_id, weight_lbs, tm_percentage, effective_date)
    SELECT
      v_user_id,
      (item ->> 'exercise_id')::int,
      tm.weight_lbs + (item ->> 'increment_lbs')::decimal,
      tm.tm_percentage,
      CURRENT_DATE
    FROM jsonb_array_elements(p_progression) item
    JOIN LATERAL (
      SELECT t.weight_lbs, t.tm_percentage
      FROM   training_maxes t
      WHERE  t.user_id      = v_user_id
        AND  t.exercise_id  = (item ->> 'exercise_id')::int
      ORDER  BY t.effective_date DESC
      LIMIT  1
    ) tm ON true;
  END IF;

  -- Create the successor cycle.
  INSERT INTO cycles (program_id, user_id, cycle_number, start_date)
  VALUES (v_program_id, v_user_id, v_cycle_number + 1, CURRENT_DATE)
  RETURNING id INTO v_new_cycle_id;

  -- Build the return object.
  v_result := jsonb_build_object(
    'completed_cycle_id', p_cycle_id,
    'new_cycle_id',       v_new_cycle_id,
    'new_cycle_number',   v_cycle_number + 1
  );

  RETURN v_result;
END;
$$;


-- ---------------------------------------------------------------------------
-- get_dashboard()
--
-- Single-query aggregate for the dashboard page.
-- Returns active program, current cycle, 5 recent workouts, and latest TMs.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(

    'active_program', (
      SELECT jsonb_build_object(
               'id',           id,
               'name',         name,
               'template_key', template_key
             )
      FROM   training_programs
      WHERE  user_id   = auth.uid()
        AND  is_active = true
      LIMIT  1
    ),

    'current_cycle', (
      SELECT jsonb_build_object(
               'id',           c.id,
               'cycle_number', c.cycle_number
             )
      FROM   cycles c
      JOIN   training_programs p ON p.id = c.program_id
      WHERE  c.user_id      = auth.uid()
        AND  c.completed_at IS NULL
        AND  p.is_active    = true
      ORDER  BY c.cycle_number DESC
      LIMIT  1
    ),

    'recent_workouts', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id',             w.id,
            'exercise_name',  e.name,
            'week_number',    w.week_number,
            'completed_at',   w.completed_at,
            'scheduled_date', w.scheduled_date
          )
          ORDER BY w.scheduled_date DESC
        ),
        '[]'::jsonb
      )
      FROM (
        SELECT * FROM workouts
        WHERE  user_id = auth.uid()
        ORDER  BY scheduled_date DESC
        LIMIT  5
      ) w
      JOIN exercises e ON e.id = w.primary_exercise_id
    ),

    'current_tms', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'exercise_id',   tm.exercise_id,
            'exercise_name', e.name,
            'weight_lbs',    tm.weight_lbs,
            'effective_date', tm.effective_date
          )
        ),
        '[]'::jsonb
      )
      FROM   training_maxes tm
      JOIN   exercises e ON e.id = tm.exercise_id
      WHERE  tm.user_id      = auth.uid()
        AND  tm.effective_date = (
          SELECT MAX(t2.effective_date)
          FROM   training_maxes t2
          WHERE  t2.user_id     = tm.user_id
            AND  t2.exercise_id = tm.exercise_id
        )
    )

  ) INTO v_result;

  RETURN v_result;
END;
$$;


-- ---------------------------------------------------------------------------
-- get_analytics_data(p_exercise_id, p_date_from, p_date_to)
--
-- Full analytics aggregate powering the charts page and AI coaching feed.
-- All six dimensions: e1rm_trend, volume_trend, pr_history, consistency,
--                     muscle_balance, stall_detection.
-- ---------------------------------------------------------------------------
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

    -- Epley e1RM for every AMRAP set in the date window.
    'e1rm_trend', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'date',          w.scheduled_date,
            'exercise_id',   ws.exercise_id,
            'exercise_name', e.name,
            'weight',        ws.weight_lbs,
            'reps',          ws.reps_actual,
            'e1rm',          ROUND((ws.weight_lbs * (1 + ws.reps_actual::decimal / 30))::numeric, 1)
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

    -- Best e1RM per exercise per day (used to surface PR history).
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
          e.name                                                                       AS exercise_name,
          ws.weight_lbs,
          ws.reps_actual,
          ROUND((ws.weight_lbs * (1 + ws.reps_actual::decimal / 30))::numeric, 1)     AS e1rm
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
