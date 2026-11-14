import Link from 'next/link';
import { PageTitle } from '@/components/portal/Shell';
import { Status } from '@/components/ui/Status';
import { Empty } from '@/components/ui/Empty';
import { withClaims } from '@/server/db';
import { requireSession } from '@/server/session';
import { fmtDateTime } from '@/lib/format';

export default async function MyEventsPage() {
  const session = await requireSession('/app/events');
  const regs = await withClaims(session.claims, (tx) => tx.query(`select r.status, r.manage_token, r.created_at, e.title, e.slug, e.date_label, e.starts_at, t.name ticket,
      exists (select 1 from app.checkins c where c.registration_id = r.id and c.result = 'ok') attended
    from app.registrations r join app.events e on e.id = r.event_id join app.ticket_types t on t.id = r.ticket_type_id
    where r.person_id = authz.current_person_id() order by r.created_at desc`));
  return (
    <>
      <PageTitle label="Events" title="My events" actions={<Link href="/events" className="btn btn-primary btn-sm">Find events</Link>}>Your tickets and registrations. Attendance is recorded only by QR check-in.</PageTitle>
      {regs.length ? (
        <div className="table-wrap"><table className="table"><thead><tr><th>Event</th><th>Ticket</th><th>When</th><th>Status</th><th></th></tr></thead>
          <tbody>{regs.map((r: any) => (
            <tr key={r.manage_token}><td className="font-semibold">{r.title}</td><td>{r.ticket}</td><td className="whitespace-nowrap">{r.date_label ?? fmtDateTime(r.starts_at)}</td>
              <td><span className="flex gap-1 flex-wrap"><Status value={r.status} />{r.attended && <span className="chip chip-lock">Attended</span>}</span></td>
              <td><Link href={`/tickets/${r.manage_token}`} className="btn btn-ghost btn-sm">Open</Link></td></tr>))}</tbody></table></div>
      ) : <Empty title="No registrations yet" action={<Link href="/events" className="btn btn-primary">Browse events</Link>}>Register for an event and your ticket appears here.</Empty>}
    </>
  );
}
