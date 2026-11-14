import 'server-only';
import { asSystem, type Tx } from './db';
import { env } from './env';
import { sendMail } from './email';
import { fmtDateTime, fmtMoney } from '@/lib/format';

async function regDetails(tx: Tx, id: string) {
  return tx.one(`select r.*, e.title event_title, e.slug, e.starts_at, e.date_label, e.venue, t.name ticket_name, t.price,
                   i.id invoice_id, i.invoice_no, i.amount::text amount, s.expires_at
                 from app.registrations r join app.events e on e.id = r.event_id join app.ticket_types t on t.id = r.ticket_type_id
                 left join app.invoices i on i.registration_id = r.id left join app.seat_holds s on s.registration_id = r.id and s.released_at is null
                 where r.id = $1`, [id]);
}

async function handle(tx: Tx, topic: string, p: any) {
  const site = env.siteUrl;
  switch (topic) {
    case 'email.ticket': {
      const r = await regDetails(tx, p.registration_id);
      if (!r || r.status !== 'confirmed') return;
      return sendMail(tx, { to: r.email, template: 'ticket', subject: `Your ticket: ${r.event_title}`,
        text: `Hello ${r.name},\n\nYour seat for ${r.event_title} is confirmed.\n\nTicket: ${r.ticket_name}${r.team_name ? `\nTeam: ${r.team_name}` : ''}\nWhen: ${r.starts_at ? fmtDateTime(r.starts_at) : r.date_label ?? 'To be announced'}\nWhere: ${r.venue ?? 'To be announced'}\n\nShow this QR ticket at the door:\n${site}/tickets/${r.manage_token}\n\nBAUBC` });
    }
    case 'email.payment_instructions': {
      const r = await regDetails(tx, p.registration_id);
      if (!r || r.status !== 'pending_payment') return;
      return sendMail(tx, { to: r.email, template: 'payment_instructions', subject: `Complete your payment: ${r.event_title}`,
        text: `Hello ${r.name},\n\nWe are holding your seat for ${r.event_title} until ${fmtDateTime(r.expires_at)}.\n\nAmount: ${fmtMoney(r.amount)} (invoice ${r.invoice_no})\n\nPay with bKash Send Money and then submit your Transaction ID here:\n${site}/tickets/${r.manage_token}\n\nBAUBC` });
    }
    case 'email.waitlist_offer': {
      const r = await regDetails(tx, p.registration_id);
      if (!r) return;
      return sendMail(tx, { to: r.email, template: 'waitlist_offer', subject: `A seat opened up: ${r.event_title}`,
        text: `Hello ${r.name},\n\nA seat for ${r.event_title} opened up and we are holding it for you for 12 hours.\n\n${r.status === 'confirmed' ? 'Your seat is confirmed.' : 'Complete payment to keep it.'}\n${site}/tickets/${r.manage_token}\n\nBAUBC` });
    }
    case 'email.payment_rejected': {
      const r = await tx.one(`select reg.name, reg.email, reg.manage_token, e.title from app.payments pay join app.invoices i on i.id = pay.invoice_id
                              left join app.registrations reg on reg.id = i.registration_id left join app.events e on e.id = reg.event_id where pay.id = $1`, [p.payment_id]);
      if (!r?.email) return;
      return sendMail(tx, { to: r.email, template: 'payment_rejected', subject: `We could not verify your payment`,
        text: `Hello ${r.name},\n\nWe could not match your bKash transaction for ${r.title}.\nReason: ${p.reason}\n\nYour seat is held for 2 more hours. Please check the Transaction ID and submit it again:\n${site}/tickets/${r.manage_token}\n\nBAUBC` });
    }
    case 'email.membership_status':
      return sendMail(tx, { to: p.to, template: 'membership_status', subject: `Your BAUBC application: ${p.status}`,
        text: `Hello ${p.name},\n\nYour application status is now: ${p.status}.${p.reason ? `\n\n${p.reason}` : ''}${p.member_no ? `\n\nWelcome to BAUBC! Your member number is ${p.member_no}.` : ''}\n\nSign in to see details: ${site}/app\n\nBAUBC` });
    case 'email.info_request':
      return sendMail(tx, { to: p.to, template: 'info_request', subject: 'BAUBC needs a little more information',
        text: `Hello ${p.name},\n\n${p.message}\n\nPlease respond in your dashboard${p.due ? ` by ${fmtDateTime(p.due)}` : ''}: ${site}/app/application\n\nBAUBC` });
    case 'email.contact_ack': {
      const c = await tx.one(`select name, email, category from app.contact_inquiries where id = $1`, [p.inquiry_id]);
      if (!c) return;
      return sendMail(tx, { to: c.email, template: 'contact_ack', subject: 'We received your message',
        text: `Hello ${c.name},\n\nThank you for contacting BAUBC about ${c.category}. A member of the team will reply from businessclub@bau.edu.bd.\n\nBAUBC` });
    }
    default:
      return; // unknown topics are acknowledged
  }
}

/** Processes the transactional outbox. Idempotent per message; retries with backoff; dead-letters after 8 attempts. */
export async function runJobs(limit = 25) {
  await asSystem((tx) => tx.query(`select app.expire_holds(null)`));
  const jobs = await asSystem((tx) => tx.query(`
    update ops.outbox set locked_until = now() + interval '2 minutes', attempts = attempts + 1
    where id in (select id from ops.outbox where done_at is null and not dead and available_at <= now()
                 and (locked_until is null or locked_until < now()) order by id limit $1 for update skip locked)
    returning id::text, topic, payload, attempts`, [limit]));
  let ok = 0, failed = 0;
  for (const j of jobs) {
    try {
      await asSystem(async (tx) => {
        await handle(tx, j.topic, j.payload);
        await tx.query(`update ops.outbox set done_at = now(), last_error = null where id = $1`, [j.id]);
      });
      ok++;
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      await asSystem((tx) => tx.query(`update ops.outbox set last_error = $2, dead = attempts >= 8,
        available_at = now() + make_interval(secs => least(3600, power(2, attempts) * 15)::int) where id = $1`, [j.id, msg]));
    }
  }
  return { processed: jobs.length, ok, failed };
}

/** Fire-and-forget nudge after a user action so emails go out quickly; the cron is the safety net. */
export function kickJobs() {
  runJobs(10).catch((e) => console.error('[jobs]', e));
}
