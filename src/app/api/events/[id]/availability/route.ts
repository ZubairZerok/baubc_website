import { NextResponse } from 'next/server';
import { getAvailability, getRecentRegistrations } from '@/server/queries/public';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'bad id' }, { status: 400 });
  const [rows, recent] = await Promise.all([getAvailability(id), getRecentRegistrations(id)]);
  return NextResponse.json({ at: new Date().toISOString(), tickets: rows, recent }, { headers: { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10' } });
}
