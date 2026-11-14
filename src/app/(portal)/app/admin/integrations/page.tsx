import { PageTitle } from '@/components/portal/Shell';
import { Status } from '@/components/ui/Status';
import { ActionForm, SubmitButton } from '@/components/ui/forms';
import { runJobsNow, simulateFormSubmission } from '@/app/actions/portal';
import { withClaims } from '@/server/db';
import { requireSession } from '@/server/session';
import { env, isPreview } from '@/server/env';
import { fmtDateTime, relTime } from '@/lib/format';

export default async function IntegrationsPage() {
  const session = await requireSession('/app/admin/integrations');
  const d = await withClaims(session.claims, async (tx) => ({
    conns: await tx.query(`select * from app.integration_connections order by provider`),
    emails: await tx.query(`select * from app.email_log order by created_at desc limit 40`),
  }));
  const configured: Record<string, boolean> = { google_form: !!env.formSecret, gmail_appsscript: !!env.gmailSecret, resend: !!env.resendKey, meta_page: false, bkash_pgw: false };
  return (
    <>
      <PageTitle label="Admin" title="Integrations & email" actions={session.isSuperAdmin ? <ActionForm action={runJobsNow}><SubmitButton className="btn btn-ghost btn-sm border-line">Run background jobs now</SubmitButton></ActionForm> : undefined}>
        Status of connected services, the webhook endpoints the Apps Scripts call, and every email the platform sent{isPreview ? ' (in preview mode emails are logged here instead of sent)' : ''}.
      </PageTitle>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mb-8">
        {d.conns.map((c: any) => (
          <div key={c.provider} className="panel grid gap-2">
            <div className="flex justify-between gap-2 items-start"><b>{c.label}</b><Status value={c.status} /></div>
            <span className="text-xs text-muted">{c.last_success_at ? `Last success ${relTime(c.last_success_at)}` : 'Never connected'}{configured[c.provider] ? ' · secret configured' : ''}</span>
            {c.provider === 'google_form' && <span className="text-xs font-mono break-all">POST {env.siteUrl}/api/hooks/google-form</span>}
            {c.provider === 'gmail_appsscript' && <span className="text-xs font-mono break-all">POST {env.siteUrl}/api/hooks/gmail</span>}
            {c.provider === 'bkash_pgw' && <span className="text-xs text-muted">Needs a bKash merchant account in the club&apos;s or university&apos;s name (Stage 2).</span>}
            {c.provider === 'meta_page' && <span className="text-xs text-muted">Daily metrics sync; Facebook figures are updated by Meta about once every 24 hours.</span>}
          </div>
        ))}
      </div>
      <ActionForm action={simulateFormSubmission} resetOnSuccess className="panel grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end mb-8">
        <div className="sm:col-span-4"><h2 className="heading text-lg">Test the Google Form pipeline</h2><p className="text-sm text-ink-2">Sends a test application through the same intake function the Apps Script uses: it creates the applicant, the application and an activation email.</p></div>
        <div className="field"><label htmlFor="sf-n">Full name</label><input id="sf-n" name="full_name" className="input" required defaultValue="Test Applicant" /></div>
        <div className="field"><label htmlFor="sf-e">Email</label><input id="sf-e" name="email" type="email" className="input" required placeholder="someone@example.com" /></div>
        <div className="field"><label htmlFor="sf-s">Student ID</label><input id="sf-s" name="student_id" className="input" /></div>
        <SubmitButton className="btn btn-secondary">Send test</SubmitButton>
      </ActionForm>
      <section className="grid gap-3">
        <h2 className="heading text-lg">Email log</h2>
        <div className="grid gap-2">
          {d.emails.map((m: any) => (
            <details key={m.id} className="panel">
              <summary className="cursor-pointer flex flex-wrap justify-between gap-3"><span><b>{m.subject}</b> <span className="text-muted text-sm">→ {m.to_email}</span></span><span className="flex gap-2 items-center text-sm text-muted"><Status value={m.status === 'logged' ? 'pending' : m.status === 'sent' ? 'verified' : 'failed'} label={m.status} />{fmtDateTime(m.created_at)}</span></summary>
              <pre className="mt-3 whitespace-pre-wrap text-sm font-sans text-ink-2">{m.body_text}</pre>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
