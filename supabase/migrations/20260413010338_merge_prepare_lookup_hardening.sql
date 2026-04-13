BEGIN;

CREATE TABLE IF NOT EXISTS public.auth_user_email_index (
	user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
	normalized_email text,
	is_anonymous boolean NOT NULL DEFAULT false,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CHECK (normalized_email IS NULL OR normalized_email = lower(normalized_email))
);

ALTER TABLE public.auth_user_email_index ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_user_email_index_normalized_email
	ON public.auth_user_email_index (normalized_email)
	WHERE normalized_email IS NOT NULL;

CREATE OR REPLACE FUNCTION private.sync_auth_user_email_index()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
	IF TG_OP = 'DELETE' THEN
		DELETE FROM public.auth_user_email_index
		WHERE user_id = OLD.id;

		RETURN OLD;
	END IF;

	INSERT INTO public.auth_user_email_index (user_id, normalized_email, is_anonymous)
	VALUES (
		NEW.id,
		lower(NEW.email),
		COALESCE(NEW.is_anonymous, false)
	)
	ON CONFLICT (user_id) DO UPDATE
	SET normalized_email = EXCLUDED.normalized_email,
		is_anonymous = EXCLUDED.is_anonymous,
		updated_at = now();

	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_auth_user_email_index ON auth.users;
CREATE TRIGGER sync_auth_user_email_index
	AFTER INSERT OR UPDATE OF email, is_anonymous OR DELETE ON auth.users
	FOR EACH ROW EXECUTE FUNCTION private.sync_auth_user_email_index();

INSERT INTO public.auth_user_email_index (user_id, normalized_email, is_anonymous)
SELECT
	users.id,
	lower(users.email),
	COALESCE(users.is_anonymous, false)
FROM auth.users users
ON CONFLICT (user_id) DO UPDATE
SET normalized_email = EXCLUDED.normalized_email,
	is_anonymous = EXCLUDED.is_anonymous,
	updated_at = now();

COMMIT;