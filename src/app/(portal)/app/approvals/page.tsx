import { PageTitle } from '@/components/portal/Shell';
import { Status } from '@/components/ui/Status';
import { Empty } from '@/components/ui/Empty';
import { ActionForm, SubmitButton } from '@/components/ui/forms';
import { decideApproval, respondApproval } from '@/app/actions/portal';
import { withClaims } from '@/server/db';
import { requireSession } from '@/server/session';
import { fmtDateTime, fmtMoney, relTime } from '@/lib/format';

export default async function ApprovalsPage() {
  const session = await requireSession('/app/approvals');
  const d = await withClaims(session.claims, async (tx) => ({
    inbox: await tx.query(`select r.*, app.person_label(r.requested_by) requester, d.request_no, d.purpose, d.payee_name, d.payee_account_last4, d.budget_line, d.evidence_urls, d.kind,
        (select jsonb_agg(jsonb_build_object('who', app.person_label(a.actor_person_id), 'action', a.action, 'note', a.note, 'at', a.created_at, 'void', a.voided_at is not null) order by a.created_at)
         from app.approval_actions a where a.request_id = r.id) actions,
        (select count(*)::int from app.disbursement_requests x where x.payee_name = d.payee_name and x.id <> d.id and x.created_at > now() - interval '30 days') similar
      from app.approval_requests r left join app.disbursement_requests d on d.id = r.disbursement_id
      where r.status = 'pending' and authz.can_decide(r.id)
        and not exists (select 1 from app.approval_actions a where a.request_id = r.id and a.actor_person_id = authz.current_person_id() and a.voided_at is null and a.action in ('approve','reject'))
      order by r.due_at nulls last`),
    mine: await tx.query(`select r.id, r.title, r.status, r.amount::text, r.clarification_question, r.created_at from app.approval_requests r where r.requested_by = authz.current_person_id() order by r.created_at desc limit 20`),
    history: await tx.query(`select r.title, r.amount::text, a.action, a.note, a.created_at from app.approval_actions a join app.approval_requests r on r.id = a.request_id where a.actor_person_id = authz.current_person_id() and a.action in ('approve','reject','return','clarify') order by a.created_at desc limit 20`),
  }));
  return (
    <>
      <PageTitle label="Decisions" title="Approvals">Each card shows everything needed to decide. You can only decide requests within your mandate, never your own, and finance decisions need two-step verification.</PageTitle>
      <div className="grid gap-5">
        {d.inbox.length ? d.inbox.map((r: any) => {
          const pol = r.policy ?? {};
          const approvals = (r.actions ?? []).filter((a: any) => a.action === 'approve' && !a.void).length;
          return (
            <article key={r.id} className="card overflow-hidden" style={{ boxShadow: 'var(--shadow)' }}>
              <div className="p-5 sm:p-6 grid gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tag"><i>{r.subject_type === 'disbursement' ? 'DR' : r.subject_type === 'points_award' ? 'PTS' : 'REQ'}</i>{r.request_no ?? r.category}</span>
                  <span className="chip chip-pend">Approval {approvals + 1} of {pol.required_approvals}</span>
                  {pol.require_super_admin && <span className="chip chip-info">Needs a Super Admin</span>}
                  {r.due_at && <span className="label text-muted">Due {relTime(r.due_at)}</span>}
                </div>
                <h2 className="heading text-2xl">{r.purpose ?? r.title}</h2>
                {r.amount && <div className="display-md text-4xl tnum">{r.subject_type === 'points_award' ? `${Number(r.amount)} points` : fmtMoney(r.amount)}</div>}
                <dl className="grid sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                  {r.payee_name && <div><dt className="text-xs text-muted">Payee</dt><dd className="font-semibold">{r.payee_name}</dd></div>}
                  {r.payee_account_last4 && <div><dt className="text-xs text-muted">Pay to</dt><dd className="font-semibold font-mono">•••• {r.payee_account_last4}</dd></div>}
                  {r.budget_line && <div><dt className="text-xs text-muted">Budget line</dt><dd className="font-semibold">{r.budget_line}</dd></div>}
                  <div><dt className="text-xs text-muted">Requested by</dt><dd className="font-semibold">{r.requester} · {relTime(r.created_at)}</dd></div>
                  <div><dt className="text-xs text-muted">Policy</dt><dd className="font-semibold">{pol.required_approvals} distinct approver{pol.required_approvals > 1 ? 's' : ''}{pol.max_amount ? ` (up to ${fmtMoney(pol.max_amount)})` : ''}</dd></div>
                  <div><dt className="text-xs text-muted">Similar requests (30 days)</dt><dd className={`font-semibold ${r.similar ? 'text-harvest-text' : ''}`}>{r.similar ? `${r.similar} to this payee` : 'None'}</dd></div>
                  {r.context?.reason && <div className="sm:col-span-3"><dt className="text-xs text-muted">Reason</dt><dd>{r.context.reason}</dd></div>}
                </dl>
                {r.evidence_urls?.length > 0 && <div className="flex flex-wrap gap-2">{r.evidence_urls.map((u: string) => <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm border-line">Evidence ↗</a>)}</div>}
                {r.actions?.length > 0 && <ul className="text-sm grid gap-1 border-t border-line pt-3">{r.actions.map((a: any, i: number) => <li key={i} className={a.void ? 'line-through text-muted' : ''}><b>{a.who}</b> · {a.action}{a.note ? `: “${a.note}”` : ''} · {relTime(a.at)}</li>)}</ul>}
              </div>
              <ActionForm action={decideApproval} className="border-t border-line bg-paper-2 p-4 sm:p-5 grid gap-3">
                <input type="hidden" name="request_id" value={r.id} />
                <div className="field"><label htmlFor={`note-${r.id}`}>Decision note <span className="font-normal text-muted">(required to reject, return or ask)</span></label><textarea id={`note-${r.id}`} name="note" className="textarea min-h-[70px]" /></div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <SubmitButton name="decision" value="clarify" className="btn btn-ghost border-line">Ask a question</SubmitButton>
                  <SubmitButton name="decision" value="return" className="btn btn-secondary">Return for revision</SubmitButton>
                  <SubmitButton name="decision" value="reject" className="btn btn-danger">Reject</SubmitButton>
                  <SubmitButton name="decision" value="approve" className="btn btn-primary">Approve</SubmitButton>
                </div>
              </ActionForm>
            </article>
          );
        }) : <Empty title="Nothing to decide right now">New requests within your mandate appear here, and you get an email and a notification.</Empty>}
      </div>
      <div className="grid xl:grid-cols-2 gap-6 mt-10">
        <section className="panel grid gap-2 content-start">
          <h2 className="heading text-lg">My requests</h2>
          {d.mine.length ? d.mine.map((r: any) => (
            <div key={r.id} className="py-2 border-b border-line last:border-0 grid gap-2">
              <div className="flex justify-between gap-3"><span>{r.title}</span><Status value={r.status} /></div>
              {['clarification', 'returned'].includes(r.status) && (
                <ActionForm action={respondApproval} className="grid gap-2">
                  {r.clarification_question && <p className="text-sm text-harvest-text">Question: {r.clarification_question}</p>}
                  <input type="hidden" name="request_id" value={r.id} />
                  <textarea name="note" className="textarea min-h-[60px]" required placeholder="Your answer or what you changed" />
                  <SubmitButton className="btn btn-secondary btn-sm w-max">Send back to approvers</SubmitButton>
                </ActionForm>
              )}
            </div>)) : <p className="text-sm text-muted">You have not requested anything.</p>}
        </section>
        <section className="panel grid gap-2 content-start">
          <h2 className="heading text-lg">My decisions</h2>
          {d.history.length ? d.history.map((h: any, i: number) => <div key={i} className="flex justify-between gap-3 py-2 border-b border-line last:border-0 text-sm"><span>{h.title}{h.note ? ` · “${h.note}”` : ''}</span><span className="whitespace-nowrap"><Status value={h.action === 'approve' ? 'approved' : h.action === 'reject' ? 'rejected' : h.action === 'return' ? 'returned' : 'clarification'} /> <span className="text-muted">{fmtDateTime(h.created_at)}</span></span></div>)
            : <p className="text-sm text-muted">No decisions yet.</p>}
        </section>
      </div>
    </>
  );
}
