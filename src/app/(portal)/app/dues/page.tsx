import { PageTitle } from '@/components/portal/Shell';
import { Status } from '@/components/ui/Status';
import { Empty } from '@/components/ui/Empty';
import { ActionForm, SubmitButton } from '@/components/ui/forms';
import { payDues } from '@/app/actions/portal';
import { withClaims } from '@/server/db';
import { getSettings } from '@/server/queries/public';
import { requireSession } from '@/server/session';
import { fmtDate, fmtMoney } from '@/lib/format';

export default async function DuesPage() {
  const session = await requireSession('/app/dues');
  const [{ payments }, d] = await Promise.all([getSettings(), withClaims(session.claims, async (tx) => ({
    invoices: await tx.query(`select i.id, i.invoice_no, i.description, i.amount::text amount, i.status, i.period, i.due_at,
        (select p.status from app.payments p where p.invoice_id = i.id order by p.created_at desc limit 1) pay_status
      from app.invoices i where i.payer_person_id = authz.current_person_id() and i.purpose = 'dues' order by i.period desc`),
  }))]);
  return (
    <>
      <PageTitle label="Advisor contribution" title="Monthly dues">Your monthly contribution supports student events and operations. Pay with bKash Send Money and submit the Transaction ID; a finance volunteer verifies it. Receipts appear here.</PageTitle>
      {d.invoices.length ? (
        <div className="grid gap-4">
          {d.invoices.map((i: any) => (
            <article key={i.id} className="panel grid gap-4">
              <div className="flex flex-wrap justify-between gap-3 items-center">
                <div className="grid"><b>{i.description}</b><span className="text-xs text-muted font-mono">{i.invoice_no} · due {fmtDate(i.due_at)}</span></div>
                <span className="flex items-center gap-3"><span className="heading text-xl tnum">{fmtMoney(i.amount)}</span><Status value={i.pay_status === 'pending_verification' || i.pay_status === 'pending_second_verification' ? i.pay_status : i.status} /></span>
              </div>
              {i.status === 'open' && !['pending_verification', 'pending_second_verification'].includes(i.pay_status) && (
                <ActionForm action={payDues} className="grid gap-3 border-t border-line pt-4">
                  <p className="text-sm text-ink-2">Send {fmtMoney(i.amount)} to <b className="font-mono">{payments.bkash_number || 'the club bKash number'}</b> with reference <b className="font-mono">{i.invoice_no.replace('INV-', '')}</b>.</p>
                  <input type="hidden" name="invoice_id" value={i.id} /><input type="hidden" name="amount" value={i.amount} />
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="field"><label htmlFor={`t-${i.id}`}>TrxID</label><input id={`t-${i.id}`} name="trx" className="input font-mono uppercase" required minLength={8} maxLength={12} /></div>
                    <div className="field"><label htmlFor={`l-${i.id}`}>Last 4 digits of your bKash number</label><input id={`l-${i.id}`} name="last4" className="input font-mono" required pattern="\d{4}" maxLength={4} inputMode="numeric" /></div>
                    <div className="field"><label htmlFor={`d-${i.id}`}>Sent at</label><input id={`d-${i.id}`} name="paid_at" type="datetime-local" className="input" /></div>
                  </div>
                  <SubmitButton className="btn btn-dark w-max">Submit payment</SubmitButton>
                </ActionForm>
              )}
            </article>
          ))}
        </div>
      ) : <Empty title="No dues invoices">Invoices are created on the 1st of each month.</Empty>}
    </>
  );
}
