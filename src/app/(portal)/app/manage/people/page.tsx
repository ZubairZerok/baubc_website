import { PageTitle } from '@/components/portal/Shell';
import { ActionForm, SubmitButton } from '@/components/ui/forms';
import { adjustPoints, decideBestMember, decideCorrection, issueAchievement, reversePoints, verifyAchievement } from '@/app/actions/portal';
import { withClaims } from '@/server/db';
import { can, requireSession } from '@/server/session';
import { fmtDate } from '@/lib/format';

export default async function PointsRecognitionPage() {
  const session = await requireSession('/app/manage/people');
  const lastMonth = new Date(); lastMonth.setDate(1); lastMonth.setMonth(lastMonth.getMonth() - 1);
  const period = lastMonth.toISOString().slice(0, 10);
  const d = await withClaims(session.claims, async (tx) => ({
    members: await tx.query(`select p.id::text, p.full_name, coalesce((select sum(amount) from app.point_ledger l where l.person_id = p.id),0)::int pts,
        coalesce((select sum(amount) from app.point_ledger l where l.person_id = p.id and l.period_month = date_trunc('month', now() at time zone 'Asia/Dhaka')::date),0)::int mon
      from app.people p join app.memberships m on m.person_id = p.id and m.status_key = 'active' order by pts desc`),
    pendingAch: await tx.query(`select a.id, a.title, a.kind, a.occurred_on, p.full_name, (select full_name from app.people where id = a.issued_by) issuer from app.achievement_records a join app.people p on p.id = a.person_id where a.status = 'pending_verification' order by a.created_at`),
    recent: await tx.query(`select l.id::text, l.amount, l.reason, l.kind, l.created_at, p.full_name, exists (select 1 from app.point_ledger r where r.reverses_entry_id = l.id) reversed
      from app.point_ledger l join app.people p on p.id = l.person_id order by l.id desc limit 15`),
    shortlist: can(session, 'recognition.decide') ? await tx.query(`select person_id::text, full_name, points::int, tasks_approved::int, attended::int from app.best_member_shortlist($1::date)`, [period]) : [],
    awards: await tx.query(`select r.period, p.full_name, r.citation from app.recognition_awards r join app.people p on p.id = r.person_id order by period desc limit 6`),
    corrections: can(session, 'people.verify') ? await tx.query(`select c.id, c.field, c.old_value, c.new_value, c.reason, p.full_name from app.profile_change_requests c join app.people p on p.id = c.person_id where c.status = 'requested' order by c.created_at`) : [],
  }));
  const MemberSelect = ({ id }: { id: string }) => <select id={id} name="person_id" className="select">{d.members.map((m: any) => <option key={m.id} value={m.id}>{m.full_name} · {m.pts} pts</option>)}</select>;
  return (
    <>
      <PageTitle label="People" title="Points & recognition">The ledger is append-only: corrections are reversal entries, and large adjustments need a second approver.</PageTitle>
      <div className="grid xl:grid-cols-2 gap-6 items-start">
        {can(session, 'recognition.decide') && (
          <section className="panel grid gap-3">
            <h2 className="heading text-lg">Member of the Month · {fmtDate(period, { month: 'long', year: 'numeric' })}</h2>
            <div className="table-wrap"><table className="table"><thead><tr><th>Member</th><th className="text-right">Points</th><th className="text-right">Tasks</th><th className="text-right">Events</th></tr></thead>
              <tbody>{d.shortlist.map((s: any) => <tr key={s.person_id}><td>{s.full_name}</td><td className="text-right tnum">{s.points}</td><td className="text-right tnum">{s.tasks_approved}</td><td className="text-right tnum">{s.attended}</td></tr>)}</tbody></table></div>
            <ActionForm action={decideBestMember} className="grid gap-3">
              <input type="hidden" name="period" value={period} />
              <div className="field"><label htmlFor="bm-p">Decision</label><select id="bm-p" name="person_id" className="select">{d.shortlist.map((s: any) => <option key={s.person_id} value={s.person_id}>{s.full_name}</option>)}</select></div>
              <div className="field"><label htmlFor="bm-c">Citation</label><textarea id="bm-c" name="citation" className="textarea min-h-[70px]" required placeholder="What they did and why it mattered" /></div>
              <SubmitButton>Record decision</SubmitButton>
            </ActionForm>
            {d.awards.length > 0 && <ul className="text-sm grid gap-1">{d.awards.map((a: any) => <li key={a.period}><b>{fmtDate(a.period, { month: 'short', year: 'numeric' })}</b>: {a.full_name}</li>)}</ul>}
          </section>
        )}
        {can(session, 'achievement.issue') && (
          <section className="panel grid gap-3">
            <h2 className="heading text-lg">Achievements</h2>
            <ActionForm action={issueAchievement} resetOnSuccess className="grid gap-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="field"><label htmlFor="ach-p">Member</label><MemberSelect id="ach-p" /></div>
                <div className="field"><label htmlFor="ach-k">Kind</label><select id="ach-k" name="kind" className="select"><option value="contribution">Contribution</option><option value="position">Position</option><option value="leadership">Leadership</option><option value="award">Award</option></select></div>
              </div>
              <div className="field"><label htmlFor="ach-t">Title</label><input id="ach-t" name="title" className="input" required /></div>
              <div className="field"><label htmlFor="ach-d">Description</label><input id="ach-d" name="description" className="input" /></div>
              <div className="field"><label htmlFor="ach-o">Date</label><input id="ach-o" name="occurred_on" type="date" className="input" /></div>
              <SubmitButton className="btn btn-secondary">Record (needs a second verifier)</SubmitButton>
            </ActionForm>
            {d.pendingAch.map((a: any) => (
              <ActionForm key={a.id} action={verifyAchievement} className="rounded-lg border border-line p-3 grid gap-2">
                <input type="hidden" name="id" value={a.id} />
                <div className="flex justify-between gap-2"><b className="text-sm">{a.full_name}: {a.title}</b><span className="text-xs text-muted">by {a.issuer}</span></div>
                <div className="flex gap-2 items-center"><input name="reason" className="input min-h-9 text-sm" placeholder="Reason if revoking" />
                  <SubmitButton name="decision" value="verify" className="btn btn-primary btn-sm">Verify</SubmitButton><SubmitButton name="decision" value="revoke" className="btn btn-ghost btn-sm">Revoke</SubmitButton></div>
              </ActionForm>
            ))}
          </section>
        )}
        {can(session, 'points.adjust') && (
          <section className="panel grid gap-3">
            <h2 className="heading text-lg">Manual adjustment</h2>
            <ActionForm action={adjustPoints} resetOnSuccess className="grid gap-3">
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="field sm:col-span-2"><label htmlFor="adj-p">Member</label><MemberSelect id="adj-p" /></div>
                <div className="field"><label htmlFor="adj-a">Points (±)</label><input id="adj-a" name="amount" type="number" className="input" required /></div>
              </div>
              <div className="field"><label htmlFor="adj-c">Category</label><select id="adj-c" name="category" className="select">{['operations', 'content', 'events', 'research', 'leadership', 'social', 'participation'].map((c) => <option key={c}>{c}</option>)}</select></div>
              <div className="field"><label htmlFor="adj-r">Reason</label><input id="adj-r" name="reason" className="input" required /></div>
              <SubmitButton className="btn btn-secondary">Post adjustment</SubmitButton>
            </ActionForm>
            <h3 className="font-semibold mt-2">Recent ledger entries</h3>
            {d.recent.map((e: any) => (
              <ActionForm key={e.id} action={reversePoints} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-line last:border-0 text-sm">
                <span><b>{e.full_name}</b> {e.amount > 0 ? '+' : ''}{e.amount} · {e.reason}</span>
                {e.reversed || e.kind === 'reversal' ? <span className="text-xs text-muted">{e.kind === 'reversal' ? 'reversal' : 'reversed'}</span> : (
                  <span className="flex gap-2"><input type="hidden" name="entry_id" value={e.id} /><input name="reason" className="input min-h-8 text-xs w-36" placeholder="Reason" required /><SubmitButton className="btn btn-ghost btn-sm">Reverse</SubmitButton></span>)}
              </ActionForm>
            ))}
          </section>
        )}
        {d.corrections.length > 0 && (
          <section className="panel grid gap-3">
            <h2 className="heading text-lg">Profile corrections</h2>
            {d.corrections.map((c: any) => (
              <ActionForm key={c.id} action={decideCorrection} className="rounded-lg border border-line p-3 grid gap-2">
                <input type="hidden" name="id" value={c.id} />
                <b className="text-sm">{c.full_name} · {c.field}</b>
                <p className="text-sm">“{c.old_value ?? '—'}” → “{c.new_value}”</p><p className="text-xs text-muted">{c.reason}</p>
                <div className="flex gap-2"><input name="note" className="input min-h-9 text-sm" placeholder="Note" /><SubmitButton name="decision" value="approve" className="btn btn-primary btn-sm">Apply</SubmitButton><SubmitButton name="decision" value="reject" className="btn btn-ghost btn-sm">Decline</SubmitButton></div>
              </ActionForm>
            ))}
          </section>
        )}
        <section className="panel grid gap-2 xl:col-span-2">
          <h2 className="heading text-lg">Members by verified points</h2>
          <div className="table-wrap"><table className="table"><thead><tr><th>#</th><th>Member</th><th className="text-right">This month</th><th className="text-right">Total</th></tr></thead>
            <tbody>{d.members.map((m: any, i: number) => <tr key={m.id}><td className="tnum">{i + 1}</td><td>{m.full_name}</td><td className="text-right tnum">{m.mon}</td><td className="text-right tnum font-semibold">{m.pts}</td></tr>)}</tbody></table></div>
        </section>
      </div>
    </>
  );
}
