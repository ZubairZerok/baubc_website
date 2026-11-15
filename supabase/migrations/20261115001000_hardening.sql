-- BAUBC OS · Hardening flagged by the Supabase security advisor: pin the search path of helper functions.
-- (Tables reported as "RLS enabled, no policy" — account_provisions, counters, private.perk_codes — are deny-all on purpose:
--  only SECURITY DEFINER functions touch them.)
alter function authz.claims() set search_path = '';
alter function ops.forbid_mutation() set search_path = '';
alter function app.touch_updated_at() set search_path = '';
alter function app.random_code(int) set search_path = '';
alter function app.next_counter(text) set search_path = '';
alter function app.guard_verified_fields() set search_path = '';
alter function app.guard_locked_submission() set search_path = '';
