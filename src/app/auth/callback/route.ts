import { NextResponse } from 'next/server';
import { supabaseServer } from '@/server/supabase';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/app';
  const safe = next.startsWith('/') && !next.startsWith('//') ? next : '/app';
  if (code) {
    const s = await supabaseServer();
    const { error } = await s.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL('/login?error=link', url.origin));
  }
  return NextResponse.redirect(new URL(safe, url.origin));
}
