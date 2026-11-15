import { Shell } from '@/components/portal/Shell';
import { RevealObserver } from '@/components/site/client';
import { requireSession } from '@/server/session';
import { withClaims } from '@/server/db';
import { getCounts } from '@/server/queries/portal';
import { Flash } from '@/components/portal/Flash';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Workspace', robots: { index: false } };

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession('/app');
  const counts = await getCounts(session);
  const flash = (await cookies()).get('flash')?.value;
  const me = await withClaims(session.claims, (tx) => tx.one(`select photo_url, avatar from app.people where id = authz.current_person_id()`));
  return <Shell session={session} counts={counts} unread={counts.unread ?? 0} avatar={me as any}><RevealObserver /><Flash message={flash ? decodeURIComponent(flash) : null} />{children}</Shell>;
}
