-- ═════════════════════════════════════════════════════════════════════════════
-- Public member profiles, perk presentation, Bangla articles, contact desk,
-- Google Form event registrations with a live public feed, YouTube settings.
-- ═════════════════════════════════════════════════════════════════════════════

-- ───────────────────────────── 1. Public profiles ─────────────────────────────
alter table app.people
  add column if not exists handle text unique check (handle ~ '^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$'),
  add column if not exists public_fields jsonb not null
    default '{"department":true,"session":true,"bio":true,"socials":true,"achievements":true,"rank":true,"skills":true}'::jsonb;

create or replace function app.slugify(p text) returns text language sql immutable set search_path = '' as $$
  select trim(both '-' from regexp_replace(lower(coalesce(p, '')), '[^a-z0-9]+', '-', 'g'))
$$;

create or replace function app.make_handle(p_name text, p_id uuid) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare v_base text := trim(both '-' from left(app.slugify(p_name), 32)); v text; i int := 1;
begin
  if length(v_base) < 2 then v_base := 'member'; end if;
  v := v_base;
  while exists (select 1 from app.people where handle = v and id is distinct from p_id)
        or v in ('new', 'edit', 'me', 'admin', 'app', 'api', 'settings', 'directory') loop
    i := i + 1; v := v_base || '-' || i::text;
  end loop;
  return v;
end $$;

-- A handle is created the first time someone makes their profile public, then kept stable (links never break).
create or replace function app.ensure_handle() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.handle is null and new.public_profile then
    new.handle := app.make_handle(coalesce(nullif(trim(new.display_name), ''), new.full_name), new.id);
  end if;
  return new;
end $$;
drop trigger if exists people_handle on app.people;
create trigger people_handle before insert or update of public_profile, display_name, full_name on app.people
  for each row execute function app.ensure_handle();

do $$ declare r record; begin
  for r in select id, full_name, display_name from app.people where public_profile and handle is null order by created_at loop
    update app.people set handle = app.make_handle(coalesce(nullif(trim(r.display_name), ''), r.full_name), r.id) where id = r.id;
  end loop;
end $$;

