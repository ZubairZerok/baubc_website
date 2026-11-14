import { PageTitle } from '@/components/portal/Shell';
import { Scanner } from '@/components/portal/Scanner';
import { withClaims } from '@/server/db';
import { requireSession } from '@/server/session';

export default async function ScanPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const session = await requireSession('/app/scan');
  const { event } = await searchParams;
  const events = await withClaims(session.claims, (tx) => tx.query(`select id::text, title, date_label, starts_at from app.events where status = 'published' and authz.has_perm('event.checkin', 'event', id) order by starts_at nulls last`));
  return (
    <>
      <PageTitle label="Check-in" title="Ticket scanner">Point the camera at a ticket QR or type the code. Each ticket works once per session; a second scan shows who scanned it first.</PageTitle>
      <Scanner events={events as any} initialEvent={event ?? events[0]?.id} />
    </>
  );
}
