-- BAUBC OS · Events (atomic seat inventory, holds, waitlist, check-in) and Finance (invoices, manual bKash claims,
-- maker-checker verification, append-only cash book, disbursements, refunds, dues)

-- ───────────────────────────── events ─────────────────────────────
create table app.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  title_bn text,
  subtitle text,
  summary text,
  body text,
  category text not null check (category in ('summit','case_competition','pitch','olympiad','hackathon','workshop','talk','recruitment','series','social')),
  status text not null default 'draft' check (status in ('draft','published','completed','cancelled','archived')),
  venue text,
  venue_detail text,
  starts_at timestamptz,
  ends_at timestamptz,
  date_label text,
  reg_opens_at timestamptz,
  reg_closes_at timestamptz,
  is_online boolean not null default false,
  featured boolean not null default false,
  eligibility text,
  refund_policy text,
  contact_email text,
  external_url text,
  cover_tone text not null default 'canopy' check (cover_tone in ('canopy','harvest','paper','river')),
  organizer_unit_id uuid references app.org_units(id),
  created_by uuid references app.people(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);
create trigger events_touch before update on app.events for each row execute function app.touch_updated_at();
create index events_status_idx on app.events(status, starts_at);

create table app.event_people (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references app.events(id) on delete cascade,
  name text not null,
  role text not null default 'speaker' check (role in ('speaker','judge','mentor','host','guest')),
  title text,
  bio text,
  photo_url text,
  sort int not null default 100
);

create table app.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references app.events(id) on delete cascade,
  name text not null,
  description text,
  audience text not null default 'public' check (audience in ('public','members')),
  unit text not null default 'person' check (unit in ('person','team')),
  seats_per_unit int not null default 1 check (seats_per_unit between 1 and 20),
  team_min int,
  team_max int,
  price numeric(12,2) not null default 0 check (price >= 0),
  capacity int not null check (capacity >= 0),
  sold_count int not null default 0 check (sold_count >= 0),
  held_count int not null default 0 check (held_count >= 0),
  waitlist_enabled boolean not null default true,
  sales_start_at timestamptz,
  sales_end_at timestamptz,
  hold_minutes_online int not null default 30 check (hold_minutes_online between 5 and 240),
  hold_minutes_manual int not null default 1440 check (hold_minutes_manual between 30 and 4320),
  sort int not null default 100,
  constraint ticket_inventory_ok check (sold_count + held_count <= capacity)
);
create index ticket_types_event_idx on app.ticket_types(event_id);

create table app.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references app.events(id) on delete cascade,
  ticket_type_id uuid not null references app.ticket_types(id),
  person_id uuid references app.people(id),
  name text not null,
  email text not null,
  phone text,
  institution text,
  identity_key text not null,
  team_name text,
  team_members jsonb not null default '[]',
  answers jsonb not null default '{}',
  consent jsonb not null default '{}',
  units int not null default 1,
  status text not null check (status in ('pending_payment','pending_verification','confirmed','waitlisted','cancelled','expired','refunded')),
  source text not null default 'online' check (source in ('online','admin','walkin','waitlist')),
  ticket_code text not null unique,
  manage_token text not null unique,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text
);
create unique index registrations_active_identity_uq on app.registrations(event_id, identity_key)
  where status in ('pending_payment','pending_verification','confirmed');
create index registrations_event_idx on app.registrations(event_id, status);
create index registrations_person_idx on app.registrations(person_id);
comment on column app.registrations.ticket_code is 'Bearer code shown as QR. Readable only by the registrant and event staff.';

create table app.seat_holds (
  id uuid primary key default gen_random_uuid(),
  ticket_type_id uuid not null references app.ticket_types(id) on delete cascade,
  registration_id uuid not null unique references app.registrations(id) on delete cascade,
  units int not null,
  expires_at timestamptz not null,
  released_at timestamptz,
  release_reason text check (release_reason in ('expired','confirmed','cancelled','payment_rejected'))
);
create index seat_holds_active_idx on app.seat_holds(expires_at) where released_at is null;

create table app.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  ticket_type_id uuid not null references app.ticket_types(id) on delete cascade,
  position bigint generated always as identity,
  person_id uuid references app.people(id),
  name text not null,
  email text not null,
  identity_key text not null,
  status text not null default 'waiting' check (status in ('waiting','offered','accepted','expired','removed')),
  offered_registration_id uuid references app.registrations(id),
  created_at timestamptz not null default now()
);
create unique index waitlist_live_uq on app.waitlist_entries(ticket_type_id, identity_key) where status in ('waiting','offered');

create table app.checkins (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references app.registrations(id) on delete cascade,
  session_label text not null default 'main',
  scanned_by uuid references app.people(id),
  device_id text,
  method text not null default 'qr' check (method in ('qr','manual','offline_sync')),
  scanned_at timestamptz not null default now(),
  result text not null check (result in ('ok','duplicate')),
  created_at timestamptz not null default now()
);
create unique index checkins_single_use on app.checkins(registration_id, session_label) where result = 'ok';
create trigger checkins_immutable before update or delete on app.checkins for each row execute function ops.forbid_mutation();

