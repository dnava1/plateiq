BEGIN;

ALTER FUNCTION private.get_strength_age_multiplier(int, text) SECURITY DEFINER;
ALTER FUNCTION private.get_strength_benchmark_one_rm(text, text, numeric, int, text) SECURITY DEFINER;
ALTER FUNCTION private.get_strength_profile(date, date) SECURITY DEFINER;

REVOKE ALL ON FUNCTION private.get_strength_age_multiplier(int, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.get_strength_age_multiplier(int, text) FROM anon;
REVOKE ALL ON FUNCTION private.get_strength_age_multiplier(int, text) FROM authenticated;

REVOKE ALL ON FUNCTION private.get_strength_benchmark_one_rm(text, text, numeric, int, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.get_strength_benchmark_one_rm(text, text, numeric, int, text) FROM anon;
REVOKE ALL ON FUNCTION private.get_strength_benchmark_one_rm(text, text, numeric, int, text) FROM authenticated;

REVOKE ALL ON FUNCTION private.get_strength_profile(date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.get_strength_profile(date, date) FROM anon;
REVOKE ALL ON FUNCTION private.get_strength_profile(date, date) FROM authenticated;
GRANT EXECUTE ON FUNCTION private.get_strength_profile(date, date) TO authenticated;

COMMIT;