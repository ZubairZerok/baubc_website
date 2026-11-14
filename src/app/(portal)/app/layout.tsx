import { Shell } from '@/components/portal/Shell';
import { RevealObserver } from '@/components/site/client';
import { requireSession } from '@/server/session';
import { getCounts } from '@/server/queries/portal';
import { Flash } from '@/components/portal/Flash';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Workspace', robots: { index: false } };

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession('/app');
  const counts = await getCounts(session);
  const flash = (await cookies()).get('flash')?.value;
  return <Shell session={session} counts={counts} unread={counts.unread ?? 0}><RevealObserver /><Flash message={flash ? decodeURIComponent(flash) : null} />{children}</Shell>;
}
