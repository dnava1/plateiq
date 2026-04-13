BEGIN;

CREATE INDEX IF NOT EXISTS idx_strength_benchmark_points_lift_slug
  ON private.strength_benchmark_points (lift_slug);

COMMIT;