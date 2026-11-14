import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asSystem } from '@/server/db';
import { getSettings } from '@/server/queries/public';
import { QR } from '@/components/ui/QR';
import { Status } from '@/components/ui/Status';
import { ActionForm, SubmitButton } from '@/components/ui/forms';
import { CopyButton } from '@/components/site/client';
import { claimPaymentAction, cancelRegistrationAction } from '@/app/actions/public';
import { fmtDateTime, fmtMoney } from '@/lib/format';
import { eventWhen } from '@/components/site/bits';

export const metadata: Metadata = { title: 'Your ticket', robots: { index: false } };

export default async function TicketPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ new?: string }> }) {
  const { token } = await params; const { new: isNew } = await searchParams;
  if (!/^[a-f0-9]{20,64}$/.test(token)) notFound();
  // The manage token is the bearer credential for this page (like a boarding-pass link); look it up as the system, show only this registration.
  const r = await asSystem((tx) => tx.one(`
    select r.id, r.name, r.email, r.status, r.ticket_code, r.manage_token, r.team_name, r.team_members, r.units, r.created_at,
      e.title, e.slug, e.starts_at, e.date_label, e.venue, t.name ticket_name, t.price::text price,
      i.id invoice_id, i.invoice_no, i.amount::text amount, i.status invoice_status, s.expires_at hold_until,
      (select jsonb_build_object('status', p.status, 'trx', p.provider_trx_id, 'reason', p.rejection_reason, 'at', p.created_at)
         from app.payments p where p.invoice_id = i.id order by p.created_at desc limit 1) payment
    from app.registrations r join app.events e on e.id = r.event_id join app.ticket_types t on t.id = r.ticket_type_id
    left join app.invoices i on i.registration_id = r.id left join app.seat_holds s on s.registration_id = r.id and s.released_at is null
    where r.manage_token = $1`, [token]));
  if (!r) notFound();
  const { payments } = await getSettings();
  const confirmed = r.status === 'confirmed';
  const awaitingPay = r.status === 'pending_payment';
  return (
    <div className="wrap py-12 md:py-16 grid gap-8 max-w-4xl">
      {isNew && <div className="panel border-link bg-paper-2"><b>{confirmed ? 'You are registered.' : 'Your seat is on hold.'}</b> {confirmed ? 'Your ticket is below and in your email.' : 'Complete the payment steps below to confirm it.'} Bookmark this page: it is your private link to manage your registration.</div>}
      <div className="grid gap-2">
        <Link href={`/events/${r.slug}`} className="label text-muted hover:text-link w-max">← {r.title}</Link>
        <h1 className="display-md text-[clamp(2rem,1.4rem+3vw,3.4rem)]">{confirmed ? 'Your ticket' : 'Your registration'}</h1>
        <div className="flex flex-wrap items-center gap-2"><Status value={r.status} />{r.invoice_no && <span className="tag"><i>INV</i>{r.invoice_no}</span>}</div>
      </div>

      <div className="grid md:grid-cols-[auto_1fr] gap-8 items-start">
        {confirmed ? (
          <div className="grid gap-3 justify-items-center panel">
            <QR value={r.ticket_code} />
            <span className="font-mono text-sm tracking-widest">{r.ticket_code.match(/.{1,4}/g)?.join(' ')}</span>
            <span className="hint">Show this at the door. It works once per session.</span>
          </div>
        ) : (
          <div className="panel grid place-items-center text-center gap-2 w-full md:w-[260px] min-h-[240px]">
            <span className="label text-muted">QR ticket</span>
            <p className="text-sm text-muted">Appears here once {awaitingPay ? 'your payment is verified' : r.status === 'pending_verification' ? 'finance verifies your payment' : 'your registration is confirmed'}.</p>
          </div>
        )}
        <dl className="grid gap-0">
          {[['Name', r.name], ['Event', r.title], ['Ticket', r.ticket_name], ...(r.team_name ? [['Team', r.team_name]] : []), ['When', eventWhen(r as any)], ['Where', r.venue ?? 'To be announced'], ['Email', r.email]].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-6 py-3 border-b border-line"><dt className="text-muted">{k}</dt><dd className="font-semibold text-right">{v}</dd></div>
          ))}
        </dl>
      </div>

      {awaitingPay && r.invoice_id && (
        <section className="panel grid gap-5" aria-labelledby="pay-h">
          <div className="grid gap-1">
            <h2 id="pay-h" className="heading text-2xl">Pay {fmtMoney(r.amount)} with bKash</h2>
            {r.hold_until && <p className="text-sm text-harvest-text font-semibold">Seat held until {fmtDateTime(r.hold_until)}</p>}
            {r.payment?.status === 'rejected' && <p className="text-soil text-sm">Your previous Transaction ID could not be verified: {r.payment.reason}</p>}
          </div>
          <ol className="grid gap-3 sm:grid-cols-3 text-sm">
            <li className="rounded-xl bg-paper-2 p-4 grid gap-1"><span className="label text-green">Step 1</span>Open the bKash app and choose <b>Send Money</b>.</li>
            <li className="rounded-xl bg-paper-2 p-4 grid gap-1"><span className="label text-green">Step 2</span>
              <span>Send <b className="tnum">{fmtMoney(r.amount)}</b> to <b className="font-mono">{payments.bkash_number || 'the club number (ask the organisers)'}</b> ({payments.bkash_account_type ?? 'Personal'}).</span>
              {payments.bkash_number && <CopyButton value={String(payments.bkash_number).replace(/[^0-9]/g, '')} label="Copy number" />}</li>
            <li className="rounded-xl bg-paper-2 p-4 grid gap-1"><span className="label text-green">Step 3</span>Write <b className="font-mono">{r.invoice_no.replace('INV-', '')}</b> in the Reference field, then submit the TrxID below.</li>
          </ol>
          <ActionForm action={claimPaymentAction} className="grid gap-4">
            <input type="hidden" name="invoice_id" value={r.invoice_id} />
            <input type="hidden" name="token" value={r.manage_token} />
            <input type="hidden" name="amount" value={r.amount} />
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="field"><label htmlFor="trx">Transaction ID (TrxID)</label><input id="trx" name="trx" className="input font-mono uppercase" required minLength={8} maxLength={12} placeholder="e.g. 9KX4T7QZ2M" autoComplete="off" /></div>
              <div className="field"><label htmlFor="last4">Last 4 digits of your bKash number</label><input id="last4" name="last4" className="input font-mono" required inputMode="numeric" pattern="\d{4}" maxLength={4} /></div>
              <div className="field"><label htmlFor="paid_at">When did you send it?</label><input id="paid_at" name="paid_at" type="datetime-local" className="input" /></div>
            </div>
            <p className="hint">Never share your bKash PIN or OTP with anyone, including BAUBC. We only need the Transaction ID from the confirmation SMS.</p>
            <SubmitButton pendingText="Submitting…">Submit for verification</SubmitButton>
          </ActionForm>
        </section>
      )}

      {r.status === 'pending_verification' && (
        <section className="panel grid gap-2 bg-paper-2">
          <h2 className="heading text-xl">Payment submitted</h2>
          <p className="text-ink-2">TrxID <b className="font-mono">{r.payment?.trx}</b> is waiting for verification by the finance team. Your seat stays held{r.hold_until ? ` until ${fmtDateTime(r.hold_until)}` : ''}. You will get an email with your ticket once it is verified.</p>
        </section>
      )}

      {['pending_payment', 'pending_verification', 'confirmed'].includes(r.status) && (
        <details className="panel">
          <summary className="cursor-pointer font-semibold">Cancel this registration</summary>
          <ActionForm action={cancelRegistrationAction} className="grid gap-3 mt-4">
            <input type="hidden" name="registration_id" value={r.id} />
            <input type="hidden" name="token" value={r.manage_token} />
            <div className="field"><label htmlFor="reason">Reason (optional)</label><input id="reason" name="reason" className="input" /></div>
            <p className="hint">Your seat goes to the next person on the waitlist. If you already paid, a refund request is created for the finance team.</p>
            <SubmitButton className="btn btn-danger">Cancel registration</SubmitButton>
          </ActionForm>
        </details>
      )}
    </div>
  );
}
