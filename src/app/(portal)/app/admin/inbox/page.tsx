import { PageTitle } from '@/components/portal/Shell';
import { Status } from '@/components/ui/Status';
import { Empty } from '@/components/ui/Empty';
import { ActionForm, SubmitButton } from '@/components/ui/forms';
import { handlePrivacyRequest, reviewInbound, updateInquiry } from '@/app/actions/portal';
import { withClaims } from '@/server/db';
import { can, requireSession } from '@/server/session';
import { fmtDate, relTime } from '@/lib/format';

export default async function InboxPage() {
  const session = await requireSession('/app/admin/inbox');
  const d = await withClaims(session.claims, async (tx) => ({
    contact: await tx.query(`select * from app.contact_inquiries order by (status = 'new') desc, created_at desc limit 50`),
    privacy: can(session, 'privacy.handle') ? await tx.query(`select r.id, r.kind, r.details, r.status, r.email, r.created_at, r.due_at, app.person_label(r.person_id) who from app.privacy_requests r order by (r.status in ('received','in_progress')) desc, r.created_at desc limit 30`) : [],
    mail: await tx.query(`select * from app.inbound_messages order by (status = 'new') desc, received_at desc limit 50`),
  }));
  return (
    <>
      <PageTitle label="Communications" title="Inbox">Website messages and the labelled subset of the club Gmail. Nothing from email becomes an official record until someone here accepts it.</PageTitle>
      {d.privacy.length > 0 && (
        <section className="panel mb-6 grid gap-2">
          <h2 className="heading text-lg">Privacy requests</h2>
          <p className="text-sm text-ink-2">Answer each one within 30 days. Deleting data is done by a Super Admin after HR confirms nothing must be kept for the accounts.</p>
          {d.privacy.map((r: any) => (
            <ActionForm key={r.id} action={handlePrivacyRequest} className="flex flex-wrap items-center justify-between gap-3 py-2.5 border-t border-line text-sm">
              <input type="hidden" name="id" value={r.id} />
              <span className="grid"><b>{r.kind.replace(/_/g, ' ')} · {r.who ?? r.email}</b><span className="text-muted">{r.details ?? 'No details given'} · due {fmtDate(r.due_at)}</span></span>
              <span className="flex items-center gap-2"><Status value={r.status} />
                {['received', 'in_progress'].includes(r.status) && <><SubmitButton name="status" value="in_progress" className="btn btn-ghost btn-sm">Working on it</SubmitButton><SubmitButton name="status" value="fulfilled" className="btn btn-secondary btn-sm">Done</SubmitButton><SubmitButton name="status" value="rejected" className="btn btn-ghost btn-sm">Cannot do</SubmitButton></>}</span>
            </ActionForm>
          ))}
        </section>
      )}
      <div className="grid xl:grid-cols-2 gap-6 items-start">
        <section className="grid gap-3">
          <h2 className="heading text-lg">Website contact form</h2>
          {d.contact.length ? d.contact.map((c: any) => (
            <ActionForm key={c.id} action={updateInquiry} className="panel grid gap-2">
              <input type="hidden" name="id" value={c.id} />
              <div className="flex justify-between gap-3"><span className="label text-muted">{c.category} · {relTime(c.created_at)}</span><Status value={c.status} /></div>
              <b>{c.name}{c.organization ? ` · ${c.organization}` : ''}</b><span className="font-mono text-sm">{c.email}</span>
              <p className="text-ink-2 whitespace-pre-line text-sm">{c.message}</p>
              <div className="flex gap-2"><SubmitButton name="status" value="in_progress" className="btn btn-secondary btn-sm">Working on it</SubmitButton><SubmitButton name="status" value="closed" className="btn btn-secondary btn-sm">Done</SubmitButton><SubmitButton name="status" value="spam" className="btn btn-ghost btn-sm">Spam</SubmitButton></div>
            </ActionForm>
          )) : <Empty title="No messages">Contact-form messages appear here.</Empty>}
        </section>
        <section className="grid gap-3">
          <h2 className="heading text-lg">Club Gmail (labelled)</h2>
          {d.mail.length ? d.mail.map((m: any) => (
            <ActionForm key={m.id} action={reviewInbound} className="panel grid gap-2">
              <input type="hidden" name="id" value={m.id} />
              <div className="flex justify-between gap-3"><span className="label text-muted">{m.category} · {relTime(m.received_at)}</span><Status value={m.status} /></div>
              <b>{m.subject}</b><span className="text-sm">{m.from_name} <span className="font-mono text-muted">&lt;{m.from_email}&gt;</span></span>
              {m.snippet && <p className="text-sm text-ink-2">{m.snippet}</p>}
              <div className="flex flex-wrap gap-2 items-center"><input name="note" className="input min-h-9 text-sm flex-1" placeholder="Note (e.g. linked to Summit sponsorship)" /><input type="hidden" name="category" value="" />
                <SubmitButton name="status" value="accepted" className="btn btn-primary btn-sm">Accept</SubmitButton><SubmitButton name="status" value="ignored" className="btn btn-ghost btn-sm">Ignore</SubmitButton></div>
            </ActionForm>
          )) : <Empty title="No synced email">Apply a BAUBC/Sync/… label in Gmail and the Apps Script sends it here within 10 minutes.</Empty>}
        </section>
      </div>
    </>
  );
}
