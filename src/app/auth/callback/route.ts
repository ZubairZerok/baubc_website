import { NextResponse } from 'next/server';
import { supabaseServer } from '@/server/supabase';
import { asSystem } from '@/server/db';

/** Finishes Google sign-in and password-reset links. A provider sign-in is linked to the person record BAUBC already holds for that verified email. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/app';
  const safe = next.startsWith('/') && !next.startsWith('//') ? next : '/app';
  if (code) {
    const s = await supabaseServer();
    const { data, error } = await s.auth.exchangeCodeForSession(code);
    if (error || !data.user) return NextResponse.redirect(new URL('/login?error=link', url.origin));
    const linked = await asSystem(async (tx) => (await tx.one(`select app.link_verified_user($1::uuid) v`, [data.user!.id]))?.v).catch(() => false);
    if (!linked) { await s.auth.signOut(); return NextResponse.redirect(new URL('/login?error=unknown', url.origin)); }
  }
  return NextResponse.redirect(new URL(safe, url.origin));
}
