-- BAUBC OS · Supabase platform wiring (safe no-op in preview mode)
-- 1) Auth hook: block every sign-up that has no open provision (defence in depth on top of "Allow new users to sign up = off").
--    Enable in Dashboard → Authentication → Hooks → "Before User Created" → Postgres function app.hook_before_user_created.
-- 2) pg_cron schedules for hold expiry, waitlist promotion and dues generation (requires the pg_cron extension).

create or replace function app.hook_before_user_created(event jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_email text := lower(coalesce(event->'user'->>'email', ''));
begin
  if exists (select 1 from app.account_provisions where email = v_email and consumed_at is null and expires_at > now())
     or exists (select 1 from app.people where email = v_email and user_id is null and status = 'active'
                and exists (select 1 from app.account_provisions ap where ap.person_id = people.id)) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object('http_code', 403,
    'message', 'Accounts are created by BAUBC. Apply through the Join page or ask an administrator for an invitation.'));
end $$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    execute 'grant usage on schema app to supabase_auth_admin';
    execute 'grant execute on function app.hook_before_user_created(jsonb) to supabase_auth_admin';
    execute 'grant select on app.account_provisions, app.people to supabase_auth_admin';
  end if;
end $$;
revoke execute on function app.hook_before_user_created(jsonb) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.unschedule(jobname) from cron.job where jobname in ('baubc_expire_holds','baubc_dues');
    perform cron.schedule('baubc_expire_holds', '* * * * *', 'select app.expire_holds(null)');
    perform cron.schedule('baubc_dues', '20 0 1 * *', $c$select app.generate_dues((now() at time zone 'Asia/Dhaka')::date)$c$);
  end if;
exception when others then
  raise notice 'pg_cron not configured (%). Use the /api/jobs/run cron endpoint instead.', sqlerrm;
end $$;
