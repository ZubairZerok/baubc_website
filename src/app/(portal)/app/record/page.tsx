import Link from 'next/link';
import { PageTitle, Stat } from '@/components/portal/Shell';
import { Status } from '@/components/ui/Status';
import { LedgerStamp } from '@/components/ui/Stamp';
import { Empty } from '@/components/ui/Empty';
import { GrowthRings } from '@/components/portal/GrowthRings';
import { withClaims } from '@/server/db';
import { requireSession } from '@/server/session';
import { fmtDate } from '@/lib/format';

export default async function RecordPage() {
  const session = await requireSession('/app/record');
  const d = await withClaims(session.claims, async (tx) => ({
    ledger: await tx.query(`select id::text, amount, kind, category, reason, created_at, reverses_entry_id::text from app.point_ledger where person_id = authz.current_person_id() order by id desc limit 100`),
    byYear: await tx.query(`select extract(year from period_month)::int y, category, sum(amount)::int pts from app.point_ledger where person_id = authz.current_person_id() group by 1, 2 order by 1`),
    ach: await tx.query(`select id, kind, title, description, occurred_on, status from app.achievement_records where person_id = authz.current_person_id() order by occurred_on desc`),
    certs: await tx.query(`select serial_no, verification_code, title, subtitle, issued_at, revoked_at from app.issued_documents where recipient_person_id = authz.current_person_id() order by issued_at desc`),
    units: await tx.query(`select u.name, um.position_title, um.term_label, um.ended_at from app.unit_memberships um join app.org_units u on u.id = um.unit_id where um.person_id = authz.current_person_id()`),
    attended: await tx.one(`select count(*)::int n from app.checkins c join app.registrations r on r.id = c.registration_id where r.person_id = authz.current_person_id() and c.result = 'ok'`),
  }));
  const total = d.ledger.reduce((a: number, e: any) => a + e.amount, 0);
  return (
    <>
      <PageTitle label="Verified record" title="My record" actions={<Link href="/print/cv" target="_blank" className="btn btn-secondary btn-sm">Generate my CV</Link>}>
        Everything here comes from verified, locked records. You cannot edit it, but you can <Link href="/app/profile" className="underline text-link">request a correction</Link>.
      </PageTitle>
      <div className="grid lg:grid-cols-[320px_1fr] gap-6 mb-8">
        <div className="panel grid gap-3 justify-items-center"><GrowthRings data={d.byYear as any} /><span className="text-xs text-muted text-center">Each ring is a year; thickness is verified points.</span></div>
        <div className="grid sm:grid-cols-2 gap-3 content-start">
          <Stat label="Verified points" value={total} />
          <Stat label="Events attended" value={d.attended?.n ?? 0} hint="From QR check-ins" />
          <Stat label="Achievements" value={d.ach.filter((a: any) => a.status === 'active').length} />
          <Stat label="Certificates" value={d.certs.filter((c: any) => !c.revoked_at).length} />
        </div>
      </div>
      <div className="grid xl:grid-cols-2 gap-6">
        <section className="panel grid gap-2 content-start">
          <h2 className="heading text-lg">Positions & achievements</h2>
          {d.units.map((u: any, i: number) => <div key={i} className="flex items-center gap-3 py-2 border-b border-line"><LedgerStamp size={36} /><div className="grid"><b>{u.position_title} · {u.name}</b><span className="text-xs text-muted">{u.term_label}{u.ended_at ? ' · ended' : ''}</span></div></div>)}
          {d.ach.length ? d.ach.map((a: any) => (
            <div key={a.id} className="flex items-center gap-3 py-2 border-b border-line last:border-0">
              {a.status === 'active' ? <LedgerStamp size={36} year={new Date(a.occurred_on).getFullYear()} /> : <span className="size-9 grid place-items-center"><Status value={a.status === 'pending_verification' ? 'pending' : a.status} /></span>}
              <div className="grid"><b>{a.title}</b><span className="text-xs text-muted">{a.kind} · {fmtDate(a.occurred_on)}{a.status === 'pending_verification' ? ' · awaiting verification' : ''}</span></div>
            </div>)) : !d.units.length && <p className="text-sm text-muted">Achievements are recorded by HR and verified by a second person.</p>}
        </section>
        <section className="panel grid gap-2 content-start">
          <h2 className="heading text-lg">Certificates</h2>
          {d.certs.length ? d.certs.map((c: any) => (
            <div key={c.serial_no} className="flex items-center justify-between gap-3 py-2 border-b border-line last:border-0">
              <div className="grid"><b>{c.title}</b><span className="text-xs text-muted font-mono">{c.serial_no}</span></div>
              {c.revoked_at ? <span className="chip chip-bad">Revoked</span> : <Link href={`/print/certificate/${c.verification_code}`} target="_blank" className="btn btn-sm btn-ghost">Open</Link>}
            </div>)) : <Empty title="No certificates yet">Attend events (checked in by QR) or receive recognition to earn certificates.</Empty>}
        </section>
        <section className="panel grid gap-2 xl:col-span-2">
          <h2 className="heading text-lg">Points ledger</h2>
          {d.ledger.length ? (
            <div className="table-wrap"><table className="table"><thead><tr><th>Date</th><th>Entry</th><th>Category</th><th className="text-right">Points</th></tr></thead>
              <tbody>{d.ledger.map((e: any) => <tr key={e.id}><td className="whitespace-nowrap">{fmtDate(e.created_at)}</td><td>{e.reason}{e.reverses_entry_id ? <span className="text-xs text-muted"> (corrects #{e.reverses_entry_id})</span> : ''}</td><td>{e.category}</td><td className={`text-right tnum font-semibold ${e.amount < 0 ? 'text-soil' : ''}`}>{e.amount > 0 ? '+' : ''}{e.amount}</td></tr>)}</tbody></table></div>
          ) : <p className="text-sm text-muted">Points appear when a reviewer approves your work.</p>}
        </section>
      </div>
    </>
  );
}
