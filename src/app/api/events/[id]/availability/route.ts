import { NextResponse } from 'next/server';
import { getAvailability } from '@/server/queries/public';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'bad id' }, { status: 400 });
  const rows = await getAvailability(id);
  return NextResponse.json({ at: new Date().toISOString(), tickets: rows }, { headers: { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10' } });
}
