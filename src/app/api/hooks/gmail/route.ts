import { NextResponse } from 'next/server';
import { asSystem } from '@/server/db';
import { env } from '@/server/env';
import { verifyHmac } from '@/server/crypto';

/** Club mailbox → Apps Script (labelled threads only) → here. Minimal fields; bodies are never sent. */
export async function POST(req: Request) {
  const body = await req.text();
  if (body.length > 256_000) return NextResponse.json({ error: 'too large' }, { status: 413 });
  if (!verifyHmac(env.gmailSecret, req.headers.get('x-baubc-timestamp'), body, req.headers.get('x-baubc-signature'))) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }
  let payload: any;
  try { payload = JSON.parse(body); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }
  const messages: any[] = Array.isArray(payload?.messages) ? payload.messages.slice(0, 100) : [];
  const results = [];
  for (const m of messages) {
    try {
      results.push(await asSystem(async (tx) => (await tx.one(`select app.ingest_gmail($1::jsonb) r`, [JSON.stringify(m)]))!.r));
    } catch (e) {
      results.push({ message_id: m?.message_id, error: (e instanceof Error ? e.message : String(e)).split(':')[0] });
    }
  }
  return NextResponse.json({ ok: true, accepted: results.filter((r: any) => r.id).length, results }, { status: 202 });
}
