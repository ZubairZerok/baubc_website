import 'server-only';
import { env } from './env';
import type { Tx } from './db';

type Mail = { to: string; subject: string; text: string; template: string };

function html(text: string) {
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const linked = esc.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" style="color:#155234">$1</a>');
  return `<!doctype html><html><body style="margin:0;background:#F6F5EE;font-family:Arial,Helvetica,sans-serif;color:#151913">
  <div style="max-width:560px;margin:0 auto;padding:28px 20px">
  <div style="font-weight:700;font-size:15px;letter-spacing:.04em;color:#0F3A27">BAUBC</div>
  <div style="margin-top:18px;background:#fff;border:1px solid #e3e1d6;border-radius:12px;padding:22px;font-size:15px;line-height:1.6;white-space:pre-line">${linked}</div>
  <p style="font-size:12px;color:#6B6A5C;margin-top:16px">Bangladesh Agricultural University Business Club · Mymensingh · businessclub@bau.edu.bd</p>
  </div></body></html>`;
}

/** Sends through Resend when configured; always records the message in app.email_log (preview: logged only). */
export async function sendMail(tx: Tx, mail: Mail) {
  let status: 'sent' | 'logged' | 'failed' = 'logged';
  let providerId: string | null = null;
  let error: string | null = null;
  if (env.resendKey) {
    try {
      const { Resend } = await import('resend');
      const r = await new Resend(env.resendKey).emails.send({ from: env.emailFrom, to: mail.to, subject: mail.subject, text: mail.text, html: html(mail.text) });
      if (r.error) throw new Error(r.error.message);
      status = 'sent'; providerId = r.data?.id ?? null;
    } catch (e) { status = 'failed'; error = e instanceof Error ? e.message : String(e); }
  }
  await tx.query(`insert into app.email_log(to_email, subject, template, body_text, status, provider_id, error) values ($1,$2,$3,$4,$5,$6,$7)`,
    [mail.to, mail.subject, mail.template, mail.text, status, providerId, error]);
  if (status === 'failed') throw new Error(`Email failed: ${error}`);
}

export const activationMail = (to: string, name: string, link: string, reason: 'application' | 'invite'): Mail => ({
  to, template: 'activation',
  subject: reason === 'application' ? 'Activate your BAUBC account' : 'You are invited to BAUBC',
  text: `Hello ${name},\n\n${reason === 'application'
    ? 'Thank you for applying to Bangladesh Agricultural University Business Club. We created an account so you can follow your application.'
    : 'An administrator invited you to the BAUBC platform.'}\n\nSet your own password here (the link works once and expires in 72 hours):\n${link}\n\nWe never ask for your password by email or form.\n\nBAUBC`,
});
