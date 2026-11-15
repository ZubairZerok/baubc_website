'use server';
import { timingSafeEqual } from 'node:crypto';
import { asSystem } from '@/server/db';
import { env } from '@/server/env';
import { randomToken, sha256 } from '@/server/crypto';
import { activationMail, sendMail } from '@/server/email';
import { rateLimit } from '@/server/ratelimit';
import { friendlyError } from '@/server/errors';
import type { ActionResult } from '@/components/ui/forms';

const same = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

/** One-time: creates the two Super Admin records and gives each a 72-hour activation link. Works only while no Super Admin exists. */
export async function setupAdmins(_: ActionResult, fd: FormData): Promise<ActionResult> {
  if (!(await rateLimit('setup', 5, 10 * 60_000))) return { ok: false, message: 'Too many attempts. Please wait ten minutes.' };
  if (!env.setupToken || env.setupToken.length < 16) return { ok: false, message: 'Set a SETUP_TOKEN (16 characters or more) in the hosting environment first.' };
  if (!same(String(fd.get('setup_token') ?? ''), env.setupToken)) return { ok: false, message: 'That setup code is not correct.' };
  const people = [1, 2].map((i) => ({ full_name: String(fd.get(`name${i}`) ?? '').trim(), email: String(fd.get(`email${i}`) ?? '').trim().toLowerCase(), token: randomToken() }));
  if (people.some((p) => !p.full_name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email))) return { ok: false, message: 'Enter a name and a valid email for both people.' };
  try {
    await asSystem(async (tx) => {
      await tx.query(`select app.bootstrap_super_admins($1::jsonb)`, [JSON.stringify(people.map((p) => ({ full_name: p.full_name, email: p.email, token_hash: sha256(p.token) })))]);
      for (const p of people) await sendMail(tx, activationMail(p.email, p.full_name, `${env.siteUrl}/activate/${p.token}`, 'invite'));
    });
  } catch (e) { return { ok: false, message: friendlyError(e) }; }
  return { ok: true, message: 'Both Super Admins are created.', data: { links: people.map((p) => ({ name: p.full_name, email: p.email, url: `${env.siteUrl}/activate/${p.token}` })), emailed: !!env.resendKey } };
}
