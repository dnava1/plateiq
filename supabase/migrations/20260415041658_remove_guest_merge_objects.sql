BEGIN;

DROP TRIGGER IF EXISTS sync_auth_user_email_index ON auth.users;
DROP FUNCTION IF EXISTS private.sync_auth_user_email_index();
DROP TABLE IF EXISTS public.auth_user_email_index;

DROP FUNCTION IF EXISTS public.merge_guest_account(uuid, uuid);
DROP FUNCTION IF EXISTS private.resolve_merged_exercise_name(uuid, text);
DROP TABLE IF EXISTS public.account_merge_intents;

COMMIT;