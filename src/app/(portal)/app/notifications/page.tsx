import Link from 'next/link';
import { PageTitle } from '@/components/portal/Shell';
import { Empty } from '@/components/ui/Empty';
import { markAllRead } from '@/app/actions/portal';
import { withClaims } from '@/server/db';
import { requireSession } from '@/server/session';
import { relTime } from '@/lib/format';

export default async function NotificationsPage() {
  const session = await requireSession('/app/notifications');
  const items = await withClaims(session.claims, (tx) => tx.query(`select * from app.notifications where person_id = authz.current_person_id() order by created_at desc limit 100`));
  return (
    <>
      <PageTitle title="Notifications" actions={<form action={markAllRead}><button className="btn btn-ghost btn-sm border-line">Mark all read</button></form>} />
      {items.length ? (
        <div className="card divide-y divide-[var(--line)]">
          {items.map((n: any) => (
            <Link key={n.id} href={n.link ?? '/app'} className={`flex gap-3 p-4 hover:bg-paper-2 ${n.read_at ? '' : 'bg-paper-2/50'}`}>
              <span className={`mt-2 size-2 rounded-full shrink-0 ${n.read_at ? 'bg-transparent' : 'bg-signal'}`} style={!n.read_at ? { boxShadow: '0 0 0 2px var(--on-signal)' } : undefined} />
              <span className="grid gap-0.5 min-w-0"><b>{n.title}</b>{n.body && <span className="text-sm text-ink-2">{n.body}</span>}<span className="text-xs text-muted">{relTime(n.created_at)} · {n.type}</span></span>
            </Link>
          ))}
        </div>
      ) : <Empty title="No notifications">Updates about your tasks, payments and decisions appear here.</Empty>}
    </>
  );
}
