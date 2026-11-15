'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { asSystem } from '@/server/db';
import { env, hasSupabaseAuth, isPreview } from '@/server/env';
import { PREVIEW_COOKIE, signPreviewCookie } from '@/server/session';
import { supabaseAdmin, supabaseServer } from '@/server/supabase';
import { sha256 } from '@/server/crypto';
import { rateLimit } from '@/server/ratelimit';
import { friendlyError } from '@/server/errors';
import type { ActionResult } from '@/components/ui/forms';

const passwordMessage = (m?: string) => !m ? 'We could not create your account. Please try the link again.'
  : /weak|pwned|breach/i.test(m) ? 'Choose a stronger password: this one is too simple or has appeared in a data breach.'
  : /already|registered|exists/i.test(m) ? 'An account already exists for this email. Sign in instead, or reset your password.' : m;
const safeNext = (n: unknown) => (typeof n === 'string' && n.startsWith('/') && !n.startsWith('//') ? n : '/app');

export async function previewSignIn(fd: FormData) {
  if (!isPreview) throw new Error('Preview sign-in is disabled when a production database is configured.');
  const userId = String(fd.get('user_id'));
  if (!/^a0000000-0000-4000-8000-0000000000[0-9a-f]{2}$/.test(userId)) throw new Error('Unknown persona');
  (await cookies()).set(PREVIEW_COOKIE, await signPreviewCookie(userId), { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 12, secure: process.env.NODE_ENV === 'production' });
  redirect(safeNext(fd.get('next')));
}

async function privilegedNeedsMfa(userId: string) {
  return asSystem(async (tx) => !!(await tx.one(`select exists (select 1 from app.people p join app.role_assignments ra on ra.person_id = p.id and ra.revoked_at is null
      join app.roles r on r.key = ra.role_key and r.requires_mfa where p.user_id = $1) v`, [userId]))?.v);
}

export async function passwordSignIn(_: ActionResult, fd: FormData): Promise<ActionResult> {
  if (!hasSupabaseAuth) return { ok: false, message: 'Sign-in is not configured yet.' };
  if (!(await rateLimit('login', 8, 5 * 60_000))) return { ok: false, message: 'Too many attempts. Please wait a few minutes.' };
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email: String(fd.get('email')).trim().toLowerCase(), password: String(fd.get('password')) });
  if (error || !data.user) return { ok: false, message: 'Email or password is incorrect.' };
  const next = safeNext(fd.get('next'));
  if (await privilegedNeedsMfa(data.user.id)) redirect(`/mfa?next=${encodeURIComponent(next)}`);
  redirect(next);
}

export async function googleSignIn(fd: FormData) {
  if (!hasSupabaseAuth || !env.googleSignIn) redirect('/login');
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${env.siteUrl}/auth/callback?next=${encodeURIComponent(safeNext(fd.get('next')))}` } });
  if (data.url) redirect(data.url);
}

export async function signOut() {
  (await cookies()).delete(PREVIEW_COOKIE);
  if (hasSupabaseAuth) { const s = await supabaseServer(); await s.auth.signOut(); }
  redirect('/');
}

export async function activateAccount(_: ActionResult, fd: FormData): Promise<ActionResult> {
  if (!(await rateLimit('activate', 6, 10 * 60_000))) return { ok: false, message: 'Too many attempts. Please wait.' };
  const token = String(fd.get('token') ?? '');
  const password = String(fd.get('password') ?? '');
  const hash = sha256(token);
  const prov = await asSystem(async (tx) => (await tx.one(`select app.lookup_provision($1) p`, [hash]))?.p);
  if (!prov) return { ok: false, message: 'This activation link has expired or was already used.' };

  if (isPreview) {
    const userId = await asSystem(async (tx) => {
      const u = await tx.one(`insert into auth.users(email) values ($1) on conflict (email) do update set email = excluded.email returning id::text`, [prov.email]);
      await tx.query(`select app.consume_provision($1, $2::uuid)`, [hash, u!.id]);
      return u!.id as string;
    });
    (await cookies()).set(PREVIEW_COOKIE, await signPreviewCookie(userId), { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 12 });
    redirect('/app?welcome=1');
  }

  if (password.length < 10) return { ok: false, message: 'Use at least 10 characters.' };
  if (password !== String(fd.get('confirm'))) return { ok: false, message: 'The two passwords do not match.' };
  try {
    const s = await supabaseServer();
    let userId: string;
    if (env.supabaseSecret) {
      const { data, error } = await supabaseAdmin().auth.admin.createUser({ email: prov.email, password, email_confirm: true, user_metadata: { full_name: prov.full_name } });
      if (error || !data.user) throw new Error(passwordMessage(error?.message));
      userId = data.user.id;
    } else {
      // No secret key needed: the database's sign-up gate only lets this through because the request carries the hash of a live activation token.
      const { data, error } = await s.auth.signUp({ email: prov.email, password, options: { data: { full_name: prov.full_name, provision_hash: hash } } });
      if (error || !data.user?.id || !data.user.identities?.length) throw new Error(passwordMessage(error?.message));
      userId = data.user.id;
    }
    await asSystem((tx) => tx.query(`select app.consume_provision($1, $2::uuid)`, [hash, userId]));
    const { error: signInError } = await s.auth.signInWithPassword({ email: prov.email, password });
    if (signInError) return { ok: true, message: 'Your account is ready. Please sign in with your new password.' };
    await s.auth.updateUser({ data: { provision_hash: null } });
  } catch (e) { return { ok: false, message: e instanceof Error && !/^[A-Z_]+(:|$)/.test(e.message) ? e.message : friendlyError(e) }; }
  redirect('/app?welcome=1');
}

export async function requestPasswordReset(_: ActionResult, fd: FormData): Promise<ActionResult> {
  if (!hasSupabaseAuth) return { ok: false, message: 'Password reset is not available in preview mode.' };
  if (!(await rateLimit('reset', 3, 10 * 60_000))) return { ok: false, message: 'Too many attempts. Please wait.' };
  const s = await supabaseServer();
  await s.auth.resetPasswordForEmail(String(fd.get('email')).trim().toLowerCase(), { redirectTo: `${env.siteUrl}/auth/callback?next=/account/password` });
  return { ok: true, message: 'If an account exists for that email, a reset link is on its way.' };
}

export async function updatePassword(_: ActionResult, fd: FormData): Promise<ActionResult> {
  if (!hasSupabaseAuth) return { ok: false, message: 'Not available in preview mode.' };
  const password = String(fd.get('password') ?? '');
  if (password.length < 10) return { ok: false, message: 'Use at least 10 characters.' };
  if (password !== String(fd.get('confirm'))) return { ok: false, message: 'The two passwords do not match.' };
  const s = await supabaseServer();
  const { error } = await s.auth.updateUser({ password });
  if (error) return { ok: false, message: error.message };
  await s.auth.signOut({ scope: 'others' });
  return { ok: true, message: 'Password updated. Other devices were signed out.' };
}
