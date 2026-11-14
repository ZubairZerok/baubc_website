import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { env } from './env';

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* called from a Server Component */ }
      },
    },
  });
}

/** Admin client (secret key). Server-only: used to create auth users from activation links. */
export function supabaseAdmin() {
  if (!env.supabaseSecret) throw new Error('SUPABASE_SECRET_KEY is not configured');
  return createClient(env.supabaseUrl, env.supabaseSecret, { auth: { persistSession: false, autoRefreshToken: false } });
}
