-- BAUBC OS · Lets officers record their own admin actions (settings saved, exports taken) in the audit chain.
-- app.audit itself stays closed to API roles; this wrapper only accepts callers who hold an active role,
-- and the actor is always the signed-in person, so nobody can write entries in someone else's name.
create or replace function app.log_action(p_action text, p_entity_type text, p_entity_id text, p_after jsonb default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if authz.current_person_id() is null or not (authz.is_super_admin() or exists (
    select 1 from app.role_assignments ra where ra.person_id = authz.current_person_id() and ra.revoked_at is null
      and now() >= ra.valid_from and (ra.valid_until is null or now() < ra.valid_until))) then
    raise exception 'PERMISSION_DENIED';
  end if;
  if p_action !~ '^[a-z_]+\.[a-z_]+$' then raise exception 'INVALID_ACTION'; end if;
  perform app.audit(p_action, p_entity_type, p_entity_id, null, p_after);
end $$;
revoke execute on function app.log_action(text, text, text, jsonb) from public, anon;
grant execute on function app.log_action(text, text, text, jsonb) to authenticated;
