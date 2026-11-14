-- BAUBC OS · Foundation: schemas, settings, identity, RBAC, audit, outbox, notifications
-- Works on Supabase Postgres (15+) and on PGlite (demo mode) with supabase/shim/demo_auth.sql loaded first.
-- Design: all tables live in schema `app` (NOT exposed through the Supabase Data API).
-- The Next.js server connects directly and runs every user request inside a transaction with
-- `set local role authenticated|anon` + `request.jwt.claims`, so RLS below is always enforced.

create schema if not exists app;
create schema if not exists authz;
create schema if not exists audit;
create schema if not exists ops;
create schema if not exists private;

grant usage on schema app, authz to anon, authenticated;
revoke all on schema audit, ops, private from public;

-- ───────────────────────────── utilities ─────────────────────────────
create or replace function app.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create or replace function ops.forbid_mutation() returns trigger language plpgsql as $$
begin raise exception 'APPEND_ONLY: % is immutable', tg_table_name using errcode = 'P0001'; end $$;

create or replace function app.random_code(p_len int default 20) returns text language sql volatile as $$
  select upper(substr(encode(sha256(convert_to(gen_random_uuid()::text || clock_timestamp()::text || gen_random_uuid()::text, 'UTF8')), 'hex'), 1, p_len))
$$;

create table app.counters (key text primary key, value bigint not null default 0);
create or replace function app.next_counter(p_key text) returns bigint language sql volatile as $$
  insert into app.counters(key, value) values (p_key, 1)
  on conflict (key) do update set value = app.counters.value + 1
  returning value
$$;

-- ───────────────────────────── settings ─────────────────────────────
create table app.site_settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create or replace function app.setting(p_key text) returns jsonb language sql stable security definer set search_path = '' as $$
  select value from app.site_settings where key = p_key
$$;

-- ───────────────────────────── identity ─────────────────────────────
create table app.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  kind text not null default 'student' check (kind in ('student','teacher','external','staff')),
  full_name text not null check (length(trim(full_name)) between 2 and 120),
  full_name_bn text,
  display_name text,
  email text not null unique check (email = lower(email) and email like '%_@_%._%'),
  student_id text unique,
  academic_department text,
  academic_session text,
  batch_level text,
  photo_url text,
  avatar jsonb,
  bio text check (bio is null or length(bio) <= 600),
  facebook_url text check (facebook_url is null or facebook_url ~* '^https://(www\.|m\.)?facebook\.com/'),
  linkedin_url text check (linkedin_url is null or linkedin_url ~* '^https://(www\.)?linkedin\.com/'),
  interests text[] not null default '{}',
  skills text[] not null default '{}',
  public_profile boolean not null default false,
  status text not null default 'active' check (status in ('active','suspended','deactivated')),
  verified_locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger people_touch before update on app.people for each row execute function app.touch_updated_at();
comment on column app.people.email is 'classification:confidential';
comment on column app.people.student_id is 'classification:confidential';

-- verified fields can only change through the correction workflow once locked
create or replace function app.guard_verified_fields() returns trigger language plpgsql as $$
begin
  if old.verified_locked_at is not null
     and coalesce(current_setting('app.allow_verified_change', true), '') <> 'on'
     and (new.full_name is distinct from old.full_name
          or new.student_id is distinct from old.student_id
          or new.academic_department is distinct from old.academic_department
          or new.academic_session is distinct from old.academic_session) then
    raise exception 'VERIFIED_FIELD_LOCKED: submit a correction request' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger people_guard before update on app.people for each row execute function app.guard_verified_fields();

create table app.person_contacts (
  person_id uuid primary key references app.people(id) on delete cascade,
  phone text check (phone is null or phone ~ '^\+?[0-9 \-]{8,16}$'),
  guardian_name text,
  guardian_phone text,
  updated_at timestamptz not null default now()
);
comment on table app.person_contacts is 'classification:restricted';

create table app.roles (
  key text primary key,
  name text not null,
  description text,
  is_privileged boolean not null default false,
  requires_mfa boolean not null default false,
  sort int not null default 100
);

create table app.permissions (
  key text primary key,
  description text not null
);

create table app.role_permissions (
  role_key text not null references app.roles(key) on delete cascade,
  permission_key text not null references app.permissions(key) on delete cascade,
  primary key (role_key, permission_key)
);

create table app.org_units (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references app.org_units(id),
  kind text not null default 'wing' check (kind in ('wing','department','team','committee')),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  name_bn text,
  summary text,
  responsibilities text[] not null default '{}',
  is_public boolean not null default true,
  sort int not null default 100,
  created_at timestamptz not null default now()
);

