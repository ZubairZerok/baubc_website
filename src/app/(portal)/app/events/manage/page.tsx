import Link from 'next/link';
import { PageTitle } from '@/components/portal/Shell';
import { Status } from '@/components/ui/Status';
import { EventForm } from '@/components/portal/EventForm';
import { withClaims } from '@/server/db';
import { requireSession } from '@/server/session';
import { CATEGORY_LABEL } from '@/lib/format';
import { eventWhen } from '@/components/site/bits';

export default async function ManageEventsPage() {
  const session = await requireSession('/app/events/manage');
  const events = await withClaims(session.claims, (tx) => tx.query(`select e.*, coalesce(sum(t.capacity),0)::int cap, coalesce(sum(t.sold_count),0)::int sold, coalesce(sum(t.held_count),0)::int held,
      (select count(*)::int from app.registrations r where r.event_id = e.id and r.status = 'pending_verification') pv
    from app.events e left join app.ticket_types t on t.event_id = e.id group by e.id order by e.starts_at nulls last, e.created_at`));
  return (
    <>
      <PageTitle label="Operations" title="Events">Seat counts come from the database inventory; capacity can never drop below seats already sold or held.</PageTitle>
      <div className="table-wrap mb-8"><table className="table"><thead><tr><th>Event</th><th>When</th><th>Status</th><th className="text-right">Sold</th><th className="text-right">Held</th><th className="text-right">Capacity</th><th></th></tr></thead>
        <tbody>{events.map((e: any) => (
          <tr key={e.id}><td><b>{e.title}</b><div className="text-xs text-muted">{CATEGORY_LABEL[e.category]}{e.pv ? ` · ${e.pv} payments to verify` : ''}</div></td><td className="text-sm whitespace-nowrap">{eventWhen(e)}</td><td><Status value={e.status} /></td>
            <td className="text-right tnum">{e.sold}</td><td className="text-right tnum">{e.held}</td><td className="text-right tnum">{e.cap}</td>
            <td><Link href={`/app/events/manage/${e.id}`} className="btn btn-ghost btn-sm border-line">Manage</Link></td></tr>))}</tbody></table></div>
      <details className="panel"><summary className="cursor-pointer heading text-lg">Create an event</summary><div className="mt-4"><EventForm /></div></details>
    </>
  );
}