-- ───────────────────────────── finance ─────────────────────────────
create table app.finance_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('bkash_personal','bkash_merchant','cash','bank')),
  identifier_last4 text,
  custodian_person_id uuid references app.people(id),
  is_default_incoming boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index one_default_incoming on app.finance_accounts((true)) where is_default_incoming;

create table app.dues_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  audience_role text not null,
  amount numeric(12,2) not null check (amount > 0),
  frequency text not null default 'monthly' check (frequency in ('monthly')),
  starts_on date not null default date_trunc('month', now())::date,
  active boolean not null default true
);

create table app.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_no text not null unique,
  payer_person_id uuid references app.people(id),
  registration_id uuid unique references app.registrations(id) on delete set null,
  dues_plan_id uuid references app.dues_plans(id),
  period date,
  purpose text not null check (purpose in ('event_fee','dues','membership_fee','workshop_fee','other')),
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'open' check (status in ('open','paid','void','refunded')),
  due_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (dues_plan_id, payer_person_id, period)
);

create table app.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references app.invoices(id),
  method text not null check (method in ('bkash_send_money','bkash_pgw','cash','bank_transfer')),
  amount numeric(12,2) not null check (amount > 0),
  status text not null check (status in ('pending_verification','pending_second_verification','verified','rejected','refunded','reconciliation_required')),
  provider text not null default 'bkash',
  provider_trx_id text,
  payer_wallet_last4 text check (payer_wallet_last4 is null or payer_wallet_last4 ~ '^[0-9]{4}$'),
  claimed_paid_at timestamptz,
  claimed_by_person_id uuid references app.people(id),
  claimer_email text,
  note text,
  idempotency_key text unique,
  verified_by uuid references app.people(id),
  verified_at timestamptz,
  second_verified_by uuid references app.people(id),
  rejection_reason text,
  receiving_account_id uuid references app.finance_accounts(id),
  created_at timestamptz not null default now(),
  check (second_verified_by is null or second_verified_by <> verified_by)
);
create unique index payments_trx_unique on app.payments(provider, upper(provider_trx_id)) where provider_trx_id is not null;
create index payments_status_idx on app.payments(status, created_at);

create table app.finance_entries (
  id bigint generated always as identity primary key,
  account_id uuid not null references app.finance_accounts(id),
  direction text not null check (direction in ('in','out')),
  amount numeric(12,2) not null check (amount > 0),
  occurred_at timestamptz not null default now(),
  payment_id uuid references app.payments(id),
  disbursement_id uuid,
  refund_id uuid,
  memo text not null,
  created_by uuid references app.people(id),
  created_at timestamptz not null default now()
);
create trigger finance_entries_immutable before update or delete on app.finance_entries for each row execute function ops.forbid_mutation();