create table app.role_assignments (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references app.people(id) on delete cascade,
  role_key text not null references app.roles(key),
  scope_type text not null default 'global' check (scope_type in ('global','unit','event')),
  scope_id uuid,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  granted_by uuid references app.people(id),
  confirmed_by uuid references app.people(id),
  revoked_at timestamptz,
  revoke_reason text,
  created_at timestamptz not null default now(),
  check (granted_by is null or granted_by <> person_id),
  check ((scope_type = 'global') = (scope_id is null))
);
create unique index role_assignments_live_uq on app.role_assignments(person_id, role_key, scope_type, coalesce(scope_id, '00000000-0000-0000-0000-000000000000'::uuid)) where revoked_at is null;
create index role_assignments_person_idx on app.role_assignments(person_id);

create table app.approval_mandates (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references app.people(id) on delete cascade,
  categories text[] not null check (cardinality(categories) > 0),
  max_amount numeric(12,2) not null default 0 check (max_amount >= 0),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  granted_by uuid references app.people(id),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (granted_by is null or granted_by <> person_id)
);

create table app.pending_privileged_changes (
  id uuid primary key default gen_random_uuid(),
  change_type text not null check (change_type in ('grant_role','grant_mandate','setting')),
  payload jsonb not null,
  summary text not null,
  requested_by uuid not null references app.people(id),
  expires_at timestamptz not null default now() + interval '72 hours',
  confirmed_by uuid references app.people(id),
  confirmed_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  check (confirmed_by is null or confirmed_by <> requested_by)
);

create table app.account_provisions (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references app.people(id) on delete cascade,
  email text not null,
  source text not null check (source in ('google_form','native_form','admin_invite','bootstrap','event_guest')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_by uuid references app.people(id),
  created_at timestamptz not null default now()
);

create table app.unit_memberships (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references app.people(id) on delete cascade,
  unit_id uuid not null references app.org_units(id) on delete cascade,
  position_title text not null default 'Member',
  is_lead boolean not null default false,
  term_label text,
  started_at date not null default current_date,
  ended_at date,
  verified_by uuid references app.people(id),
  created_at timestamptz not null default now()
);
create unique index unit_memberships_live_uq on app.unit_memberships(person_id, unit_id) where ended_at is null;

create table app.consent_records (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references app.people(id) on delete cascade,
  purpose text not null check (purpose in ('membership_processing','public_profile','gallery_photos','marketing_email','social_linking')),
  notice_version text not null default '2026-11',
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz
);
create unique index consent_live_uq on app.consent_records(person_id, purpose) where withdrawn_at is null;

-- ───────────────────────────── authz helpers ─────────────────────────────
create or replace function authz.claims() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

create or replace function authz.current_person_id() returns uuid language sql stable security definer set search_path = '' as $$
  select p.id from app.people p
  where p.user_id = nullif(authz.claims()->>'sub', '')::uuid and p.status = 'active'
$$;

create or replace function authz.is_super_admin(p_person uuid default null) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from app.role_assignments ra
    where ra.person_id = coalesce(p_person, authz.current_person_id())
      and ra.role_key = 'super_admin' and ra.revoked_at is null
      and now() >= ra.valid_from and (ra.valid_until is null or now() < ra.valid_until)
  )
$$;

create or replace function authz.has_role(p_role text) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from app.role_assignments ra
    where ra.person_id = authz.current_person_id() and ra.role_key = p_role and ra.revoked_at is null
      and now() >= ra.valid_from and (ra.valid_until is null or now() < ra.valid_until)
  )
$$;

