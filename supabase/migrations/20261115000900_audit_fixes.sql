-- BAUBC OS · Audit fixes: features that were missing or half-built in the first build.
-- Wing placement, recruitment-cycle permission, account suspension, mandate revocation, refunds, cash payments,
-- activation re-issue, leaderboard, public recognition, privacy requests, task closing, perk codes,
-- first-admin setup, OAuth linking, token-gated sign-up hook, avatar storage.

-- ───────────────────────────── permissions ─────────────────────────────
insert into app.permissions(key, description) values
  ('membership.cycle', 'Open and close recruitment cycles'),
  ('org.manage', 'Manage wings and place members in them')
on conflict (key) do update set description = excluded.description;
insert into app.role_permissions(role_key, permission_key) values ('hr', 'membership.cycle'), ('hr', 'org.manage') on conflict do nothing;

drop policy if exists cycles_write on app.membership_cycles;
create policy cycles_write on app.membership_cycles for all to authenticated
  using (authz.has_perm('membership.cycle')) with check (authz.has_perm('membership.cycle'));

insert into app.finance_accounts(name, kind) select 'Cash box', 'cash' where not exists (select 1 from app.finance_accounts where kind = 'cash');

-- ───────────────────────────── wings: place members, set leads ─────────────────────────────
create or replace function app.assign_unit(p_person uuid, p_unit uuid, p_title text, p_is_lead boolean) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_me uuid := authz.current_person_id(); v_term text := to_char(now(), 'YYYY') || '–' || to_char(now() + interval '1 year', 'YY');
begin
  perform authz.require('org.manage');
  if p_person = v_me and p_is_lead then raise exception 'SOD_VIOLATION: someone else must make you a lead'; end if;
  if not authz.is_member(p_person) then raise exception 'NOT_A_MEMBER: only active members can be placed in a wing'; end if;
  update app.unit_memberships set ended_at = current_date where person_id = p_person and unit_id = p_unit and ended_at is null;
  insert into app.unit_memberships(person_id, unit_id, position_title, is_lead, term_label, verified_by)
  values (p_person, p_unit, coalesce(nullif(trim(p_title), ''), case when p_is_lead then 'Lead' else 'Member' end), coalesce(p_is_lead, false), v_term, v_me)
  returning id into v_id;
  if p_is_lead then
    insert into app.role_assignments(person_id, role_key, scope_type, scope_id, granted_by) values (p_person, 'team_lead', 'unit', p_unit, v_me) on conflict do nothing;
  else
    update app.role_assignments set revoked_at = now(), revoke_reason = 'No longer lead of this wing'
    where person_id = p_person and role_key = 'team_lead' and scope_type = 'unit' and scope_id = p_unit and revoked_at is null;
  end if;
  perform app.notify(p_person, 'role', 'You were placed in ' || (select name from app.org_units where id = p_unit), p_title, '/app', 'unit:' || v_id);
  perform app.audit('unit.assigned', 'unit_membership', v_id::text, null, jsonb_build_object('person', p_person, 'unit', p_unit, 'lead', p_is_lead));
  return v_id;
end $$;