create table app.disbursement_requests (
  id uuid primary key default gen_random_uuid(),
  request_no text not null unique,
  kind text not null check (kind in ('vendor','expense','reimbursement','prize','advance','other')),
  purpose text not null,
  amount numeric(12,2) not null check (amount > 0),
  payee_name text not null,
  payee_account_last4 text,
  method_planned text not null default 'bkash' check (method_planned in ('bkash','bank','cash')),
  budget_line text,
  evidence_urls text[] not null default '{}',
  event_id uuid references app.events(id),
  requested_by uuid not null references app.people(id),
  status text not null default 'pending_approval' check (status in ('draft','pending_approval','approved','rejected','returned','processing','successful','failed','cancelled','reconciliation_required')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger disb_touch before update on app.disbursement_requests for each row execute function app.touch_updated_at();

create table app.disbursement_executions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references app.disbursement_requests(id),
  executed_by uuid not null references app.people(id),
  method text not null,
  provider_trx_id text not null,
  amount numeric(12,2) not null check (amount > 0),
  proof_url text,
  executed_at timestamptz not null default now(),
  verified_by uuid references app.people(id),
  verified_at timestamptz,
  check (verified_by is null or verified_by <> executed_by)
);
create unique index executions_trx_unique on app.disbursement_executions(method, upper(provider_trx_id));

create table app.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references app.payments(id),
  registration_id uuid references app.registrations(id),
  amount numeric(12,2) not null check (amount > 0),
  reason text not null,
  status text not null default 'requested' check (status in ('requested','approved','completed','rejected','failed')),
  requested_by uuid references app.people(id),
  executed_by uuid references app.people(id),
  provider_trx_id text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ───────────────────────────── inventory helpers ─────────────────────────────
create or replace function app.broadcast_availability() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  begin
    perform realtime.send(
      jsonb_build_object('ticket_type_id', new.id, 'seats_left', new.capacity - new.sold_count - new.held_count,
                         'capacity', new.capacity, 'sold', new.sold_count, 'held', new.held_count),
      'availability', 'event:' || new.event_id::text || ':availability', false);
  exception when others then null; -- realtime unavailable (preview mode): clients fall back to polling
  end;
  return new;
end $$;
create trigger ticket_types_broadcast after update of sold_count, held_count, capacity on app.ticket_types
  for each row execute function app.broadcast_availability();

create or replace function app.event_availability(p_event uuid) returns table(
  ticket_type_id uuid, name text, description text, audience text, unit text, price numeric, capacity int, sold int, held int, seats_left int,
  waitlist_enabled boolean, waitlist_count bigint, sales_open boolean)
language sql stable security definer set search_path = '' as $$
  select t.id, t.name, t.description, t.audience, t.unit, t.price, t.capacity, t.sold_count, t.held_count,
         t.capacity - t.sold_count - t.held_count, t.waitlist_enabled,
         (select count(*) from app.waitlist_entries w where w.ticket_type_id = t.id and w.status = 'waiting'),
         e.status = 'published'
           and now() >= coalesce(t.sales_start_at, e.reg_opens_at, 'infinity'::timestamptz)
           and now() < coalesce(t.sales_end_at, e.reg_closes_at, 'infinity'::timestamptz)
  from app.ticket_types t join app.events e on e.id = t.event_id
  where t.event_id = p_event and e.status in ('published','completed')
  order by t.sort, t.price
$$;

create or replace function app.next_invoice_no() returns text language sql volatile security definer set search_path = '' as $$
  select 'INV-' || to_char(now() at time zone 'Asia/Dhaka', 'YYYY') || '-' || lpad(app.next_counter('invoice_' || to_char(now() at time zone 'Asia/Dhaka', 'YYYY'))::text, 5, '0')
$$;

-- release expired holds, void their invoices, then promote waitlists
create or replace function app.expire_holds(p_ticket_type uuid default null) returns int
language plpgsql security definer set search_path = '' as $$
declare v_n int := 0; r record;
begin
  for r in
    update app.seat_holds h set released_at = now(), release_reason = 'expired'
    where h.released_at is null and h.expires_at < now() and (p_ticket_type is null or h.ticket_type_id = p_ticket_type)
    returning h.ticket_type_id, h.units, h.registration_id
  loop
    update app.ticket_types set held_count = held_count - r.units where id = r.ticket_type_id;
    update app.registrations set status = 'expired' where id = r.registration_id and status in ('pending_payment','pending_verification');
    update app.invoices set status = 'void' where registration_id = r.registration_id and status = 'open';
    v_n := v_n + 1;
  end loop;
  if v_n > 0 then
    for r in select distinct t.id from app.ticket_types t where (p_ticket_type is null or t.id = p_ticket_type) loop
      perform app.promote_waitlist(r.id);
    end loop;
  end if;
  return v_n;
end $$;

-- internal: create a held registration (no permission checks; callers check)
create or replace function app._hold_registration(p_tt uuid, p_person uuid, p_name text, p_email text, p_phone text, p_institution text,
  p_team_name text, p_team jsonb, p_answers jsonb, p_consent jsonb, p_identity text, p_idem text, p_source text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_tt app.ticket_types; v_ev app.events; v_reg uuid; v_code text := app.random_code(20); v_manage text := lower(app.random_code(32));
        v_inv uuid; v_status text; v_expires timestamptz;
begin
  update app.ticket_types set held_count = held_count + seats_per_unit
  where id = p_tt and sold_count + held_count + seats_per_unit <= capacity
  returning * into v_tt;
  if v_tt.id is null then raise exception 'SOLD_OUT' using errcode = 'P0001'; end if;
  select * into v_ev from app.events where id = v_tt.event_id;

  v_status := case when v_tt.price = 0 then 'confirmed' else 'pending_payment' end;
  v_expires := now() + make_interval(mins => v_tt.hold_minutes_online);
  insert into app.registrations(event_id, ticket_type_id, person_id, name, email, phone, institution, identity_key, team_name, team_members,
                                answers, consent, units, status, source, ticket_code, manage_token, idempotency_key, confirmed_at)
  values (v_ev.id, v_tt.id, p_person, trim(p_name), lower(trim(p_email)), p_phone, p_institution, p_identity, p_team_name, coalesce(p_team, '[]'),
          coalesce(p_answers, '{}'), coalesce(p_consent, '{}'), v_tt.seats_per_unit, v_status, p_source, v_code, v_manage, p_idem,
          case when v_status = 'confirmed' then now() end)
  returning id into v_reg;

  if v_status = 'confirmed' then
    update app.ticket_types set held_count = held_count - seats_per_unit, sold_count = sold_count + seats_per_unit where id = v_tt.id;
    perform app.enqueue('email.ticket', jsonb_build_object('registration_id', v_reg), 'email:ticket:' || v_reg);
  else
    insert into app.seat_holds(ticket_type_id, registration_id, units, expires_at) values (v_tt.id, v_reg, v_tt.seats_per_unit, v_expires);
    insert into app.invoices(invoice_no, payer_person_id, registration_id, purpose, description, amount, due_at)
    values (app.next_invoice_no(), p_person, v_reg, 'event_fee', v_ev.title || ' · ' || v_tt.name, v_tt.price, v_expires)
    returning id into v_inv;
    perform app.enqueue('email.payment_instructions', jsonb_build_object('registration_id', v_reg), 'email:payinstr:' || v_reg);
  end if;
  if p_person is not null then
    perform app.notify(p_person, 'event', 'Registered: ' || v_ev.title,
      case when v_status = 'confirmed' then 'Your seat is confirmed.' else 'Complete payment to confirm your seat.' end,
      '/tickets/' || v_manage, 'reg:' || v_reg);
  end if;
  return jsonb_build_object('registration_id', v_reg, 'status', v_status, 'manage_token', v_manage, 'invoice_id', v_inv,
                            'hold_expires_at', case when v_status <> 'confirmed' then v_expires end, 'event_slug', v_ev.slug);
end $$;

-- PUBLIC: reserve a seat (anon or signed-in). Atomic, idempotent, duplicate-safe.
create or replace function app.reserve_seat(p_ticket_type uuid, p_name text, p_email text, p_phone text, p_institution text,
  p_team_name text, p_team jsonb, p_answers jsonb, p_consent jsonb, p_idem text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_tt app.ticket_types; v_ev app.events; v_me uuid := authz.current_person_id(); v_person app.people; v_identity text; v_existing app.registrations;
        v_email text := lower(trim(coalesce(p_email, '')));
begin
  if p_idem is not null then
    select * into v_existing from app.registrations where idempotency_key = p_idem;
    if v_existing.id is not null then
      return jsonb_build_object('registration_id', v_existing.id, 'status', v_existing.status, 'manage_token', v_existing.manage_token, 'replayed', true);
    end if;
  end if;
  select * into v_tt from app.ticket_types where id = p_ticket_type;
  if v_tt.id is null then raise exception 'NOT_FOUND'; end if;
  select * into v_ev from app.events where id = v_tt.event_id;
  if v_ev.status <> 'published'
     or now() < coalesce(v_tt.sales_start_at, v_ev.reg_opens_at, 'infinity'::timestamptz)
     or now() >= coalesce(v_tt.sales_end_at, v_ev.reg_closes_at, 'infinity'::timestamptz) then
    raise exception 'REGISTRATION_CLOSED' using errcode = 'P0001';
  end if;
  if v_tt.audience = 'members' and not authz.is_member() then raise exception 'MEMBERS_ONLY'; end if;
  if v_me is not null then
    select * into v_person from app.people where id = v_me;
    v_identity := 'p:' || v_me; v_email := v_person.email;
  else
    if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'INVALID_EMAIL'; end if;
    v_identity := 'e:' || v_email;
  end if;
  if coalesce(trim(coalesce(p_name, v_person.full_name)), '') = '' then raise exception 'NAME_REQUIRED'; end if;
  if v_tt.unit = 'team' then
    if coalesce(trim(p_team_name), '') = '' then raise exception 'TEAM_NAME_REQUIRED'; end if;
    if jsonb_array_length(coalesce(p_team, '[]')) + 1 < coalesce(v_tt.team_min, 1)
       or jsonb_array_length(coalesce(p_team, '[]')) + 1 > coalesce(v_tt.team_max, 20) then
      raise exception 'TEAM_SIZE: teams need % to % members', coalesce(v_tt.team_min, 1), coalesce(v_tt.team_max, 20);
    end if;
  end if;
  perform app.expire_holds(v_tt.id);
  if exists (select 1 from app.registrations where event_id = v_ev.id and identity_key = v_identity
             and status in ('pending_payment','pending_verification','confirmed')) then
    raise exception 'ALREADY_REGISTERED';
  end if;
  return app._hold_registration(v_tt.id, v_me, coalesce(nullif(trim(p_name), ''), v_person.full_name), v_email, p_phone, p_institution,
                                p_team_name, p_team, p_answers, p_consent, v_identity, p_idem, 'online');
end $$;

create or replace function app.join_waitlist(p_ticket_type uuid, p_name text, p_email text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := authz.current_person_id(); v_email text := lower(trim(p_email)); v_id uuid; v_pos bigint;
begin
  if v_me is not null then select email into v_email from app.people where id = v_me; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'INVALID_EMAIL'; end if;
  if not exists (select 1 from app.ticket_types where id = p_ticket_type and waitlist_enabled) then raise exception 'WAITLIST_CLOSED'; end if;
  insert into app.waitlist_entries(ticket_type_id, person_id, name, email, identity_key)
  values (p_ticket_type, v_me, trim(p_name), v_email, coalesce('p:' || v_me, 'e:' || v_email))
  on conflict do nothing returning id, position into v_id, v_pos;
  if v_id is null then raise exception 'ALREADY_ON_WAITLIST'; end if;
  return jsonb_build_object('waitlist_id', v_id, 'position',
    (select count(*) from app.waitlist_entries where ticket_type_id = p_ticket_type and status = 'waiting' and position <= v_pos));
end $$;

create or replace function app.promote_waitlist(p_ticket_type uuid) returns int language plpgsql security definer set search_path = '' as $$
declare v_w app.waitlist_entries; v_tt app.ticket_types; v_res jsonb; v_n int := 0;
begin
  loop
    select * into v_tt from app.ticket_types where id = p_ticket_type;
    exit when v_tt.capacity - v_tt.sold_count - v_tt.held_count < v_tt.seats_per_unit;
    select * into v_w from app.waitlist_entries where ticket_type_id = p_ticket_type and status = 'waiting' order by position limit 1 for update skip locked;
    exit when v_w.id is null;
    begin
      v_res := app._hold_registration(p_ticket_type, v_w.person_id, v_w.name, v_w.email, null, null, null, '[]', '{}', '{}', v_w.identity_key, null, 'waitlist');
      update app.seat_holds set expires_at = now() + interval '12 hours' where registration_id = (v_res->>'registration_id')::uuid;
      update app.waitlist_entries set status = 'offered', offered_registration_id = (v_res->>'registration_id')::uuid where id = v_w.id;
      perform app.enqueue('email.waitlist_offer', jsonb_build_object('registration_id', v_res->>'registration_id'), 'email:wl:' || v_w.id);
    exception when unique_violation then
      update app.waitlist_entries set status = 'removed' where id = v_w.id;
    end;
    v_n := v_n + 1;
    exit when v_n > 50;
  end loop;
  return v_n;
end $$;

-- cancel: by registrant (signed in or via manage token) or event staff
create or replace function app.cancel_registration(p_registration uuid, p_manage_token text, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_r app.registrations; v_pay app.payments;
begin
  select * into v_r from app.registrations where id = p_registration for update;
  if v_r.id is null then raise exception 'NOT_FOUND'; end if;
  if not (v_r.person_id = authz.current_person_id()
          or (p_manage_token is not null and v_r.manage_token = p_manage_token)
          or authz.has_perm('event.manage', 'event', v_r.event_id)) then
    raise exception 'PERMISSION_DENIED';
  end if;
  if v_r.status not in ('pending_payment','pending_verification','confirmed') then raise exception 'NOT_CANCELLABLE'; end if;
  if v_r.status = 'confirmed' then
    update app.ticket_types set sold_count = sold_count - v_r.units where id = v_r.ticket_type_id;
  else
    update app.seat_holds set released_at = now(), release_reason = 'cancelled' where registration_id = v_r.id and released_at is null;
    update app.ticket_types set held_count = held_count - v_r.units where id = v_r.ticket_type_id;
    update app.invoices set status = 'void' where registration_id = v_r.id and status = 'open';
  end if;
  update app.registrations set status = 'cancelled', cancelled_at = now(), cancel_reason = p_reason where id = v_r.id;
  select p.* into v_pay from app.payments p join app.invoices i on i.id = p.invoice_id
  where i.registration_id = v_r.id and p.status = 'verified' limit 1;
  if v_pay.id is not null then
    insert into app.refunds(payment_id, registration_id, amount, reason, requested_by)
    values (v_pay.id, v_r.id, v_pay.amount, coalesce(p_reason, 'Registration cancelled'), authz.current_person_id());
  end if;
  perform app.promote_waitlist(v_r.ticket_type_id);
  perform app.audit('registration.cancelled', 'registration', v_r.id::text, jsonb_build_object('status', v_r.status), jsonb_build_object('reason', p_reason));
end $$;

-- staff: walk-in / admin-assisted registration through the same inventory
create or replace function app.admin_register(p_ticket_type uuid, p_name text, p_email text, p_phone text, p_institution text, p_source text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_tt app.ticket_types;
begin
  select * into v_tt from app.ticket_types where id = p_ticket_type;
  perform authz.require('event.manage', 'event', v_tt.event_id);
  perform app.expire_holds(v_tt.id);
  return app._hold_registration(v_tt.id, null, p_name, p_email, p_phone, p_institution, null, '[]', '{}', '{}',
                                'e:' || lower(trim(p_email)), null, coalesce(p_source, 'admin'));
end $$;

-- staff: capacity change (never below confirmed seats)
create or replace function app.set_capacity(p_ticket_type uuid, p_capacity int) returns void
language plpgsql security definer set search_path = '' as $$
declare v_tt app.ticket_types;
begin
  select * into v_tt from app.ticket_types where id = p_ticket_type for update;
  perform authz.require('event.manage', 'event', v_tt.event_id);
  if p_capacity < v_tt.sold_count + v_tt.held_count then
    raise exception 'CAPACITY_BELOW_COMMITTED: % seats are sold or held', v_tt.sold_count + v_tt.held_count;
  end if;
  update app.ticket_types set capacity = p_capacity where id = v_tt.id;
  perform app.audit('ticket_type.capacity', 'ticket_type', v_tt.id::text, jsonb_build_object('capacity', v_tt.capacity), jsonb_build_object('capacity', p_capacity));
  perform app.promote_waitlist(v_tt.id);
end $$;

-- ───────────────────────────── payments ─────────────────────────────
-- payer submits a bKash Send Money TrxID (signed-in payer or guest with manage token)
create or replace function app.claim_payment(p_invoice uuid, p_manage_token text, p_trx text, p_wallet_last4 text, p_amount numeric, p_paid_at timestamptz, p_idem text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_inv app.invoices; v_reg app.registrations; v_pay uuid; v_tt app.ticket_types; v_trx text := upper(regexp_replace(coalesce(p_trx, ''), '\s', '', 'g'));
begin
  select * into v_inv from app.invoices where id = p_invoice for update;
  if v_inv.id is null then raise exception 'NOT_FOUND'; end if;
  select * into v_reg from app.registrations where id = v_inv.registration_id;
  if not (v_inv.payer_person_id = authz.current_person_id()
          or (p_manage_token is not null and v_reg.manage_token = p_manage_token)) then
    raise exception 'PERMISSION_DENIED';
  end if;
  if v_inv.status <> 'open' then raise exception 'INVOICE_NOT_OPEN: %', v_inv.status; end if;
  if v_trx !~ '^[A-Z0-9]{8,12}$' then raise exception 'INVALID_TRXID: a bKash TrxID has 8 to 12 letters and digits'; end if;
  if p_wallet_last4 !~ '^[0-9]{4}$' then raise exception 'INVALID_WALLET: enter the last 4 digits of the sending number'; end if;
  if p_amount <> v_inv.amount then raise exception 'AMOUNT_MISMATCH: this invoice is BDT %', v_inv.amount; end if;
  if exists (select 1 from app.payments where invoice_id = v_inv.id and status in ('pending_verification','pending_second_verification')) then
    raise exception 'CLAIM_ALREADY_PENDING';
  end if;
  begin
    insert into app.payments(invoice_id, method, amount, status, provider, provider_trx_id, payer_wallet_last4, claimed_paid_at,
                             claimed_by_person_id, claimer_email, idempotency_key, receiving_account_id)
    values (v_inv.id, 'bkash_send_money', p_amount, 'pending_verification', 'bkash', v_trx, p_wallet_last4, coalesce(p_paid_at, now()),
            authz.current_person_id(), v_reg.email, p_idem, (select id from app.finance_accounts where is_default_incoming limit 1))
    returning id into v_pay;
  exception when unique_violation then
    perform app.audit('payment.duplicate_trx_attempt', 'invoice', v_inv.id::text, null, jsonb_build_object('trx', v_trx));
    raise exception 'TRXID_ALREADY_USED: this transaction ID has already been submitted';
  end;
  if v_reg.id is not null then
    select * into v_tt from app.ticket_types where id = v_reg.ticket_type_id;
    update app.registrations set status = 'pending_verification' where id = v_reg.id and status = 'pending_payment';
    update app.seat_holds set expires_at = greatest(expires_at, now() + make_interval(mins => v_tt.hold_minutes_manual))
    where registration_id = v_reg.id and released_at is null;
  end if;
  perform app.audit('payment.claimed', 'payment', v_pay::text, null, jsonb_build_object('invoice', v_inv.invoice_no, 'trx', v_trx, 'amount', p_amount));
  return jsonb_build_object('payment_id', v_pay, 'status', 'pending_verification');
end $$;

-- finance verifier: verify or reject a claim (maker-checker, MFA, payer ≠ verifier, second verifier above threshold)
create or replace function app.verify_payment(p_payment uuid, p_verified boolean, p_reason text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_p app.payments; v_inv app.invoices; v_reg app.registrations; v_me uuid := authz.current_person_id();
        v_threshold numeric := coalesce((app.setting('finance')->>'second_verifier_threshold')::numeric, 5000); v_new text;
begin
  perform authz.require('finance.verify');
  perform authz.require_aal2();
  select * into v_p from app.payments where id = p_payment for update;
  if v_p.id is null then raise exception 'NOT_FOUND'; end if;
  if v_p.status not in ('pending_verification','pending_second_verification') then raise exception 'NOT_PENDING'; end if;
  if v_p.claimed_by_person_id = v_me then raise exception 'SOD_VIOLATION: you cannot verify your own payment'; end if;
  select * into v_inv from app.invoices where id = v_p.invoice_id for update;
  select * into v_reg from app.registrations where id = v_inv.registration_id;

  if not p_verified then
    if coalesce(trim(p_reason), '') = '' then raise exception 'REASON_REQUIRED'; end if;
    update app.payments set status = 'rejected', rejection_reason = p_reason, verified_by = v_me, verified_at = now() where id = v_p.id;
    if v_reg.id is not null and v_reg.status = 'pending_verification' then
      update app.registrations set status = 'pending_payment' where id = v_reg.id;
      update app.seat_holds set expires_at = now() + interval '2 hours' where registration_id = v_reg.id and released_at is null;
    end if;
    perform app.enqueue('email.payment_rejected', jsonb_build_object('payment_id', v_p.id, 'reason', p_reason), 'email:payrej:' || v_p.id);
    perform app.audit('payment.rejected', 'payment', v_p.id::text, null, jsonb_build_object('reason', p_reason));
    return jsonb_build_object('status', 'rejected');
  end if;

  if v_p.status = 'pending_verification' and v_p.amount > v_threshold then
    update app.payments set status = 'pending_second_verification', verified_by = v_me, verified_at = now() where id = v_p.id;
    perform app.audit('payment.first_verification', 'payment', v_p.id::text, null, jsonb_build_object('threshold', v_threshold));
    return jsonb_build_object('status', 'pending_second_verification');
  end if;
  if v_p.status = 'pending_second_verification' and v_p.verified_by = v_me then
    raise exception 'SOD_VIOLATION: a different person must give the second verification';
  end if;

  if v_inv.status = 'paid' then
    update app.payments set status = 'reconciliation_required', note = 'Invoice already paid by another payment' where id = v_p.id;
    return jsonb_build_object('status', 'reconciliation_required');
  end if;

  if v_p.status = 'pending_second_verification' then
    update app.payments set status = 'verified', second_verified_by = v_me where id = v_p.id;
  else
    update app.payments set status = 'verified', verified_by = v_me, verified_at = now() where id = v_p.id;
  end if;
  update app.invoices set status = 'paid', paid_at = now() where id = v_inv.id;
  insert into app.finance_entries(account_id, direction, amount, payment_id, memo, created_by)
  select coalesce(v_p.receiving_account_id, (select id from app.finance_accounts where is_default_incoming limit 1)),
         'in', v_p.amount, v_p.id, v_inv.invoice_no || ' · ' || v_inv.description || ' · TrxID ' || v_p.provider_trx_id, v_me
  where coalesce(v_p.receiving_account_id, (select id from app.finance_accounts where is_default_incoming limit 1)) is not null;

  if v_reg.id is not null and v_reg.status in ('pending_verification','pending_payment') then
    update app.seat_holds set released_at = now(), release_reason = 'confirmed' where registration_id = v_reg.id and released_at is null;
    update app.ticket_types set held_count = held_count - v_reg.units, sold_count = sold_count + v_reg.units where id = v_reg.ticket_type_id;
    update app.registrations set status = 'confirmed', confirmed_at = now() where id = v_reg.id;
    update app.waitlist_entries set status = 'accepted' where offered_registration_id = v_reg.id;
    perform app.enqueue('email.ticket', jsonb_build_object('registration_id', v_reg.id), 'email:ticket:' || v_reg.id);
  elsif v_reg.id is not null and v_reg.status = 'expired' then
    update app.payments set status = 'reconciliation_required', note = 'Seat hold expired before verification: refund or re-seat' where id = v_p.id;
  end if;
  if v_inv.payer_person_id is not null then
    perform app.notify(v_inv.payer_person_id, 'payment', 'Payment verified', v_inv.invoice_no || ' · BDT ' || v_inv.amount, '/app', 'pay:' || v_p.id);
  end if;
  perform app.audit('payment.verified', 'payment', v_p.id::text, null, jsonb_build_object('invoice', v_inv.invoice_no, 'amount', v_p.amount));
  return jsonb_build_object('status', 'verified');
end $$;

-- ───────────────────────────── check-in ─────────────────────────────
create or replace function app.check_in(p_code text, p_event uuid, p_session text, p_device text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_r app.registrations; v_first app.checkins; v_scanner text;
begin
  perform authz.require('event.checkin', 'event', p_event);
  select * into v_r from app.registrations where ticket_code = upper(trim(p_code));
  if v_r.id is null then return jsonb_build_object('result', 'invalid', 'message', 'Unknown ticket'); end if;
  if v_r.event_id <> p_event then return jsonb_build_object('result', 'wrong_event', 'name', v_r.name); end if;
  if v_r.status <> 'confirmed' then return jsonb_build_object('result', 'invalid', 'name', v_r.name, 'message', 'Ticket status: ' || v_r.status); end if;
  begin
    insert into app.checkins(registration_id, session_label, scanned_by, device_id, method, result)
    values (v_r.id, coalesce(p_session, 'main'), authz.current_person_id(), p_device, 'qr', 'ok');
    return jsonb_build_object('result', 'ok', 'name', v_r.name, 'team', v_r.team_name,
      'ticket', (select name from app.ticket_types where id = v_r.ticket_type_id));
  exception when unique_violation then
    select * into v_first from app.checkins where registration_id = v_r.id and session_label = coalesce(p_session, 'main') and result = 'ok';
    select full_name into v_scanner from app.people where id = v_first.scanned_by;
    insert into app.checkins(registration_id, session_label, scanned_by, device_id, method, result)
    values (v_r.id, coalesce(p_session, 'main'), authz.current_person_id(), p_device, 'qr', 'duplicate');
    return jsonb_build_object('result', 'duplicate', 'name', v_r.name, 'first_scan_at', v_first.scanned_at, 'first_scanner', v_scanner);
  end;
end $$;

-- ───────────────────────────── dues ─────────────────────────────
create or replace function app.generate_dues(p_period date) returns int language plpgsql security definer set search_path = '' as $$
declare v_n int := 0; r record; v_period date := date_trunc('month', p_period)::date;
begin
  if authz.current_person_id() is not null then perform authz.require('finance.verify'); end if;
  for r in
    select dp.id plan_id, dp.amount, dp.name, ra.person_id
    from app.dues_plans dp
    join app.role_assignments ra on ra.role_key = dp.audience_role and ra.revoked_at is null
    where dp.active and dp.starts_on <= v_period
  loop
    insert into app.invoices(invoice_no, payer_person_id, dues_plan_id, period, purpose, description, amount, due_at)
    values (app.next_invoice_no(), r.person_id, r.plan_id, v_period, 'dues', r.name || ' · ' || to_char(v_period, 'Mon YYYY'), r.amount,
            (v_period + interval '1 month')::timestamptz)
    on conflict (dues_plan_id, payer_person_id, period) do nothing;
    if found then
      v_n := v_n + 1;
      perform app.notify(r.person_id, 'dues', 'Monthly dues: BDT ' || r.amount, to_char(v_period, 'Mon YYYY'), '/app/dues', 'dues:' || r.plan_id || ':' || v_period);
    end if;
  end loop;
  return v_n;
end $$;

-- payer for dues invoices uses claim_payment with no manage token (signed in)

-- ───────────────────────────── RLS ─────────────────────────────
alter table app.events enable row level security;
alter table app.event_people enable row level security;
alter table app.ticket_types enable row level security;
alter table app.registrations enable row level security;
alter table app.seat_holds enable row level security;
alter table app.waitlist_entries enable row level security;
alter table app.checkins enable row level security;
alter table app.finance_accounts enable row level security;
alter table app.dues_plans enable row level security;
alter table app.invoices enable row level security;
alter table app.payments enable row level security;
alter table app.finance_entries enable row level security;
alter table app.disbursement_requests enable row level security;
alter table app.disbursement_executions enable row level security;
alter table app.refunds enable row level security;

create policy events_read on app.events for select to anon, authenticated using (
  status in ('published','completed') or authz.has_perm_any('event.manage'));
create policy events_insert on app.events for insert to authenticated with check (authz.has_perm('event.manage'));
create policy events_update on app.events for update to authenticated using (authz.has_perm('event.manage') or authz.has_perm('event.manage','event',id))
  with check (authz.has_perm('event.manage') or authz.has_perm('event.manage','event',id));
create policy event_people_read on app.event_people for select to anon, authenticated using (
  exists (select 1 from app.events e where e.id = event_id and (e.status in ('published','completed') or authz.has_perm_any('event.manage'))));
create policy event_people_write on app.event_people for all to authenticated using (authz.has_perm('event.manage') or authz.has_perm('event.manage','event',event_id))
  with check (authz.has_perm('event.manage') or authz.has_perm('event.manage','event',event_id));
create policy ticket_types_read on app.ticket_types for select to anon, authenticated using (
  exists (select 1 from app.events e where e.id = event_id and (e.status in ('published','completed') or authz.has_perm_any('event.manage'))));
create policy ticket_types_insert on app.ticket_types for insert to authenticated with check (authz.has_perm('event.manage') or authz.has_perm('event.manage','event',event_id));
create policy ticket_types_update on app.ticket_types for update to authenticated using (authz.has_perm('event.manage') or authz.has_perm('event.manage','event',event_id))
  with check (authz.has_perm('event.manage') or authz.has_perm('event.manage','event',event_id));
create policy registrations_read on app.registrations for select to authenticated using (
  person_id = authz.current_person_id() or authz.has_perm('event.manage') or authz.has_perm('event.manage','event',event_id)
  or authz.has_perm('event.checkin','event',event_id) or authz.has_perm('finance.verify'));
create policy holds_read on app.seat_holds for select to authenticated using (authz.has_perm_any('event.manage'));
create policy waitlist_read on app.waitlist_entries for select to authenticated using (person_id = authz.current_person_id() or authz.has_perm_any('event.manage'));
create policy checkins_read on app.checkins for select to authenticated using (
  authz.has_perm_any('event.manage') or authz.has_perm_any('event.checkin')
  or exists (select 1 from app.registrations r where r.id = registration_id and r.person_id = authz.current_person_id()));
create policy finance_accounts_read on app.finance_accounts for select to authenticated using (authz.has_perm('finance.read'));
create policy dues_plans_read on app.dues_plans for select to authenticated using (true);
create policy dues_plans_write on app.dues_plans for all to authenticated using (authz.has_perm('settings.manage')) with check (authz.has_perm('settings.manage'));
create policy invoices_read on app.invoices for select to authenticated using (payer_person_id = authz.current_person_id() or authz.has_perm('finance.read'));
create policy payments_read on app.payments for select to authenticated using (
  claimed_by_person_id = authz.current_person_id() or authz.has_perm('finance.read')
  or exists (select 1 from app.invoices i where i.id = invoice_id and i.payer_person_id = authz.current_person_id()));
create policy entries_read on app.finance_entries for select to authenticated using (authz.has_perm('finance.read'));
create policy disb_read on app.disbursement_requests for select to authenticated using (
  requested_by = authz.current_person_id() or authz.has_perm('finance.read')
  or exists (select 1 from app.approval_mandates m where m.person_id = authz.current_person_id() and m.revoked_at is null and 'finance_disbursement' = any(m.categories)));
create policy exec_read on app.disbursement_executions for select to authenticated using (authz.has_perm('finance.read'));
create policy refunds_read on app.refunds for select to authenticated using (requested_by = authz.current_person_id() or authz.has_perm('finance.read'));

grant select on app.events, app.event_people, app.ticket_types to anon;
grant insert, update on app.events to authenticated;
-- counters (sold/held) and capacity are never writable directly: use reserve/verify/cancel/set_capacity functions
grant insert (event_id, name, description, audience, unit, seats_per_unit, team_min, team_max, price, capacity, waitlist_enabled,
              sales_start_at, sales_end_at, hold_minutes_online, hold_minutes_manual, sort) on app.ticket_types to authenticated;
grant update (name, description, audience, unit, seats_per_unit, team_min, team_max, price, waitlist_enabled,
              sales_start_at, sales_end_at, hold_minutes_online, hold_minutes_manual, sort) on app.ticket_types to authenticated;
grant insert, update, delete on app.event_people to authenticated;
grant insert, update, delete on app.dues_plans to authenticated;
