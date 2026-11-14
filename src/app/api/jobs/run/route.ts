import { NextResponse } from 'next/server';
import { env, isPreview } from '@/server/env';
import { runJobs } from '@/server/worker';

/** Background worker: Vercel Cron (every minute) calls this with "Authorization: Bearer $CRON_SECRET". */
export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (!isPreview && (!env.cronSecret || auth !== `Bearer ${env.cronSecret}`)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const r = await runJobs(50);
  return NextResponse.json({ status: 'done', ...r });
}
export const POST = GET;
