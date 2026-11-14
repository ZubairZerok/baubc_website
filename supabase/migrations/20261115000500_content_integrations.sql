-- BAUBC OS · Content (CMS), communications, integrations, documents/certificates, perks, privacy, reference data, grants

-- ───────────────────────────── content ─────────────────────────────
create table app.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  kind text not null default 'article' check (kind in ('episode','article','news')),
  series text check (series in ('decoded','case-studies','insights','news')),
  episode_no int,
  title text not null,
  title_bn text,
  dek text,
  body text,
  topics text[] not null default '{}',
  cover_tone text not null default 'canopy' check (cover_tone in ('canopy','harvest','paper','river')),
  cover_label text,
  facebook_url text,
  youtube_url text,
  author_name text,
  stats jsonb,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  created_by uuid references app.people(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger posts_touch before update on app.posts for each row execute function app.touch_updated_at();
create unique index posts_series_episode_uq on app.posts(series, episode_no) where episode_no is not null;

create table app.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  title_bn text,
  body text not null,
  audience text not null default 'members' check (audience in ('public','members','teachers','staff','all_signed_in')),
  pinned boolean not null default false,
  publish_at timestamptz not null default now(),
  expires_at timestamptz,
  author_id uuid references app.people(id),
  created_at timestamptz not null default now()
);

create table app.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  url text not null check (url ~* '^https://'),
  category text not null default 'guide' check (category in ('guide','report','deck','template','reading','form')),
  audience text not null default 'public' check (audience in ('public','members','teachers','staff')),
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table app.gallery_albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_id uuid references app.events(id),
  external_url text check (external_url is null or external_url ~* '^https://'),
  cover_url text,
  photo_count int,
  taken_on date,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table app.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('general','sponsorship','partnership','speaker','media','membership')),
  name text not null,
  email text not null,
  organization text,
  message text not null check (length(message) between 10 and 4000),
  status text not null default 'new' check (status in ('new','in_progress','closed','spam')),
  assigned_to uuid references app.people(id),
  created_at timestamptz not null default now()
);

-- ───────────────────────────── integrations ─────────────────────────────
create table app.integration_connections (
  provider text primary key check (provider in ('google_form','gmail_appsscript','gmail_api','meta_page','bkash_pgw','resend','supabase_realtime')),
  label text not null,
  status text not null default 'not_connected' check (status in ('not_connected','active','degraded','expired')),
  last_success_at timestamptz,
  last_error text,
  config jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table app.webhook_inbox (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  delivery_id text not null,
  received_at timestamptz not null default now(),
  status text not null default 'received' check (status in ('received','processed','rejected','failed')),
  error text,
  summary jsonb,
  unique (source, delivery_id)
);

create table app.inbound_messages (
  id uuid primary key default gen_random_uuid(),
  gmail_message_id text not null unique,
  thread_id text,
  from_email text not null,
  from_name text,
  subject text not null,
  received_at timestamptz not null,
  labels text[] not null default '{}',
  snippet text check (snippet is null or length(snippet) <= 300),
  category text not null default 'uncategorised',
  status text not null default 'new' check (status in ('new','accepted','ignored')),
  reviewer_id uuid references app.people(id),
  review_note text,
  retention_until timestamptz not null default now() + interval '180 days',
  created_at timestamptz not null default now()
);

create table app.social_posts (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'facebook' check (platform in ('facebook','youtube','linkedin','instagram')),
  external_id text not null,
  title text not null,
  post_type text,
  permalink text,
  published_at timestamptz,
  viewers int, views int, likes int, comments int, shares int,
  captured_at timestamptz not null default now(),
  unique (platform, external_id)
);

-- ───────────────────────────── documents (certificates) ─────────────────────────────
create table app.issued_documents (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('participation','membership','leadership','volunteer','appreciation','achievement','receipt')),
  serial_no text not null unique,
  verification_code text not null unique,
  recipient_person_id uuid references app.people(id),
  recipient_name text not null,
  title text not null,
  subtitle text,
  event_id uuid references app.events(id),
  registration_id uuid references app.registrations(id),
  achievement_id uuid references app.achievement_records(id),
  issued_by uuid references app.people(id),
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoke_reason text,
  check (registration_id is not null or achievement_id is not null or kind in ('membership','receipt'))
);
create unique index one_participation_cert on app.issued_documents(registration_id, kind) where registration_id is not null;

