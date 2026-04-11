BEGIN;

-- Rewrite existing set_type values
UPDATE workout_sets
SET set_type = 'variation'
WHERE set_type = 'supplement';

-- Drop old constraint, add new one (temporarily allow both for safe rollout)
ALTER TABLE workout_sets
  DROP CONSTRAINT IF EXISTS workout_sets_set_type_check;

ALTER TABLE workout_sets
  ADD CONSTRAINT workout_sets_set_type_check
  CHECK (set_type IN ('warmup', 'main', 'amrap', 'variation', 'supplement', 'accessory'));

-- Rewrite config jsonb keys
UPDATE training_programs
SET config =
  CASE
    WHEN config IS NULL THEN NULL
    WHEN config ? 'supplement_key' AND NOT (config ? 'variation_key')
      THEN jsonb_set(config - 'supplement_key', '{variation_key}', config -> 'supplement_key', true)
    WHEN config ? 'supplement_key' AND config ? 'variation_key'
      THEN config - 'supplement_key'
    ELSE config
  END
WHERE config ? 'supplement_key';

COMMIT;