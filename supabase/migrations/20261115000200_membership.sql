-- BAUBC OS · Membership: cycles, configurable states/transitions, applications, memberships, decisions

create table app.membership_cycles (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  opens_at timestamptz,
  closes_at timestamptz,
  intake_form_url text,
  status text not null default 'planned' check (status in ('planned','open','closed')),
  notes text,
  created_at timestamptz not null default now()
);
create unique index one_open_cycle on app.membership_cycles((true)) where status = 'open';

create table app.membership_states (
  key text primary key,
  label text not null,
  label_bn text,
  category text not null check (category in ('applicant','member','former')),
  is_terminal boolean not null default false,
  counts_as_member boolean not null default false,
  sort int not null default 100
);

create table app.membership_transitions (
  from_key text not null references app.membership_states(key),
  to_key text not null references app.membership_states(key),
  permission text not null,
  requires_reason boolean not null default false,
  requires_mfa boolean not null default false,
  primary key (from_key, to_key)
);

create table app.applications (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid references app.membership_cycles(id),
  person_id uuid not null references app.people(id) on delete cascade,
  source text not null check (source in ('google_form','native_form','admin')),
  source_response_id text,
  answers jsonb not null default '{}',
  preferred_units text[] not null default '{}',
  status_key text not null references app.membership_states(key),
  late_submission boolean not null default false,
  duplicate_of uuid references app.applications(id),
  assigned_reviewer_id uuid references app.people(id),
  submitted_at timestamptz not null default now(),
  email_verified_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (source, source_response_id)
);
create index applications_cycle_status_idx on app.applications(cycle_id, status_key);
create index applications_person_idx on app.applications(person_id);
create trigger applications_touch before update on app.applications for each row execute function app.touch_updated_at();