create or replace function app.issue_event_certificates(p_event uuid) returns int language plpgsql security definer set search_path = '' as $$
declare v_ev app.events; v_n int := 0; r record; v_year text := to_char(now() at time zone 'Asia/Dhaka', 'YYYY');
begin
  select * into v_ev from app.events where id = p_event;
  if not (authz.has_perm('document.issue') or authz.has_perm('event.manage', 'event', p_event)) then raise exception 'PERMISSION_DENIED'; end if;
  for r in
    select distinct on (reg.id) reg.id, reg.person_id, reg.name
    from app.registrations reg join app.checkins c on c.registration_id = reg.id and c.result = 'ok'
    where reg.event_id = p_event and reg.status = 'confirmed'
      and not exists (select 1 from app.issued_documents d where d.registration_id = reg.id and d.kind = 'participation')
  loop
    insert into app.issued_documents(kind, serial_no, verification_code, recipient_person_id, recipient_name, title, subtitle, event_id, registration_id, issued_by)
    values ('participation', 'BAUBC-CERT-' || v_year || '-' || lpad(app.next_counter('cert_' || v_year)::text, 6, '0'), app.random_code(16),
            r.person_id, r.name, v_ev.title, 'Certificate of Participation', p_event, r.id, authz.current_person_id());
    if r.person_id is not null then
      perform app.notify(r.person_id, 'certificate', 'Certificate issued: ' || v_ev.title, null, '/app/record', 'cert:' || r.id);
    end if;
    v_n := v_n + 1;
  end loop;
  perform app.audit('certificates.issued', 'event', p_event::text, null, jsonb_build_object('count', v_n));
  return v_n;
end $$;

