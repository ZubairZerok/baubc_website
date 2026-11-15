import { PageTitle } from '@/components/portal/Shell';
import { Empty } from '@/components/ui/Empty';
import { ActionForm, SubmitButton } from '@/components/ui/forms';
import { reviewSubmission } from '@/app/actions/portal';
import { withClaims } from '@/server/db';
import { requireSession } from '@/server/session';
import { relTime } from '@/lib/format';

export default async function ReviewPage() {
  const session = await requireSession('/app/review');
  const subs = await withClaims(session.claims, (tx) => tx.query(`
    select s.id, s.attempt_no, s.content, s.link_url, s.submitted_at, s.is_late, t.title, t.points, t.instructions, t.expected_output, tt.name type_name, tt.max_points, tt.second_review_above, tt.validation_mode,
      app.person_label(a.assignee_person_id) member, u.name unit,
      (select jsonb_agg(jsonb_build_object('rule', v.rule_key, 'outcome', v.outcome, 'comment', v.comment)) from app.validation_results v where v.submission_id = s.id and v.validator_kind = 'rule') rules,
      (select count(*)::int from app.task_submissions s2 join app.task_assignments a2 on a2.id = s2.assignment_id where a2.assignee_person_id = a.assignee_person_id and s2.status = 'approved') prior_ok
    from app.task_submissions s join app.task_assignments a on a.id = s.assignment_id join app.tasks t on t.id = a.task_id join app.task_types tt on tt.key = t.type_key
    left join app.org_units u on u.id = t.scope_unit_id
    where s.status = 'validation_pending' and a.assignee_person_id <> authz.current_person_id() order by s.submitted_at`));
  return (
    <>
      <PageTitle label="Validation" title="Review queue">Automated checks only flag objective problems. Your job is the quality judgement. Points above the type threshold go to a second approver automatically.</PageTitle>
      <div className="grid gap-5">
        {subs.length ? subs.map((s: any) => (
          <article key={s.id} className="card overflow-hidden">
            <div className="grid lg:grid-cols-[1.3fr_1fr]">
              <div className="p-5 grid gap-3 border-b lg:border-b-0 lg:border-r border-line">
                <div className="flex flex-wrap gap-2 items-center"><span className="label text-muted">{s.type_name}{s.unit ? ` · ${s.unit}` : ''}</span>{s.is_late && <span className="chip chip-pend">Late</span>}{s.attempt_no > 1 && <span className="chip chip-info">Attempt {s.attempt_no}</span>}</div>
                <h2 className="heading text-xl">{s.title}</h2>
                <p className="text-sm text-muted"><b className="text-ink">{s.member}</b> · {relTime(s.submitted_at)} · {s.prior_ok} approved before</p>
                <div className="rounded-lg bg-lime-50 p-3 whitespace-pre-line">{s.content}</div>
                {s.link_url && <a href={s.link_url} target="_blank" rel="noopener noreferrer" className="underline text-brand break-all text-sm">{s.link_url}</a>}
                <div className="flex flex-wrap gap-2">{(s.rules ?? []).map((r: any) => <span key={r.rule} className={`chip ${r.outcome === 'pass' ? 'chip-ok' : 'chip-pend'}`} title={r.comment ?? ''}>{r.rule.replace(/_/g, ' ')}: {r.outcome}</span>)}</div>
              </div>
              <ActionForm action={reviewSubmission} className="p-5 grid gap-3 content-start bg-lime-50/40">
                <input type="hidden" name="submission_id" value={s.id} />
                {s.instructions && <p className="text-sm"><b>Brief:</b> {s.instructions}</p>}
                <div className="field"><label htmlFor={`p-${s.id}`}>Points (max {s.max_points})</label><input id={`p-${s.id}`} name="points" type="number" min={0} max={s.max_points} defaultValue={s.points} className="input w-32 tnum" />
                  <span className="hint">Above {s.second_review_above} a second approver is required.</span></div>
                <div className="field"><label htmlFor={`c-${s.id}`}>Feedback for the member</label><textarea id={`c-${s.id}`} name="comment" className="textarea min-h-[80px]" /></div>
                <div className="flex flex-wrap gap-2">
                  <SubmitButton name="decision" value="approve" className="btn btn-primary">Approve</SubmitButton>
                  <SubmitButton name="decision" value="revise" className="btn btn-secondary">Ask for revision</SubmitButton>
                  <SubmitButton name="decision" value="reject" className="btn btn-danger">Reject</SubmitButton>
                </div>
              </ActionForm>
            </div>
          </article>
        )) : <Empty title="The queue is clear">New submissions in your scope appear here.</Empty>}
      </div>
    </>
  );
}
