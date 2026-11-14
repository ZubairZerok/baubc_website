import Link from 'next/link';
import { PageTitle, Stat } from '@/components/portal/Shell';
import { Status } from '@/components/ui/Status';
import { Empty } from '@/components/ui/Empty';
import { ActionForm, SubmitButton } from '@/components/ui/forms';
import { transitionApplication, transitionMembership } from '@/app/actions/portal';
import { withClaims } from '@/server/db';
import { can, requireSession } from '@/server/session';
import { fmtDate, fmtDateTime, relTime } from '@/lib/format';

export default async function ApplicationsAdmin({ searchParams }: { searchParams: Promise<{ status?: string; id?: string }> }) {
  const session = await requireSession('/app/admin/applications');
  const { status, id } = await searchParams;
  const d = await withClaims(session.claims, async (tx) => ({
    counts: await tx.query(`select status_key, count(*)::int n from app.applications group by 1`),
    list: await tx.query(`select a.id, a.status_key, a.submitted_at, a.updated_at, a.late_submission, a.preferred_units, p.full_name, p.academic_department, p.academic_session, p.student_id,
        (select count(*)::int from app.applications a2 join app.people p2 on p2.id = a2.person_id where a2.id <> a.id and (p2.student_id = p.student_id or p2.email = p.email)) dupes
      from app.applications a join app.people p on p.id = a.person_id where ($1::text is null or a.status_key = $1) order by a.updated_at desc limit 200`, [status ?? null]),
    sel: id ? await tx.one(`select a.*, p.full_name, p.full_name_bn, p.email, p.student_id, p.academic_department, p.academic_session, p.batch_level, p.facebook_url, p.linkedin_url, p.bio, p.interests, p.skills, p.user_id is not null activated, s.label
        from app.applications a join app.people p on p.id = a.person_id join app.membership_states s on s.key = a.status_key where a.id = $1`, [id]) : null,
    transitions: await tx.query(`select from_key, to_key, permission, requires_reason, requires_mfa, s.label from app.membership_transitions t join app.membership_states s on s.key = t.to_key`),
    history: id ? await tx.query(`select e.*, (select full_name from app.people where id = e.actor_person_id) actor from app.membership_status_events e where application_id = $1 order by id`, [id]) : [],
    infos: id ? await tx.query(`select * from app.info_requests where application_id = $1 order by created_at`, [id]) : [],
    members: can(session, 'membership.finalize') ? await tx.query(`select m.id, m.member_no, m.status_key, p.full_name from app.memberships m join app.people p on p.id = m.person_id order by m.member_no`) : [],
  }));
  const count = (k: string) => d.counts.find((c: any) => c.status_key === k)?.n ?? 0;
  const legal = d.sel ? d.transitions.filter((t: any) => t.from_key === d.sel!.status_key && can(session, t.permission)) : [];
  const filters = [['', 'All'], ['pending_review', 'Pending review'], ['under_review', 'Under review'], ['info_requested', 'Info requested'], ['provisionally_approved', 'Provisional'], ['waitlisted', 'Waitlisted'], ['finalized', 'Finalised'], ['rejected', 'Not selected'], ['submitted', 'Not activated']];
  return (
    <>
      <PageTitle label="Membership" title="Applications">Every decision is recorded with who made it, when, the previous and new status, and the reason. Finalising needs two-step verification.</PageTitle>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Stat label="Pending review" value={count('pending_review')} href="?status=pending_review" /><Stat label="Under review" value={count('under_review')} href="?status=under_review" />
        <Stat label="Provisional" value={count('provisionally_approved')} href="?status=provisionally_approved" /><Stat label="Finalised" value={count('finalized')} href="?status=finalized" /><Stat label="Not activated" value={count('submitted')} href="?status=submitted" />
      </div>
      <nav className="flex flex-wrap gap-2 mb-5">{filters.map(([k, l]) => <Link key={k} href={k ? `?status=${k}` : '?'} className={`btn btn-sm ${(status ?? '') === k ? 'btn-dark' : 'btn-ghost border-line'}`}>{l}</Link>)}</nav>
      <div className="grid xl:grid-cols-[1fr_1.1fr] gap-6 items-start">
        <div className="table-wrap"><table className="table"><thead><tr><th>Applicant</th><th>Status</th><th>Updated</th></tr></thead>
          <tbody>{d.list.length ? d.list.map((a: any) => (
            <tr key={a.id} className={id === a.id ? 'bg-paper-2' : ''}><td><Link href={`?${status ? `status=${status}&` : ''}id=${a.id}`} className="font-semibold hover:text-link">{a.full_name}</Link>
              <div className="text-xs text-muted">{[a.academic_department, a.academic_session].filter(Boolean).join(' · ')}{a.dupes ? ' · ⚠ possible duplicate' : ''}{a.late_submission ? ' · late' : ''}</div></td>
              <td><Status value={a.status_key} /></td><td className="text-sm text-muted whitespace-nowrap">{relTime(a.updated_at)}</td></tr>)) : <tr><td colSpan={3} className="text-muted">No applications in this view.</td></tr>}</tbody></table></div>
        {d.sel ? (
          <section className="panel grid gap-5">
            <div className="flex flex-wrap justify-between gap-3 items-start">
              <div className="grid gap-1"><h2 className="heading text-2xl">{d.sel.full_name}</h2>{d.sel.full_name_bn && <p className="text-green" lang="bn">{d.sel.full_name_bn}</p>}<p className="text-sm text-muted">{d.sel.email} · {d.sel.activated ? 'account activated' : 'not activated yet'}</p></div>
              <Status value={d.sel.status_key} label={d.sel.label} />
            </div>
            <dl className="grid sm:grid-cols-2 gap-x-6 text-sm">
              {[['Student ID', d.sel.student_id], ['Department', d.sel.academic_department], ['Session', d.sel.academic_session], ['Level', d.sel.batch_level], ['Preferred wings', (d.sel.preferred_units ?? []).join(', ')], ['Submitted', fmtDate(d.sel.submitted_at)]].map(([k, v]) => <div key={k} className="py-1.5 border-b border-line flex justify-between gap-3"><dt className="text-muted">{k}</dt><dd className="font-semibold text-right">{v || '—'}</dd></div>)}
            </dl>
            <div className="grid gap-2 text-sm">{Object.entries(d.sel.answers ?? {}).filter(([k]) => !['response_id', 'email', 'full_name', 'full_name_bn', 'student_id', 'department', 'session', 'batch', 'preferred_units', 'consents'].includes(k)).map(([k, v]) => (
              <div key={k}><span className="label text-muted">{k.replace(/_/g, ' ')}</span><p className="whitespace-pre-line">{Array.isArray(v) ? v.join(', ') : String(v)}</p></div>))}</div>
            {(d.sel.facebook_url || d.sel.linkedin_url) && <div className="flex gap-3 text-sm">{d.sel.facebook_url && <a href={d.sel.facebook_url} target="_blank" rel="noopener noreferrer" className="underline text-link">Facebook</a>}{d.sel.linkedin_url && <a href={d.sel.linkedin_url} target="_blank" rel="noopener noreferrer" className="underline text-link">LinkedIn</a>}</div>}
            {d.infos.map((r: any) => <div key={r.id} className="rounded-lg bg-paper-2 p-3 text-sm"><b>Asked:</b> {r.message}<br /><b>Answer:</b> {r.response ?? <span className="text-muted">waiting{r.due_at ? ` (due ${fmtDateTime(r.due_at)})` : ''}</span>}</div>)}
            {legal.length > 0 && (
              <ActionForm action={transitionApplication} className="grid gap-3 border-t border-line pt-4">
                <input type="hidden" name="application_id" value={d.sel.id} />
                <div className="field"><label htmlFor="tr-r">Reason / message <span className="text-muted font-normal">(required for some decisions; sent to the applicant)</span></label><textarea id="tr-r" name="reason" className="textarea min-h-[70px]" /></div>
                <div className="field"><label htmlFor="tr-n">Internal notes</label><input id="tr-n" name="notes" className="input" /></div>
                <div className="flex flex-wrap gap-2">{legal.map((t: any) => (
                  <SubmitButton key={t.to_key} name="to" value={t.to_key} className={`btn btn-sm ${t.to_key === 'rejected' ? 'btn-danger' : t.to_key === 'finalized' ? 'btn-primary' : 'btn-secondary'}`}>{t.to_key === 'info_requested' ? 'Request information' : `→ ${t.label}`}{t.requires_mfa ? ' 🔐' : ''}</SubmitButton>))}</div>
              </ActionForm>
            )}
            <ol className="grid gap-1 text-sm border-t border-line pt-3">{d.history.map((h: any) => <li key={h.id}><b>{h.to_state.replace(/_/g, ' ')}</b> · {h.actor ?? 'system'} · {fmtDateTime(h.created_at)}{h.reason ? ` · “${h.reason}”` : ''}</li>)}</ol>
          </section>
        ) : <Empty title="Select an application">Pick an applicant to see their answers, history and the decisions you are allowed to make.</Empty>}
      </div>
      {d.members.length > 0 && (
        <section className="mt-10 grid gap-3">
          <h2 className="heading text-xl">Memberships</h2>
          <div className="table-wrap"><table className="table"><thead><tr><th>Member no.</th><th>Name</th><th>Status</th><th>Change</th></tr></thead>
            <tbody>{d.members.map((m: any) => (
              <tr key={m.id}><td className="font-mono text-sm">{m.member_no}</td><td>{m.full_name}</td><td><Status value={m.status_key} /></td>
                <td><ActionForm action={transitionMembership} className="flex gap-2"><input type="hidden" name="membership_id" value={m.id} />
                  <select name="to" className="select min-h-9 text-sm w-36" defaultValue=""><option value="" disabled>Change to…</option>{d.transitions.filter((t: any) => t.from_key === m.status_key).map((t: any) => <option key={t.to_key} value={t.to_key}>{t.label}</option>)}</select>
                  <input name="reason" className="input min-h-9 text-sm" placeholder="Reason" /><SubmitButton className="btn btn-ghost btn-sm border-line">Apply</SubmitButton></ActionForm></td></tr>))}</tbody></table></div>
        </section>
      )}
    </>
  );
}
