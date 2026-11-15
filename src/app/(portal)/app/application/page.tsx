import { PageTitle } from '@/components/portal/Shell';
import { Status } from '@/components/ui/Status';
import { Empty } from '@/components/ui/Empty';
import { ActionForm, SubmitButton } from '@/components/ui/forms';
import { respondInfo } from '@/app/actions/portal';
import { withClaims } from '@/server/db';
import { requireSession } from '@/server/session';
import { fmtDateTime } from '@/lib/format';

const STAGES = [['submitted', 'Seed', 'Application received'], ['pending_review', 'Sprout', 'Account activated, waiting for review'], ['under_review', 'Sapling', 'HR is reviewing'], ['provisionally_approved', 'Tree', 'Provisionally approved'], ['finalized', 'Harvest', 'Finalised: welcome!']];
const ORDER: Record<string, number> = { submitted: 0, email_verified: 1, pending_review: 1, under_review: 2, info_requested: 2, waitlisted: 2, provisionally_approved: 3, finalized: 4, rejected: 2 };

export default async function ApplicationPage() {
  const session = await requireSession('/app/application');
  const d = await withClaims(session.claims, async (tx) => {
    const app = await tx.one(`select a.*, s.label, c.label cycle, c.closes_at from app.applications a join app.membership_states s on s.key = a.status_key left join app.membership_cycles c on c.id = a.cycle_id
      where a.person_id = authz.current_person_id() order by a.submitted_at desc limit 1`);
    if (!app) return null;
    return {
      app,
      events: await tx.query(`select from_state, to_state, reason, created_at from app.membership_status_events where application_id = $1 order by id`, [app.id]),
      requests: await tx.query(`select * from app.info_requests where application_id = $1 order by created_at desc`, [app.id]),
    };
  });
  if (!d) return <><PageTitle title="My application" /><Empty title="No application yet">Apply through the Join page during recruitment.</Empty></>;
  const stage = ORDER[d.app.status_key] ?? 0;
  return (
    <>
      <PageTitle label={`Recruitment ${d.app.cycle ?? ''}`} title="My application"><Status value={d.app.status_key} label={d.app.label} /></PageTitle>
      <ol className="grid grid-cols-5 gap-1 mb-8" aria-label="Application progress">
        {STAGES.map(([k, name, desc], i) => (
          <li key={k} className="grid gap-2">
            <div className={`h-2 rounded-full ${i <= stage ? (d.app.status_key === 'rejected' && i === stage ? 'bg-soil' : 'bg-brand') : 'bg-lime-50'}`} />
            <span className={`label ${i <= stage ? 'text-ink' : 'text-muted'}`}>{name}</span>
            <span className="text-xs text-muted hidden sm:block">{desc}</span>
          </li>
        ))}
      </ol>
      {d.app.status_key === 'rejected' && <div className="panel mb-6"><b>Thank you for applying.</b> You were not selected in this cycle. Recruitment runs every year and we would be glad to see you apply again.</div>}
      {d.app.status_key === 'waitlisted' && <div className="panel mb-6"><b>You are on the waitlist.</b> If a place opens in this cycle we will let you know.</div>}
      {d.requests.filter((r: any) => !r.responded_at).map((r: any) => (
        <ActionForm key={r.id} action={respondInfo} className="panel mb-6 grid gap-3 border-harvest">
          <input type="hidden" name="request_id" value={r.id} />
          <span className="label text-harvest-text">Information requested{r.due_at ? ` · due ${fmtDateTime(r.due_at)}` : ''}</span>
          <p className="text-lg">{r.message}</p>
          <div className="field"><label htmlFor={`resp-${r.id}`}>Your response</label><textarea id={`resp-${r.id}`} name="response" className="textarea" required /></div>
          <SubmitButton>Send response</SubmitButton>
        </ActionForm>
      ))}
      <section className="panel grid gap-3">
        <h2 className="heading text-lg">History</h2>
        <ol className="grid gap-0">
          {d.events.map((e: any, i: number) => (
            <li key={i} className="grid grid-cols-[auto_1fr] gap-3 py-2.5 border-b border-line last:border-0">
              <span className="mt-1.5 size-2.5 rounded-full bg-brand" aria-hidden="true" />
              <div className="grid"><span className="font-semibold">{e.to_state.replace(/_/g, ' ')}</span>{e.reason && <span className="text-sm text-ink-2">{e.reason}</span>}<span className="text-xs text-muted">{fmtDateTime(e.created_at)}</span></div>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
