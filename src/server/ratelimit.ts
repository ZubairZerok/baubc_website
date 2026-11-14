import 'server-only';
import { headers } from 'next/headers';

const buckets = new Map<string, number[]>();

/** Best-effort per-instance limiter (the database functions enforce their own limits too). */
export async function rateLimit(name: string, limit: number, windowMs: number) {
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'local';
  const key = `${name}:${ip}`;
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) return false;
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) buckets.clear();
  return true;
}