create or replace function app.issue_membership_certificate(p_person uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_p app.people; v_m app.memberships; v_id uuid; v_year text := to_char(now() at time zone 'Asia/Dhaka', 'YYYY');
begin
  perform authz.require('document.issue');
  select * into v_p from app.people where id = p_person;
  select * into v_m from app.memberships where person_id = p_person and status_key = 'active';
  if v_m.id is null then raise exception 'NOT_AN_ACTIVE_MEMBER'; end if;
  insert into app.issued_documents(kind, serial_no, verification_code, recipient_person_id, recipient_name, title, subtitle, issued_by)
  values ('membership', 'BAUBC-CERT-' || v_year || '-' || lpad(app.next_counter('cert_' || v_year)::text, 6, '0'), app.random_code(16),
          p_person, v_p.full_name, 'Membership · ' || v_m.member_no, 'Certificate of Membership', authz.current_person_id())
  returning id into v_id;
  perform app.audit('certificate.membership', 'issued_document', v_id::text, null, jsonb_build_object('person', p_person));
  return v_id;
end $$;

create or replace function app.revoke_document(p_id uuid, p_reason text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not authz.is_super_admin() then raise exception 'PERMISSION_DENIED'; end if;
  perform authz.require_aal2();
  if coalesce(trim(p_reason), '') = '' then raise exception 'REASON_REQUIRED'; end if;
  update app.issued_documents set revoked_at = now(), revoke_reason = p_reason where id = p_id and revoked_at is null;
  perform app.audit('document.revoked', 'issued_document', p_id::text, null, jsonb_build_object('reason', p_reason));
end $$;

-- public verification: minimum information only
create or replace function app.verify_document(p_code text) returns table(serial_no text, kind text, recipient_name text, title text, subtitle text, issued_at timestamptz, status text, revoked_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select d.serial_no, d.kind, d.recipient_name, d.title, d.subtitle, d.issued_at,
         case when d.revoked_at is null then 'valid' else 'revoked' end, d.revoked_at
  from app.issued_documents d where d.verification_code = upper(trim(p_code)) or d.serial_no = upper(trim(p_code))
$$;

-- ───────────────────────────── perks ─────────────────────────────
create table app.perks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  partner text not null,
  description text not null,
  terms text,
  mode text not null check (mode in ('link','shared_code','unique_codes')),
  url text check (url is null or url ~* '^https://'),
  shared_code text,
  min_points int not null default 0,
  distribution_permission text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  status text not null default 'active' check (status in ('draft','active','ended')),
  created_at timestamptz not null default now()
);

create table private.perk_codes (
  id uuid primary key default gen_random_uuid(),
  perk_id uuid not null references app.perks(id) on delete cascade,
  code text not null,
  claimed_by uuid references app.people(id),
  claimed_at timestamptz,
  unique (perk_id, code)
);

create table app.perk_claims (
  id uuid primary key default gen_random_uuid(),
  perk_id uuid not null references app.perks(id) on delete cascade,
  person_id uuid not null references app.people(id) on delete cascade,
  revealed_value text,
  claimed_at timestamptz not null default now(),
  unique (perk_id, person_id)
);

create or replace function app.claim_perk(p_perk uuid) returns text language plpgsql security definer set search_path = '' as $$
declare v_perk app.perks; v_me uuid := authz.current_person_id(); v_points bigint; v_value text; v_code private.perk_codes;
begin
  if not authz.is_member() then raise exception 'MEMBERS_ONLY: perks are for active members'; end if;
  select * into v_perk from app.perks where id = p_perk and status = 'active' and now() >= starts_at and (ends_at is null or now() < ends_at);
  if v_perk.id is null then raise exception 'PERK_UNAVAILABLE'; end if;
  select coalesce(sum(amount), 0) into v_points from app.point_ledger where person_id = v_me;
  if v_points < v_perk.min_points then raise exception 'NOT_ENOUGH_POINTS: needs % verified points', v_perk.min_points; end if;
  select revealed_value into v_value from app.perk_claims where perk_id = p_perk and person_id = v_me;
  if v_value is not null then return v_value; end if;
  if v_perk.mode = 'link' then v_value := v_perk.url;
  elsif v_perk.mode = 'shared_code' then v_value := v_perk.shared_code;
  else
    select * into v_code from private.perk_codes where perk_id = p_perk and claimed_by is null limit 1 for update skip locked;
    if v_code.id is null then raise exception 'OUT_OF_CODES'; end if;
    update private.perk_codes set claimed_by = v_me, claimed_at = now() where id = v_code.id;
    v_value := v_code.code;
  end if;
  insert into app.perk_claims(perk_id, person_id, revealed_value) values (p_perk, v_me, v_value);
  perform app.audit('perk.claimed', 'perk', p_perk::text, null, jsonb_build_object('person', v_me));
  return v_value;
end $$;

-- ───────────────────────────── privacy ─────────────────────────────
create table app.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references app.people(id),
  email text not null,
  kind text not null check (kind in ('access','correction','erasure','withdraw_consent','objection')),
  details text,
  status text not null default 'received' check (status in ('received','in_progress','fulfilled','partially_fulfilled','rejected')),
  due_at timestamptz not null default now() + interval '30 days',
  handled_by uuid references app.people(id),
  created_at timestamptz not null default now()
);

-- ───────────────────────────── public functions ─────────────────────────────
create or replace function app.submit_contact(p_category text, p_name text, p_email text, p_org text, p_message text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if lower(trim(p_email)) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'INVALID_EMAIL'; end if;
  if (select count(*) from app.contact_inquiries where email = lower(trim(p_email)) and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'RATE_LIMITED: please wait before sending another message';
  end if;
  insert into app.contact_inquiries(category, name, email, organization, message)
  values (p_category, trim(p_name), lower(trim(p_email)), nullif(trim(p_org), ''), trim(p_message)) returning id into v_id;
  perform app.enqueue('email.contact_ack', jsonb_build_object('inquiry_id', v_id), 'email:contact:' || v_id);
  return v_id;
end $$;

create or replace function app.public_stats() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'members', (select count(*) from app.memberships m join app.membership_states s on s.key = m.status_key and s.counts_as_member),
    'events', (select count(*) from app.events where status in ('published','completed')),
    'episodes', (select count(*) from app.posts where status = 'published' and kind = 'episode'),
    'wings', (select count(*) from app.org_units where is_public and kind = 'wing'),
    'social_viewers', (select coalesce(sum(viewers), 0) from app.social_posts where platform = 'facebook'),
    'social_followers', (app.setting('social')->>'facebook_followers')::int
  )
$$;

-- system: Gmail label-sync ingestion (called by webhook handler as table owner)
create or replace function app.ingest_gmail(p jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_cat text := 'uncategorised'; v_label text; v_id uuid;
begin
  foreach v_label in array coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p->'labels', '[]')) x), '{}') loop
    if v_label ilike 'BAUBC/Sync/%' then v_cat := lower(split_part(v_label, '/', 3)); end if;
  end loop;
  if not exists (select 1 from jsonb_array_elements_text(coalesce(p->'labels', '[]')) x where x ilike 'BAUBC/Sync%') then
    raise exception 'UNLABELLED_MESSAGE_REJECTED';
  end if;
  insert into app.inbound_messages(gmail_message_id, thread_id, from_email, from_name, subject, received_at, labels, snippet, category)
  values (p->>'message_id', p->>'thread_id', lower(p->>'from_email'), p->>'from_name', left(coalesce(p->>'subject', '(no subject)'), 300),
          coalesce((p->>'date')::timestamptz, now()),
          coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p->'labels', '[]')) x), '{}'), left(p->>'snippet', 300), v_cat)
  on conflict (gmail_message_id) do nothing returning id into v_id;
  update app.integration_connections set status = 'active', last_success_at = now(), last_error = null where provider = 'gmail_appsscript';
  return jsonb_build_object('id', v_id, 'duplicate', v_id is null, 'category', v_cat);
