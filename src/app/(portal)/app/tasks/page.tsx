import { PageTitle } from '@/components/portal/Shell';
import { Status } from '@/components/ui/Status';
import { Empty } from '@/components/ui/Empty';
import { ActionForm, SubmitButton } from '@/components/ui/forms';
import { claimTask, submitTask } from '@/app/actions/portal';
import { withClaims } from '@/server/db';
import { requireSession } from '@/server/session';
import { fmtDateTime, relTime } from '@/lib/format';

export default async function TasksPage() {
  const session = await requireSession('/app/tasks');
  const d = await withClaims(session.claims, async (tx) => ({
    mine: await tx.query(`select a.id, a.status, t.title, t.description, t.instructions, t.expected_output, t.due_at, t.points, t.priority, t.links, tt.name type_name, tt.evidence_kind, tt.validation_mode,
        (select jsonb_agg(jsonb_build_object('attempt', s.attempt_no, 'status', s.status, 'at', s.submitted_at, 'late', s.is_late,
           'feedback', (select string_agg(v.comment, ' · ') from app.validation_results v where v.submission_id = s.id and v.validator_kind = 'human')) order by s.attempt_no)
         from app.task_submissions s where s.assignment_id = a.id) submissions
      from app.task_assignments a join app.tasks t on t.id = a.task_id join app.task_types tt on tt.key = t.type_key
      where a.assignee_person_id = authz.current_person_id() order by (a.status in ('approved','rejected','cancelled')), t.due_at nulls last`),
    open: await tx.query(`select t.id, t.title, t.description, t.due_at, t.points, t.max_claims,
        (select count(*)::int from app.task_assignments x where x.task_id = t.id and x.status <> 'cancelled') claimed
      from app.tasks t where t.assignment_mode = 'open_claim' and t.status = 'published' and (t.due_at is null or t.due_at > now())
        and not exists (select 1 from app.task_assignments a where a.task_id = t.id and a.assignee_person_id = authz.current_person_id())`),
  }));
  const active = d.mine.filter((t: any) => !['approved', 'rejected', 'cancelled', 'expired'].includes(t.status));
  const done = d.mine.filter((t: any) => ['approved', 'rejected'].includes(t.status));
  return (
    <>
      <PageTitle label="Work" title="Tasks">Submit your work here. Objective checks (deadline, link format, duplicates) run automatically; a reviewer judges quality. Approved submissions are locked and points go to your verified ledger.</PageTitle>
      <div className="grid gap-4">
        {active.length ? active.map((t: any) => (
          <article key={t.id} className="panel grid gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="grid gap-1"><span className="label text-muted">{t.type_name} · {t.points} pts{t.priority !== 'normal' ? ` · ${t.priority}` : ''}</span><h2 className="heading text-xl">{t.title}</h2></div>
              <Status value={t.status} />
            </div>
            {t.description && <p className="text-ink-2">{t.description}</p>}
            {t.instructions && <div className="rounded-lg bg-paper-2 p-3 text-sm"><b>Instructions.</b> {t.instructions}</div>}
            <p className="text-sm text-muted">{t.due_at ? `Due ${fmtDateTime(t.due_at)} (${relTime(t.due_at)})` : 'No deadline'}</p>
            {t.links?.length > 0 && <div className="flex flex-wrap gap-2">{t.links.map((l: string) => <a key={l} href={l} target="_blank" rel="noopener noreferrer" className="text-sm underline text-link">{new URL(l).hostname}</a>)}</div>}
            {t.submissions?.length > 0 && <ul className="text-sm grid gap-1">{t.submissions.map((s: any) => <li key={s.attempt}>Attempt {s.attempt}: <Status value={s.status} />{s.late ? ' · late' : ''}{s.feedback ? ` · “${s.feedback}”` : ''}</li>)}</ul>}
            {['assigned', 'in_progress', 'revision_requested'].includes(t.status) && (
              <ActionForm action={submitTask} className="grid gap-3 border-t border-line pt-4">
                <input type="hidden" name="assignment_id" value={t.id} />
                <div className="field"><label htmlFor={`c-${t.id}`}>What did you do?</label><textarea id={`c-${t.id}`} name="content" className="textarea" required minLength={10} /></div>
                <div className="field"><label htmlFor={`l-${t.id}`}>Link to your work {t.evidence_kind === 'link' ? '' : <span className="text-muted font-normal">(optional)</span>}</label>
                  <input id={`l-${t.id}`} name="link" type="url" className="input" placeholder="https://" required={t.evidence_kind === 'link'} /><span className="hint">Drive, Canva, Facebook comment or post link. Files stay private to reviewers.</span></div>
                <SubmitButton>Submit for review</SubmitButton>
              </ActionForm>
            )}
          </article>
        )) : <Empty title="No open tasks">Your wing lead assigns tasks here. You can also claim an open task below.</Empty>}
      </div>
      {d.open.length > 0 && (
        <section className="mt-10 grid gap-3">
          <h2 className="heading text-xl">Open tasks you can claim</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {d.open.map((t: any) => (
              <ActionForm key={t.id} action={claimTask} className="panel grid gap-2">
                <input type="hidden" name="task_id" value={t.id} />
                <div className="flex justify-between gap-3"><b>{t.title}</b><span className="text-sm text-muted tnum">{t.points} pts</span></div>
                {t.description && <p className="text-sm text-ink-2">{t.description}</p>}
                <p className="text-xs text-muted">{t.max_claims ? `${t.max_claims - t.claimed} of ${t.max_claims} slots left` : 'Unlimited slots'}{t.due_at ? ` · until ${fmtDateTime(t.due_at)}` : ''}</p>
                <SubmitButton className="btn btn-secondary btn-sm w-max">Claim</SubmitButton>
              </ActionForm>
            ))}
          </div>
        </section>
      )}
      {done.length > 0 && (
        <section className="mt-10 grid gap-3">
          <h2 className="heading text-xl">Finished</h2>
          <div className="table-wrap"><table className="table"><thead><tr><th>Task</th><th>Points</th><th>Status</th></tr></thead>
            <tbody>{done.map((t: any) => <tr key={t.id}><td>{t.title}</td><td className="tnum">{t.points}</td><td><Status value={t.status} /></td></tr>)}</tbody></table></div>
        </section>
      )}
    </>
  );
}
