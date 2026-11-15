import Link from 'next/link';
import { PageTitle, Stat } from '@/components/portal/Shell';
import { Status } from '@/components/ui/Status';
import { Empty } from '@/components/ui/Empty';
import { withClaims } from '@/server/db';
import { requireSession, can, canApprove, isTeacher } from '@/server/session';
import { getCounts } from '@/server/queries/portal';
import { fmtDate, fmtDateTime, fmtMoney, relTime } from '@/lib/format';

export default async function Overview({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const session = await requireSession();
  const { welcome } = await searchParams;
  const counts = await getCounts(session);
  const data = await withClaims(session.claims, async (tx) => ({
    tasks: await tx.query(`select a.id, a.status, t.title, t.due_at, t.points from app.task_assignments a join app.tasks t on t.id = a.task_id
      where a.assignee_person_id = authz.current_person_id() and a.status in ('assigned','in_progress','revision_requested','submitted') order by t.due_at nulls last limit 5`),
    points: await tx.one(`select coalesce(sum(amount),0)::int total, coalesce(sum(amount) filter (where period_month = date_trunc('month', now() at time zone 'Asia/Dhaka')::date),0)::int mon
      from app.point_ledger where person_id = authz.current_person_id()`),
    regs: await tx.query(`select r.status, r.manage_token, e.title, e.date_label, e.starts_at from app.registrations r join app.events e on e.id = r.event_id
      where r.person_id = authz.current_person_id() and r.status in ('confirmed','pending_payment','pending_verification') order by e.starts_at nulls last limit 3`),
    notices: await tx.query(`select title, body, audience, publish_at, pinned from app.announcements where audience <> 'public' or pinned order by pinned desc, publish_at desc limit 3`),
    app: await tx.one(`select a.status_key, s.label, a.submitted_at from app.applications a join app.membership_states s on s.key = a.status_key where a.person_id = authz.current_person_id() order by submitted_at desc limit 1`),
    dues: await tx.one(`select count(*)::int n, coalesce(sum(amount),0)::text total from app.invoices where payer_person_id = authz.current_person_id() and status = 'open' and purpose = 'dues'`),
    activity: session.isSuperAdmin || can(session, 'audit.read')
      ? await tx.query(`select action, entity_type, occurred_at, (select full_name from app.people where id = actor_person_id) actor from audit.audit_log order by id desc limit 6`)
      : [],
    health: session.isSuperAdmin ? await tx.query(`select provider, label, status, last_success_at from app.integration_connections order by provider`) : [],
  }));
  const first = session.name.split(' ')[0].replace(/^Dr\.$/, session.name.split(' ').slice(0, 2).join(' '));
  const queues = [
    canApprove(session) && { label: 'Decisions waiting for you', value: counts.approvals, href: '/app/approvals' },
    can(session, 'finance.verify') && { label: 'Payments to verify', value: counts.verifications, href: '/app/finance' },
    can(session, 'task.review') && { label: 'Submissions to review', value: counts.reviews, href: '/app/review' },
    can(session, 'membership.review') && { label: 'Applications to review', value: counts.applications, href: '/app/admin/applications' },
    session.isSuperAdmin && { label: 'Privileged changes to confirm', value: counts.privileged, href: '/app/admin/people' },
    (can(session, 'inquiry.manage')) && { label: 'New messages', value: counts.inbox, href: '/app/admin/inbox' },
  ].filter(Boolean) as { label: string; value: number; href: string }[];

  return (
    <>
      {welcome && <div className="panel mb-6 border-brand bg-lime-50"><b>Welcome to BAUBC.</b> Your account is active. {session.hasApplication && !session.isMember ? 'You can follow your application below.' : ''}</div>}
      <PageTitle label={fmtDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })} title={`Hello, ${first}`}>
        {session.memberNo ? <>Member <span className="font-mono">{session.memberNo}</span>. </> : null}Here is what needs your attention.
      </PageTitle>

      {queues.length > 0 && (
        <section className="mb-8 grid gap-3">
          <h2 className="label text-muted">Needs you</h2>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {queues.map((q) => (
              <Link key={q.href} href={q.href} className={`panel flex items-center justify-between gap-4 lift ${q.value ? '' : 'opacity-70'}`}>
                <span className="font-semibold">{q.label}</span>
                <span className={`display-md text-3xl tnum ${q.value ? 'text-ink' : 'text-muted'}`}>{q.value}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {data.app && !session.isMember && (
        <section className="panel mb-8 grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="heading text-xl">Your application</h2><Status value={data.app.status_key} label={data.app.label} /></div>
          <p className="text-ink-2">Submitted {fmtDate(data.app.submitted_at)}. <Link href="/app/application" className="underline text-brand">See progress and any requests →</Link></p>
        </section>
      )}

      {isTeacher(session) && (data.dues?.n ?? 0) > 0 && (
        <section className="panel mb-8 flex flex-wrap items-center justify-between gap-4 border-harvest" style={{ background: 'var(--tint-pend)' }}>
          <div><b>Monthly advisor contribution</b><p className="text-sm text-ink-2">{data.dues?.n} open invoice{(data.dues?.n ?? 0) > 1 ? 's' : ''} · {fmtMoney(data.dues?.total)}. Thank you for supporting the club.</p></div>
          <Link href="/app/dues" className="btn btn-dark btn-sm">Pay with bKash</Link>
        </section>
      )}

      {session.isMember && (
        <section className="grid sm:grid-cols-3 gap-3 mb-8">
          <Stat label="Verified points" value={data.points?.total ?? 0} hint="All time, from the ledger" href="/app/record" />
          <Stat label="This month" value={data.points?.mon ?? 0} hint="Counts toward Member of the Month" href="/app/record" />
          <Stat label="Open tasks" value={counts.my_tasks} href="/app/tasks" />
        </section>
      )}

      <div className="grid xl:grid-cols-2 gap-6">
        {session.isMember && (
          <section className="panel grid gap-3 content-start">
            <div className="flex justify-between items-center"><h2 className="heading text-lg">Due soon</h2><Link href="/app/tasks" className="text-sm text-brand underline">All tasks</Link></div>
            {data.tasks.length ? data.tasks.map((t: any) => (
              <Link key={t.id} href="/app/tasks" className="flex items-center justify-between gap-3 py-2 border-b border-line last:border-0">
                <span className="grid"><b className="text-[.95rem]">{t.title}</b><span className="text-xs text-muted">{t.due_at ? `Due ${relTime(t.due_at)}` : 'No deadline'} · {t.points} pts</span></span>
                <Status value={t.status} />
              </Link>
            )) : <p className="text-muted text-sm">No open tasks. Your lead will assign the next one, or claim an open task.</p>}
          </section>
        )}
        <section className="panel grid gap-3 content-start">
          <div className="flex justify-between items-center"><h2 className="heading text-lg">My events</h2><Link href="/events" className="text-sm text-brand underline">Browse events</Link></div>
          {data.regs.length ? data.regs.map((r: any) => (
            <Link key={r.manage_token} href={`/tickets/${r.manage_token}`} className="flex items-center justify-between gap-3 py-2 border-b border-line last:border-0">
              <span className="grid"><b className="text-[.95rem]">{r.title}</b><span className="text-xs text-muted">{r.date_label ?? fmtDateTime(r.starts_at)}</span></span><Status value={r.status} />
            </Link>
          )) : <p className="text-muted text-sm">You have no upcoming registrations.</p>}
        </section>
        <section className="panel grid gap-3 content-start">
          <div className="flex justify-between items-center"><h2 className="heading text-lg">Notices</h2><Link href="/app/notices" className="text-sm text-brand underline">All notices</Link></div>
          {data.notices.length ? data.notices.map((nn: any, i: number) => (
            <div key={i} className="py-2 border-b border-line last:border-0 grid gap-1"><b className="text-[.95rem]">{nn.pinned ? '📌 ' : ''}{nn.title}</b><p className="text-sm text-ink-2 line-clamp-2">{nn.body}</p><span className="text-xs text-muted">{relTime(nn.publish_at)} · {nn.audience}</span></div>
          )) : <Empty title="No notices">Announcements for your role appear here.</Empty>}
        </section>
        {data.activity.length > 0 && (
          <section className="panel grid gap-3 content-start">
            <div className="flex justify-between items-center"><h2 className="heading text-lg">Recent activity</h2><Link href="/app/admin/audit" className="text-sm text-brand underline">Audit log</Link></div>
            {data.activity.map((a: any, i: number) => (
              <div key={i} className="flex justify-between gap-3 text-sm py-1.5 border-b border-line last:border-0"><span><b>{a.actor ?? 'System'}</b> · {a.action.replace(/[._]/g, ' ')}</span><span className="text-muted whitespace-nowrap">{relTime(a.occurred_at)}</span></div>
            ))}
          </section>
        )}
        {data.health.length > 0 && (
          <section className="panel grid gap-3 content-start">
            <div className="flex justify-between items-center"><h2 className="heading text-lg">Integration health</h2><Link href="/app/admin/integrations" className="text-sm text-brand underline">Manage</Link></div>
            {data.health.map((h: any) => (
              <div key={h.provider} className="flex justify-between items-center gap-3 text-sm py-1.5 border-b border-line last:border-0"><span>{h.label}</span><span className="flex items-center gap-2">{h.last_success_at && <span className="text-xs text-muted">{relTime(h.last_success_at)}</span>}<Status value={h.status} /></span></div>
            ))}
          </section>
        )}
      </div>
    </>
  );
}
