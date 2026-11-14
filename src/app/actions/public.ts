'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { withClaims, asSystem } from '@/server/db';
import { getSession } from '@/server/session';
import { friendlyError } from '@/server/errors';
import { rateLimit } from '@/server/ratelimit';
import { kickJobs } from '@/server/worker';
import { randomToken, sha256 } from '@/server/crypto';
import { activationMail, sendMail } from '@/server/email';
import { env } from '@/server/env';
import type { ActionResult } from '@/components/ui/forms';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();

export async function registerAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  if (!(await rateLimit('register', 8, 60_000))) return { ok: false, message: 'Too many attempts. Please wait a minute.' };
  const session = await getSession();
  const team = str(fd, 'team_members').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 19).map((l) => {
    const [name, email] = l.split(',').map((x) => x.trim());
    return { name, email: email ?? null };
  });
  if (!fd.get('consent')) return { ok: false, message: 'Please agree to the privacy notice to register.' };
  let res: any;
  try {
    res = await withClaims(session?.claims ?? null, async (tx) =>
      (await tx.one(`select app.reserve_seat($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10) r`, [
        str(fd, 'ticket_type_id'), str(fd, 'name'), str(fd, 'email'), str(fd, 'phone') || null, str(fd, 'institution') || null,
        str(fd, 'team_name') || null, JSON.stringify(team), JSON.stringify({}),
        JSON.stringify({ privacy_notice: '2026-11', photos: !!fd.get('photo_consent') }), str(fd, 'idem') || null,
      ]))!.r);
  } catch (e) {
    return { ok: false, message: friendlyError(e) };
  }
  kickJobs();
  redirect(`/tickets/${res.manage_token}?new=1`);
}

export async function waitlistAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  if (!(await rateLimit('waitlist', 5, 60_000))) return { ok: false, message: 'Too many attempts. Please wait a minute.' };
  const session = await getSession();
  try {
    const r = await withClaims(session?.claims ?? null, async (tx) =>
      (await tx.one(`select app.join_waitlist($1,$2,$3) r`, [str(fd, 'ticket_type_id'), str(fd, 'name') || session?.name || 'Guest', str(fd, 'email') || session?.email || '']))!.r);
    return { ok: true, message: `You are on the waitlist (position ${r.position}). We will email you if a seat opens.` };
  } catch (e) { return { ok: false, message: friendlyError(e) }; }
}

const claimSchema = z.object({
  invoice_id: z.string().uuid(),
  token: z.string().min(10).max(80).optional().or(z.literal('')),
  trx: z.string().min(6).max(20),
  last4: z.string().regex(/^\d{4}$/, 'Enter the last 4 digits of the sending bKash number'),
  amount: z.coerce.number().positive(),
  paid_at: z.string().optional(),
});

export async function claimPaymentAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  if (!(await rateLimit('claim', 6, 60_000))) return { ok: false, message: 'Too many attempts. Please wait a minute.' };
  const parsed = claimSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check the form.' };
  const d = parsed.data;
  const session = await getSession();
  try {
    await withClaims(session?.claims ?? null, (tx) => tx.query(`select app.claim_payment($1,$2,$3,$4,$5,$6,$7)`, [
      d.invoice_id, d.token || null, d.trx, d.last4, d.amount, d.paid_at ? new Date(/[zZ]|[+-]\d\d:\d\d$/.test(d.paid_at) ? d.paid_at : `${d.paid_at}:00+06:00`).toISOString() : null, `claim:${d.invoice_id}:${d.trx.toUpperCase()}`,
    ]));
  } catch (e) { return { ok: false, message: friendlyError(e) }; }
  revalidatePath('/tickets');
  return { ok: true, message: 'Thank you. Your Transaction ID was submitted and your seat is held while a finance volunteer verifies it (usually within 24 hours).' };
}

export async function cancelRegistrationAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const session = await getSession();
  try {
    await withClaims(session?.claims ?? null, (tx) => tx.query(`select app.cancel_registration($1,$2,$3)`, [str(fd, 'registration_id'), str(fd, 'token') || null, str(fd, 'reason') || 'Cancelled by registrant']));
  } catch (e) { return { ok: false, message: friendlyError(e) }; }
  kickJobs();
  revalidatePath('/tickets');
  return { ok: true, message: 'Your registration was cancelled. If you had paid, a refund request was created for the finance team.' };
}

export async function contactAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  if (str(fd, 'website')) return { ok: true, message: 'Thank you.' }; // honeypot
  if (!(await rateLimit('contact', 4, 10 * 60_000))) return { ok: false, message: 'Too many messages. Please try again later.' };
  try {
    await withClaims(null, (tx) => tx.query(`select app.submit_contact($1,$2,$3,$4,$5)`, [str(fd, 'category') || 'general', str(fd, 'name'), str(fd, 'email'), str(fd, 'organization'), str(fd, 'message')]));
  } catch (e) { return { ok: false, message: friendlyError(e) }; }
  kickJobs();
  return { ok: true, message: 'Thank you. Your message reached the BAUBC team; we will reply by email.' };
}

/** Native application form (used when the Google Form is not configured). Same pipeline as the Google Form webhook. */
export async function applyAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  if (str(fd, 'website')) return { ok: true, message: 'Thank you.' };
  if (!(await rateLimit('apply', 3, 10 * 60_000))) return { ok: false, message: 'Too many attempts. Please try again later.' };
  if (!fd.get('consent')) return { ok: false, message: 'Please agree to the privacy notice.' };
  const payload = {
    response_id: `native:${str(fd, 'email').toLowerCase()}:${new Date().toISOString().slice(0, 10)}`,
    email: str(fd, 'email'), full_name: str(fd, 'full_name'), full_name_bn: str(fd, 'full_name_bn'), student_id: str(fd, 'student_id'),
    department: str(fd, 'department'), session: str(fd, 'session'), batch: str(fd, 'batch'), phone: str(fd, 'phone'),
    facebook_url: str(fd, 'facebook_url'), linkedin_url: str(fd, 'linkedin_url'), bio: str(fd, 'bio'),
    interests: str(fd, 'interests').split(',').map((s) => s.trim()).filter(Boolean),
    skills: str(fd, 'skills').split(',').map((s) => s.trim()).filter(Boolean),
    experience: str(fd, 'experience'), motivation: str(fd, 'motivation'),
    preferred_units: fd.getAll('preferred_units').map(String).slice(0, 3),
    consents: { privacy_notice: '2026-11', photo: !!fd.get('photo_consent') },
  };
  if (!payload.full_name || !payload.email) return { ok: false, message: 'Name and email are required.' };
  const token = randomToken();
  try {
    const r = await asSystem(async (tx) => {
      const res = (await tx.one(`select app.ingest_application('native_form', $1::jsonb, $2) r`, [JSON.stringify(payload), sha256(token)]))!.r;
      if (res.needs_activation && !res.duplicate_delivery) {
        await sendMail(tx, activationMail(res.email, payload.full_name, `${env.siteUrl}/activate/${token}`, 'application'));
      }
      return res;
    });
    if (r.duplicate_delivery) return { ok: true, message: 'We already have your application from today. Check your email for the activation link.' };
    return { ok: true, message: r.needs_activation
      ? 'Application received. We emailed you a one-time link to activate your account and follow your application.'
      : 'Application received. Sign in to follow it from your dashboard.' };
  } catch (e) { return { ok: false, message: friendlyError(e) }; }
}

export async function verifyLookupAction(fd: FormData) {
  const code = str(fd, 'code').toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (code) redirect(`/verify/${encodeURIComponent(code)}`);
}