create table app.memberships (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null unique references app.people(id) on delete cascade,
  application_id uuid references app.applications(id),
  member_no text not null unique,
  status_key text not null references app.membership_states(key),
  finalized_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table app.membership_status_events (
  id bigint generated always as identity primary key,
  application_id uuid references app.applications(id) on delete cascade,
  membership_id uuid references app.memberships(id) on delete cascade,
  from_state text,
  to_state text not null,
  actor_person_id uuid references app.people(id),
  actor_roles text[],
  reason text,
  notes text,
  batch_id uuid,
  created_at timestamptz not null default now(),
  check (num_nonnulls(application_id, membership_id) >= 1)
);
create trigger membership_events_immutable before update or delete on app.membership_status_events for each row execute function ops.forbid_mutation();

create table app.info_requests (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references app.applications(id) on delete cascade,
  requested_by uuid references app.people(id),
  message text not null,
  due_at timestamptz,
  response text,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

create table app.profile_change_requests (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references app.people(id) on delete cascade,
  field text not null check (field in ('full_name','full_name_bn','student_id','academic_department','academic_session','batch_level')),
  old_value text,
  new_value text not null,
  reason text not null,
  status text not null default 'requested' check (status in ('requested','approved','rejected')),
  reviewer_id uuid references app.people(id),
  decision_note text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

-- ───────────────────────────── helpers ─────────────────────────────
create or replace function authz.is_member(p_person uuid default null) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from app.memberships m join app.membership_states s on s.key = m.status_key
    where m.person_id = coalesce(p_person, authz.current_person_id()) and s.counts_as_member
  )
$$;

create or replace function app.role_snapshot() returns text[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(distinct ra.role_key), '{}') from app.role_assignments ra
  where ra.person_id = authz.current_person_id() and ra.revoked_at is null
$$;

-- ───────────────────────────── intake (system: called by the webhook handler) ─────────────────────────────
-- p_payload: { response_id, email, full_name, full_name_bn, student_id, department, session, batch, phone,
--              facebook_url, linkedin_url, bio, interests[], skills[], experience, preferred_units[], consents{...} }
create or replace function app.ingest_application(p_source text, p_payload jsonb, p_token_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(trim(p_payload->>'email'));
  v_person uuid; v_cycle app.membership_cycles; v_app uuid; v_existing uuid; v_needs_activation boolean; v_key text;
begin
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'INVALID_EMAIL'; end if;
  if coalesce(trim(p_payload->>'full_name'), '') = '' then raise exception 'NAME_REQUIRED'; end if;
  for v_key in select jsonb_object_keys(p_payload) loop
    if v_key ~* '(pass(word)?|pin|otp|secret)' then raise exception 'FORBIDDEN_FIELD: % (passwords are never collected)', v_key; end if;
  end loop;

  select id into v_existing from app.applications where source = p_source and source_response_id = p_payload->>'response_id';
  if v_existing is not null then
    return jsonb_build_object('application_id', v_existing, 'duplicate_delivery', true);
  end if;

  select * into v_cycle from app.membership_cycles where status = 'open' limit 1;

  select id into v_person from app.people where email = v_email;
  if v_person is null and nullif(p_payload->>'student_id', '') is not null then
    select id into v_person from app.people where student_id = p_payload->>'student_id';
  end if;
  if v_person is null then
    insert into app.people(kind, full_name, full_name_bn, email, student_id, academic_department, academic_session, batch_level,
                           facebook_url, linkedin_url, bio, interests, skills)
    values ('student', trim(p_payload->>'full_name'), nullif(p_payload->>'full_name_bn', ''), v_email,
            nullif(trim(p_payload->>'student_id'), ''), nullif(p_payload->>'department', ''), nullif(p_payload->>'session', ''),
            nullif(p_payload->>'batch', ''),
            case when p_payload->>'facebook_url' ~* '^https://(www\.|m\.)?facebook\.com/' then p_payload->>'facebook_url' end,
            case when p_payload->>'linkedin_url' ~* '^https://(www\.)?linkedin\.com/' then p_payload->>'linkedin_url' end,
            left(nullif(p_payload->>'bio', ''), 600),
            coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_payload->'interests', '[]')) x), '{}'),
            coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_payload->'skills', '[]')) x), '{}'))
    returning id into v_person;
    if nullif(p_payload->>'phone', '') is not null then
      insert into app.person_contacts(person_id, phone) values (v_person, p_payload->>'phone') on conflict (person_id) do nothing;
    end if;
  end if;

  insert into app.applications(cycle_id, person_id, source, source_response_id, answers, preferred_units, status_key, late_submission)
  values (v_cycle.id, v_person, p_source, p_payload->>'response_id', p_payload - 'phone',
          coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_payload->'preferred_units', '[]')) x), '{}'),
          'submitted', v_cycle.id is null)
  returning id into v_app;

  insert into app.membership_status_events(application_id, from_state, to_state, reason)
  values (v_app, null, 'submitted', 'Received from ' || p_source || case when v_cycle.id is null then ' (no open cycle: late submission)' else '' end);

  insert into app.consent_records(person_id, purpose)
  select v_person, 'membership_processing' where not exists (
    select 1 from app.consent_records where person_id = v_person and purpose = 'membership_processing' and withdrawn_at is null);

  select user_id is null into v_needs_activation from app.people where id = v_person;
  if v_needs_activation and p_token_hash is not null then
    update app.account_provisions set expires_at = now() where person_id = v_person and consumed_at is null;
    insert into app.account_provisions(person_id, email, source, token_hash, expires_at)
    values (v_person, v_email, case when p_source = 'google_form' then 'google_form' else 'native_form' end, p_token_hash, now() + interval '72 hours');
  end if;

  perform app.audit('application.ingested', 'application', v_app::text, null, jsonb_build_object('source', p_source, 'person', v_person));
  return jsonb_build_object('application_id', v_app, 'person_id', v_person, 'email', v_email,
                            'needs_activation', v_needs_activation, 'late', v_cycle.id is null);
end $$;