end $$;

-- ───────────────────────────── RLS ─────────────────────────────
alter table app.posts enable row level security;
alter table app.announcements enable row level security;
alter table app.resources enable row level security;
alter table app.gallery_albums enable row level security;
alter table app.contact_inquiries enable row level security;
alter table app.integration_connections enable row level security;
alter table app.webhook_inbox enable row level security;
alter table app.inbound_messages enable row level security;
alter table app.social_posts enable row level security;
alter table app.issued_documents enable row level security;
alter table app.perks enable row level security;
alter table app.perk_claims enable row level security;
alter table app.privacy_requests enable row level security;
alter table private.perk_codes enable row level security;

create policy posts_read on app.posts for select to anon, authenticated using (status = 'published' or authz.has_perm('cms.edit'));
create policy posts_write on app.posts for all to authenticated using (authz.has_perm('cms.edit')) with check (authz.has_perm('cms.edit'));
create policy ann_read on app.announcements for select to anon, authenticated using (
  (publish_at <= now() and (expires_at is null or expires_at > now()) and (
     audience = 'public'
     or (audience = 'all_signed_in' and authz.current_person_id() is not null)
     or (audience = 'members' and (authz.is_member() or authz.has_perm_any('staff.portal')))
     or (audience = 'teachers' and (authz.has_role('teacher') or authz.has_role('teacher_approver')))
     or (audience = 'staff' and authz.has_perm_any('staff.portal'))))
  or authz.has_perm('announcement.publish'));
create policy ann_write on app.announcements for all to authenticated using (authz.has_perm('announcement.publish')) with check (authz.has_perm('announcement.publish'));
create policy resources_read on app.resources for select to anon, authenticated using (
  (published and (audience = 'public' or (audience = 'members' and authz.is_member())
   or (audience = 'teachers' and authz.has_role('teacher')) or (audience = 'staff' and authz.has_perm_any('staff.portal'))))
  or authz.has_perm('cms.edit'));
create policy resources_write on app.resources for all to authenticated using (authz.has_perm('cms.edit')) with check (authz.has_perm('cms.edit'));
create policy gallery_read on app.gallery_albums for select to anon, authenticated using (published or authz.has_perm('cms.edit'));
create policy gallery_write on app.gallery_albums for all to authenticated using (authz.has_perm('cms.edit')) with check (authz.has_perm('cms.edit'));
create policy inquiries_read on app.contact_inquiries for select to authenticated using (authz.has_perm('inquiry.manage'));
create policy inquiries_update on app.contact_inquiries for update to authenticated using (authz.has_perm('inquiry.manage')) with check (authz.has_perm('inquiry.manage'));
create policy integ_read on app.integration_connections for select to authenticated using (authz.has_perm('integration.manage'));
create policy inbox_read on app.webhook_inbox for select to authenticated using (authz.has_perm('integration.manage'));
create policy inbound_read on app.inbound_messages for select to authenticated using (authz.has_perm('integration.manage') or authz.has_perm('inquiry.manage'));
create policy inbound_update on app.inbound_messages for update to authenticated using (authz.has_perm('integration.manage') or authz.has_perm('inquiry.manage'))
  with check (authz.has_perm('integration.manage') or authz.has_perm('inquiry.manage'));