create or replace function app.set_my_handle(p_handle text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := authz.current_person_id(); v text := lower(trim(coalesce(p_handle, '')));
begin
  if v_me is null then raise exception 'NOT_SIGNED_IN'; end if;
  if v !~ '^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$' or length(v) < 3 then
    raise exception 'INVALID_HANDLE: use 3 to 40 lowercase letters, digits and dashes';
  end if;
  if v in ('new', 'edit', 'me', 'admin', 'app', 'api', 'settings', 'directory') then raise exception 'INVALID_HANDLE: that address is reserved'; end if;
  if exists (select 1 from app.people where handle = v and id <> v_me) then raise exception 'HANDLE_TAKEN: someone already uses that address'; end if;
  update app.people set handle = v where id = v_me;
  perform app.audit('profile.handle', 'person', v_me::text, null, jsonb_build_object('handle', v));
  return v;
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
    public_fields = case when jsonb_typeof(p->'public_fields') = 'object' then
      (select jsonb_object_agg(k, coalesce((p->'public_fields'->>k)::boolean, false))
       from unnest(array['department','session','bio','socials','achievements','rank','skills']) k)
      else public_fields end,
    avatar = coalesce(p->'avatar', avatar)
  where id = v_me;
  if (p->>'public_profile')::boolean is true then
    insert into app.consent_records(person_id, purpose) select v_me, 'public_profile'
    where not exists (select 1 from app.consent_records where person_id = v_me and purpose = 'public_profile' and withdrawn_at is null);
  elsif (p->>'public_profile')::boolean is false then
    update app.consent_records set withdrawn_at = now() where person_id = v_me and purpose = 'public_profile' and withdrawn_at is null;
  end if;
end $$;

-- Directory projection: safe columns only, and each one respects the member's own switches.
drop function if exists app.public_members();
create function app.public_members() returns table(
  id uuid, handle text, full_name text, full_name_bn text, display_name text, academic_department text, academic_session text,
  bio text, photo_url text, avatar jsonb, facebook_url text, linkedin_url text, member_no text, units text[], positions text[], is_mom boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, p.handle, p.full_name, p.full_name_bn, p.display_name,
         case when (p.public_fields->>'department')::boolean then p.academic_department end,
         case when (p.public_fields->>'session')::boolean then p.academic_session end,
         case when (p.public_fields->>'bio')::boolean then p.bio end,
         p.photo_url, p.avatar,
         case when (p.public_fields->>'socials')::boolean then p.facebook_url end,
         case when (p.public_fields->>'socials')::boolean then p.linkedin_url end,
         m.member_no,
         coalesce(array_agg(distinct u.name) filter (where u.id is not null), '{}'),
         coalesce(array_agg(distinct um.position_title) filter (where um.is_lead and u.id is not null), '{}'),
         exists (select 1 from app.recognition_awards r where r.person_id = p.id and r.period = (select max(period) from app.recognition_awards))
  from app.people p
  join app.memberships m on m.person_id = p.id
  join app.membership_states s on s.key = m.status_key and s.counts_as_member
  left join app.unit_memberships um on um.person_id = p.id and um.ended_at is null
  left join app.org_units u on u.id = um.unit_id and u.is_public
  where p.public_profile and p.status = 'active'
  group by p.id, m.member_no
  order by p.full_name
$$;

-- One public profile. Never returns email, phone, student ID or anything the member switched off.
create or replace function app.public_profile(p_handle text) returns jsonb
language sql stable security definer set search_path = '' as $$
  with me as (
    select p.*, m.member_no, m.finalized_at, coalesce(s.counts_as_member, false) is_member
    from app.people p
    left join app.memberships m on m.person_id = p.id
    left join app.membership_states s on s.key = m.status_key
    where p.handle = lower(trim(p_handle)) and p.public_profile and p.status = 'active'
      and (coalesce(s.counts_as_member, false) or p.kind = 'teacher')
    limit 1
  ), month_rank as (
    select l.person_id, rank() over (order by sum(l.amount) desc) rnk, sum(l.amount)::int pts
    from app.point_ledger l join app.memberships m on m.person_id = l.person_id and m.status_key = 'active'
    where l.period_month = date_trunc('month', now() at time zone 'Asia/Dhaka')::date
    group by l.person_id having sum(l.amount) > 0
  )
  select jsonb_build_object(
    'handle', me.handle,
    'name', coalesce(nullif(trim(me.display_name), ''), me.full_name),
    'full_name', me.full_name,
    'full_name_bn', me.full_name_bn,
    'kind', me.kind,
    'photo_url', me.photo_url,
    'avatar', me.avatar,
    'department', case when (me.public_fields->>'department')::boolean then me.academic_department end,
    'session', case when (me.public_fields->>'session')::boolean then me.academic_session end,
    'bio', case when (me.public_fields->>'bio')::boolean then me.bio end,
    'facebook_url', case when (me.public_fields->>'socials')::boolean then me.facebook_url end,
    'linkedin_url', case when (me.public_fields->>'socials')::boolean then me.linkedin_url end,
    'skills', case when (me.public_fields->>'skills')::boolean then to_jsonb(me.skills) else '[]'::jsonb end,
    'interests', case when (me.public_fields->>'skills')::boolean then to_jsonb(me.interests) else '[]'::jsonb end,
    'member_since', case when me.is_member then me.finalized_at end,
    'units', coalesce((select jsonb_agg(jsonb_build_object('name', u.name, 'slug', u.slug, 'title', um.position_title, 'lead', um.is_lead) order by um.is_lead desc, u.name)
                       from app.unit_memberships um join app.org_units u on u.id = um.unit_id and u.is_public
                       where um.person_id = me.id and um.ended_at is null), '[]'::jsonb),
    'awards', coalesce((select jsonb_agg(jsonb_build_object('period', r.period, 'citation', r.citation) order by r.period desc)
                        from app.recognition_awards r where r.person_id = me.id), '[]'::jsonb),
    'achievements', case when (me.public_fields->>'achievements')::boolean then coalesce((
        select jsonb_agg(jsonb_build_object('kind', a.kind, 'title', a.title, 'description', a.description, 'on', a.occurred_on) order by a.occurred_on desc)
        from app.achievement_records a
        where a.person_id = me.id and a.status = 'active' and a.is_public and a.verified_at is not null and a.kind <> 'recognition'), '[]'::jsonb)
      else '[]'::jsonb end,
    'stats', case when (me.public_fields->>'rank')::boolean and coalesce(app.setting('features')->>'leaderboard', 'members') <> 'off' then jsonb_build_object(
        'points_total', (select coalesce(sum(amount), 0)::int from app.point_ledger where person_id = me.id),
        'points_month', (select pts from month_rank where person_id = me.id),
        'rank_month', (select rnk from month_rank where person_id = me.id),
        'events', (select count(distinct r.event_id)::int from app.checkins c join app.registrations r on r.id = c.registration_id
                   where r.person_id = me.id and c.result = 'ok')) end
  ) from me
$$;

drop function if exists app.leaderboard(text);
create function app.leaderboard(p_scope text default 'month')
returns table(rank bigint, full_name text, wing text, points bigint, handle text, photo_url text)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_mode text := coalesce(app.setting('features')->>'leaderboard', 'members');
  v_inside boolean := authz.current_person_id() is not null and (authz.is_member() or authz.has_perm_any('staff.portal') or authz.is_super_admin());
begin
  if v_mode = 'off' or (v_mode <> 'public' and not v_inside) then return; end if;
  return query
  select row_number() over (order by t.pts desc, t.nm), t.nm, t.wing, t.pts, t.handle, t.photo from (
    select case when v_inside or p.public_profile then coalesce(p.display_name, p.full_name) else split_part(p.full_name, ' ', 1) end nm,
           (select u.name from app.unit_memberships um join app.org_units u on u.id = um.unit_id where um.person_id = p.id and um.ended_at is null order by um.is_lead desc limit 1) wing,
           sum(l.amount)::bigint pts,
           case when p.public_profile then p.handle end handle,
           case when p.public_profile then p.photo_url end photo
    from app.point_ledger l join app.people p on p.id = l.person_id
    join app.memberships m on m.person_id = p.id and m.status_key = 'active'
    where p_scope <> 'month' or l.period_month = date_trunc('month', now() at time zone 'Asia/Dhaka')::date
    group by p.id having sum(l.amount) > 0
  ) t order by t.pts desc, t.nm limit 50;
end $$;

drop function if exists app.public_recognition();
create function app.public_recognition() returns table(period date, full_name text, citation text, wing text, handle text, photo_url text, points bigint)
language sql stable security definer set search_path = '' as $$
  select r.period, case when p.public_profile then coalesce(p.display_name, p.full_name) else split_part(p.full_name, ' ', 1) end, r.citation,
         (select u.name from app.unit_memberships um join app.org_units u on u.id = um.unit_id where um.person_id = p.id and um.ended_at is null order by um.is_lead desc limit 1),
         case when p.public_profile then p.handle end,
         case when p.public_profile then p.photo_url end,
         (select coalesce(sum(l.amount), 0) from app.point_ledger l where l.person_id = p.id and l.period_month = r.period)::bigint
  from app.recognition_awards r join app.people p on p.id = r.person_id
  order by r.period desc limit 1
$$;

-- ───────────────────────────── 2. Perks as members see them ─────────────────────────────
alter table app.perks
  add column if not exists category text,
  add column if not exists icon text not null default 'gift' check (icon in ('burst','book','ticket','chat','gift','laptop','cup','star')),
  add column if not exists accent text not null default 'lime' check (accent in ('lime','coral','river','harvest','leaf','ink')),
  add column if not exists sort int not null default 100;

create or replace function app.claim_perk(p_perk uuid) returns text language plpgsql security definer set search_path = '' as $$
declare v_perk app.perks; v_me uuid := authz.current_person_id(); v_points bigint; v_value text; v_code private.perk_codes;
begin
  if not authz.is_member() then raise exception 'MEMBERS_ONLY: perks are for active members'; end if;
  -- one claim at a time per member and perk, so a double click can never take two codes
  perform pg_advisory_xact_lock(hashtextextended(p_perk::text || ':' || v_me::text, 0));
  select * into v_perk from app.perks where id = p_perk and status = 'active' and now() >= starts_at and (ends_at is null or now() < ends_at);
  if v_perk.id is null then raise exception 'PERK_UNAVAILABLE'; end if;
  select revealed_value into v_value from app.perk_claims where perk_id = p_perk and person_id = v_me;
  if v_value is not null then return v_value; end if;
  select coalesce(sum(amount), 0) into v_points from app.point_ledger where person_id = v_me;
  if v_points < v_perk.min_points then raise exception 'NOT_ENOUGH_POINTS: needs % verified points', v_perk.min_points; end if;
  if v_perk.mode = 'link' then v_value := v_perk.url;
  elsif v_perk.mode = 'shared_code' then v_value := v_perk.shared_code;
  else
    select * into v_code from private.perk_codes where perk_id = p_perk and claimed_by is null limit 1 for update skip locked;
    if v_code.id is null then raise exception 'OUT_OF_CODES'; end if;
    update private.perk_codes set claimed_by = v_me, claimed_at = now() where id = v_code.id;
    v_value := v_code.code;
  end if;
  if v_value is null then raise exception 'PERK_UNAVAILABLE'; end if;
  insert into app.perk_claims(perk_id, person_id, revealed_value) values (p_perk, v_me, v_value);
  perform app.notify(v_me, 'perk', 'Perk claimed: ' || v_perk.title,
    case when v_perk.mode = 'link' then 'Your personal link is saved in Perks.' else 'Your code is saved in Perks.' end, '/app/perks', 'perk:' || p_perk);
  perform app.audit('perk.claimed', 'perk', p_perk::text, null, jsonb_build_object('person', v_me));
  return v_value;
end $$;

-- The four perks shown in the trailer. They start as drafts: an admin adds the partner's permission
-- and the real codes or link, then switches each one to Live. Nothing is offered that the club cannot give.
insert into app.perks(title, partner, description, terms, mode, min_points, distribution_permission, status, category, icon, accent, sort)
select v.* from (values
  ('Claude Pro', 'Anthropic', '3-month Claude Pro subscription for active members.', 'One code per member. Personal and non-transferable.', 'unique_codes', 0,
   'PENDING: attach the partner''s written permission before publishing', 'draft', 'AI', 'burst', 'coral', 10),
  ('Course Bundle', 'Learning partner', 'Business & strategy track: a full online course bundle.', 'One enrolment per member.', 'unique_codes', 0,
   'PENDING: attach the partner''s written permission before publishing', 'draft', 'Learning', 'book', 'river', 20),
  ('Summit Pass', 'BAUBC', 'Free entry to the next Summit, reserved for members.', 'Show your member QR at the door.', 'shared_code', 0,
   'BAUBC own event (Executive Committee to confirm)', 'draft', 'Events', 'ticket', 'harvest', 30),
  ('Mentor Session', 'BAUBC alumni network', 'A 1:1 session with an alumni mentor.', 'Book within 30 days of claiming.', 'link', 0,
   'PENDING: confirm mentor availability before publishing', 'draft', 'Growth', 'chat', 'leaf', 40)
) as v(title, partner, description, terms, mode, min_points, distribution_permission, status, category, icon, accent, sort)
where not exists (select 1 from app.perks p where p.title = v.title);

-- ───────────────────────────── 3. Articles in Bangla ─────────────────────────────
alter table app.posts add column if not exists lang text not null default 'en' check (lang in ('en','bn'));

insert into app.posts(slug, kind, series, title, dek, body, topics, cover_tone, cover_label, author_name, status, published_at, lang)
select v.* from (values
 ('krishi-theke-udyokta', 'article', 'insights',
  'কৃষির সমস্যাই হতে পারে পরের বড় ব্যবসা',
  'মাঠে যে কষ্ট রোজ চোখে পড়ে, সেখানেই লুকিয়ে থাকে একজন উদ্যোক্তার প্রথম সুযোগ।',
  E'বাংলাদেশের কৃষক প্রতিদিন এমন অনেক সমস্যার মুখোমুখি হন, যেগুলো আমরা শহর থেকে প্রায় দেখতেই পাই না। সঠিক সময়ে ভালো বীজ না পাওয়া, ফসল তোলার পর দ্রুত নষ্ট হয়ে যাওয়া, কিংবা ন্যায্য দাম না পাওয়া: প্রতিটি সমস্যার পেছনে আছে একটি অপূর্ণ চাহিদা।\n\n==প্রতিটি অপূর্ণ চাহিদাই আসলে একটি ব্যবসার সম্ভাবনা।==\n\n## সমস্যাকে কাছ থেকে দেখুন\n\nএকজন উদ্যোক্তার প্রথম কাজ সমাধান বানানো নয়, বরং সমস্যাটি গভীরভাবে বোঝা। মাঠে যান, কৃষকের সঙ্গে কথা বলুন, তাঁর দিনের হিসাবটা জানুন। কোন কাজে সবচেয়ে বেশি সময় যায়? কোথায় সবচেয়ে বেশি টাকা হারায়? এই প্রশ্নগুলোর উত্তরই আপনাকে সঠিক পথে নিয়ে যাবে।\n\n> যে সমস্যা আপনি নিজের চোখে দেখেননি, তার সমাধান বিক্রি করা সবচেয়ে কঠিন।\n\n## ছোট করে শুরু করুন\n\nবড় কারখানা বা দামি প্রযুক্তি দিয়ে শুরু করার দরকার নেই। একটি গ্রাম, একটি ফসল, দশজন কৃষক: এটুকু দিয়েই জানা যায় ধারণাটি কাজ করে কি না। ==ছোট পরীক্ষা দ্রুত শেখায়, আর ভুলের দামও কম রাখে।==\n\n## সংখ্যা দিয়ে ভাবুন\n\nআপনার সমাধানে কৃষকের কত টাকা বাঁচবে বা কত বাড়তি আয় হবে, সেটি পরিষ্কারভাবে হিসাব করুন। কৃষক তখনই কিছু কিনবেন, যখন তিনি নিজের লাভটা স্পষ্ট দেখতে পাবেন।\n\nবাউবিসি-তে আমরা ঠিক এই প্রশ্নগুলো নিয়েই কাজ করি: মাঠের বাস্তবতা থেকে শুরু করে একটি টেকসই ব্যবসার মডেল পর্যন্ত। ==কৃষি আর ব্যবসা আলাদা কিছু নয়; দুটো মিলেই তৈরি হয় আগামীর অর্থনীতি।==',
  array['উদ্যোক্তা','কৃষি'], 'canopy', 'উদ্যোগ', 'বাউবিসি সম্পাদকীয় ডেস্ক', 'published', now() - interval '6 days', 'bn'),
 ('mather-theke-bazar', 'article', 'case-studies',
  'মাঠ থেকে বাজার: একটি সবজির দামের গল্প',
  'কৃষকের হাতে যে দাম, আর আপনার বাজারের ব্যাগে যে দাম: মাঝের পথটা কেমন?',
  E'সকালে বাজারে গিয়ে আমরা যে দামে সবজি কিনি, তা কৃষকের পাওয়া দামের চেয়ে প্রায়ই অনেক বেশি। এই পার্থক্য কোথা থেকে আসে, সেটি বুঝতে হলে সবজির পুরো যাত্রাটা দেখতে হয়।\n\n## যাত্রার ধাপগুলো\n\nএকটি সবজি সাধারণত কয়েকটি হাত ঘুরে আমাদের কাছে পৌঁছায়: কৃষক, স্থানীয় ফড়িয়া, পাইকার, আড়তদার এবং শেষে খুচরা বিক্রেতা। প্রতিটি ধাপে যুক্ত হয় পরিবহন, শ্রম, ঝুঁকি আর মুনাফা।\n\n==দাম বাড়ে প্রতিটি হাতবদলে, কিন্তু মূল্য সব সময় বাড়ে না।==\n\n## কোথায় সবচেয়ে বেশি ক্ষতি\n\nতাজা সবজি দ্রুত নষ্ট হয়। সংরক্ষণ আর ঠান্ডা পরিবহনের সুবিধা কম থাকায় পথেই একটি অংশ ফেলে দিতে হয়। এই ক্ষতির খরচও শেষ পর্যন্ত দামের সঙ্গে যোগ হয়।\n\n> সমস্যা শুধু মধ্যস্বত্বভোগী নয়; দুর্বল অবকাঠামোও দাম বাড়ায়।\n\n## সমাধানের সম্ভাবনা\n\nকৃষকদের দল বেঁধে সরাসরি বিক্রি, ভালো প্যাকেজিং, দামের তথ্য সহজে জানার সুযোগ আর ছোট পরিসরের সংরক্ষণাগার: প্রতিটিই হতে পারে একটি নতুন উদ্যোগ। ==যে পথটা ছোট করবে, সে-ই কৃষক আর ক্রেতা দুজনকেই জেতাবে।==\n\nএই কেস স্টাডি আমাদের আলোচনার শুরু মাত্র। আপনার এলাকার বাজারে কী দেখেছেন? আমাদের জানান।',
  array['বাজার','কেস স্টাডি'], 'harvest', 'কেস স্টাডি', 'বাউবিসি সম্পাদকীয় ডেস্ক', 'published', now() - interval '3 days', 'bn'),
 ('prothom-pitch-deck', 'article', 'insights',
  'প্রথম পিচ ডেক: দশটি স্লাইডে আপনার গল্প',
  'বিনিয়োগকারী বা বিচারকের সামনে কয়েক মিনিটে নিজের ধারণা তুলে ধরার একটি সহজ কাঠামো।',
  E'পিচ ডেক মানে তথ্যে ঠাসা স্লাইড নয়। এটি একটি গল্প, যা শ্রোতার তিনটি প্রশ্নের উত্তর দেয়: কেন এই সমস্যা, কেন এখন, আর কেন আপনি?\n\n==ভালো পিচ শ্রোতাকে শুধু বোঝায় না, বিশ্বাস করায়।==\n\n## দশটি স্লাইডের কাঠামো\n\n- সমস্যা: কার কষ্ট, আর সেটি কতটা বড়।\n- সমাধান: আপনি ঠিক কী বানাচ্ছেন।\n- বাজার: কতজন মানুষ এর জন্য টাকা দেবে।\n- পণ্য: এটি দেখতে ও কাজ করতে কেমন।\n- ব্যবসার মডেল: টাকা আসবে কীভাবে।\n- প্রতিযোগিতা: অন্যরা কী করছে, আর আপনি কোথায় আলাদা।\n- অগ্রগতি: এখন পর্যন্ত কী অর্জন করেছেন।\n- দল: কেন আপনারাই পারবেন।\n- আর্থিক পরিকল্পনা: সামনের পথের হিসাব।\n- চাওয়া: আপনার এখন কী প্রয়োজন।\n\n> প্রতিটি স্লাইডে একটি মাত্র মূল কথা রাখুন।\n\n## উপস্থাপনের সময়\n\nসময় মেনে চলুন, মূল সংখ্যাগুলো মুখস্থ রাখুন, আর প্রশ্নকে ভয় পাবেন না। ==প্রশ্ন মানে শ্রোতা আগ্রহী, আর সেটিই আপনার সবচেয়ে বড় সুযোগ।==\n\nবাউবিসি-র ওয়ার্কশপে আমরা এই কাঠামো ধরে হাতে-কলমে পিচ অনুশীলন করি। পরের সেশনে আপনিও যোগ দিন।',
  array['পিচ','স্টার্টআপ'], 'river', 'স্টার্টআপ', 'বাউবিসি সম্পাদকীয় ডেস্ক', 'published', now() - interval '1 day', 'bn')
) as v(slug, kind, series, title, dek, body, topics, cover_tone, cover_label, author_name, status, published_at, lang)
where not exists (select 1 from app.posts p where p.slug = v.slug);

-- ───────────────────────────── 4. Contact desk ─────────────────────────────
alter table app.contact_inquiries drop constraint if exists contact_inquiries_category_check;
alter table app.contact_inquiries add constraint contact_inquiries_category_check
  check (category in ('general','query','help','collaboration','sponsorship','partnership','speaker','media','membership','recruitment'));
alter table app.contact_inquiries
  add column if not exists reference_no text unique,
  add column if not exists sender_type text not null default 'other' check (sender_type in ('bau_student','company','organisation','teacher','other')),
  add column if not exists subject text check (subject is null or length(subject) <= 140),
  add column if not exists phone text check (phone is null or phone ~ '^\+?[0-9][0-9 -]{6,19}$'),
  add column if not exists preferred_channel text not null default 'email' check (preferred_channel in ('email','phone','whatsapp')),
  add column if not exists callback_window text check (callback_window is null or length(callback_window) <= 60),
  add column if not exists student_department text check (student_department is null or length(student_department) <= 120),
  add column if not exists student_session text check (student_session is null or length(student_session) <= 20),
  add column if not exists role_title text check (role_title is null or length(role_title) <= 120),
  add column if not exists website text check (website is null or website ~* '^https?://[^\s]{3,200}$'),
  add column if not exists staff_note text check (staff_note is null or length(staff_note) <= 2000),
  add column if not exists updated_at timestamptz not null default now();

do $$ declare r record; begin
  for r in select id from app.contact_inquiries where reference_no is null order by created_at loop
    update app.contact_inquiries set reference_no = 'BAUBC-' || lpad(app.next_counter('contact')::text, 5, '0') where id = r.id;
  end loop;
end $$;

create or replace function app.submit_inquiry(p jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(trim(coalesce(p->>'email', '')));
  v_name text := trim(coalesce(p->>'name', ''));
  v_msg text := trim(coalesce(p->>'message', ''));
  v_type text := coalesce(nullif(p->>'sender_type', ''), 'other');
  v_cat text := coalesce(nullif(p->>'category', ''), 'query');
  v_channel text := coalesce(nullif(p->>'preferred_channel', ''), 'email');
  v_phone text := nullif(regexp_replace(trim(coalesce(p->>'phone', '')), '\s+', ' ', 'g'), '');
  v_org text := nullif(trim(coalesce(p->>'organization', '')), '');
  v_id uuid; v_ref text;
begin
  if length(v_name) not between 2 and 120 then raise exception 'NAME_REQUIRED: please tell us your name'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 200 then raise exception 'INVALID_EMAIL'; end if;
  -- one submission at a time, so the flood and per-sender limits below count correctly under load
  perform pg_advisory_xact_lock(hashtextextended('app.submit_inquiry', 0));
  if length(v_msg) < 10 then raise exception 'MESSAGE_TOO_SHORT: please write at least a sentence'; end if;
  if length(v_msg) > 4000 then raise exception 'MESSAGE_TOO_LONG: please keep it under 4000 characters'; end if;
  if v_channel in ('phone', 'whatsapp') and v_phone is null then raise exception 'PHONE_REQUIRED: add a number so we can call you back'; end if;
  if v_type in ('company', 'organisation') and v_org is null then raise exception 'ORG_REQUIRED: tell us which organisation you represent'; end if;
  if v_phone is not null and v_phone !~ '^\+?[0-9][0-9 -]{6,19}$' then raise exception 'INVALID_PHONE: enter a phone number such as 01XXXXXXXXX'; end if;
  if coalesce(trim(p->>'website'), '') <> '' and trim(p->>'website') !~* '^https?://[^\s]{3,200}$' then raise exception 'INVALID_WEBSITE: enter the website as https://…'; end if;
  if v_type not in ('bau_student','company','organisation','teacher','other') then v_type := 'other'; end if;
  if v_cat not in ('general','query','help','collaboration','sponsorship','partnership','speaker','media','membership','recruitment') then v_cat := 'query'; end if;
  if v_channel not in ('email','phone','whatsapp') then v_channel := 'email'; end if;
  if (select count(*) from app.contact_inquiries where email = v_email and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'RATE_LIMITED: please wait before sending another message';
  end if;
  if (select count(*) from app.contact_inquiries where created_at > now() - interval '10 minutes') >= 60 then
    raise exception 'BUSY: we are receiving a lot of messages, please try again in a few minutes';
  end if;
  v_ref := 'BAUBC-' || lpad(app.next_counter('contact')::text, 5, '0');
  insert into app.contact_inquiries(category, name, email, organization, message, reference_no, sender_type, subject, phone, preferred_channel,
                                    callback_window, student_department, student_session, role_title, website)
  values (v_cat, v_name, v_email, left(v_org, 200), v_msg, v_ref, v_type, nullif(left(trim(coalesce(p->>'subject', '')), 140), ''), v_phone, v_channel,
          nullif(left(trim(coalesce(p->>'callback_window', '')), 60), ''), nullif(left(trim(coalesce(p->>'student_department', '')), 120), ''),
          nullif(left(trim(coalesce(p->>'student_session', '')), 20), ''), nullif(left(trim(coalesce(p->>'role_title', '')), 120), ''), nullif(trim(coalesce(p->>'website', '')), ''))
  returning id into v_id;
  perform app.enqueue('email.contact_ack', jsonb_build_object('inquiry_id', v_id), 'email:contact:' || v_id);
  return jsonb_build_object('id', v_id, 'reference', v_ref);
end $$;

grant update (status, assigned_to, staff_note, updated_at) on app.contact_inquiries to authenticated;

-- ───────────────────────────── 5. Google Form event registrations ─────────────────────────────
alter table app.registrations drop constraint if exists registrations_source_check;
alter table app.registrations add constraint registrations_source_check check (source in ('online','admin','walkin','waitlist','form'));

-- system only: called by the signed webhook (Google Form → Apps Script → /api/hooks/google-form) as table owner
create or replace function app.ingest_form_registration(p jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_ev app.events; v_tt app.ticket_types; v_email text := lower(trim(coalesce(p->>'email', ''))); v_existing app.registrations;
        v_name text := trim(coalesce(p->>'full_name', p->>'name', '')); v_idem text := 'form:' || coalesce(p->>'response_id', '');
begin
  if coalesce(p->>'response_id', '') = '' then raise exception 'INVALID: response_id required'; end if;
  -- Apps Script retries and reconcileAll() can deliver the same response many times at once
  perform pg_advisory_xact_lock(hashtextextended(v_idem, 0));
  select * into v_existing from app.registrations where idempotency_key = v_idem;
  if v_existing.id is not null then return jsonb_build_object('registration_id', v_existing.id, 'status', v_existing.status, 'replayed', true); end if;
  select * into v_ev from app.events where slug = p->>'event_slug';
  if v_ev.id is null then raise exception 'NOT_FOUND: no event with that slug'; end if;
  if coalesce(p->>'ticket_type', '') <> '' then
    select * into v_tt from app.ticket_types where event_id = v_ev.id and (id::text = p->>'ticket_type' or lower(name) = lower(p->>'ticket_type')) limit 1;
  else
    select * into v_tt from app.ticket_types where event_id = v_ev.id and audience <> 'members' order by (unit = 'team'), price, sort limit 1;
  end if;
  if v_tt.id is null then raise exception 'NOT_FOUND: no matching ticket type'; end if;
  if v_tt.unit = 'team' then raise exception 'INVALID: team tickets need the website form (team name and members)'; end if;
  if v_ev.status <> 'published'
     or now() < coalesce(v_tt.sales_start_at, v_ev.reg_opens_at, 'infinity'::timestamptz)
     or now() >= coalesce(v_tt.sales_end_at, v_ev.reg_closes_at, 'infinity'::timestamptz) then
    raise exception 'REGISTRATION_CLOSED';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'INVALID_EMAIL'; end if;
  if length(v_name) < 2 then raise exception 'NAME_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_ev.id::text || ':e:' || v_email, 0));
  perform app.expire_holds(v_tt.id);
  select * into v_existing from app.registrations where event_id = v_ev.id and identity_key = 'e:' || v_email
    and status in ('pending_payment','pending_verification','confirmed') limit 1;
  if v_existing.id is not null then return jsonb_build_object('registration_id', v_existing.id, 'status', v_existing.status, 'duplicate', true); end if;
  return app._hold_registration(v_tt.id, (select id from app.people where email = v_email), v_name, v_email,
    nullif(trim(coalesce(p->>'phone', '')), ''), nullif(trim(coalesce(p->>'institution', '')), ''), null, '[]',
    coalesce(p->'answers', '{}'), jsonb_build_object('via', 'google_form', 'privacy_notice', '2026-11'), 'e:' || v_email, v_idem, 'form');
end $$;
revoke all on function app.ingest_form_registration(jsonb) from public, anon, authenticated;

-- Public live feed: an initial and a time, nothing that identifies a person.
create or replace function app.recent_registrations(p_event uuid, p_limit int default 6)
returns table(initial text, via text, at timestamptz)
language sql stable security definer set search_path = '' as $$
  select upper(left(trim(r.name), 1)), case r.source when 'form' then 'Google Form' when 'walkin' then 'At the door' else 'Website' end, r.created_at
  from app.registrations r join app.events e on e.id = r.event_id and e.status in ('published','completed')
  where r.event_id = p_event and r.status in ('confirmed','pending_payment','pending_verification')
  order by r.created_at desc limit least(greatest(coalesce(p_limit, 6), 1), 12)
$$;

-- ───────────────────────────── 6. YouTube ─────────────────────────────
insert into app.site_settings(key, value)
values ('youtube', '{"handle":"@businessclubofbau","channel_id":"UCTXX1cpUEUDgNJGC7ArwkpA","featured":[]}'::jsonb)
on conflict (key) do nothing;
update app.site_settings set value = jsonb_set(coalesce(value, '{}'::jsonb), '{youtube_url}', '"https://www.youtube.com/@businessclubofbau"')
where key = 'social' and coalesce(value->>'youtube_url', '') in ('', 'https://www.youtube.com/@businessclubofbau');

-- ───────────────────────────── grants ─────────────────────────────
revoke all on function app.make_handle(text, uuid), app.ensure_handle() from public, anon, authenticated;
grant execute on function app.public_members(), app.public_profile(text), app.leaderboard(text), app.public_recognition(),
  app.submit_inquiry(jsonb), app.recent_registrations(uuid, int), app.slugify(text) to anon, authenticated;
grant execute on function app.set_my_handle(text), app.update_my_profile(jsonb), app.claim_perk(uuid) to authenticated;
