import { NextResponse } from 'next/server';
import { asSystem } from '@/server/db';
import { env } from '@/server/env';
import { randomToken, sha256, verifyHmac } from '@/server/crypto';
import { activationMail, sendMail } from '@/server/email';
import { kickJobs } from '@/server/worker';

/** Google Form → Apps Script → here. Signed with HMAC-SHA256 over "timestamp.body". Idempotent per form response. */
export async function POST(req: Request) {
  const body = await req.text();
  if (body.length > 64_000) return NextResponse.json({ error: 'too large' }, { status: 413 });
  if (!verifyHmac(env.formSecret, req.headers.get('x-baubc-timestamp'), body, req.headers.get('x-baubc-signature'))) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }
  let payload: any;
  try { payload = JSON.parse(body); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }
  if (!payload?.response_id) return NextResponse.json({ error: 'response_id required' }, { status: 400 });
  if (payload.type === 'event_registration') return eventRegistration(payload);
  const token = randomToken();
  try {
    const r = await asSystem(async (tx) => {
      const ins = await tx.one(`insert into app.webhook_inbox(source, delivery_id, summary) values ('google_form', $1, $2::jsonb) on conflict (source, delivery_id) do nothing returning id`,
        [String(payload.response_id), JSON.stringify({ email: payload.email })]);
      if (!ins) return { duplicate: true };
      const res = (await tx.one(`select app.ingest_application('google_form', $1::jsonb, $2) r`, [JSON.stringify(payload), sha256(token)]))!.r;
      await tx.query(`update app.webhook_inbox set status = 'processed' where id = $1`, [ins.id]);
      await tx.query(`update app.integration_connections set status = 'active', last_success_at = now(), last_error = null where provider = 'google_form'`);
      if (res.needs_activation && !res.duplicate_delivery) await sendMail(tx, activationMail(res.email, String(payload.full_name), `${env.siteUrl}/activate/${token}`, 'application'));
      return res;
    });
    return NextResponse.json({ ok: true, ...r }, { status: 202 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await asSystem((tx) => tx.query(`update app.integration_connections set status = 'degraded', last_error = $1 where provider = 'google_form'`, [msg.slice(0, 300)])).catch(() => {});
    return NextResponse.json({ error: msg.split(':')[0] }, { status: msg.startsWith('FORBIDDEN_FIELD') || msg.startsWith('INVALID') ? 422 : 500 });
  }
}

/** Event form → a real registration (same seat rules as the website: never over-books). */
async function eventRegistration(payload: any) {
  const answers = payload.answers && typeof payload.answers === 'object' && !Array.isArray(payload.answers) ? payload.answers : {};
  if (Object.keys(answers).some((k) => /pass(word|code)|pin\b|otp/i.test(k))) return NextResponse.json({ error: 'FORBIDDEN_FIELD' }, { status: 422 });
  try {
    const r = await asSystem(async (tx) => {
      const res = (await tx.one(`select app.ingest_form_registration($1::jsonb) r`, [JSON.stringify({ ...payload, answers })]))!.r;
      await tx.query(`update app.integration_connections set status = 'active', last_success_at = now(), last_error = null where provider = 'google_form'`);
      return res;
    });
    kickJobs();
    return NextResponse.json({ ok: true, ...r }, { status: r.replayed || r.duplicate ? 200 : 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const code = msg.split(':')[0];
    const known = ['SOLD_OUT', 'REGISTRATION_CLOSED', 'NOT_FOUND', 'INVALID_EMAIL', 'NAME_REQUIRED', 'INVALID'];
    if (!known.includes(code)) await asSystem((tx) => tx.query(`update app.integration_connections set status = 'degraded', last_error = $1 where provider = 'google_form'`, [msg.slice(0, 300)])).catch(() => {});
    return NextResponse.json({ error: code }, { status: code === 'SOLD_OUT' || code === 'REGISTRATION_CLOSED' ? 409 : known.includes(code) ? 422 : 500 });
  }
}
