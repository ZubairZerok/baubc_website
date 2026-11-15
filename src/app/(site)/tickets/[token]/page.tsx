import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asSystem } from '@/server/db';
import { getSettings } from '@/server/queries/public';
import { QR } from '@/components/ui/QR';
import { Status } from '@/components/ui/Status';
import { ActionForm, SubmitButton } from '@/components/ui/forms';
import { CopyButton } from '@/components/site/client';
import { Mark } from '@/components/brand/Mark';
import { claimPaymentAction, cancelRegistrationAction } from '@/app/actions/public';
import { fmtDateTime, fmtMoney } from '@/lib/format';
import { eventWhen } from '@/components/site/bits';

export const metadata: Metadata = { title: 'Your ticket', robots: { index: false } };

export default async function TicketPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ new?: string }> }) {
  const { token } = await params; const { new: isNew } = await searchParams;
  if (!/^[a-f0-9]{20,64}$/.test(token)) notFound();
  // The manage token is the bearer credential for this page (like a boarding-pass link): look it up as the system, show only this registration.
  const r = await asSystem((tx) => tx.one(`
    select r.id, r.name, r.email, r.status, r.ticket_code, r.manage_token, r.team_name, r.units, r.created_at,
      e.title, e.slug, e.starts_at, e.date_label, e.venue, t.name ticket_name, t.price::text price,
      i.id invoice_id, i.invoice_no, i.amount::text amount, i.status invoice_status, s.expires_at hold_until,
      (select jsonb_build_object('status', p.status, 'trx', p.provider_trx_id, 'reason', p.rejection_reason, 'method', p.method)
         from app.payments p where p.invoice_id = i.id order by p.created_at desc limit 1) payment
    from app.registrations r join app.events e on e.id = r.event_id join app.ticket_types t on t.id = r.ticket_type_id
    left join app.invoices i on i.registration_id = r.id left join app.seat_holds s on s.registration_id = r.id and s.released_at is null
    where r.manage_token = $1`, [token]));
  if (!r) notFound();
  const { payments } = await getSettings();
  const confirmed = r.status === 'confirmed';
  const awaitingPay = r.status === 'pending_payment';
  const rows: [string, string][] = [['Name', r.name], ['Ticket', r.ticket_name], ...(r.team_name ? [['Team', r.team_name] as [string, string]] : []), ['When', eventWhen(r as any)], ['Where', r.venue ?? 'To be announced']];
  return (
    <section className="relative isolate overflow-hidden lime-wash min-h-[80vh]">
      <div className="absolute inset-0 -z-10 pat-diamonds opacity-60" aria-hidden="true" />
      <div className="wrap pt-32 md:pt-40 pb-16 grid gap-8 max-w-4xl">
        {isNew && <div className="glass-strong rounded-2xl px-5 py-4 fade-up"><b>{confirmed ? 'You are in.' : 'Your seat is on hold.'}</b> {confirmed ? 'Your ticket is below and in your email.' : 'Finish the payment steps below to confirm it.'} Bookmark this page: it is your private link to this registration.</div>}
        <div className="grid gap-3">
          <Link href={`/events/${r.slug}`} className="tag w-max hover:bg-white">← {r.title}</Link>
          <h1 className="display text-[clamp(2.6rem,1.6rem+4vw,4.6rem)]">{confirmed ? <>Your <em className="serif-i text-brand">ticket.</em></> : <>Your <em className="serif-i text-brand">registration.</em></>}</h1>
        </div>

        {/* boarding pass */}
        <div className="relative grid md:grid-cols-[1fr_auto] rounded-[28px] overflow-hidden shadow-[var(--shadow)] bg-white">
          <div className="relative p-6 md:p-8 grid gap-5 isolate overflow-hidden">
            <Mark size="26rem" className="pointer-events-none absolute -right-24 -bottom-28 -z-10 text-brand/[.06]" />
            <div className="flex flex-wrap items-center gap-2"><Status value={r.status} />{r.invoice_no && <span className="tag !bg-paper"><i>INV</i>{r.invoice_no.replace('INV-', '')}</span>}</div>
            <p className="display-md text-[clamp(1.6rem,1.2rem+1.6vw,2.4rem)] max-w-[18ch]">{r.title}</p>
            <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
              {rows.map(([k, v]) => <div key={k} className="grid gap-0.5"><dt className="label text-muted">{k}</dt><dd className="font-semibold">{v}</dd></div>)}
            </dl>
            <p className="text-xs text-muted">{r.email}</p>
          </div>
          <div className="relative canopy on-canopy p-6 md:p-8 grid place-items-center gap-3 md:w-[300px] border-t-2 md:border-t-0 md:border-l-2 border-dashed border-white/40">
            <span className="absolute -top-3 left-1/2 md:left-[-12px] md:top-[-12px] size-6 rounded-full bg-[#eef8c8]" aria-hidden="true" />
            <span className="absolute -bottom-3 left-1/2 md:left-[-12px] md:bottom-[-12px] size-6 rounded-full bg-[#f3f8e2]" aria-hidden="true" />
            {confirmed ? (
              <>
                <QR value={r.ticket_code} size={208} />
                <span className="font-mono text-sm tracking-[.25em] text-lime-200">{r.ticket_code.match(/.{1,4}/g)?.join(' ')}</span>
                <span className="text-xs text-canopy-muted text-center">Show this at the door. It works once.</span>
              </>
            ) : (
              <div className="grid place-items-center text-center gap-3 py-8">
                <Mark size={84} className="text-lime-200/80" />
                <p className="text-sm text-canopy-muted max-w-[22ch]">Your QR ticket appears here once {awaitingPay ? 'your payment is verified' : r.status === 'pending_verification' ? 'finance verifies your payment' : 'your registration is confirmed'}.</p>
              </div>
            )}
          </div>
        </div>

        {awaitingPay && r.invoice_id && (
          <section className="panel grid gap-6" aria-labelledby="pay-h">
            <div className="grid gap-1">
              <h2 id="pay-h" className="display-md text-3xl">Pay {fmtMoney(r.amount)} with bKash</h2>
              {r.hold_until && <p className="text-sm text-harvest-text font-semibold">We are holding your seat until {fmtDateTime(r.hold_until)}.</p>}
              {r.payment?.status === 'rejected' && <p className="text-soil text-sm font-medium">We could not match your last Transaction ID: {r.payment.reason}</p>}
            </div>
            <ol className="grid gap-3 sm:grid-cols-3 text-sm">
              {[
                <>Open the bKash app and choose <b>Send Money</b>.</>,
                <>Send <b className="tnum">{fmtMoney(r.amount)}</b> to <b className="font-mono">{payments.bkash_number || 'the club number (ask the organisers)'}</b> ({payments.bkash_account_type ?? 'Personal'}).{payments.bkash_number && <span className="block mt-2"><CopyButton value={String(payments.bkash_number).replace(/[^0-9]/g, '')} label="Copy number" /></span>}</>,
                <>Write <b className="font-mono">{r.invoice_no.replace('INV-', '')}</b> in the Reference field, then enter the TrxID below.</>,
              ].map((c, i) => (
                <li key={i} className="rounded-2xl bg-lime-50 border border-lime-200 p-4 grid gap-2 content-start"><span className="grid size-8 place-items-center bg-brand text-lime-200 font-bold diamond-clip text-xs">{i + 1}</span><span>{c}</span></li>
              ))}
            </ol>
            <ActionForm action={claimPaymentAction} className="grid gap-4">
              <input type="hidden" name="invoice_id" value={r.invoice_id} /><input type="hidden" name="token" value={r.manage_token} /><input type="hidden" name="amount" value={r.amount} />
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="field"><label htmlFor="trx">Transaction ID (TrxID)</label><input id="trx" name="trx" className="input font-mono uppercase" required minLength={8} maxLength={12} placeholder="e.g. 9KX4T7QZ2M" autoComplete="off" /></div>
                <div className="field"><label htmlFor="last4">Last 4 digits of your bKash number</label><input id="last4" name="last4" className="input font-mono" required inputMode="numeric" pattern="\d{4}" maxLength={4} /></div>
                <div className="field"><label htmlFor="paid_at">When did you send it?</label><input id="paid_at" name="paid_at" type="datetime-local" className="input" /></div>
              </div>
              <p className="hint">Never share your bKash PIN or OTP with anyone, including BAUBC. We only need the Transaction ID from the confirmation SMS.</p>
              <SubmitButton className="btn btn-primary btn-lg w-max" pendingText="Submitting…">Submit for verification</SubmitButton>
            </ActionForm>
          </section>
        )}

        {r.status === 'pending_verification' && (
          <section className="panel grid gap-2">
            <h2 className="display-md text-2xl">Payment submitted</h2>
            <p className="text-ink-2">{r.payment?.trx ? <>TrxID <b className="font-mono">{r.payment.trx}</b> is</> : <>Your {r.payment?.method === 'cash' ? 'cash payment' : 'payment'} is</>} waiting for the finance team to verify it. Your seat stays held{r.hold_until ? ` until ${fmtDateTime(r.hold_until)}` : ''}, and your ticket arrives by email as soon as it is verified.</p>
          </section>
        )}

        {['pending_payment', 'pending_verification', 'confirmed'].includes(r.status) && (
          <details className="panel">
            <summary className="cursor-pointer font-semibold">Cancel this registration</summary>
            <ActionForm action={cancelRegistrationAction} className="grid gap-3 mt-4">
              <input type="hidden" name="registration_id" value={r.id} /><input type="hidden" name="token" value={r.manage_token} />
              <div className="field"><label htmlFor="reason">Reason (optional)</label><input id="reason" name="reason" className="input" /></div>
              <p className="hint">Your seat goes to the next person on the waitlist. If you already paid, a refund request is created for the finance team.</p>
              <SubmitButton className="btn btn-danger w-max">Cancel registration</SubmitButton>
            </ActionForm>
          </details>
        )}
      </div>
    </section>
  );
}
