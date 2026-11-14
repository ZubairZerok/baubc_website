-- BAUBC OS · Approvals (mandates, maker-checker), RBAC management, tasks, validation, points ledger, achievements, recognition, disbursements

-- ───────────────────────────── approvals ─────────────────────────────
create table app.approval_policies (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('disbursement','points_award','refund','membership_finalize')),
  category text not null,
  min_amount numeric(12,2) not null default 0,
  max_amount numeric(12,2),
  required_approvals int not null default 1 check (required_approvals between 1 and 5),
  require_super_admin boolean not null default false,
  due_hours int not null default 72,
  active boolean not null default true,
  version int not null default 1,
  created_at timestamptz not null default now()
);

create table app.approval_requests (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null,
  category text not null,
  title text not null,
  amount numeric(12,2),
  context jsonb not null default '{}',
  disbursement_id uuid references app.disbursement_requests(id),
  refund_id uuid references app.refunds(id),
  requested_by uuid not null references app.people(id),
  policy jsonb not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','returned','clarification','cancelled','expired')),
  clarification_question text,
  due_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index approval_requests_status_idx on app.approval_requests(status, due_at);

create table app.approval_actions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references app.approval_requests(id) on delete cascade,
  actor_person_id uuid not null references app.people(id),
  action text not null check (action in ('approve','reject','clarify','return','comment','respond')),
  note text,
  mandate_id uuid references app.approval_mandates(id),
  via_super_admin boolean not null default false,
  voided_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index approval_one_vote_uq on app.approval_actions(request_id, actor_person_id) where action in ('approve','reject') and voided_at is null;

create or replace function app.find_policy(p_subject text, p_amount numeric) returns app.approval_policies
language sql stable security definer set search_path = '' as $$
  select * from app.approval_policies
  where subject_type = p_subject and active and coalesce(p_amount, 0) >= min_amount and (max_amount is null or coalesce(p_amount, 0) <= max_amount)
  order by min_amount desc limit 1
$$;

create or replace function app.open_approval(p_subject text, p_title text, p_amount numeric, p_context jsonb, p_disbursement uuid, p_refund uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_pol app.approval_policies; v_id uuid; r record;
begin
  v_pol := app.find_policy(p_subject, p_amount);
  if v_pol.id is null then raise exception 'NO_APPROVAL_POLICY for % (amount %)', p_subject, p_amount; end if;
  insert into app.approval_requests(subject_type, category, title, amount, context, disbursement_id, refund_id, requested_by, policy, due_at)
  values (p_subject, v_pol.category, p_title, p_amount, p_context, p_disbursement, p_refund, authz.current_person_id(), to_jsonb(v_pol),
          now() + make_interval(hours => v_pol.due_hours))
  returning id into v_id;
  for r in select distinct m.person_id from app.approval_mandates m
           where m.revoked_at is null and v_pol.category = any(m.categories) and m.max_amount >= coalesce(p_amount, 0)
             and m.person_id <> authz.current_person_id() loop
    perform app.notify(r.person_id, 'approval', 'Decision needed: ' || p_title, 'Amount: ' || coalesce(p_amount::text, '-'), '/app/approvals', 'appr:' || v_id);
  end loop;
  perform app.audit('approval.opened', 'approval_request', v_id::text, null, jsonb_build_object('subject', p_subject, 'amount', p_amount, 'policy', v_pol.id));
  return v_id;
end $$;

create or replace function authz.can_decide(p_request uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from app.approval_requests r
    where r.id = p_request and r.requested_by <> authz.current_person_id()
      and (authz.is_super_admin()
           or exists (select 1 from app.approval_mandates m
                      where m.person_id = authz.current_person_id() and m.revoked_at is null
                        and now() >= m.valid_from and (m.valid_until is null or now() < m.valid_until)
                        and r.category = any(m.categories) and m.max_amount >= coalesce(r.amount, 0)))
  )
$$;

create or replace function app.apply_approval_effect(p_request uuid) returns void language plpgsql security definer set search_path = '' as $$
declare v_r app.approval_requests;
begin
  select * into v_r from app.approval_requests where id = p_request;
  if v_r.subject_type = 'disbursement' then
    update app.disbursement_requests set status = 'approved' where id = v_r.disbursement_id and status = 'pending_approval';
  elsif v_r.subject_type = 'refund' then
    update app.refunds set status = 'approved' where id = v_r.refund_id and status = 'requested';
  elsif v_r.subject_type = 'points_award' then
    perform app._post_points((v_r.context->>'person_id')::uuid, (v_r.context->>'amount')::int, v_r.context->>'kind',
      v_r.context->>'category', v_r.context->>'source_type', nullif(v_r.context->>'source_id', '')::uuid,
      nullif(v_r.context->>'validation_result_id', '')::uuid, v_r.context->>'reason', v_r.requested_by, v_r.id, null);
  end if;
end $$;

create or replace function app.decide_approval(p_request uuid, p_action text, p_note text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_r app.approval_requests; v_me uuid := authz.current_person_id(); v_mandate uuid; v_sa boolean := authz.is_super_admin();
        v_approvals int; v_has_sa boolean; v_required int; v_need_sa boolean;
begin
  select * into v_r from app.approval_requests where id = p_request for update;
  if v_r.id is null then raise exception 'NOT_FOUND'; end if;
  if v_r.status not in ('pending') then raise exception 'NOT_PENDING: %', v_r.status; end if;
  if v_r.requested_by = v_me then raise exception 'SOD_VIOLATION: you cannot decide your own request'; end if;
  if not authz.can_decide(p_request) then raise exception 'NO_MANDATE: you are not authorised for % up to this amount', v_r.category; end if;
  if v_r.subject_type in ('disbursement','refund') or v_r.category like 'finance%' or v_r.subject_type = 'membership_finalize' then
    perform authz.require_aal2();
  end if;
  if p_action in ('reject','return','clarify') and coalesce(trim(p_note), '') = '' then raise exception 'NOTE_REQUIRED'; end if;
  select m.id into v_mandate from app.approval_mandates m
  where m.person_id = v_me and m.revoked_at is null and v_r.category = any(m.categories) and m.max_amount >= coalesce(v_r.amount, 0) limit 1;

  insert into app.approval_actions(request_id, actor_person_id, action, note, mandate_id, via_super_admin)
  values (v_r.id, v_me, p_action, p_note, v_mandate, v_sa and v_mandate is null);

  if p_action = 'reject' then
    update app.approval_requests set status = 'rejected', decided_at = now() where id = v_r.id;
    if v_r.disbursement_id is not null then update app.disbursement_requests set status = 'rejected' where id = v_r.disbursement_id; end if;
    if v_r.refund_id is not null then update app.refunds set status = 'rejected' where id = v_r.refund_id; end if;
  elsif p_action = 'return' then
    update app.approval_requests set status = 'returned' where id = v_r.id;
    update app.approval_actions set voided_at = now() where request_id = v_r.id and action = 'approve' and voided_at is null;
    if v_r.disbursement_id is not null then update app.disbursement_requests set status = 'returned' where id = v_r.disbursement_id; end if;
  elsif p_action = 'clarify' then
    update app.approval_requests set status = 'clarification', clarification_question = p_note where id = v_r.id;
  elsif p_action = 'approve' then
    select count(distinct actor_person_id), bool_or(via_super_admin or authz.is_super_admin(actor_person_id))
      into v_approvals, v_has_sa
    from app.approval_actions where request_id = v_r.id and action = 'approve' and voided_at is null;
    v_required := (v_r.policy->>'required_approvals')::int;
    v_need_sa := coalesce((v_r.policy->>'require_super_admin')::boolean, false);
    if v_approvals >= v_required and (not v_need_sa or v_has_sa) then
      update app.approval_requests set status = 'approved', decided_at = now() where id = v_r.id;
      perform app.apply_approval_effect(v_r.id);
    end if;
  end if;
  perform app.notify(v_r.requested_by, 'approval', 'Approval update: ' || v_r.title, p_action || coalesce(': ' || p_note, ''), '/app/approvals', 'apprd:' || v_r.id || ':' || v_me || ':' || p_action);
  perform app.audit('approval.' || p_action, 'approval_request', v_r.id::text, jsonb_build_object('status', v_r.status), jsonb_build_object('note', p_note));
  return (select jsonb_build_object('status', status) from app.approval_requests where id = v_r.id);
end $$;

-- requester answers a clarification or resubmits a returned request
create or replace function app.respond_approval(p_request uuid, p_note text) returns void language plpgsql security definer set search_path = '' as $$
declare v_r app.approval_requests;
begin
  select * into v_r from app.approval_requests where id = p_request for update;
  if v_r.requested_by <> authz.current_person_id() then raise exception 'PERMISSION_DENIED'; end if;
  if v_r.status not in ('clarification','returned') then raise exception 'NOT_AWAITING_RESPONSE'; end if;
  insert into app.approval_actions(request_id, actor_person_id, action, note) values (v_r.id, authz.current_person_id(), 'respond', p_note);
  update app.approval_requests set status = 'pending' where id = v_r.id;
  if v_r.disbursement_id is not null then update app.disbursement_requests set status = 'pending_approval' where id = v_r.disbursement_id; end if;
end $$;

-- ───────────────────────────── RBAC management (privileged changes need a second Super Admin) ─────────────────────────────
create or replace function app.request_privileged_change(p_type text, p_payload jsonb, p_summary text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not authz.is_super_admin() then raise exception 'PERMISSION_DENIED: only a Super Admin can request privileged changes'; end if;
  perform authz.require_aal2();
  if (p_payload->>'person_id')::uuid = authz.current_person_id() then raise exception 'SOD_VIOLATION: no self-grants'; end if;
  insert into app.pending_privileged_changes(change_type, payload, summary, requested_by) values (p_type, p_payload, p_summary, authz.current_person_id())
  returning id into v_id;
  perform app.audit('privileged_change.requested', 'pending_privileged_change', v_id::text, null, p_payload);
  return v_id;
end $$;

create or replace function app.confirm_privileged_change(p_id uuid, p_confirm boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare v_c app.pending_privileged_changes; v_me uuid := authz.current_person_id();
begin
  if not authz.is_super_admin() then raise exception 'PERMISSION_DENIED'; end if;
  perform authz.require_aal2();
  select * into v_c from app.pending_privileged_changes where id = p_id for update;
  if v_c.id is null or v_c.confirmed_at is not null or v_c.rejected_at is not null then raise exception 'NOT_PENDING'; end if;
  if v_c.expires_at < now() then raise exception 'EXPIRED: request a new change'; end if;
  if v_c.requested_by = v_me then raise exception 'SOD_VIOLATION: a different Super Admin must confirm'; end if;
  if (v_c.payload->>'person_id')::uuid = v_me then raise exception 'SOD_VIOLATION: you cannot confirm a change about yourself'; end if;
  if not p_confirm then
    update app.pending_privileged_changes set rejected_at = now(), confirmed_by = v_me where id = v_c.id;
    perform app.audit('privileged_change.rejected', 'pending_privileged_change', v_c.id::text, null, v_c.payload);
    return;
  end if;
  if v_c.change_type = 'grant_role' then
    insert into app.role_assignments(person_id, role_key, scope_type, scope_id, valid_until, granted_by, confirmed_by)
    values ((v_c.payload->>'person_id')::uuid, v_c.payload->>'role_key', coalesce(v_c.payload->>'scope_type', 'global'),
            nullif(v_c.payload->>'scope_id', '')::uuid, nullif(v_c.payload->>'valid_until', '')::timestamptz, v_c.requested_by, v_me)
    on conflict do nothing;
  elsif v_c.change_type = 'grant_mandate' then
    insert into app.approval_mandates(person_id, categories, max_amount, valid_until, granted_by)
    values ((v_c.payload->>'person_id')::uuid, (select array_agg(x) from jsonb_array_elements_text(v_c.payload->'categories') x),
            (v_c.payload->>'max_amount')::numeric, nullif(v_c.payload->>'valid_until', '')::timestamptz, v_c.requested_by);
  elsif v_c.change_type = 'setting' then
    update app.site_settings set value = v_c.payload->'value', updated_at = now(), updated_by = v_me where key = v_c.payload->>'key';
  end if;
  update app.pending_privileged_changes set confirmed_by = v_me, confirmed_at = now() where id = v_c.id;
  perform app.audit('privileged_change.confirmed', 'pending_privileged_change', v_c.id::text, null, v_c.payload);
end $$;

create or replace function app.grant_role(p_person uuid, p_role text, p_scope_type text, p_scope_id uuid, p_valid_until timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_role app.roles; v_id uuid;
begin
  select * into v_role from app.roles where key = p_role;
  if v_role.key is null then raise exception 'UNKNOWN_ROLE'; end if;
  if p_person = authz.current_person_id() then raise exception 'SOD_VIOLATION: no self-grants'; end if;
  if v_role.is_privileged then
    v_id := app.request_privileged_change('grant_role', jsonb_build_object('person_id', p_person, 'role_key', p_role,
              'scope_type', coalesce(p_scope_type, 'global'), 'scope_id', p_scope_id, 'valid_until', p_valid_until),
              'Grant ' || v_role.name || ' to ' || (select full_name from app.people where id = p_person));
    return jsonb_build_object('pending_confirmation', true, 'change_id', v_id);
  end if;
  if p_role in ('team_lead') and coalesce(p_scope_type, 'global') = 'unit' then
    if not (authz.has_perm('rbac.manage') or authz.has_perm('people.read')) then raise exception 'PERMISSION_DENIED'; end if;
  else
    perform authz.require('rbac.manage');
  end if;
  insert into app.role_assignments(person_id, role_key, scope_type, scope_id, valid_until, granted_by)
  values (p_person, p_role, coalesce(p_scope_type, 'global'), p_scope_id, p_valid_until, authz.current_person_id())
  returning id into v_id;
  perform app.notify(p_person, 'role', 'New role: ' || v_role.name, null, '/app', 'role:' || v_id);
  perform app.audit('role.granted', 'role_assignment', v_id::text, null, jsonb_build_object('person', p_person, 'role', p_role));
  return jsonb_build_object('assignment_id', v_id);
end $$;

create or replace function app.revoke_role(p_assignment uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_a app.role_assignments; v_role app.roles; v_active_sas int;
begin
  select * into v_a from app.role_assignments where id = p_assignment for update;
  if v_a.id is null or v_a.revoked_at is not null then raise exception 'NOT_FOUND'; end if;
  select * into v_role from app.roles where key = v_a.role_key;
  if v_role.is_privileged then
    if not authz.is_super_admin() then raise exception 'PERMISSION_DENIED'; end if;
    perform authz.require_aal2();
  else
    perform authz.require('rbac.manage');
  end if;
  if v_a.role_key = 'super_admin' then
    select count(*) into v_active_sas from app.role_assignments ra join app.people p on p.id = ra.person_id
    where ra.role_key = 'super_admin' and ra.revoked_at is null and p.status = 'active';
    if v_active_sas <= 1 then raise exception 'LAST_SUPER_ADMIN: the last active Super Admin cannot be removed'; end if;
  end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'REASON_REQUIRED'; end if;
  update app.role_assignments set revoked_at = now(), revoke_reason = p_reason where id = v_a.id;
  perform app.audit('role.revoked', 'role_assignment', v_a.id::text, jsonb_build_object('role', v_a.role_key, 'person', v_a.person_id), jsonb_build_object('reason', p_reason));
end $$;

create or replace function app.grant_mandate(p_person uuid, p_categories text[], p_max numeric, p_valid_until timestamptz) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  return app.request_privileged_change('grant_mandate', jsonb_build_object('person_id', p_person, 'categories', to_jsonb(p_categories),
    'max_amount', p_max, 'valid_until', p_valid_until),
    'Approval mandate (' || array_to_string(p_categories, ', ') || ', up to BDT ' || p_max || ') for ' || (select full_name from app.people where id = p_person));
end $$;

-- ───────────────────────────── tasks & points ─────────────────────────────
create table app.task_types (
  key text primary key,
  name text not null,
  validation_mode text not null check (validation_mode in ('auto','human','hybrid')),
  evidence_kind text not null default 'text' check (evidence_kind in ('text','link','file','checkin','form')),
  category text not null,
  default_points int not null default 10 check (default_points >= 0),
  max_points int not null default 50 check (max_points >= 0),
  second_review_above int not null default 40,
  max_attempts int not null default 3,
  description text
);

create table app.point_policies (
  category text primary key,
  monthly_cap int not null check (monthly_cap > 0),
  description text
);

create table app.tasks (
  id uuid primary key default gen_random_uuid(),
  type_key text not null references app.task_types(key),
  title text not null,
  description text,
  instructions text,
  expected_output text,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  starts_at timestamptz not null default now(),
  due_at timestamptz,
  points int not null check (points >= 0),
  assignment_mode text not null default 'individual' check (assignment_mode in ('individual','open_claim')),
  max_claims int,
  scope_unit_id uuid references app.org_units(id),
  event_id uuid references app.events(id),
  links text[] not null default '{}',
  status text not null default 'published' check (status in ('draft','published','closed','cancelled')),
  created_by uuid not null references app.people(id),
  created_at timestamptz not null default now()
);

create table app.task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references app.tasks(id) on delete cascade,
  assignee_person_id uuid not null references app.people(id) on delete cascade,
  assigned_by uuid references app.people(id),
  status text not null default 'assigned' check (status in ('assigned','in_progress','submitted','revision_requested','approved','rejected','expired','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, assignee_person_id)
);
create trigger task_assignments_touch before update on app.task_assignments for each row execute function app.touch_updated_at();

create table app.task_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references app.task_assignments(id) on delete cascade,
  attempt_no int not null,
  content text,
  link_url text,
  content_hash text not null,
  submitted_at timestamptz not null default now(),
  is_late boolean not null default false,
  status text not null default 'validation_pending' check (status in ('validation_pending','revision_requested','approved','rejected')),
  locked_at timestamptz,
  unique (assignment_id, attempt_no)
);
create index task_submissions_hash_idx on app.task_submissions(content_hash);

create or replace function app.guard_locked_submission() returns trigger language plpgsql as $$
begin
  if old.locked_at is not null then raise exception 'SUBMISSION_LOCKED: approved submissions cannot change'; end if;
  return new;
end $$;
create trigger task_submissions_lock before update on app.task_submissions for each row execute function app.guard_locked_submission();

create table app.validation_results (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references app.task_submissions(id) on delete cascade,
  validator_kind text not null check (validator_kind in ('rule','human')),
  rule_key text,
  reviewer_id uuid references app.people(id),
  outcome text not null check (outcome in ('pass','fail','flag','approve','reject','revise')),
  comment text,
  created_at timestamptz not null default now()
);
create trigger validation_immutable before update or delete on app.validation_results for each row execute function ops.forbid_mutation();

create table app.point_ledger (
  id bigint generated always as identity primary key,
  person_id uuid not null references app.people(id),
  amount int not null check (amount <> 0),
  kind text not null check (kind in ('task_award','event_attendance','achievement_bonus','adjustment','penalty','reversal')),
  category text not null,
  source_type text,
  source_id uuid,
  validation_result_id uuid references app.validation_results(id),
  approval_request_id uuid references app.approval_requests(id),
  reverses_entry_id bigint unique references app.point_ledger(id),
  reason text not null,
  awarded_by uuid references app.people(id),
  period_month date not null default date_trunc('month', now() at time zone 'Asia/Dhaka')::date,
  created_at timestamptz not null default now(),
  check (kind <> 'task_award' or validation_result_id is not null),
  check (kind <> 'reversal' or reverses_entry_id is not null)
);
create unique index ledger_one_task_award on app.point_ledger(source_type, source_id, person_id) where kind = 'task_award';
create index ledger_person_period_idx on app.point_ledger(person_id, period_month);
create trigger point_ledger_immutable before update or delete on app.point_ledger for each row execute function ops.forbid_mutation();

create table app.achievement_records (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references app.people(id) on delete cascade,
  kind text not null check (kind in ('position','award','contribution','leadership','recognition')),
  title text not null,
  description text,
  occurred_on date not null default current_date,
  event_id uuid references app.events(id),
  issued_by uuid references app.people(id),
  verified_by uuid references app.people(id),
  verified_at timestamptz,
  status text not null default 'pending_verification' check (status in ('pending_verification','active','revoked')),
  revoke_reason text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  check (verified_by is null or verified_by <> person_id)
);

create table app.recognition_awards (
  id uuid primary key default gen_random_uuid(),
  period date not null unique,
  person_id uuid not null references app.people(id),
  citation text not null,
  decided_by uuid references app.people(id),
  achievement_id uuid references app.achievement_records(id),
  created_at timestamptz not null default now()
);

create or replace function app._post_points(p_person uuid, p_amount int, p_kind text, p_category text, p_source_type text, p_source_id uuid,
  p_validation uuid, p_reason text, p_awarded_by uuid, p_approval uuid, p_reverses bigint) returns bigint
language plpgsql security definer set search_path = '' as $$
declare v_cap int; v_month_total int; v_amount int := p_amount; v_id bigint;
begin
  if p_amount > 0 and p_kind in ('task_award','event_attendance') then
    select monthly_cap into v_cap from app.point_policies where category = p_category;
    if v_cap is not null then
      select coalesce(sum(amount), 0) into v_month_total from app.point_ledger
      where person_id = p_person and category = p_category and period_month = date_trunc('month', now() at time zone 'Asia/Dhaka')::date;
      v_amount := least(p_amount, greatest(v_cap - v_month_total, 0));
      if v_amount = 0 then
        perform app.notify(p_person, 'points', 'Monthly cap reached in ' || p_category, 'No further points this month in this category.', '/app/points', 'cap:' || p_category || ':' || now()::date);
        return null;
      end if;
    end if;
  end if;
  insert into app.point_ledger(person_id, amount, kind, category, source_type, source_id, validation_result_id, approval_request_id, reverses_entry_id, reason, awarded_by)
  values (p_person, v_amount, p_kind, p_category, p_source_type, p_source_id, p_validation, p_approval, p_reverses,
          p_reason || case when v_amount < p_amount then ' (capped from ' || p_amount || ')' else '' end, p_awarded_by)
  returning id into v_id;
  perform app.notify(p_person, 'points', case when v_amount > 0 then '+' else '' end || v_amount || ' points', p_reason, '/app/points', 'pts:' || v_id);
  return v_id;
end $$;

create or replace function app.create_task(p jsonb) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_type app.task_types; v_id uuid; v_unit uuid := nullif(p->>'scope_unit_id', '')::uuid; v_points int;
begin
  if not (authz.has_perm('task.manage') or (v_unit is not null and authz.has_perm('task.manage', 'unit', v_unit))) then
    raise exception 'PERMISSION_DENIED: task.manage';
  end if;
  select * into v_type from app.task_types where key = p->>'type_key';
  if v_type.key is null then raise exception 'UNKNOWN_TASK_TYPE'; end if;
  v_points := coalesce((p->>'points')::int, v_type.default_points);
  if v_points > v_type.max_points then raise exception 'POINTS_ABOVE_TYPE_MAX: max % for %', v_type.max_points, v_type.name; end if;
  insert into app.tasks(type_key, title, description, instructions, expected_output, priority, due_at, points, assignment_mode, max_claims, scope_unit_id, event_id, links, created_by)
  values (v_type.key, p->>'title', p->>'description', p->>'instructions', p->>'expected_output', coalesce(p->>'priority', 'normal'),
          nullif(p->>'due_at', '')::timestamptz, v_points, coalesce(p->>'assignment_mode', 'individual'), nullif(p->>'max_claims', '')::int,
          v_unit, nullif(p->>'event_id', '')::uuid,
          coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p->'links', '[]')) x), '{}'), authz.current_person_id())
  returning id into v_id;
  perform app.audit('task.created', 'task', v_id::text, null, p);
  return v_id;
end $$;

create or replace function app.assign_task(p_task uuid, p_people uuid[]) returns int language plpgsql security definer set search_path = '' as $$
declare v_t app.tasks; v_n int := 0; v_p uuid;
begin
  select * into v_t from app.tasks where id = p_task;
  if not (authz.has_perm('task.manage') or (v_t.scope_unit_id is not null and authz.has_perm('task.manage', 'unit', v_t.scope_unit_id))) then
    raise exception 'PERMISSION_DENIED: task.manage';
  end if;
  foreach v_p in array p_people loop
    if v_t.scope_unit_id is not null and not authz.has_perm('task.manage') and not exists (
      select 1 from app.unit_memberships where person_id = v_p and unit_id = v_t.scope_unit_id and ended_at is null) then
      raise exception 'OUT_OF_SCOPE: person is not in this team';
    end if;
    insert into app.task_assignments(task_id, assignee_person_id, assigned_by) values (p_task, v_p, authz.current_person_id())
    on conflict (task_id, assignee_person_id) do nothing;
    if found then
      v_n := v_n + 1;
      perform app.notify(v_p, 'task', 'New task: ' || v_t.title, 'Due ' || coalesce(to_char(v_t.due_at at time zone 'Asia/Dhaka', 'DD Mon HH24:MI'), 'no deadline'), '/app/tasks', 'task:' || p_task || ':' || v_p);
    end if;
  end loop;
  return v_n;
end $$;

create or replace function app.claim_task(p_task uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_t app.tasks; v_id uuid; v_claimed int;
begin
  if not authz.is_member() then raise exception 'MEMBERS_ONLY'; end if;
  select * into v_t from app.tasks where id = p_task for update;
  if v_t.assignment_mode <> 'open_claim' or v_t.status <> 'published' then raise exception 'NOT_CLAIMABLE'; end if;
  if v_t.due_at is not null and v_t.due_at < now() then raise exception 'DEADLINE_PASSED'; end if;
  select count(*) into v_claimed from app.task_assignments where task_id = p_task and status <> 'cancelled';
  if v_t.max_claims is not null and v_claimed >= v_t.max_claims then raise exception 'NO_SLOTS_LEFT'; end if;
  insert into app.task_assignments(task_id, assignee_person_id, assigned_by, status) values (p_task, authz.current_person_id(), authz.current_person_id(), 'in_progress')
  returning id into v_id;
  return v_id;
end $$;

create or replace function app.submit_task(p_assignment uuid, p_content text, p_link text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_a app.task_assignments; v_t app.tasks; v_type app.task_types; v_attempt int; v_sub uuid; v_hash text; v_late boolean; v_dupe boolean;
begin
  select * into v_a from app.task_assignments where id = p_assignment for update;
  if v_a.assignee_person_id is distinct from authz.current_person_id() then raise exception 'PERMISSION_DENIED'; end if;
  if v_a.status not in ('assigned','in_progress','revision_requested') then raise exception 'NOT_SUBMITTABLE: %', v_a.status; end if;
  select * into v_t from app.tasks where id = v_a.task_id;
  select * into v_type from app.task_types where key = v_t.type_key;
  select coalesce(max(attempt_no), 0) + 1 into v_attempt from app.task_submissions where assignment_id = v_a.id;
  if v_attempt > v_type.max_attempts then raise exception 'MAX_ATTEMPTS_REACHED'; end if;
  if v_type.evidence_kind = 'link' and coalesce(p_link, '') !~* '^https://' then raise exception 'LINK_REQUIRED: provide an https:// link'; end if;
  if v_type.evidence_kind = 'text' and length(coalesce(trim(p_content), '')) < 10 then raise exception 'CONTENT_TOO_SHORT'; end if;
  v_hash := encode(sha256(convert_to(lower(coalesce(trim(p_content), '')) || '|' || lower(coalesce(trim(p_link), '')), 'UTF8')), 'hex');
  v_late := v_t.due_at is not null and now() > v_t.due_at;
  insert into app.task_submissions(assignment_id, attempt_no, content, link_url, content_hash, is_late)
  values (v_a.id, v_attempt, p_content, nullif(trim(p_link), ''), v_hash, v_late) returning id into v_sub;

  -- objective auto-rules (gates and flags only; quality is always human)
  insert into app.validation_results(submission_id, validator_kind, rule_key, outcome, comment)
  values (v_sub, 'rule', 'deadline', case when v_late then 'flag' else 'pass' end, case when v_late then 'Submitted after the deadline' end);
  select exists (select 1 from app.task_submissions s join app.task_assignments a on a.id = s.assignment_id
                 where s.content_hash = v_hash and s.id <> v_sub and a.assignee_person_id <> v_a.assignee_person_id) into v_dupe;
  insert into app.validation_results(submission_id, validator_kind, rule_key, outcome, comment)
  values (v_sub, 'rule', 'duplicate_content', case when v_dupe then 'flag' else 'pass' end,
          case when v_dupe then 'Identical content was submitted by another member' end);
  if v_type.evidence_kind = 'link' then
    insert into app.validation_results(submission_id, validator_kind, rule_key, outcome) values (v_sub, 'rule', 'link_format', 'pass');
  end if;
  update app.task_assignments set status = 'submitted' where id = v_a.id;
  perform app.audit('task.submitted', 'task_submission', v_sub::text, null, jsonb_build_object('attempt', v_attempt, 'late', v_late, 'dupe', v_dupe));
  return jsonb_build_object('submission_id', v_sub, 'attempt', v_attempt, 'late', v_late, 'duplicate_flag', v_dupe);
end $$;

create or replace function app.review_submission(p_submission uuid, p_decision text, p_comment text, p_points int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_s app.task_submissions; v_a app.task_assignments; v_t app.tasks; v_type app.task_types; v_vr uuid; v_points int; v_appr uuid; v_entry bigint;
begin
  select * into v_s from app.task_submissions where id = p_submission for update;
  if v_s.id is null then raise exception 'NOT_FOUND'; end if;
  if v_s.status <> 'validation_pending' then raise exception 'ALREADY_REVIEWED'; end if;
  select * into v_a from app.task_assignments where id = v_s.assignment_id for update;
  select * into v_t from app.tasks where id = v_a.task_id;
  select * into v_type from app.task_types where key = v_t.type_key;
  if not (authz.has_perm('task.review') or (v_t.scope_unit_id is not null and authz.has_perm('task.review', 'unit', v_t.scope_unit_id))) then
    raise exception 'PERMISSION_DENIED: task.review';
  end if;
  if v_a.assignee_person_id = authz.current_person_id() then raise exception 'SOD_VIOLATION: you cannot review your own submission'; end if;
  if p_decision not in ('approve','reject','revise') then raise exception 'INVALID_DECISION'; end if;
  if p_decision in ('reject','revise') and coalesce(trim(p_comment), '') = '' then raise exception 'COMMENT_REQUIRED'; end if;
  v_points := coalesce(p_points, v_t.points);
  if v_points > v_type.max_points then raise exception 'POINTS_ABOVE_TYPE_MAX'; end if;
  if v_points >= v_type.second_review_above and v_a.assigned_by = authz.current_person_id() then
    raise exception 'SOD_VIOLATION: high-value tasks need a reviewer other than the assigner';
  end if;

  insert into app.validation_results(submission_id, validator_kind, reviewer_id, outcome, comment)
  values (v_s.id, 'human', authz.current_person_id(), p_decision, p_comment) returning id into v_vr;

  if p_decision = 'approve' then
    update app.task_submissions set status = 'approved' where id = v_s.id;
    update app.task_submissions set locked_at = now() where id = v_s.id;
    update app.task_assignments set status = 'approved' where id = v_a.id;
    if v_points > 0 then
      if v_points > v_type.second_review_above then
        v_appr := app.open_approval('points_award', v_points || ' points: ' || v_t.title, v_points,
          jsonb_build_object('person_id', v_a.assignee_person_id, 'amount', v_points, 'kind', 'task_award', 'category', v_type.category,
                             'source_type', 'task_submission', 'source_id', v_s.id, 'validation_result_id', v_vr, 'reason', 'Task: ' || v_t.title), null, null);
      else
        v_entry := app._post_points(v_a.assignee_person_id, v_points, 'task_award', v_type.category, 'task_submission', v_s.id, v_vr,
                                    'Task: ' || v_t.title, authz.current_person_id(), null, null);
      end if;
    end if;
  elsif p_decision = 'reject' then
    update app.task_submissions set status = 'rejected' where id = v_s.id;
    update app.task_assignments set status = 'rejected' where id = v_a.id;
  else
    update app.task_submissions set status = 'revision_requested' where id = v_s.id;
    update app.task_assignments set status = 'revision_requested' where id = v_a.id;
  end if;
  perform app.notify(v_a.assignee_person_id, 'task', 'Review: ' || v_t.title, p_decision || coalesce(': ' || p_comment, ''), '/app/tasks', 'rev:' || v_s.id);
  perform app.audit('task.reviewed', 'task_submission', v_s.id::text, null, jsonb_build_object('decision', p_decision, 'points', v_points, 'approval', v_appr));
  return jsonb_build_object('decision', p_decision, 'ledger_entry', v_entry, 'approval_request', v_appr);
end $$;

create or replace function app.adjust_points(p_person uuid, p_amount int, p_category text, p_reason text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_appr uuid; v_id bigint; v_threshold int := coalesce((app.setting('points')->>'adjustment_approval_above')::int, 50);
begin
  perform authz.require('points.adjust');
  if p_person = authz.current_person_id() then raise exception 'SOD_VIOLATION: no self-adjustments'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'REASON_REQUIRED'; end if;
  if abs(p_amount) > v_threshold then
    v_appr := app.open_approval('points_award', 'Adjustment ' || p_amount || ' pts: ' || (select full_name from app.people where id = p_person), abs(p_amount),
      jsonb_build_object('person_id', p_person, 'amount', p_amount, 'kind', case when p_amount < 0 then 'penalty' else 'adjustment' end,
                         'category', p_category, 'reason', p_reason), null, null);
    return jsonb_build_object('pending_approval', v_appr);
  end if;
  v_id := app._post_points(p_person, p_amount, case when p_amount < 0 then 'penalty' else 'adjustment' end, p_category, 'manual', null, null, p_reason, authz.current_person_id(), null, null);
  perform app.audit('points.adjusted', 'person', p_person::text, null, jsonb_build_object('amount', p_amount, 'reason', p_reason));
  return jsonb_build_object('ledger_entry', v_id);
end $$;

create or replace function app.reverse_points(p_entry bigint, p_reason text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare v_e app.point_ledger; v_id bigint;
begin
  perform authz.require('points.adjust');
  if coalesce(trim(p_reason), '') = '' then raise exception 'REASON_REQUIRED'; end if;
  select * into v_e from app.point_ledger where id = p_entry;
  if v_e.id is null then raise exception 'NOT_FOUND'; end if;
  if v_e.kind = 'reversal' then raise exception 'CANNOT_REVERSE_A_REVERSAL'; end if;
  insert into app.point_ledger(person_id, amount, kind, category, source_type, source_id, reverses_entry_id, reason, awarded_by)
  values (v_e.person_id, -v_e.amount, 'reversal', v_e.category, v_e.source_type, v_e.source_id, v_e.id, 'Reversal: ' || p_reason, authz.current_person_id())
  returning id into v_id;
  perform app.notify(v_e.person_id, 'points', 'Points corrected: ' || (-v_e.amount), p_reason, '/app/points', 'rev:' || v_id);
  perform app.audit('points.reversed', 'point_ledger', v_e.id::text, null, jsonb_build_object('reason', p_reason, 'reversal', v_id));
  return v_id;
end $$;

create or replace function app.issue_achievement(p_person uuid, p_kind text, p_title text, p_description text, p_date date, p_event uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform authz.require('achievement.issue');
  if p_person = authz.current_person_id() then raise exception 'SOD_VIOLATION'; end if;
  insert into app.achievement_records(person_id, kind, title, description, occurred_on, event_id, issued_by)
  values (p_person, p_kind, p_title, p_description, coalesce(p_date, current_date), p_event, authz.current_person_id()) returning id into v_id;
  perform app.audit('achievement.issued', 'achievement', v_id::text, null, jsonb_build_object('person', p_person, 'title', p_title));
  return v_id;
end $$;

create or replace function app.verify_achievement(p_id uuid, p_verify boolean, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_a app.achievement_records;
begin
  perform authz.require('achievement.issue');
  select * into v_a from app.achievement_records where id = p_id for update;
  if v_a.issued_by = authz.current_person_id() and p_verify then raise exception 'SOD_VIOLATION: a different person must verify'; end if;
  if v_a.person_id = authz.current_person_id() then raise exception 'SOD_VIOLATION'; end if;
  if p_verify then
    if v_a.status <> 'pending_verification' then raise exception 'NOT_PENDING'; end if;
    update app.achievement_records set status = 'active', verified_by = authz.current_person_id(), verified_at = now() where id = p_id;
    perform app.notify(v_a.person_id, 'achievement', 'Achievement verified: ' || v_a.title, null, '/app/record', 'ach:' || p_id);
  else
    if coalesce(trim(p_reason), '') = '' then raise exception 'REASON_REQUIRED'; end if;
    update app.achievement_records set status = 'revoked', revoke_reason = p_reason where id = p_id;
  end if;
  perform app.audit(case when p_verify then 'achievement.verified' else 'achievement.revoked' end, 'achievement', p_id::text, null, jsonb_build_object('reason', p_reason));
end $$;

create or replace function app.decide_best_member(p_period date, p_person uuid, p_citation text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_ach uuid; v_id uuid; v_period date := date_trunc('month', p_period)::date;
begin
  perform authz.require('recognition.decide');
  if p_person = authz.current_person_id() then raise exception 'SOD_VIOLATION: nominees are recused'; end if;
  insert into app.achievement_records(person_id, kind, title, description, occurred_on, issued_by, verified_by, verified_at, status)
  values (p_person, 'recognition', 'Member of the Month · ' || to_char(v_period, 'Month YYYY'), p_citation, v_period, authz.current_person_id(),
          authz.current_person_id(), now(), 'active') returning id into v_ach;
  insert into app.recognition_awards(period, person_id, citation, decided_by, achievement_id) values (v_period, p_person, p_citation, authz.current_person_id(), v_ach)
  returning id into v_id;
  perform app.notify(p_person, 'achievement', 'You are Member of the Month!', p_citation, '/app/record', 'motm:' || v_period);
  perform app.audit('recognition.decided', 'recognition_award', v_id::text, null, jsonb_build_object('person', p_person, 'period', v_period));
  return v_id;
end $$;

create or replace function app.best_member_shortlist(p_period date) returns table(person_id uuid, full_name text, points bigint, tasks_approved bigint, attended bigint)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name, coalesce(sum(l.amount), 0) pts,
         (select count(*) from app.task_assignments a where a.assignee_person_id = p.id and a.status = 'approved'
            and date_trunc('month', a.updated_at) = date_trunc('month', p_period)),
         (select count(*) from app.checkins c join app.registrations r on r.id = c.registration_id
            where r.person_id = p.id and c.result = 'ok' and date_trunc('month', c.scanned_at) = date_trunc('month', p_period))
  from app.people p
  join app.memberships m on m.person_id = p.id and m.status_key = 'active'
  left join app.point_ledger l on l.person_id = p.id and l.period_month = date_trunc('month', p_period)::date
  where authz.has_perm('recognition.decide')
  group by p.id
  order by pts desc
  limit 10
$$;

-- people a task manager may assign: everyone active (global task.manage) or members of the lead's own units
create or replace function app.assignable_people() returns table(id uuid, full_name text, units text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name,
         (select string_agg(u.name, ', ') from app.unit_memberships um join app.org_units u on u.id = um.unit_id where um.person_id = p.id and um.ended_at is null)
  from app.people p join app.memberships m on m.person_id = p.id and m.status_key = 'active'
  where authz.has_perm('task.manage')
     or exists (select 1 from app.unit_memberships um where um.person_id = p.id and um.ended_at is null and authz.has_perm('task.manage', 'unit', um.unit_id))
  order by p.full_name
$$;

-- ───────────────────────────── disbursements ─────────────────────────────
create or replace function app.submit_disbursement(p jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_no text; v_amount numeric := (p->>'amount')::numeric; v_appr uuid; v_dupe boolean;
begin
  perform authz.require('finance.disburse.request');
  if v_amount is null or v_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  if coalesce(trim(p->>'purpose'), '') = '' or coalesce(trim(p->>'payee_name'), '') = '' then raise exception 'PURPOSE_AND_PAYEE_REQUIRED'; end if;
  select exists (select 1 from app.disbursement_requests where lower(payee_name) = lower(trim(p->>'payee_name'))
                 and abs(amount - v_amount) <= v_amount * 0.01 and created_at > now() - interval '30 days' and status not in ('rejected','cancelled'))
    into v_dupe;
  if v_dupe and coalesce((p->>'confirm_duplicate')::boolean, false) is false then
    raise exception 'POSSIBLE_DUPLICATE: a similar request to this payee exists in the last 30 days. Confirm to continue';
  end if;
  v_no := 'DR-' || to_char(now() at time zone 'Asia/Dhaka', 'YYYY') || '-' || lpad(app.next_counter('dr_' || to_char(now() at time zone 'Asia/Dhaka', 'YYYY'))::text, 4, '0');
  insert into app.disbursement_requests(request_no, kind, purpose, amount, payee_name, payee_account_last4, method_planned, budget_line, evidence_urls, event_id, requested_by)
  values (v_no, coalesce(p->>'kind', 'expense'), trim(p->>'purpose'), v_amount, trim(p->>'payee_name'), nullif(p->>'payee_account_last4', ''),
          coalesce(p->>'method_planned', 'bkash'), nullif(p->>'budget_line', ''),
          coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p->'evidence_urls', '[]')) x where x ~* '^https://'), '{}'),
          nullif(p->>'event_id', '')::uuid, authz.current_person_id())
  returning id into v_id;
  v_appr := app.open_approval('disbursement', v_no || ' · ' || trim(p->>'purpose'), v_amount,
    jsonb_build_object('payee', trim(p->>'payee_name'), 'payee_last4', p->>'payee_account_last4', 'budget_line', p->>'budget_line',
                       'kind', coalesce(p->>'kind', 'expense'), 'evidence', p->'evidence_urls', 'possible_duplicate', v_dupe), v_id, null);
  perform app.audit('disbursement.submitted', 'disbursement', v_id::text, null, p);
  return jsonb_build_object('disbursement_id', v_id, 'request_no', v_no, 'approval_request_id', v_appr);
end $$;

create or replace function app.record_execution(p_request uuid, p_method text, p_trx text, p_amount numeric, p_proof text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_d app.disbursement_requests; v_id uuid; v_me uuid := authz.current_person_id();
begin
  perform authz.require('finance.disburse.execute');
  perform authz.require_aal2();
  select * into v_d from app.disbursement_requests where id = p_request for update;
  if v_d.status <> 'approved' then raise exception 'NOT_APPROVED: status is %', v_d.status; end if;
  if exists (select 1 from app.approval_actions aa join app.approval_requests ar on ar.id = aa.request_id
             where ar.disbursement_id = v_d.id and aa.actor_person_id = v_me and aa.action = 'approve' and aa.voided_at is null) then
    raise exception 'SOD_VIOLATION: an approver cannot execute the same payment';
  end if;
  if p_amount <> v_d.amount then raise exception 'AMOUNT_MISMATCH: approved amount is %', v_d.amount; end if;
  insert into app.disbursement_executions(request_id, executed_by, method, provider_trx_id, amount, proof_url)
  values (v_d.id, v_me, p_method, upper(trim(p_trx)), p_amount, p_proof) returning id into v_id;
  update app.disbursement_requests set status = 'processing' where id = v_d.id;
  perform app.audit('disbursement.executed', 'disbursement', v_d.id::text, null, jsonb_build_object('trx', p_trx, 'amount', p_amount));
  return v_id;
exception when unique_violation then raise exception 'TRXID_ALREADY_USED';
end $$;

create or replace function app.verify_execution(p_request uuid, p_ok boolean, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_d app.disbursement_requests; v_e app.disbursement_executions; v_me uuid := authz.current_person_id(); v_acct uuid;
begin
  perform authz.require('finance.reconcile');
  perform authz.require_aal2();
  select * into v_d from app.disbursement_requests where id = p_request for update;
  if v_d.status <> 'processing' then raise exception 'NOT_PROCESSING'; end if;
  select * into v_e from app.disbursement_executions where request_id = v_d.id order by executed_at desc limit 1;
  if v_e.executed_by = v_me then raise exception 'SOD_VIOLATION: the executor cannot verify their own payout'; end if;
  if p_ok then
    update app.disbursement_executions set verified_by = v_me, verified_at = now() where id = v_e.id;
    update app.disbursement_requests set status = 'successful' where id = v_d.id;
    select id into v_acct from app.finance_accounts where is_default_incoming limit 1;
    if v_acct is not null then
      insert into app.finance_entries(account_id, direction, amount, disbursement_id, memo, created_by)
      values (v_acct, 'out', v_e.amount, v_d.id, v_d.request_no || ' · ' || v_d.purpose || ' · TrxID ' || v_e.provider_trx_id, v_me);
    end if;
  else
    update app.disbursement_requests set status = 'reconciliation_required' where id = v_d.id;
  end if;
  perform app.audit('disbursement.verified', 'disbursement', v_d.id::text, null, jsonb_build_object('ok', p_ok, 'note', p_note));
end $$;

-- ───────────────────────────── RLS ─────────────────────────────
alter table app.approval_policies enable row level security;
alter table app.approval_requests enable row level security;
alter table app.approval_actions enable row level security;
alter table app.task_types enable row level security;
alter table app.point_policies enable row level security;
alter table app.tasks enable row level security;
alter table app.task_assignments enable row level security;
alter table app.task_submissions enable row level security;
alter table app.validation_results enable row level security;
alter table app.point_ledger enable row level security;
alter table app.achievement_records enable row level security;
alter table app.recognition_awards enable row level security;

create policy policies_read on app.approval_policies for select to authenticated using (true);
create policy areq_read on app.approval_requests for select to authenticated using (
  requested_by = authz.current_person_id() or authz.can_decide(id) or authz.has_perm('audit.read'));
create policy aact_read on app.approval_actions for select to authenticated using (
  exists (select 1 from app.approval_requests r where r.id = request_id
          and (r.requested_by = authz.current_person_id() or authz.can_decide(r.id) or authz.has_perm('audit.read'))));
create policy task_types_read on app.task_types for select to authenticated using (true);
create policy point_policies_read on app.point_policies for select to authenticated using (true);
-- cross-table checks go through SECURITY DEFINER helpers so policies never recurse into each other
create or replace function authz.is_task_assignee(p_task uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from app.task_assignments a where a.task_id = p_task and a.assignee_person_id = authz.current_person_id())
$$;
create or replace function authz.can_staff_task(p_task uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select authz.has_perm('task.manage') or authz.has_perm('task.review') or exists (
    select 1 from app.tasks t where t.id = p_task and t.scope_unit_id is not null
      and (authz.has_perm('task.manage', 'unit', t.scope_unit_id) or authz.has_perm('task.review', 'unit', t.scope_unit_id)))
$$;
create or replace function authz.can_see_assignment(p_assignment uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from app.task_assignments a where a.id = p_assignment
                 and (a.assignee_person_id = authz.current_person_id() or authz.can_staff_task(a.task_id)))
$$;
create or replace function authz.can_see_submission(p_submission uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from app.task_submissions s where s.id = p_submission and authz.can_see_assignment(s.assignment_id))
$$;
grant execute on function authz.is_task_assignee(uuid), authz.can_staff_task(uuid), authz.can_see_assignment(uuid), authz.can_see_submission(uuid) to anon, authenticated;

create policy tasks_read on app.tasks for select to authenticated using (
  created_by = authz.current_person_id() or authz.can_staff_task(id) or authz.is_task_assignee(id)
  or (assignment_mode = 'open_claim' and status = 'published' and authz.is_member()));
create policy assignments_read on app.task_assignments for select to authenticated using (
  assignee_person_id = authz.current_person_id() or authz.can_staff_task(task_id));
create policy submissions_read on app.task_submissions for select to authenticated using (authz.can_see_assignment(assignment_id));
create policy validation_read on app.validation_results for select to authenticated using (authz.can_see_submission(submission_id));
create policy ledger_read on app.point_ledger for select to authenticated using (
  person_id = authz.current_person_id() or authz.has_perm_any('points.award') or authz.has_perm_any('task.review'));
create policy achievements_read on app.achievement_records for select to authenticated using (
  person_id = authz.current_person_id() or authz.has_perm('achievement.issue') or (status = 'active' and is_public));
create policy recognition_read on app.recognition_awards for select to anon, authenticated using (true);
grant select on app.recognition_awards to anon;