create or replace function app.end_unit_membership(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_m app.unit_memberships;
begin
  perform authz.require('org.manage');
  select * into v_m from app.unit_memberships where id = p_id for update;
  if v_m.id is null or v_m.ended_at is not null then raise exception 'NOT_FOUND'; end if;
  update app.unit_memberships set ended_at = current_date where id = p_id;
  update app.role_assignments set revoked_at = now(), revoke_reason = 'Left the wing'
  where person_id = v_m.person_id and role_key = 'team_lead' and scope_type = 'unit' and scope_id = v_m.unit_id and revoked_at is null;
  perform app.audit('unit.ended', 'unit_membership', p_id::text, null, null);
end $$;

-- ───────────────────────────── accounts & mandates ─────────────────────────────
create or replace function app.set_account_status(p_person uuid, p_status text, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_old text; v_active_sas int;
begin
  if not authz.is_super_admin() then raise exception 'PERMISSION_DENIED'; end if;
  perform authz.require_aal2();
  if p_person = authz.current_person_id() then raise exception 'SOD_VIOLATION: you cannot change your own account status'; end if;
  if p_status not in ('active', 'suspended', 'deactivated') then raise exception 'INVALID_STATUS'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'REASON_REQUIRED'; end if;
  select status into v_old from app.people where id = p_person for update;
  if v_old is null then raise exception 'NOT_FOUND'; end if;
  if p_status <> 'active' and authz.is_super_admin(p_person) then
    select count(*) into v_active_sas from app.role_assignments ra join app.people p on p.id = ra.person_id
    where ra.role_key = 'super_admin' and ra.revoked_at is null and p.status = 'active';
    if v_active_sas <= 1 then raise exception 'LAST_SUPER_ADMIN'; end if;
  end if;
  update app.people set status = p_status where id = p_person;
  perform app.audit('account.status', 'person', p_person::text, jsonb_build_object('status', v_old), jsonb_build_object('status', p_status, 'reason', p_reason));
end $$;

create or replace function app.revoke_mandate(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not authz.is_super_admin() then raise exception 'PERMISSION_DENIED'; end if;
  perform authz.require_aal2();
  if coalesce(trim(p_reason), '') = '' then raise exception 'REASON_REQUIRED'; end if;
  update app.approval_mandates set revoked_at = now() where id = p_id and revoked_at is null;
  if not found then raise exception 'NOT_FOUND'; end if;
  perform app.audit('mandate.revoked', 'approval_mandate', p_id::text, null, jsonb_build_object('reason', p_reason));
end $$;

-- applicants who lost the email: issue a fresh one-time activation link
create or replace function app.reissue_provision(p_person uuid, p_token_hash text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_p app.people;
begin
  perform authz.require('identity.invite');
  select * into v_p from app.people where id = p_person;
  if v_p.id is null then raise exception 'NOT_FOUND'; end if;
  if v_p.user_id is not null then raise exception 'ALREADY_ACTIVATED: this person already has an account'; end if;
  update app.account_provisions set expires_at = now() where person_id = p_person and consumed_at is null;
  insert into app.account_provisions(person_id, email, source, token_hash, expires_at, created_by)
  values (p_person, v_p.email, 'admin_invite', p_token_hash, now() + interval '72 hours', authz.current_person_id());
  perform app.audit('account.reissued', 'person', p_person::text, null, null);
  return jsonb_build_object('email', v_p.email, 'full_name', v_p.full_name);
end $$;

-- ───────────────────────────── first-run setup (system only; called by /setup with SETUP_TOKEN) ─────────────────────────────
create or replace function app.bootstrap_super_admins(p jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare r jsonb; v_person uuid; v_n int := 0;
begin
  if exists (select 1 from app.role_assignments where role_key = 'super_admin' and revoked_at is null) then
    raise exception 'ALREADY_SET_UP: Super Admins already exist';
  end if;
  if jsonb_array_length(p) <> 2 then raise exception 'TWO_ADMINS_REQUIRED'; end if;
  if lower(p->0->>'email') = lower(p->1->>'email') then raise exception 'EMAILS_MUST_DIFFER'; end if;
  for r in select * from jsonb_array_elements(p) loop
    insert into app.people(kind, full_name, email) values ('staff', trim(r->>'full_name'), lower(trim(r->>'email')))
    on conflict (email) do update set full_name = excluded.full_name returning id into v_person;
    insert into app.role_assignments(person_id, role_key) values (v_person, 'super_admin');
    update app.account_provisions set expires_at = now() where person_id = v_person and consumed_at is null;
    insert into app.account_provisions(person_id, email, source, token_hash, expires_at)
    values (v_person, lower(trim(r->>'email')), 'bootstrap', r->>'token_hash', now() + interval '72 hours');
    perform app.audit('bootstrap.super_admin', 'person', v_person::text, null, null);
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

create or replace function app.needs_setup() returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from app.role_assignments where role_key = 'super_admin' and revoked_at is null)
$$;

-- a person who signed in with a provider that verified their email (Google) is linked to their provisioned record
create or replace function app.link_verified_user(p_user uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_email text; v_confirmed timestamptz; v_person uuid; v_app record;
begin
  select lower(email), email_confirmed_at into v_email, v_confirmed from auth.users where id = p_user;
  if v_email is null or v_confirmed is null then return false; end if;
  if exists (select 1 from app.people where user_id = p_user) then return true; end if;
  update app.people set user_id = p_user where email = v_email and user_id is null returning id into v_person;
  if v_person is null then return false; end if;
  update app.account_provisions set consumed_at = now() where person_id = v_person and consumed_at is null;
  for v_app in select id from app.applications where person_id = v_person and status_key = 'submitted' loop
    update app.applications set status_key = 'pending_review', email_verified_at = now() where id = v_app.id;
    insert into app.membership_status_events(application_id, from_state, to_state, reason) values (v_app.id, 'submitted', 'pending_review', 'Signed in with a verified email');
  end loop;
  perform app.audit('account.linked', 'person', v_person::text, null, null);
  return true;
end $$;

-- Sign-up gate. Email sign-ups must carry the hash of a live activation token; provider sign-ups need an open invitation.
create or replace function app.hook_before_user_created(event jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(coalesce(event->'user'->>'email', ''));
  v_provider text := coalesce(event->'user'->'app_metadata'->>'provider', 'email');
  v_hash text := event->'user'->'user_metadata'->>'provision_hash';
begin
  if v_provider = 'email' then
    if v_hash is not null and exists (select 1 from app.account_provisions where email = v_email and token_hash = v_hash and consumed_at is null and expires_at > now()) then
      return '{}'::jsonb;
    end if;
  elsif exists (select 1 from app.account_provisions where email = v_email and consumed_at is null and expires_at > now()) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object('http_code', 403,
    'message', 'Accounts are created by BAUBC. Apply through the Join page or ask an administrator for an invitation.'));
end $$;
revoke execute on function app.hook_before_user_created(jsonb) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    execute 'grant usage on schema app to supabase_auth_admin';
    execute 'grant execute on function app.hook_before_user_created(jsonb) to supabase_auth_admin';
  end if;
end $$;

-- ───────────────────────────── payments: cash and bank, refunds ─────────────────────────────
create or replace function app.record_offline_payment(p_invoice uuid, p_method text, p_reference text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_inv app.invoices; v_reg app.registrations; v_tt app.ticket_types; v_pay uuid; v_me uuid := authz.current_person_id();
begin
  select * into v_inv from app.invoices where id = p_invoice for update;
  if v_inv.id is null then raise exception 'NOT_FOUND'; end if;
  select * into v_reg from app.registrations where id = v_inv.registration_id;
  if not (authz.has_perm('finance.verify') or (v_reg.id is not null and authz.has_perm('event.manage', 'event', v_reg.event_id))) then
    raise exception 'PERMISSION_DENIED';
  end if;
  if p_method not in ('cash', 'bank_transfer') then raise exception 'INVALID_METHOD'; end if;
  if v_inv.status <> 'open' then raise exception 'INVOICE_NOT_OPEN: %', v_inv.status; end if;
  if exists (select 1 from app.payments where invoice_id = v_inv.id and status in ('pending_verification', 'pending_second_verification')) then
    raise exception 'CLAIM_ALREADY_PENDING';
  end if;
  insert into app.payments(invoice_id, method, amount, status, provider, provider_trx_id, claimed_paid_at, claimed_by_person_id, claimer_email, note, receiving_account_id)
  values (v_inv.id, p_method, v_inv.amount, 'pending_verification', case when p_method = 'cash' then 'cash' else 'bank' end,
          case when p_method = 'bank_transfer' then nullif(upper(trim(p_reference)), '') end, now(), v_me, v_reg.email,
          'Received by ' || (select full_name from app.people where id = v_me) || coalesce(' · ' || nullif(trim(p_reference), ''), ''),
          coalesce((select id from app.finance_accounts where kind = case when p_method = 'cash' then 'cash' else 'bank' end and active limit 1),
                   (select id from app.finance_accounts where is_default_incoming limit 1)))
  returning id into v_pay;
  if v_reg.id is not null then
    select * into v_tt from app.ticket_types where id = v_reg.ticket_type_id;
    update app.registrations set status = 'pending_verification' where id = v_reg.id and status = 'pending_payment';
    update app.seat_holds set expires_at = greatest(expires_at, now() + make_interval(mins => v_tt.hold_minutes_manual)) where registration_id = v_reg.id and released_at is null;
  end if;
  perform app.audit('payment.recorded_offline', 'payment', v_pay::text, null, jsonb_build_object('invoice', v_inv.invoice_no, 'method', p_method));
  return v_pay;
exception when unique_violation then raise exception 'TRXID_ALREADY_USED';
end $$;

create or replace function app.request_refund(p_payment uuid, p_reason text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_p app.payments; v_done numeric; v_id uuid;
begin
  perform authz.require('finance.verify');
  if coalesce(trim(p_reason), '') = '' then raise exception 'REASON_REQUIRED'; end if;
  select * into v_p from app.payments where id = p_payment for update;
  if v_p.id is null or v_p.status not in ('verified', 'reconciliation_required') then raise exception 'NOT_REFUNDABLE'; end if;
  select coalesce(sum(amount), 0) into v_done from app.refunds where payment_id = v_p.id and status in ('requested', 'approved', 'completed');
  if v_done >= v_p.amount then raise exception 'ALREADY_REFUNDED'; end if;
  insert into app.refunds(payment_id, registration_id, amount, reason, requested_by)
  values (v_p.id, (select registration_id from app.invoices where id = v_p.invoice_id), v_p.amount - v_done, trim(p_reason), authz.current_person_id())
  returning id into v_id;
  perform app.audit('refund.requested', 'refund', v_id::text, null, jsonb_build_object('payment', v_p.id));
  return v_id;
end $$;

create or replace function app.submit_refund(p_refund uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_r app.refunds; v_inv text;
begin
  perform authz.require('finance.verify');
  select * into v_r from app.refunds where id = p_refund for update;
  if v_r.id is null or v_r.status <> 'requested' then raise exception 'NOT_REQUESTED'; end if;
  if exists (select 1 from app.approval_requests where refund_id = p_refund and status in ('pending', 'clarification', 'returned')) then
    raise exception 'ALREADY_SUBMITTED: this refund is already waiting for approval';
  end if;
  select i.invoice_no into v_inv from app.payments p join app.invoices i on i.id = p.invoice_id where p.id = v_r.payment_id;
  return app.open_approval('refund', 'Refund ' || v_inv || ' · ' || v_r.reason, v_r.amount, jsonb_build_object('reason', v_r.reason, 'invoice', v_inv), null, p_refund);
end $$;

create or replace function app.complete_refund(p_refund uuid, p_trx text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_r app.refunds; v_p app.payments; v_me uuid := authz.current_person_id(); v_acct uuid;
begin
  perform authz.require('finance.disburse.execute');
  perform authz.require_aal2();
  select * into v_r from app.refunds where id = p_refund for update;
  if v_r.id is null or v_r.status <> 'approved' then raise exception 'NOT_APPROVED: the refund must be approved first'; end if;
  if coalesce(trim(p_trx), '') = '' then raise exception 'REFERENCE_REQUIRED: enter the bKash TrxID or cash receipt number'; end if;
  if exists (select 1 from app.approval_actions aa join app.approval_requests ar on ar.id = aa.request_id
             where ar.refund_id = v_r.id and aa.actor_person_id = v_me and aa.action = 'approve' and aa.voided_at is null) then
    raise exception 'SOD_VIOLATION: an approver cannot pay out the same refund';
  end if;
  select * into v_p from app.payments where id = v_r.payment_id for update;
  update app.refunds set status = 'completed', executed_by = v_me, provider_trx_id = upper(trim(p_trx)), completed_at = now() where id = v_r.id;
  update app.payments set status = 'refunded' where id = v_p.id;
  update app.invoices set status = 'refunded' where id = v_p.invoice_id;
  update app.registrations set status = 'refunded' where id = v_r.registration_id and status = 'cancelled';
  v_acct := coalesce(v_p.receiving_account_id, (select id from app.finance_accounts where is_default_incoming limit 1));
  if v_acct is not null then
    insert into app.finance_entries(account_id, direction, amount, refund_id, memo, created_by)
    values (v_acct, 'out', v_r.amount, v_r.id, 'Refund · ' || v_r.reason || ' · ref ' || upper(trim(p_trx)), v_me);
  end if;
  perform app.audit('refund.completed', 'refund', v_r.id::text, null, jsonb_build_object('trx', upper(trim(p_trx)), 'amount', v_r.amount));
end $$;

-- ───────────────────────────── tasks ─────────────────────────────
create or replace function app.close_task(p_task uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_t app.tasks;
begin
  select * into v_t from app.tasks where id = p_task for update;
  if v_t.id is null then raise exception 'NOT_FOUND'; end if;
  if not (authz.has_perm('task.manage') or (v_t.scope_unit_id is not null and authz.has_perm('task.manage', 'unit', v_t.scope_unit_id))) then
    raise exception 'PERMISSION_DENIED: task.manage';
  end if;
  if p_status not in ('closed', 'cancelled', 'published') then raise exception 'INVALID_STATUS'; end if;
  update app.tasks set status = p_status where id = p_task;
  if p_status = 'cancelled' then
    update app.task_assignments set status = 'cancelled' where task_id = p_task and status in ('assigned', 'in_progress', 'revision_requested');
  end if;
  perform app.audit('task.status', 'task', p_task::text, jsonb_build_object('status', v_t.status), jsonb_build_object('status', p_status));
end $$;

-- ───────────────────────────── leaderboard & recognition ─────────────────────────────
create or replace function app.leaderboard(p_scope text default 'month') returns table(rank bigint, full_name text, wing text, points bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_mode text := coalesce(app.setting('features')->>'leaderboard', 'members');
  v_inside boolean := authz.current_person_id() is not null and (authz.is_member() or authz.has_perm_any('staff.portal') or authz.is_super_admin());
begin
  if v_mode = 'off' or (v_mode <> 'public' and not v_inside) then return; end if;
  return query
  select row_number() over (order by t.pts desc, t.nm), t.nm, t.wing, t.pts from (
    select case when v_inside or p.public_profile then coalesce(p.display_name, p.full_name) else split_part(p.full_name, ' ', 1) end nm,
           (select u.name from app.unit_memberships um join app.org_units u on u.id = um.unit_id where um.person_id = p.id and um.ended_at is null order by um.is_lead desc limit 1) wing,
           sum(l.amount)::bigint pts
    from app.point_ledger l join app.people p on p.id = l.person_id
    join app.memberships m on m.person_id = p.id and m.status_key = 'active'
    where p_scope <> 'month' or l.period_month = date_trunc('month', now() at time zone 'Asia/Dhaka')::date
    group by p.id having sum(l.amount) > 0
  ) t order by t.pts desc, t.nm limit 50;
end $$;

create or replace function app.public_recognition() returns table(period date, full_name text, citation text, wing text)
language sql stable security definer set search_path = '' as $$
  select r.period, case when p.public_profile then coalesce(p.display_name, p.full_name) else split_part(p.full_name, ' ', 1) end, r.citation,
         (select u.name from app.unit_memberships um join app.org_units u on u.id = um.unit_id where um.person_id = p.id and um.ended_at is null order by um.is_lead desc limit 1)
  from app.recognition_awards r join app.people p on p.id = r.person_id
  order by r.period desc limit 1
$$;

-- ───────────────────────────── privacy ─────────────────────────────
create or replace function app.open_privacy_request(p_kind text, p_details text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := authz.current_person_id(); v_id uuid;
begin
  if v_me is null then raise exception 'NOT_SIGNED_IN'; end if;
  if exists (select 1 from app.privacy_requests where person_id = v_me and kind = p_kind and status in ('received', 'in_progress')) then
    raise exception 'ALREADY_OPEN: you already have an open request of this kind';
  end if;
  insert into app.privacy_requests(person_id, email, kind, details) values (v_me, (select email from app.people where id = v_me), p_kind, nullif(trim(p_details), ''))
  returning id into v_id;
  perform app.audit('privacy.requested', 'privacy_request', v_id::text, null, jsonb_build_object('kind', p_kind));
  return v_id;
end $$;

create or replace function app.my_data() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) - 'user_id' from app.people p where p.id = authz.current_person_id()),
    'contact', (select to_jsonb(c) - 'person_id' from app.person_contacts c where c.person_id = authz.current_person_id()),
    'membership', (select to_jsonb(m) from app.memberships m where m.person_id = authz.current_person_id()),
    'applications', (select coalesce(jsonb_agg(to_jsonb(a)), '[]') from app.applications a where a.person_id = authz.current_person_id()),
    'wings', (select coalesce(jsonb_agg(jsonb_build_object('wing', u.name, 'position', um.position_title, 'from', um.started_at, 'to', um.ended_at)), '[]')
              from app.unit_memberships um join app.org_units u on u.id = um.unit_id where um.person_id = authz.current_person_id()),
    'roles', (select coalesce(jsonb_agg(jsonb_build_object('role', ra.role_key, 'from', ra.valid_from, 'revoked', ra.revoked_at)), '[]') from app.role_assignments ra where ra.person_id = authz.current_person_id()),
    'points', (select coalesce(jsonb_agg(jsonb_build_object('amount', l.amount, 'reason', l.reason, 'category', l.category, 'at', l.created_at) order by l.id), '[]') from app.point_ledger l where l.person_id = authz.current_person_id()),
    'achievements', (select coalesce(jsonb_agg(jsonb_build_object('title', a.title, 'kind', a.kind, 'on', a.occurred_on, 'status', a.status)), '[]') from app.achievement_records a where a.person_id = authz.current_person_id()),
    'registrations', (select coalesce(jsonb_agg(jsonb_build_object('event', e.title, 'status', r.status, 'at', r.created_at)), '[]') from app.registrations r join app.events e on e.id = r.event_id where r.person_id = authz.current_person_id()),
    'invoices', (select coalesce(jsonb_agg(jsonb_build_object('invoice', i.invoice_no, 'description', i.description, 'amount', i.amount, 'status', i.status)), '[]') from app.invoices i where i.payer_person_id = authz.current_person_id()),
    'certificates', (select coalesce(jsonb_agg(jsonb_build_object('serial', d.serial_no, 'title', d.title, 'issued', d.issued_at)), '[]') from app.issued_documents d where d.recipient_person_id = authz.current_person_id()),
    'consents', (select coalesce(jsonb_agg(jsonb_build_object('purpose', c.purpose, 'granted', c.granted_at, 'withdrawn', c.withdrawn_at)), '[]') from app.consent_records c where c.person_id = authz.current_person_id())
  )
$$;

create policy privacy_update on app.privacy_requests for update to authenticated using (authz.has_perm('privacy.handle')) with check (authz.has_perm('privacy.handle'));
grant update (status, handled_by) on app.privacy_requests to authenticated;

-- content editors keep the reach numbers up to date until the Facebook API is connected
drop policy social_write on app.social_posts;
create policy social_write on app.social_posts for all to authenticated
  using (authz.has_perm('cms.edit') or authz.has_perm('integration.manage')) with check (authz.has_perm('cms.edit') or authz.has_perm('integration.manage'));

-- ───────────────────────────── perks ─────────────────────────────
grant insert, update on app.perks to authenticated;
create or replace function app.add_perk_codes(p_perk uuid, p_codes text[]) returns int
language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  perform authz.require('perk.manage');
  insert into private.perk_codes(perk_id, code) select p_perk, trim(c) from unnest(p_codes) c where trim(c) <> '' on conflict do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end $$;
create or replace function app.perk_stock() returns table(perk_id uuid, total bigint, remaining bigint, claims bigint)
language sql stable security definer set search_path = '' as $$
  select p.id, (select count(*) from private.perk_codes c where c.perk_id = p.id), (select count(*) from private.perk_codes c where c.perk_id = p.id and c.claimed_by is null),
         (select count(*) from app.perk_claims c where c.perk_id = p.id)
  from app.perks p where authz.has_perm('perk.manage')
$$;

-- ───────────────────────────── profile photo (Supabase Storage, public "avatars" bucket) ─────────────────────────────
create or replace function app.set_my_photo(p_url text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid text := nullif(authz.claims()->>'sub', '');
begin
  if authz.current_person_id() is null then raise exception 'NOT_SIGNED_IN'; end if;
  if p_url is not null and p_url !~ ('^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/avatars/' || v_uid || '/[A-Za-z0-9._-]+(\?v=[0-9]+)?$') then
    raise exception 'INVALID_PHOTO_URL';
  end if;
  update app.people set photo_url = p_url where id = authz.current_person_id();
end $$;

do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
    values ('avatars', 'avatars', true, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
    on conflict (id) do update set public = true, file_size_limit = 1048576, allowed_mime_types = excluded.allowed_mime_types;
    execute 'drop policy if exists "baubc avatars: owner can read" on storage.objects';
    execute 'drop policy if exists "baubc avatars: owner can add" on storage.objects';
    execute 'drop policy if exists "baubc avatars: owner can replace" on storage.objects';
    execute 'drop policy if exists "baubc avatars: owner can remove" on storage.objects';
    execute $p$create policy "baubc avatars: owner can read" on storage.objects for select to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)$p$;
    execute $p$create policy "baubc avatars: owner can add" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)$p$;
    execute $p$create policy "baubc avatars: owner can replace" on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)$p$;
    execute $p$create policy "baubc avatars: owner can remove" on storage.objects for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)$p$;
  end if;
end $$;

-- ───────────────────────────── grants ─────────────────────────────
revoke execute on function
  app.assign_unit(uuid, uuid, text, boolean), app.end_unit_membership(uuid), app.set_account_status(uuid, text, text), app.revoke_mandate(uuid, text),
  app.reissue_provision(uuid, text), app.bootstrap_super_admins(jsonb), app.needs_setup(), app.link_verified_user(uuid),
  app.record_offline_payment(uuid, text, text), app.request_refund(uuid, text), app.submit_refund(uuid), app.complete_refund(uuid, text),
  app.close_task(uuid, text), app.leaderboard(text), app.public_recognition(), app.open_privacy_request(text, text), app.my_data(),
  app.add_perk_codes(uuid, text[]), app.perk_stock(), app.set_my_photo(text)
from public;
grant execute on function app.leaderboard(text), app.public_recognition() to anon, authenticated;
grant execute on function
  app.assign_unit(uuid, uuid, text, boolean), app.end_unit_membership(uuid), app.set_account_status(uuid, text, text), app.revoke_mandate(uuid, text),
  app.reissue_provision(uuid, text), app.record_offline_payment(uuid, text, text), app.request_refund(uuid, text), app.submit_refund(uuid),
  app.complete_refund(uuid, text), app.close_task(uuid, text), app.open_privacy_request(text, text), app.my_data(), app.add_perk_codes(uuid, text[]),
  app.perk_stock(), app.set_my_photo(text)
to authenticated;