create policy social_read on app.social_posts for select to anon, authenticated using (true);
create policy social_write on app.social_posts for all to authenticated using (authz.has_perm('integration.manage')) with check (authz.has_perm('integration.manage'));
create policy docs_read on app.issued_documents for select to authenticated using (recipient_person_id = authz.current_person_id() or authz.has_perm_any('document.issue') or authz.has_perm_any('event.manage'));
create policy perks_read on app.perks for select to authenticated using ((status = 'active' and authz.is_member()) or authz.has_perm('perk.manage'));
create policy perks_write on app.perks for all to authenticated using (authz.has_perm('perk.manage')) with check (authz.has_perm('perk.manage'));
create policy perk_claims_read on app.perk_claims for select to authenticated using (person_id = authz.current_person_id() or authz.has_perm('perk.manage'));
create policy privacy_read on app.privacy_requests for select to authenticated using (person_id = authz.current_person_id() or authz.has_perm('privacy.handle'));

grant select on app.posts, app.announcements, app.resources, app.gallery_albums, app.social_posts to anon;
grant insert, update, delete on app.posts, app.announcements, app.resources, app.gallery_albums, app.social_posts to authenticated;
grant update (status, assigned_to) on app.contact_inquiries to authenticated;
grant update (status, reviewer_id, review_note, category) on app.inbound_messages to authenticated;

-- ───────────────────────────── grants & function exposure ─────────────────────────────
grant select on all tables in schema app to authenticated;           -- RLS decides which rows
revoke execute on all functions in schema app from public;
revoke execute on all functions in schema authz from public;
grant execute on all functions in schema authz to anon, authenticated;  -- helpers used inside RLS policies

-- callable by anyone (they enforce their own rules)
grant execute on function app.reserve_seat(uuid, text, text, text, text, text, jsonb, jsonb, jsonb, text) to anon, authenticated;
grant execute on function app.join_waitlist(uuid, text, text) to anon, authenticated;
grant execute on function app.cancel_registration(uuid, text, text) to anon, authenticated;
grant execute on function app.claim_payment(uuid, text, text, text, numeric, timestamptz, text) to anon, authenticated;
grant execute on function app.event_availability(uuid) to anon, authenticated;
grant execute on function app.verify_document(text) to anon, authenticated;
grant execute on function app.submit_contact(text, text, text, text, text) to anon, authenticated;
grant execute on function app.public_stats() to anon, authenticated;
grant execute on function app.public_members() to anon, authenticated;
grant execute on function app.public_advisors() to anon, authenticated;
grant execute on function app.setting(text) to anon, authenticated;
grant execute on function app.person_label(uuid) to authenticated;

-- signed-in commands (each checks permissions, MFA and separation of duties internally)
grant execute on function
  app.invite_person(text, text, text, text, text),
  app.transition_application(uuid, text, text, text, uuid),
  app.transition_membership(uuid, text, text),
  app.request_info(uuid, text, timestamptz),
  app.respond_info_request(uuid, text),
  app.request_profile_change(text, text, text),
  app.decide_profile_change(uuid, boolean, text),
  app.update_my_profile(jsonb),
  app.admin_register(uuid, text, text, text, text, text),
  app.set_capacity(uuid, int),
  app.verify_payment(uuid, boolean, text),
  app.check_in(text, uuid, text, text),
  app.generate_dues(date),
  app.decide_approval(uuid, text, text),
  app.respond_approval(uuid, text),
  app.request_privileged_change(text, jsonb, text),
  app.confirm_privileged_change(uuid, boolean),
  app.grant_role(uuid, text, text, uuid, timestamptz),
  app.revoke_role(uuid, text),
  app.grant_mandate(uuid, text[], numeric, timestamptz),
  app.create_task(jsonb),
  app.assignable_people(),
  app.assign_task(uuid, uuid[]),
  app.claim_task(uuid),
  app.submit_task(uuid, text, text),
  app.review_submission(uuid, text, text, int),
  app.adjust_points(uuid, int, text, text),
  app.reverse_points(bigint, text),
  app.issue_achievement(uuid, text, text, text, date, uuid),
  app.verify_achievement(uuid, boolean, text),
  app.decide_best_member(date, uuid, text),
  app.best_member_shortlist(date),
  app.submit_disbursement(jsonb),
  app.record_execution(uuid, text, text, numeric, text),
  app.verify_execution(uuid, boolean, text),
  app.issue_event_certificates(uuid),
  app.issue_membership_certificate(uuid),
  app.revoke_document(uuid, text),
  app.claim_perk(uuid),
  app.verify_audit_chain()
to authenticated;

-- safety net: every table in app must have RLS enabled
do $$
declare r record;
begin
  for r in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname in ('app','private') and c.relkind = 'r' and not c.relrowsecurity loop
    raise exception 'RLS not enabled on %', r.relname;
  end loop;
end $$;