create or replace function authz.has_perm(p_perm text, p_scope_type text default null, p_scope_id uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select authz.current_person_id() is not null and (
    authz.is_super_admin()
    or exists (
      select 1
      from app.role_assignments ra
      join app.role_permissions rp on rp.role_key = ra.role_key
      where ra.person_id = authz.current_person_id()
        and rp.permission_key = p_perm
        and ra.revoked_at is null
        and now() >= ra.valid_from and (ra.valid_until is null or now() < ra.valid_until)
        and (ra.scope_type = 'global'
             or (p_scope_type is not null and ra.scope_type = p_scope_type and ra.scope_id = p_scope_id))
    )
  )
$$;

-- "any scope" check: true when the person holds the permission globally or in at least one scope
create or replace function authz.has_perm_any(p_perm text) returns boolean language sql stable security definer set search_path = '' as $$
  select authz.current_person_id() is not null and (
    authz.is_super_admin()
    or exists (
      select 1 from app.role_assignments ra join app.role_permissions rp on rp.role_key = ra.role_key
      where ra.person_id = authz.current_person_id() and rp.permission_key = p_perm and ra.revoked_at is null
        and now() >= ra.valid_from and (ra.valid_until is null or now() < ra.valid_until)
    )
  )
$$;

create or replace function authz.require(p_perm text, p_scope_type text default null, p_scope_id uuid default null)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if authz.current_person_id() is null then
    raise exception 'NOT_SIGNED_IN' using errcode = '42501';
  end if;
  if not authz.has_perm(p_perm, p_scope_type, p_scope_id) then
    raise exception 'PERMISSION_DENIED: %', p_perm using errcode = '42501';
  end if;
end $$;

create or replace function authz.require_aal2() returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce((app.setting('security')->>'mfa_required')::boolean, true)
     and coalesce(authz.claims()->>'aal', 'aal1') <> 'aal2' then
    raise exception 'MFA_REQUIRED: verify with your authenticator app first' using errcode = '42501';
  end if;
end $$;

-- Display name only (no contact data) for signed-in users: lets approvers and reviewers see who is involved
-- without granting them read access to people records.
create or replace function app.person_label(p_id uuid) returns text language sql stable security definer set search_path = '' as $$
  select case when authz.current_person_id() is null then null else coalesce(display_name, full_name) end from app.people where id = p_id
$$;

-- ───────────────────────────── audit (hash-chained) ─────────────────────────────
create table audit.audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_person_id uuid,
  actor_kind text not null default 'person' check (actor_kind in ('person','system')),
  action text not null,
  entity_type text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  prev_hash text,
  hash text not null
);
create index audit_entity_idx on audit.audit_log(entity_type, entity_id);
create index audit_actor_idx on audit.audit_log(actor_person_id, occurred_at desc);
create trigger audit_immutable before update or delete on audit.audit_log for each row execute function ops.forbid_mutation();
alter table audit.audit_log enable row level security;
grant usage on schema audit to authenticated;
grant select on audit.audit_log to authenticated;
-- policy is created after authz helpers exist (see end of file)