-- Admin invite (teachers, staff, bootstrap). Token is generated by the app; only its hash is stored.
create or replace function app.invite_person(p_email text, p_full_name text, p_kind text, p_role text, p_token_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_email text := lower(trim(p_email)); v_person uuid; v_priv boolean;
begin
  perform authz.require('identity.invite');
  select id into v_person from app.people where email = v_email;
  if v_person is null then
    insert into app.people(kind, full_name, email) values (coalesce(p_kind, 'student'), trim(p_full_name), v_email) returning id into v_person;
  end if;
  if p_role is not null then
    select is_privileged into v_priv from app.roles where key = p_role;
    if v_priv is null then raise exception 'UNKNOWN_ROLE'; end if;
    if v_priv then
      perform app.request_privileged_change('grant_role', jsonb_build_object('person_id', v_person, 'role_key', p_role), 'Grant ' || p_role || ' to ' || v_email);
    else
      insert into app.role_assignments(person_id, role_key, granted_by) values (v_person, p_role, authz.current_person_id())
      on conflict do nothing;
    end if;
  end if;
  if (select user_id from app.people where id = v_person) is null then
    update app.account_provisions set expires_at = now() where person_id = v_person and consumed_at is null;
    insert into app.account_provisions(person_id, email, source, token_hash, expires_at, created_by)
    values (v_person, v_email, 'admin_invite', p_token_hash, now() + interval '72 hours', authz.current_person_id());
  end if;
  perform app.audit('person.invited', 'person', v_person::text, null, jsonb_build_object('email', v_email, 'role', p_role));
  return jsonb_build_object('person_id', v_person, 'email', v_email);
end $$;

-- Validate an activation token (system). Returns null when invalid/expired/consumed.
create or replace function app.lookup_provision(p_token_hash text) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('provision_id', ap.id, 'person_id', p.id, 'email', ap.email, 'full_name', p.full_name, 'has_user', p.user_id is not null)
  from app.account_provisions ap join app.people p on p.id = ap.person_id
  where ap.token_hash = p_token_hash and ap.consumed_at is null and ap.expires_at > now()
$$;

-- Consume token after the auth user exists (system).
create or replace function app.consume_provision(p_token_hash text, p_user_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_prov app.account_provisions; v_app record;
begin
  select * into v_prov from app.account_provisions where token_hash = p_token_hash for update;
  if v_prov.id is null or v_prov.consumed_at is not null or v_prov.expires_at <= now() then
    raise exception 'ACTIVATION_LINK_INVALID';
  end if;
  update app.people set user_id = p_user_id where id = v_prov.person_id and (user_id is null or user_id = p_user_id);
  update app.account_provisions set consumed_at = now() where id = v_prov.id;
  for v_app in select id, status_key from app.applications where person_id = v_prov.person_id and status_key = 'submitted' loop
    update app.applications set status_key = 'pending_review', email_verified_at = now() where id = v_app.id;
    insert into app.membership_status_events(application_id, from_state, to_state, reason)
    values (v_app.id, 'submitted', 'email_verified', 'Activation link used'),
           (v_app.id, 'email_verified', 'pending_review', 'Automatic');
  end loop;
  perform app.audit('account.activated', 'person', v_prov.person_id::text, null, jsonb_build_object('source', v_prov.source));
  return jsonb_build_object('person_id', v_prov.person_id, 'email', v_prov.email);
end $$;

-- ───────────────────────────── decisions ─────────────────────────────
create or replace function app.transition_application(p_application uuid, p_to text, p_reason text default null, p_notes text default null, p_batch uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_app app.applications; v_tr app.membership_transitions; v_member_no text; v_membership uuid; v_person app.people; v_label text;
begin
  select * into v_app from app.applications where id = p_application for update;
  if v_app.id is null then raise exception 'NOT_FOUND'; end if;
  select * into v_tr from app.membership_transitions where from_key = v_app.status_key and to_key = p_to;
  if v_tr.from_key is null then raise exception 'ILLEGAL_TRANSITION: % → %', v_app.status_key, p_to; end if;
  perform authz.require(v_tr.permission);
  if v_tr.requires_mfa then perform authz.require_aal2(); end if;
  if v_tr.requires_reason and coalesce(trim(p_reason), '') = '' then raise exception 'REASON_REQUIRED'; end if;
  if v_app.person_id = authz.current_person_id() then raise exception 'SOD_VIOLATION: you cannot decide your own application'; end if;

  update app.applications set status_key = p_to where id = v_app.id;
  insert into app.membership_status_events(application_id, from_state, to_state, actor_person_id, actor_roles, reason, notes, batch_id)
  values (v_app.id, v_app.status_key, p_to, authz.current_person_id(), app.role_snapshot(), p_reason, p_notes, p_batch);

  select * into v_person from app.people where id = v_app.person_id;
  select label into v_label from app.membership_states where key = p_to;

  if p_to = 'finalized' then
    v_member_no := 'BAUBC-' || to_char(now() at time zone 'Asia/Dhaka', 'YYYY') || '-' ||
                   lpad(app.next_counter('member_no_' || to_char(now() at time zone 'Asia/Dhaka', 'YYYY'))::text, 4, '0');
    insert into app.memberships(person_id, application_id, member_no, status_key)
    values (v_app.person_id, v_app.id, v_member_no, 'active')
    on conflict (person_id) do update set status_key = 'active', ended_at = null, application_id = excluded.application_id
    returning id into v_membership;
    insert into app.membership_status_events(membership_id, application_id, from_state, to_state, actor_person_id, reason)
    values (v_membership, v_app.id, 'finalized', 'active', authz.current_person_id(), 'Membership activated');
    update app.people set verified_locked_at = coalesce(verified_locked_at, now()) where id = v_app.person_id;
  end if;

  if v_person.id is not null then
    perform app.notify(v_person.id, 'membership', 'Application update: ' || v_label,
      coalesce(p_reason, 'Your application status changed to ' || v_label || '.'), '/app/application', 'app:' || v_app.id || ':' || p_to);
    perform app.enqueue('email.membership_status', jsonb_build_object('to', v_person.email, 'name', v_person.full_name, 'status', v_label,
      'reason', p_reason, 'member_no', v_member_no), 'email:app:' || v_app.id || ':' || p_to);
  end if;
  perform app.audit('application.transition', 'application', v_app.id::text,
    jsonb_build_object('status', v_app.status_key), jsonb_build_object('status', p_to, 'reason', p_reason));
  return jsonb_build_object('application_id', v_app.id, 'status', p_to, 'member_no', v_member_no);
end $$;

create or replace function app.transition_membership(p_membership uuid, p_to text, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_m app.memberships; v_tr app.membership_transitions;
begin
  select * into v_m from app.memberships where id = p_membership for update;
  if v_m.id is null then raise exception 'NOT_FOUND'; end if;
  select * into v_tr from app.membership_transitions where from_key = v_m.status_key and to_key = p_to;
  if v_tr.from_key is null then raise exception 'ILLEGAL_TRANSITION: % → %', v_m.status_key, p_to; end if;
  perform authz.require(v_tr.permission);
  if v_tr.requires_mfa then perform authz.require_aal2(); end if;
  if v_tr.requires_reason and coalesce(trim(p_reason), '') = '' then raise exception 'REASON_REQUIRED'; end if;
  if v_m.person_id = authz.current_person_id() and p_to <> 'withdrawn' then raise exception 'SOD_VIOLATION'; end if;
  update app.memberships set status_key = p_to, ended_at = case when p_to in ('withdrawn','alumni') then now() else null end where id = v_m.id;
  insert into app.membership_status_events(membership_id, from_state, to_state, actor_person_id, actor_roles, reason)
  values (v_m.id, v_m.status_key, p_to, authz.current_person_id(), app.role_snapshot(), p_reason);
  perform app.notify(v_m.person_id, 'membership', 'Membership status: ' || p_to, p_reason, '/app', 'mem:' || v_m.id || ':' || p_to || ':' || now()::date);
  perform app.audit('membership.transition', 'membership', v_m.id::text, jsonb_build_object('status', v_m.status_key), jsonb_build_object('status', p_to, 'reason', p_reason));
end $$;

create or replace function app.request_info(p_application uuid, p_message text, p_due timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare v_person app.people;
begin
  perform app.transition_application(p_application, 'info_requested', p_message, null, null);
  insert into app.info_requests(application_id, requested_by, message, due_at) values (p_application, authz.current_person_id(), p_message, p_due);
  select p.* into v_person from app.people p join app.applications a on a.person_id = p.id where a.id = p_application;
  perform app.enqueue('email.info_request', jsonb_build_object('to', v_person.email, 'name', v_person.full_name, 'message', p_message, 'due', p_due), null);
end $$;

create or replace function app.respond_info_request(p_request uuid, p_response text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_ir app.info_requests; v_app app.applications;
begin
  select * into v_ir from app.info_requests where id = p_request for update;
  select * into v_app from app.applications where id = v_ir.application_id;
  if v_app.person_id is distinct from authz.current_person_id() then raise exception 'PERMISSION_DENIED'; end if;
  if v_ir.responded_at is not null then raise exception 'ALREADY_RESPONDED'; end if;
  if coalesce(trim(p_response), '') = '' then raise exception 'RESPONSE_REQUIRED'; end if;
  update app.info_requests set response = p_response, responded_at = now() where id = v_ir.id;
  if v_app.status_key = 'info_requested' then
    update app.applications set status_key = 'under_review' where id = v_app.id;
    insert into app.membership_status_events(application_id, from_state, to_state, actor_person_id, reason)
    values (v_app.id, 'info_requested', 'under_review', authz.current_person_id(), 'Applicant responded');
  end if;
  perform app.audit('application.info_response', 'application', v_app.id::text, null, jsonb_build_object('request', v_ir.id));
end $$;

create or replace function app.request_profile_change(p_field text, p_new text, p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_me uuid := authz.current_person_id(); v_old text; v_id uuid;
begin
  if v_me is null then raise exception 'NOT_SIGNED_IN'; end if;
  execute format('select (%I)::text from app.people where id = $1', p_field) into v_old using v_me;
  insert into app.profile_change_requests(person_id, field, old_value, new_value, reason)
  values (v_me, p_field, v_old, trim(p_new), p_reason) returning id into v_id;
  perform app.audit('profile.change_requested', 'person', v_me::text, null, jsonb_build_object('field', p_field));
  return v_id;
end $$;

create or replace function app.decide_profile_change(p_request uuid, p_approve boolean, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_r app.profile_change_requests;
begin
  perform authz.require('people.verify');
  select * into v_r from app.profile_change_requests where id = p_request for update;
  if v_r.status <> 'requested' then raise exception 'ALREADY_DECIDED'; end if;
  if v_r.person_id = authz.current_person_id() then raise exception 'SOD_VIOLATION'; end if;
  if p_approve then
    perform set_config('app.allow_verified_change', 'on', true);
    execute format('update app.people set %I = $1 where id = $2', v_r.field) using v_r.new_value, v_r.person_id;
    perform set_config('app.allow_verified_change', 'off', true);
  end if;
  update app.profile_change_requests set status = case when p_approve then 'approved' else 'rejected' end,
    reviewer_id = authz.current_person_id(), decision_note = p_note, decided_at = now() where id = v_r.id;
  perform app.notify(v_r.person_id, 'profile', 'Correction ' || case when p_approve then 'approved' else 'declined' end, p_note, '/app/profile', 'pcr:' || v_r.id);
  perform app.audit('profile.change_decided', 'person', v_r.person_id::text,
    jsonb_build_object(v_r.field, v_r.old_value), jsonb_build_object(v_r.field, case when p_approve then v_r.new_value else v_r.old_value end, 'approved', p_approve));
end $$;

create or replace function app.update_my_profile(p jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare v_me uuid := authz.current_person_id();
begin
  if v_me is null then raise exception 'NOT_SIGNED_IN'; end if;
  update app.people set
    display_name = nullif(trim(coalesce(p->>'display_name', display_name)), ''),
    bio = left(coalesce(p->>'bio', bio), 600),
    facebook_url = case when p ? 'facebook_url' then nullif(p->>'facebook_url', '') else facebook_url end,
    linkedin_url = case when p ? 'linkedin_url' then nullif(p->>'linkedin_url', '') else linkedin_url end,
    interests = coalesce((select array_agg(trim(x)) from jsonb_array_elements_text(p->'interests') x where trim(x) <> ''), interests),
    skills = coalesce((select array_agg(trim(x)) from jsonb_array_elements_text(p->'skills') x where trim(x) <> ''), skills),
    public_profile = coalesce((p->>'public_profile')::boolean, public_profile),
    avatar = coalesce(p->'avatar', avatar)
  where id = v_me;
  if (p->>'public_profile')::boolean is true then
    insert into app.consent_records(person_id, purpose) select v_me, 'public_profile'
    where not exists (select 1 from app.consent_records where person_id = v_me and purpose = 'public_profile' and withdrawn_at is null);
  elsif (p->>'public_profile')::boolean is false then
    update app.consent_records set withdrawn_at = now() where person_id = v_me and purpose = 'public_profile' and withdrawn_at is null;
  end if;
end $$;

-- Public directory projection (safe columns only)
create or replace function app.public_members() returns table(
  id uuid, full_name text, full_name_bn text, display_name text, academic_department text, academic_session text,
  bio text, photo_url text, avatar jsonb, facebook_url text, linkedin_url text, member_no text, units text[], positions text[])
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name, p.full_name_bn, p.display_name, p.academic_department, p.academic_session, p.bio, p.photo_url, p.avatar,
         p.facebook_url, p.linkedin_url, m.member_no,
         coalesce(array_agg(distinct u.name) filter (where u.id is not null), '{}'),
         coalesce(array_agg(distinct um.position_title) filter (where um.is_lead), '{}')
  from app.people p
  join app.memberships m on m.person_id = p.id
  join app.membership_states s on s.key = m.status_key and s.counts_as_member
  left join app.unit_memberships um on um.person_id = p.id and um.ended_at is null
  left join app.org_units u on u.id = um.unit_id and u.is_public
  where p.public_profile and p.status = 'active'
  group by p.id, m.member_no
  order by p.full_name
$$;

create or replace function app.public_advisors() returns table(id uuid, full_name text, full_name_bn text, bio text, photo_url text, title text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name, p.full_name_bn, p.bio, p.photo_url, coalesce(p.display_name, 'Advisor')
  from app.people p
  where p.kind = 'teacher' and p.public_profile and p.status = 'active'
  order by p.full_name
$$;

-- ───────────────────────────── RLS ─────────────────────────────
alter table app.membership_cycles enable row level security;
alter table app.membership_states enable row level security;
alter table app.membership_transitions enable row level security;
alter table app.applications enable row level security;
alter table app.memberships enable row level security;
alter table app.membership_status_events enable row level security;
alter table app.info_requests enable row level security;
alter table app.profile_change_requests enable row level security;

create policy cycles_read on app.membership_cycles for select to anon, authenticated using (true);
create policy cycles_write on app.membership_cycles for all to authenticated using (authz.has_perm('membership.config')) with check (authz.has_perm('membership.config'));
create policy states_read on app.membership_states for select to anon, authenticated using (true);
create policy transitions_read on app.membership_transitions for select to authenticated using (true);
create policy applications_read on app.applications for select to authenticated using (
  person_id = authz.current_person_id() or authz.has_perm_any('membership.review'));
create policy memberships_read on app.memberships for select to authenticated using (
  person_id = authz.current_person_id() or authz.has_perm_any('people.read'));
create policy mse_read on app.membership_status_events for select to authenticated using (
  authz.has_perm_any('membership.review')
  or exists (select 1 from app.applications a where a.id = application_id and a.person_id = authz.current_person_id())
  or exists (select 1 from app.memberships m where m.id = membership_id and m.person_id = authz.current_person_id()));
create policy info_read on app.info_requests for select to authenticated using (
  authz.has_perm_any('membership.review')
  or exists (select 1 from app.applications a where a.id = application_id and a.person_id = authz.current_person_id()));
create policy pcr_read on app.profile_change_requests for select to authenticated using (
  person_id = authz.current_person_id() or authz.has_perm('people.verify'));

grant select on app.membership_cycles, app.membership_states to anon;
grant insert, update on app.membership_cycles to authenticated;
