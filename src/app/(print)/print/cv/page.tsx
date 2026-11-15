import Link from 'next/link';
import { withClaims } from '@/server/db';
import { requireSession } from '@/server/session';
import { LogoTile } from '@/components/brand/Mark';
import { fmtDate } from '@/lib/format';
import { PrintButton } from '../PrintButton';

export const metadata = { title: 'Annual CV', robots: { index: false } };

export default async function CvPage() {
  const session = await requireSession('/print/cv');
  const d = await withClaims(session.claims, async (tx) => ({
    p: await tx.one(`select p.*, m.member_no, m.finalized_at from app.people p left join app.memberships m on m.person_id = p.id where p.id = authz.current_person_id()`),
    units: await tx.query(`select u.name, um.position_title, um.term_label, um.started_at, um.ended_at from app.unit_memberships um join app.org_units u on u.id = um.unit_id where um.person_id = authz.current_person_id() order by um.started_at desc`),
    ach: await tx.query(`select title, description, kind, occurred_on from app.achievement_records where person_id = authz.current_person_id() and status = 'active' order by occurred_on desc`),
    events: await tx.query(`select distinct e.title, e.starts_at from app.checkins c join app.registrations r on r.id = c.registration_id join app.events e on e.id = r.event_id where r.person_id = authz.current_person_id() and c.result = 'ok' order by e.starts_at desc nulls last`),
    work: await tx.query(`select t.title, l.amount, l.category, l.created_at from app.point_ledger l join app.task_submissions s on s.id = l.source_id join app.task_assignments a on a.id = s.assignment_id join app.tasks t on t.id = a.task_id
       where l.person_id = authz.current_person_id() and l.kind = 'task_award' and not exists (select 1 from app.point_ledger r where r.reverses_entry_id = l.id) order by l.created_at desc limit 20`),
    pts: await tx.one(`select coalesce(sum(amount),0)::int v from app.point_ledger where person_id = authz.current_person_id()`),
    certs: await tx.query(`select title, subtitle, serial_no, issued_at from app.issued_documents where recipient_person_id = authz.current_person_id() and revoked_at is null order by issued_at desc`),
  }));
  const p = d.p!;
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => <section className="grid gap-2 break-inside-avoid"><h2 className="label text-[#0B7A4B] border-b border-[#0F3A27]/30 pb-1">{title}</h2>{children}</section>;
  return (
    <div className="grid gap-4 justify-items-center px-4">
      <div className="no-print flex gap-3 flex-wrap justify-center"><Link href="/app/record" className="btn btn-ghost">Back</Link><PrintButton /><span className="text-sm text-muted self-center">Built only from verified BAUBC records. Skills are self-declared.</span></div>
      <article className="w-full max-w-[820px] bg-white text-[#151913] p-10 shadow-[var(--shadow)] print:shadow-none grid gap-6" style={{ colorScheme: 'light' }}>
        <header className="flex justify-between gap-6 items-start border-b-2 border-[#0F3A27] pb-5">
          <div className="grid gap-1"><h1 className="display-md text-4xl">{p.full_name}</h1>
            <p className="text-sm text-[#6B6A5C]">{[p.academic_department, p.academic_session, p.batch_level].filter(Boolean).join(' · ')} · Bangladesh Agricultural University</p>
            <p className="text-sm text-[#6B6A5C]">{p.email}{p.linkedin_url ? ` · ${p.linkedin_url.replace('https://', '')}` : ''}</p></div>
          <div className="grid justify-items-end gap-1 text-right"><LogoTile size={40} /><span className="font-mono text-xs">{p.member_no ?? ''}</span><span className="text-xs text-[#6B6A5C]">{d.pts!.v} verified points</span></div>
        </header>
        {p.bio && <p className="text-[.95rem]">{p.bio}</p>}
        {d.units.length > 0 && <Section title="Club positions">{d.units.map((u: any, i: number) => <div key={i} className="flex justify-between gap-4 text-[.95rem]"><span><b>{u.position_title}</b>, {u.name}</span><span className="text-[#6B6A5C]">{u.term_label}</span></div>)}</Section>}
        {d.ach.length > 0 && <Section title="Achievements">{d.ach.map((a: any, i: number) => <div key={i} className="grid text-[.95rem]"><span className="flex justify-between gap-4"><b>{a.title}</b><span className="text-[#6B6A5C]">{fmtDate(a.occurred_on, { month: 'short', year: 'numeric' })}</span></span>{a.description && <span className="text-[#6B6A5C] text-sm">{a.description}</span>}</div>)}</Section>}
        {d.work.length > 0 && <Section title="Verified contributions">{d.work.map((w: any, i: number) => <div key={i} className="flex justify-between gap-4 text-[.95rem]"><span>{w.title}</span><span className="text-[#6B6A5C]">{w.category} · {fmtDate(w.created_at, { month: 'short', year: 'numeric' })}</span></div>)}</Section>}
        {d.events.length > 0 && <Section title="Events attended">{<p className="text-[.95rem]">{d.events.map((e: any) => e.title).join(' · ')}</p>}</Section>}
        {d.certs.length > 0 && <Section title="Certificates">{d.certs.map((c: any) => <div key={c.serial_no} className="flex justify-between gap-4 text-[.95rem]"><span>{c.subtitle}: {c.title}</span><span className="font-mono text-xs text-[#6B6A5C]">{c.serial_no}</span></div>)}</Section>}
        {(p.skills?.length ?? 0) > 0 && <Section title="Skills (self-declared)"><p className="text-[.95rem]">{p.skills.join(' · ')}</p></Section>}
        <footer className="text-xs text-[#6B6A5C] border-t border-[#0F3A27]/30 pt-3">Generated {fmtDate(new Date())} from BAUBC verified records. Certificates can be verified at the BAUBC website.</footer>
      </article>
    </div>
  );
}