create or replace function app.audit(p_action text, p_entity_type text, p_entity_id text, p_before jsonb default null, p_after jsonb default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_prev text; v_actor uuid := authz.current_person_id(); v_at timestamptz := clock_timestamp(); v_hash text;
begin
  perform pg_advisory_xact_lock(hashtext('baubc.audit_chain'));
  select hash into v_prev from audit.audit_log order by id desc limit 1;
  v_hash := encode(sha256(convert_to(coalesce(v_prev, 'GENESIS') || '|' || v_at::text || '|' || coalesce(v_actor::text, 'system') || '|' ||
            p_action || '|' || p_entity_type || '|' || coalesce(p_entity_id, '') || '|' || coalesce(p_before::text, '') || '|' || coalesce(p_after::text, ''), 'UTF8')), 'hex');
  insert into audit.audit_log(occurred_at, actor_person_id, actor_kind, action, entity_type, entity_id, before, after, prev_hash, hash)
  values (v_at, v_actor, case when v_actor is null then 'system' else 'person' end, p_action, p_entity_type, p_entity_id, p_before, p_after, v_prev, v_hash);
end $$;

create or replace function app.verify_audit_chain() returns table(ok boolean, checked bigint, first_bad_id bigint)
language plpgsql security definer set search_path = '' as $$
declare r record; v_prev text := null; v_n bigint := 0; v_expected text;
begin
  if authz.current_person_id() is not null and not authz.has_perm('audit.read') then raise exception 'PERMISSION_DENIED: audit.read'; end if;
  for r in select * from audit.audit_log order by id loop
    v_n := v_n + 1;
    v_expected := encode(sha256(convert_to(coalesce(v_prev, 'GENESIS') || '|' || r.occurred_at::text || '|' || coalesce(r.actor_person_id::text, 'system') || '|' ||
                  r.action || '|' || r.entity_type || '|' || coalesce(r.entity_id, '') || '|' || coalesce(r.before::text, '') || '|' || coalesce(r.after::text, ''), 'UTF8')), 'hex');
    if r.hash <> v_expected or r.prev_hash is distinct from v_prev then
      ok := false; checked := v_n; first_bad_id := r.id; return next; return;
    end if;
    v_prev := r.hash;
  end loop;
  ok := true; checked := v_n; first_bad_id := null; return next;
end $$;

-- ───────────────────────────── outbox, notifications, email log ─────────────────────────────
create table ops.outbox (
  id bigint generated always as identity primary key,
  topic text not null,
  payload jsonb not null default '{}',
  dedupe_key text unique,
  created_at timestamptz not null default now(),
  available_at timestamptz not null default now(),
  attempts int not null default 0,
  last_error text,
  locked_until timestamptz,
  done_at timestamptz,
  dead boolean not null default false
);
create index outbox_ready_idx on ops.outbox(available_at) where done_at is null and not dead;

create or replace function app.enqueue(p_topic text, p_payload jsonb, p_dedupe text default null) returns void
language sql security definer set search_path = '' as $$
  insert into ops.outbox(topic, payload, dedupe_key) values (p_topic, p_payload, p_dedupe) on conflict (dedupe_key) do nothing
$$;

create table app.notifications (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references app.people(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (person_id, dedupe_key)
);
create index notifications_person_idx on app.notifications(person_id, created_at desc);

create or replace function app.notify(p_person uuid, p_type text, p_title text, p_body text, p_link text, p_dedupe text)
returns void language sql security definer set search_path = '' as $$
  insert into app.notifications(person_id, type, title, body, link, dedupe_key)
  values (p_person, p_type, p_title, p_body, p_link, p_dedupe) on conflict (person_id, dedupe_key) do nothing
$$;

create table app.email_log (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  subject text not null,
  template text not null,
  body_text text not null,
  status text not null default 'queued' check (status in ('queued','sent','logged','failed')),
  provider_id text,
  error text,
  created_at timestamptz not null default now()
);
comment on table app.email_log is 'Transactional email record. In preview mode emails are logged here instead of sent.';

-- ───────────────────────────── RLS ─────────────────────────────
alter table app.counters enable row level security;
alter table app.site_settings enable row level security;
alter table app.people enable row level security;
alter table app.person_contacts enable row level security;
alter table app.roles enable row level security;
alter table app.permissions enable row level security;
alter table app.role_permissions enable row level security;
alter table app.org_units enable row level security;
alter table app.role_assignments enable row level security;
alter table app.approval_mandates enable row level security;
alter table app.pending_privileged_changes enable row level security;
alter table app.account_provisions enable row level security;
alter table app.unit_memberships enable row level security;
alter table app.consent_records enable row level security;
alter table app.notifications enable row level security;
alter table app.email_log enable row level security;

create policy settings_read_public on app.site_settings for select to anon, authenticated using (is_public or authz.has_perm('settings.manage'));
create policy settings_write on app.site_settings for update to authenticated using (authz.has_perm('settings.manage')) with check (authz.has_perm('settings.manage'));

create policy people_read on app.people for select to authenticated using (
  id = authz.current_person_id() or authz.has_perm_any('people.read'));
create policy contacts_read on app.person_contacts for select to authenticated using (
  person_id = authz.current_person_id() or authz.has_perm('people.read_restricted'));

create policy roles_read on app.roles for select to authenticated using (true);
create policy permissions_read on app.permissions for select to authenticated using (true);
create policy role_permissions_read on app.role_permissions for select to authenticated using (true);

create policy org_units_read on app.org_units for select to anon, authenticated using (is_public or authz.has_perm_any('people.read'));
create policy org_units_write on app.org_units for all to authenticated using (authz.has_perm('org.manage')) with check (authz.has_perm('org.manage'));

create policy role_assignments_read on app.role_assignments for select to authenticated using (
  person_id = authz.current_person_id() or authz.has_perm('rbac.manage'));
create policy mandates_read on app.approval_mandates for select to authenticated using (
  person_id = authz.current_person_id() or authz.has_perm('rbac.manage'));
create policy ppc_read on app.pending_privileged_changes for select to authenticated using (authz.is_super_admin());
create policy unit_memberships_read on app.unit_memberships for select to authenticated using (
  person_id = authz.current_person_id() or authz.has_perm_any('people.read'));
create policy consent_read on app.consent_records for select to authenticated using (person_id = authz.current_person_id() or authz.has_perm('privacy.handle'));
create policy notifications_read on app.notifications for select to authenticated using (person_id = authz.current_person_id());
create policy notifications_mark on app.notifications for update to authenticated using (person_id = authz.current_person_id()) with check (person_id = authz.current_person_id());
create policy email_log_read on app.email_log for select to authenticated using (authz.has_perm('integration.manage'));
-- counters, account_provisions: no policies (server/system only)
create policy audit_read on audit.audit_log for select to authenticated using (authz.has_perm('audit.read') or actor_person_id = authz.current_person_id());

grant select on app.site_settings, app.org_units to anon;
grant update (value, updated_at, updated_by) on app.site_settings to authenticated;
grant update (read_at) on app.notifications to authenticated;
grant insert, update, delete on app.org_units to authenticated;
