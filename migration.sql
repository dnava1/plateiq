CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;
CREATE TABLE users (
    id integer GENERATED ALWAYS AS IDENTITY,
    email character varying(320) NOT NULL,
    name character varying(200) NOT NULL,
    google_subject_id character varying(128) NOT NULL,
    avatar_url character varying(2048),
    preferred_unit character varying(5) NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT (now() at time zone 'utc'),
    updated_at timestamp with time zone NOT NULL DEFAULT (now() at time zone 'utc'),
    CONSTRAINT "PK_users" PRIMARY KEY (id)
);

CREATE TABLE exercises (
    id integer GENERATED ALWAYS AS IDENTITY,
    name character varying(200) NOT NULL,
    is_main_lift boolean NOT NULL,
    progression_increment_lbs numeric(5,2),
    created_by_user_id integer,
    created_at timestamp with time zone NOT NULL DEFAULT (now() at time zone 'utc'),
    CONSTRAINT "PK_exercises" PRIMARY KEY (id),
    CONSTRAINT "FK_exercises_users_created_by_user_id" FOREIGN KEY (created_by_user_id) REFERENCES users (id)
);

CREATE TABLE refresh_tokens (
    id integer GENERATED ALWAYS AS IDENTITY,
    user_id integer NOT NULL,
    token_hash character varying(128) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    replaced_by_token_hash character varying(128),
    created_by_ip character varying(45) NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT (now() at time zone 'utc'),
    CONSTRAINT "PK_refresh_tokens" PRIMARY KEY (id),
    CONSTRAINT "FK_refresh_tokens_users_user_id" FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE training_programs (
    id integer GENERATED ALWAYS AS IDENTITY,
    user_id integer NOT NULL,
    name character varying(200) NOT NULL,
    start_date date NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT (now() at time zone 'utc'),
    updated_at timestamp with time zone NOT NULL DEFAULT (now() at time zone 'utc'),
    CONSTRAINT "PK_training_programs" PRIMARY KEY (id),
    CONSTRAINT "FK_training_programs_users_user_id" FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE training_maxes (
    id integer GENERATED ALWAYS AS IDENTITY,
    user_id integer NOT NULL,
    exercise_id integer NOT NULL,
    weight_lbs numeric(8,2) NOT NULL,
    effective_date date NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT (now() at time zone 'utc'),
    CONSTRAINT "PK_training_maxes" PRIMARY KEY (id),
    CONSTRAINT "FK_training_maxes_exercises_exercise_id" FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE,
    CONSTRAINT "FK_training_maxes_users_user_id" FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE cycles (
    id integer GENERATED ALWAYS AS IDENTITY,
    program_id integer NOT NULL,
    cycle_number integer NOT NULL,
    start_date date NOT NULL,
    completed_at timestamp with time zone,
    auto_progression_applied boolean NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT (now() at time zone 'utc'),
    CONSTRAINT "PK_cycles" PRIMARY KEY (id),
    CONSTRAINT "FK_cycles_training_programs_program_id" FOREIGN KEY (program_id) REFERENCES training_programs (id) ON DELETE CASCADE
);

CREATE TABLE workouts (
    id integer GENERATED ALWAYS AS IDENTITY,
    cycle_id integer NOT NULL,
    user_id integer NOT NULL,
    primary_exercise_id integer NOT NULL,
    week_number integer NOT NULL,
    scheduled_date date,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    notes character varying(4000),
    created_at timestamp with time zone NOT NULL DEFAULT (now() at time zone 'utc'),
    CONSTRAINT "PK_workouts" PRIMARY KEY (id),
    CONSTRAINT "FK_workouts_cycles_cycle_id" FOREIGN KEY (cycle_id) REFERENCES cycles (id) ON DELETE CASCADE,
    CONSTRAINT "FK_workouts_exercises_primary_exercise_id" FOREIGN KEY (primary_exercise_id) REFERENCES exercises (id) ON DELETE RESTRICT,
    CONSTRAINT "FK_workouts_users_user_id" FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
);

CREATE TABLE workout_sets (
    id integer GENERATED ALWAYS AS IDENTITY,
    workout_id integer NOT NULL,
    exercise_id integer NOT NULL,
    set_order integer NOT NULL,
    set_type character varying(50) NOT NULL,
    weight_lbs numeric(8,2) NOT NULL,
    reps_prescribed integer NOT NULL,
    reps_actual integer,
    is_amrap boolean NOT NULL,
    rpe numeric(4,2),
    logged_at timestamp with time zone,
    CONSTRAINT "PK_workout_sets" PRIMARY KEY (id),
    CONSTRAINT "FK_workout_sets_exercises_exercise_id" FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE RESTRICT,
    CONSTRAINT "FK_workout_sets_workouts_workout_id" FOREIGN KEY (workout_id) REFERENCES workouts (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX "IX_cycles_program_id_cycle_number" ON cycles (program_id, cycle_number);

CREATE INDEX "IX_exercises_created_by_user_id" ON exercises (created_by_user_id);

CREATE UNIQUE INDEX "IX_refresh_tokens_token_hash" ON refresh_tokens (token_hash);

CREATE INDEX "IX_refresh_tokens_user_id" ON refresh_tokens (user_id);

CREATE INDEX "IX_training_maxes_exercise_id" ON training_maxes (exercise_id);

CREATE INDEX "IX_training_maxes_user_exercise_date" ON training_maxes (user_id, exercise_id, effective_date DESC);

CREATE INDEX "IX_training_programs_user_id" ON training_programs (user_id);

CREATE UNIQUE INDEX "IX_users_email" ON users (email);

CREATE UNIQUE INDEX "IX_users_google_subject_id" ON users (google_subject_id);

CREATE INDEX "IX_workout_sets_exercise_id" ON workout_sets (exercise_id);

CREATE INDEX "IX_workout_sets_workout_order" ON workout_sets (workout_id, set_order);

CREATE INDEX "IX_workouts_cycle_id" ON workouts (cycle_id);

CREATE INDEX "IX_workouts_primary_exercise_id" ON workouts (primary_exercise_id);

CREATE INDEX "IX_workouts_user_id" ON workouts (user_id);

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260409041819_InitialCreate', '10.0.5');

COMMIT;

