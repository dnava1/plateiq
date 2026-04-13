ALTER TABLE workout_sets DROP CONSTRAINT IF EXISTS workout_sets_intensity_type_check;

ALTER TABLE workout_sets
ADD CONSTRAINT workout_sets_intensity_type_check
  CHECK (intensity_type IN (
    'percentage_tm',
    'percentage_1rm',
    'rpe',
    'fixed_weight',
    'bodyweight',
    'percentage_work_set'
  ));

-- The workout set idempotency guarantee is finalized in 004 after legacy duplicates
-- are removed, so this migration only updates the intensity constraint.