import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import { env, isPreview, hasSupabaseAuth } from './env';
import { withClaims, type Claims } from './db';
import { supabaseServer } from './supabase';

export type Session = {
  userId: string;
  personId: string;
  name: string;
  email: string;
  aal: 'aal1' | 'aal2';
  roles: string[];
  perms: string[];
  isSuperAdmin: boolean;
  isMember: boolean;
  hasApplication: boolean;
  memberNo: string | null;
  mandates: { categories: string[]; max_amount: string }[];
  scopes: { role_key: string; scope_type: string; scope_id: string | null; unit_name: string | null }[];
  claims: Claims;
};

export const PREVIEW_COOKIE = 'baubc_preview';
const key = () => new TextEncoder().encode(env.previewSecret);

export async function signPreviewCookie(userId: string) {
  return new SignJWT({ sub: userId, aal: 'aal2' }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('12h').sign(key());
}

async function currentClaims(): Promise<Claims | null> {
  if (isPreview) {
    const token = (await cookies()).get(PREVIEW_COOKIE)?.value;
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, key());
      return { sub: String(payload.sub), role: 'authenticated', aal: 'aal2' };
    } catch { return null; }
  }
  if (!hasSupabaseAuth) return null;
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  const c = data?.claims as Record<string, any> | undefined;
  if (!c?.sub) return null;
  return { sub: c.sub, role: 'authenticated', aal: c.aal === 'aal2' ? 'aal2' : 'aal1', email: c.email };
}

export const getSession = cache(async (): Promise<Session | null> => {
  const claims = await currentClaims();
  if (!claims) return null;
  const row = await withClaims(claims, (tx) => tx.one(`
    select p.id::text person_id, p.full_name, p.email,
      authz.is_super_admin() is_sa, authz.is_member() is_member,
      exists (select 1 from app.applications a where a.person_id = p.id) has_app,
      (select m.member_no from app.memberships m where m.person_id = p.id) member_no,
      coalesce((select array_agg(distinct ra.role_key) from app.role_assignments ra
                where ra.person_id = p.id and ra.revoked_at is null and now() >= ra.valid_from and (ra.valid_until is null or now() < ra.valid_until)), '{}') roles,
      case when authz.is_super_admin() then (select array_agg(key) from app.permissions)
           else coalesce((select array_agg(distinct rp.permission_key) from app.role_assignments ra join app.role_permissions rp on rp.role_key = ra.role_key
                where ra.person_id = p.id and ra.revoked_at is null and now() >= ra.valid_from and (ra.valid_until is null or now() < ra.valid_until)), '{}') end perms,
      coalesce((select jsonb_agg(jsonb_build_object('categories', m.categories, 'max_amount', m.max_amount::text)) from app.approval_mandates m
                where m.person_id = p.id and m.revoked_at is null and (m.valid_until is null or now() < m.valid_until)), '[]') mandates,
      coalesce((select jsonb_agg(jsonb_build_object('role_key', ra.role_key, 'scope_type', ra.scope_type, 'scope_id', ra.scope_id, 'unit_name', u.name))
                from app.role_assignments ra left join app.org_units u on u.id = ra.scope_id
                where ra.person_id = p.id and ra.revoked_at is null and ra.scope_type <> 'global'), '[]') scopes
    from app.people p where p.id = authz.current_person_id()`));
  if (!row) return null;
  return {
    userId: claims.sub!, personId: row.person_id, name: row.full_name, email: row.email, aal: claims.aal ?? 'aal1',
    roles: row.roles ?? [], perms: row.perms ?? [], isSuperAdmin: !!row.is_sa, isMember: !!row.is_member,
    hasApplication: !!row.has_app, memberNo: row.member_no ?? null, mandates: row.mandates ?? [], scopes: row.scopes ?? [], claims,
  };
});

export async function requireSession(next = '/app'): Promise<Session> {
  const s = await getSession();
  if (!s) redirect(`/login?next=${encodeURIComponent(next)}`);
  return s;
}

export const can = (s: Session | null, perm: string) => !!s && (s.isSuperAdmin || s.perms.includes(perm));
export const hasRole = (s: Session | null, role: string) => !!s && s.roles.includes(role);
export const isStaff = (s: Session | null) => can(s, 'staff.portal') || !!s?.isSuperAdmin;
export const isTeacher = (s: Session | null) => hasRole(s, 'teacher') || hasRole(s, 'teacher_approver');
export const canApprove = (s: Session | null) => !!s && (s.isSuperAdmin || s.mandates.length > 0);

/** Claims for the current visitor (anon when signed out). */
export async function visitorClaims(): Promise<Claims | null> {
  return (await getSession())?.claims ?? null;
}
