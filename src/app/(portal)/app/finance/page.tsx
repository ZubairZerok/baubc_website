import { PageTitle, Stat } from '@/components/portal/Shell';
import { Status } from '@/components/ui/Status';
import { Empty } from '@/components/ui/Empty';
import { ActionForm, SubmitButton } from '@/components/ui/forms';
import { completeRefund, generateDues, recordExecution, requestRefund, submitDisbursement, verifyExecution, verifyPayment } from '@/app/actions/portal';
import { withClaims } from '@/server/db';
import { can, requireSession } from '@/server/session';
import { fmtDate, fmtDateTime, fmtMoney, relTime } from '@/lib/format';

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await requireSession('/app/finance');
  const { tab = 'verify' } = await searchParams;
  const d = await withClaims(session.claims, async (tx) => ({
    queue: await tx.query(`select p.id, p.amount::text, p.status, p.method, p.note, p.provider_trx_id, p.payer_wallet_last4, p.claimed_paid_at, p.created_at, p.claimer_email, i.invoice_no, i.description,
        app.person_label(p.verified_by) first_verifier, p.verified_by = authz.current_person_id() i_verified
      from app.payments p join app.invoices i on i.id = p.invoice_id where p.status in ('pending_verification','pending_second_verification') order by p.created_at`),
    totals: await tx.one(`select coalesce(sum(amount) filter (where direction='in'),0)::text income, coalesce(sum(amount) filter (where direction='out'),0)::text spend,
        (coalesce(sum(amount) filter (where direction='in'),0) - coalesce(sum(amount) filter (where direction='out'),0))::text balance from app.finance_entries`),
    entries: await tx.query(`select e.id::text, e.direction, e.amount::text, e.memo, e.occurred_at, a.name account, app.person_label(e.created_by) by
      from app.finance_entries e join app.finance_accounts a on a.id = e.account_id order by e.id desc limit 50`),
    disb: await tx.query(`select d.*, d.amount::text amount, app.person_label(d.requested_by) requester,
        (select jsonb_build_object('trx', x.provider_trx_id, 'by', app.person_label(x.executed_by), 'at', x.executed_at, 'proof', x.proof_url, 'mine', x.executed_by = authz.current_person_id())
         from app.disbursement_executions x where x.request_id = d.id order by x.executed_at desc limit 1) exec
      from app.disbursement_requests d order by d.created_at desc limit 40`),
    refunds: await tx.query(`select r.*, r.amount::text amount, i.invoice_no, i.description, app.person_label(r.requested_by) requester from app.refunds r join app.payments p on p.id = r.payment_id join app.invoices i on i.id = p.invoice_id order by r.created_at desc limit 30`),
    refundable: can(session, 'finance.verify') ? await tx.query(`select p.id::text, p.amount::text, p.method, p.provider_trx_id, i.invoice_no, i.description, p.claimer_email from app.payments p join app.invoices i on i.id = p.invoice_id
      where p.status = 'verified' and not exists (select 1 from app.refunds r where r.payment_id = p.id and r.status in ('requested','approved','completed')) order by p.created_at desc limit 80`) : [],
    events: await tx.query(`select id::text, title from app.events order by created_at desc`),
    dues: await tx.one(`select count(*) filter (where status='open')::int open, count(*) filter (where status='paid')::int paid from app.invoices where purpose = 'dues'`),
  }));
  const tabs = [['verify', `Verify payments (${d.queue.length})`], ['disburse', 'Disbursements'], ['book', 'Cash book'], ['refunds', `Refunds & dues${d.refunds.filter((r: any) => r.status === 'approved').length ? ` (${d.refunds.filter((r: any) => r.status === 'approved').length})` : ''}`]];
  return (
    <>
      <PageTitle label="Finance" title="Money in, money out">Payments are never marked received just because a TrxID was typed in. Every movement is verified by a person who did not make it, and the cash book is append-only.</PageTitle>
      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <Stat label="Verified income" value={fmtMoney(d.totals?.income)} />
        <Stat label="Verified payouts" value={fmtMoney(d.totals?.spend)} />
        <Stat label="Book balance" value={fmtMoney(d.totals?.balance)} hint="Reconcile weekly against the wallet statement" />
      </div>
      <nav className="flex flex-wrap gap-2 mb-6">{tabs.map(([k, l]) => <a key={k} href={`?tab=${k}`} className={`btn btn-sm ${tab === k ? 'btn-dark' : 'btn-secondary'}`}>{l}</a>)}</nav>

      {tab === 'verify' && (d.queue.length ? (
        <div className="grid gap-3">
          {d.queue.map((p: any) => (
            <ActionForm key={p.id} action={verifyPayment} className="panel grid lg:grid-cols-[1fr_auto] gap-4 items-center">
              <input type="hidden" name="payment_id" value={p.id} />
              <div className="grid sm:grid-cols-4 gap-3 items-center">
                <div className="grid"><span className="label text-muted">{p.method === 'cash' ? 'Cash' : p.method === 'bank_transfer' ? 'Bank reference' : 'TrxID'}</span><span className="font-mono text-xl tracking-wider">{p.provider_trx_id ?? 'In hand'}</span></div>
                <div className="grid"><span className="label text-muted">Amount</span><span className="heading text-xl tnum">{fmtMoney(p.amount)}</span></div>
                <div className="grid"><span className="label text-muted">{p.method === 'bkash_manual' || !p.method ? 'From wallet' : 'Received'}</span><span className="font-mono">{p.payer_wallet_last4 ? `•••• ${p.payer_wallet_last4}` : (p.note ?? '').slice(0, 40)}</span><span className="text-xs text-muted">{p.claimed_paid_at ? fmtDateTime(p.claimed_paid_at) : ''}</span></div>
                <div className="grid text-sm"><span className="font-mono text-xs">{p.invoice_no}</span><span className="text-muted">{p.description}</span><span className="text-xs text-muted">{p.claimer_email} · {relTime(p.created_at)}</span>
                  {p.status === 'pending_second_verification' && <span className="chip chip-pend mt-1 w-max">2nd check · first by {p.first_verifier}</span>}</div>
              </div>
              <div className="grid gap-2">
                <input name="reason" className="input min-h-9 text-sm" placeholder="Reason if rejecting" />
                <div className="flex gap-2">
                  <SubmitButton name="decision" value="verify" className="btn btn-primary btn-sm" disabled={p.i_verified}>{p.i_verified ? 'Needs another person' : p.method === 'cash' ? 'Cash counted' : 'Matches statement'}</SubmitButton>
                  <SubmitButton name="decision" value="reject" className="btn btn-danger btn-sm">Not found</SubmitButton>
                </div>
              </div>
            </ActionForm>
          ))}
        </div>
      ) : <Empty title="No payments waiting">Payments show up here when someone submits a bKash Transaction ID, or when an organiser records cash at the desk.</Empty>)}

      {tab === 'disburse' && (
        <div className="grid xl:grid-cols-[400px_1fr] gap-6 items-start">
          {can(session, 'finance.disburse.request') ? (
            <ActionForm action={submitDisbursement} resetOnSuccess className="panel grid gap-3">
              <h2 className="heading text-lg">Request a payment</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="field"><label htmlFor="d-kind">Kind</label><select id="d-kind" name="kind" className="select"><option value="expense">Expense</option><option value="vendor">Vendor</option><option value="reimbursement">Reimbursement</option><option value="prize">Prize</option><option value="advance">Advance</option></select></div>
                <div className="field"><label htmlFor="d-amt">Amount (BDT)</label><input id="d-amt" name="amount" type="number" min="1" step="0.01" className="input" required /></div>
              </div>
              <div className="field"><label htmlFor="d-pur">Purpose</label><input id="d-pur" name="purpose" className="input" required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="field"><label htmlFor="d-payee">Payee</label><input id="d-payee" name="payee_name" className="input" required /></div>
                <div className="field"><label htmlFor="d-last4">Payee account (last 4)</label><input id="d-last4" name="payee_last4" className="input font-mono" maxLength={4} /></div>
                <div className="field"><label htmlFor="d-bl">Budget line</label><input id="d-bl" name="budget_line" className="input" placeholder="Summit / Venue" /></div>
                <div className="field"><label htmlFor="d-ev">Event</label><select id="d-ev" name="event_id" className="select"><option value="">—</option>{d.events.map((e: any) => <option key={e.id} value={e.id}>{e.title}</option>)}</select></div>
              </div>
              <div className="field"><label htmlFor="d-evd">Evidence links (quote, invoice)</label><input id="d-evd" name="evidence" className="input" placeholder="https://drive.google.com/…" /></div>
              <label className="check"><input type="checkbox" name="confirm_duplicate" />This is not a duplicate of a recent request</label>
              <SubmitButton>Send for approval</SubmitButton>
            </ActionForm>
          ) : <div />}
          <div className="grid gap-3">
            {d.disb.length ? d.disb.map((x: any) => (
              <article key={x.id} className="panel grid gap-3">
                <div className="flex flex-wrap justify-between gap-3 items-start">
                  <div className="grid"><span className="font-mono text-xs text-muted">{x.request_no} · {x.kind}</span><b>{x.purpose}</b><span className="text-sm text-muted">{x.payee_name}{x.payee_account_last4 ? ` · •••• ${x.payee_account_last4}` : ''} · requested by {x.requester}</span></div>
                  <span className="flex items-center gap-3"><span className="heading text-xl tnum">{fmtMoney(x.amount)}</span><Status value={x.status} /></span>
                </div>
                {x.status === 'approved' && can(session, 'finance.disburse.execute') && (
                  <ActionForm action={recordExecution} className="grid sm:grid-cols-[auto_1fr_1fr_auto] gap-2 items-end border-t border-line pt-3">
                    <input type="hidden" name="request_id" value={x.id} /><input type="hidden" name="amount" value={x.amount} />
                    <div className="field"><label htmlFor={`m-${x.id}`}>Method</label><select id={`m-${x.id}`} name="method" className="select"><option value="bkash">bKash</option><option value="bank">Bank</option><option value="cash">Cash</option></select></div>
                    <div className="field"><label htmlFor={`trx-${x.id}`}>TrxID / reference</label><input id={`trx-${x.id}`} name="trx" className="input font-mono" required /></div>
                    <div className="field"><label htmlFor={`pf-${x.id}`}>Proof link</label><input id={`pf-${x.id}`} name="proof" className="input" placeholder="https://" /></div>
                    <SubmitButton className="btn btn-secondary">Record payout</SubmitButton>
                  </ActionForm>
                )}
                {x.status === 'processing' && x.exec && (
                  <ActionForm action={verifyExecution} className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-sm">
                    <input type="hidden" name="request_id" value={x.id} />
                    <span>Paid by <b>{x.exec.by}</b> · TrxID <b className="font-mono">{x.exec.trx}</b>{x.exec.proof && <> · <a className="underline text-brand" href={x.exec.proof} target="_blank" rel="noopener noreferrer">proof</a></>}</span>
                    {can(session, 'finance.reconcile') && <span className="flex gap-2"><SubmitButton name="decision" value="ok" className="btn btn-primary btn-sm" disabled={x.exec.mine}>{x.exec.mine ? 'Another person must verify' : 'Verify against statement'}</SubmitButton><SubmitButton name="decision" value="mismatch" className="btn btn-secondary btn-sm">Mismatch</SubmitButton></span>}
                  </ActionForm>
                )}
              </article>
            )) : <Empty title="No disbursements yet">Requests go to Teacher Approvers according to the amount.</Empty>}
          </div>
        </div>
      )}

      {tab === 'book' && (
        <div className="table-wrap"><table className="table"><thead><tr><th>#</th><th>Date</th><th>Account</th><th>Memo</th><th>By</th><th className="text-right">In</th><th className="text-right">Out</th></tr></thead>
          <tbody>{d.entries.map((e: any) => <tr key={e.id}><td className="tnum text-muted">{e.id}</td><td className="whitespace-nowrap">{fmtDate(e.occurred_at)}</td><td>{e.account}</td><td>{e.memo}</td><td className="text-sm">{e.by ?? 'System'}</td>
            <td className="text-right tnum text-green">{e.direction === 'in' ? fmtMoney(e.amount) : ''}</td><td className="text-right tnum">{e.direction === 'out' ? fmtMoney(e.amount) : ''}</td></tr>)}</tbody></table></div>
      )}

      {tab === 'refunds' && (
        <div className="grid xl:grid-cols-2 gap-6">
          <section className="panel grid gap-4 content-start"><h2 className="heading text-lg">Refunds</h2>
            <p className="text-sm text-ink-2">A refund is requested here, approved by someone with a refund mandate, then paid out by a different person. The cash book records it only after the payout.</p>
            {can(session, 'finance.verify') && d.refundable.length > 0 && (
              <ActionForm action={requestRefund} resetOnSuccess className="grid gap-3 rounded-2xl bg-lime-50 border border-line p-3.5">
                <div className="field"><label htmlFor="rf-p">Payment to refund</label><select id="rf-p" name="payment_id" className="select">{d.refundable.map((p: any) => <option key={p.id} value={p.id}>{p.invoice_no} · {fmtMoney(p.amount)} · {p.claimer_email ?? p.description}</option>)}</select></div>
                <div className="field"><label htmlFor="rf-r">Reason</label><input id="rf-r" name="reason" className="input" placeholder="Event cancelled, paid twice…" required /></div>
                <SubmitButton className="btn btn-secondary btn-sm justify-self-start">Send for approval</SubmitButton>
              </ActionForm>
            )}
            {d.refunds.length ? d.refunds.map((r: any) => (
              <div key={r.id} className="grid gap-2 py-3 border-t border-line text-sm">
                <div className="flex flex-wrap justify-between gap-3"><span><b className="font-mono text-xs">{r.invoice_no}</b> · {r.reason}<span className="text-muted"> · asked by {r.requester ?? 'system'}</span></span><span className="flex gap-2 items-center"><b className="tnum">{fmtMoney(r.amount)}</b><Status value={r.status} /></span></div>
                {r.status === 'approved' && can(session, 'finance.disburse.execute') && (
                  <ActionForm action={completeRefund} className="flex flex-wrap gap-2 items-end"><input type="hidden" name="refund_id" value={r.id} />
                    <div className="field flex-1 min-w-40"><label htmlFor={`rt-${r.id}`}>bKash TrxID or receipt number of the refund</label><input id={`rt-${r.id}`} name="trx" className="input font-mono" required /></div>
                    <SubmitButton className="btn btn-primary btn-sm">Mark as paid back</SubmitButton></ActionForm>
                )}
                {r.status === 'completed' && <span className="text-xs text-muted">Paid back · ref <b className="font-mono">{r.provider_trx_id}</b></span>}
              </div>))
              : <p className="text-sm text-muted">No refunds yet.</p>}</section>
          <section className="panel grid gap-3 content-start"><h2 className="heading text-lg">Teacher dues</h2>
            <p className="text-sm text-ink-2">{d.dues?.open ?? 0} open · {d.dues?.paid ?? 0} paid. Invoices are generated automatically on the 1st of each month.</p>
            {can(session, 'finance.verify') && <ActionForm action={generateDues} className="flex gap-2 items-end"><div className="field"><label htmlFor="dp">Month</label><input id="dp" name="period" type="date" className="input" /></div><SubmitButton className="btn btn-secondary">Generate now</SubmitButton></ActionForm>}
          </section>
        </div>
      )}
    </>
  );
}
