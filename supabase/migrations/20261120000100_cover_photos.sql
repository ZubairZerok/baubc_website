-- Articles can carry a cover photo (https only). The three Bangla articles get theirs.
alter table app.posts add column if not exists cover_url text check (cover_url is null or (cover_url ~* '^https://[^\s]+$' and length(cover_url) <= 800));

update app.posts set cover_url = 'https://media.istockphoto.com/id/1469639791/photo/farmer-using-digital-tablet-in-corn-crop-cultivated-field-with-smart-farming-interface-icons.jpg?s=612x612&w=0&k=20&c=CEnLHATfACNoH_N3Ru5KoTOmAc5SbufJozvV_kcuwc4='
where slug = 'krishi-theke-udyokta' and cover_url is null;
update app.posts set cover_url = 'https://img.magnific.com/free-photo/front-view-aubergines-tree-wood-board-pink_140725-105436.jpg?semt=ais_hybrid&w=740&q=80'
where slug = 'mather-theke-bazar' and cover_url is null;
update app.posts set cover_url = 'https://a-us.storyblok.com/f/1022037/770x320/c3066b7d93/pitch-deck-creators-funding.png'
where slug = 'prothom-pitch-deck' and cover_url is null;

-- Advisors link to their own public profile; teacher profiles show how many decisions they co-signed.
drop function if exists app.public_advisors();
create function app.public_advisors() returns table(id uuid, full_name text, full_name_bn text, bio text, photo_url text, title text, handle text, decisions int)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name, p.full_name_bn, p.bio, p.photo_url, coalesce(p.display_name, 'Advisor'), p.handle,
         (select count(*)::int from app.approval_actions a where a.actor_person_id = p.id and a.action = 'approve' and a.voided_at is null)
  from app.people p
  where p.kind = 'teacher' and p.public_profile and p.status = 'active'
  order by p.full_name
$$;
grant execute on function app.public_advisors() to anon, authenticated;

create or replace function app.teacher_record(p_handle text) returns jsonb
language sql stable security definer set search_path = '' as $$
  -- Aggregates only: how many decisions a public advisor signed, by kind. No request details are exposed.
  select jsonb_build_object(
    'title', coalesce(p.display_name, 'Advisor'),
    'approved', (select count(*)::int from app.approval_actions a where a.actor_person_id = p.id and a.action = 'approve' and a.voided_at is null),
    'returned', (select count(*)::int from app.approval_actions a where a.actor_person_id = p.id and a.action in ('return','clarify') and a.voided_at is null),
    'kinds', coalesce((select jsonb_object_agg(k, n) from (select r.subject_type k, count(*)::int n from app.approval_actions a join app.approval_requests r on r.id = a.request_id
               where a.actor_person_id = p.id and a.action = 'approve' and a.voided_at is null group by r.subject_type) x), '{}'::jsonb))
  from app.people p where p.handle = lower(trim(p_handle)) and p.kind = 'teacher' and p.public_profile and p.status = 'active'
$$;
grant execute on function app.teacher_record(text) to anon, authenticated;

-- Teachers keep a title in display_name ("Club Advisor"), so their address comes from their real name.
create or replace function app.ensure_handle() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.handle is null and new.public_profile then
    new.handle := app.make_handle(case when new.kind = 'teacher' then new.full_name else coalesce(nullif(trim(new.display_name), ''), new.full_name) end, new.id);
  end if;
  return new;
end $$;
update app.people p set handle = null where p.kind = 'teacher' and p.handle = app.slugify(p.display_name) and p.display_name is not null;
do $$ declare r record; begin
  for r in select id, full_name from app.people where kind = 'teacher' and public_profile and handle is null loop
    update app.people set handle = app.make_handle(r.full_name, r.id) where id = r.id;
  end loop;
end $$;
