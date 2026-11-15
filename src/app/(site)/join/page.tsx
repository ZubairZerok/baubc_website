import type { Metadata } from 'next';
import Link from 'next/link';
import { Arrow } from '@/components/brand/Mark';
import { PageHero } from '@/components/site/bits';
import { ActionForm, SubmitButton } from '@/components/ui/forms';
import { applyAction } from '@/app/actions/public';
import { getRecruitment, getWings } from '@/server/queries/public';
import { fmtDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Join BAUBC', description: 'Annual member recruitment of Bangladesh Agricultural University Business Club.' };

export default async function JoinPage() {
  const [cycle, wings] = await Promise.all([getRecruitment(), getWings()]);
  const open = cycle?.status === 'open';
  const steps = [
    ['Apply', 'Fill in one form. We never ask for a password in it.'],
    ['Activate', 'We email you a one-time link. You set your own password and get a dashboard.'],
    ['Get reviewed', 'The HR wing reads every application and may ask a follow-up question.'],
    ['Start', 'Finalised members get a member number, a wing, tasks and a verified record.'],
  ];
  return (
    <>
      <PageHero label={`Recruitment ${cycle?.label ?? ''}`} title={<>Your seat <em className="serif-i text-brand">is open.</em></>}>
        {open ? <>Applications are open{cycle?.closes_at ? <> until <b>{fmtDate(cycle.closes_at, { day: 'numeric', month: 'long', year: 'numeric' })}</b></> : null}. Every Bangladesh Agricultural University student can apply.</>
          : 'BAUBC recruits once a year. The next dates will be announced here and on our Facebook page.'}
      </PageHero>
      <section className="wrap py-14 grid gap-10">
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map(([t, d], i) => (
            <li key={t} className="panel spot grid gap-3 content-start reveal" style={{ ['--d' as any]: i }}>
              <span className="grid size-10 place-items-center bg-brand text-lime-200 font-bold diamond-clip text-sm">{i + 1}</span>
              <h2 className="display-md text-2xl">{t}</h2><p className="text-sm text-ink-2">{d}</p>
            </li>
          ))}
        </ol>

        {open && cycle?.intake_form_url && (
          <div className="glass-strong rounded-[28px] p-7 md:p-9 grid md:grid-cols-[1fr_auto] gap-6 items-center reveal">
            <div className="grid gap-2"><h2 className="display-md text-3xl">Apply with the official Google Form</h2><p className="text-ink-2">Sign in with Google when the form asks. That confirms your email, and your BAUBC account is created from your answers automatically.</p></div>
            <a href={cycle.intake_form_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg">Open the form <Arrow /></a>
          </div>
        )}

        {open ? (
          <ActionForm action={applyAction} className="panel grid gap-6 reveal">
            <div className="grid gap-1"><h2 className="display-md text-3xl">{cycle?.intake_form_url ? 'Or apply right here' : 'Application'}</h2><p className="text-sm text-muted">Takes about five minutes.</p></div>
            <fieldset className="grid sm:grid-cols-2 gap-4"><legend className="eyebrow mb-3">About you</legend>
              <div className="field"><label htmlFor="a-name">Full name</label><input id="a-name" name="full_name" className="input" required autoComplete="name" /></div>
              <div className="field"><label htmlFor="a-email">Email</label><input id="a-email" name="email" type="email" className="input" required autoComplete="email" /><span className="hint">Your activation link goes here.</span></div>
              <div className="field"><label htmlFor="a-phone">Phone</label><input id="a-phone" name="phone" className="input" inputMode="tel" autoComplete="tel" /><span className="hint">Seen only by HR. Never public.</span></div>
              <div className="field"><label htmlFor="a-sid">Student ID</label><input id="a-sid" name="student_id" className="input" required /></div>
              <div className="field"><label htmlFor="a-dept">Department</label><input id="a-dept" name="department" className="input" required /></div>
              <div className="field"><label htmlFor="a-sess">Session</label><input id="a-sess" name="session" className="input" placeholder="2024-25" required /></div>
              <div className="field"><label htmlFor="a-batch">Level and semester</label><input id="a-batch" name="batch" className="input" placeholder="Level 1, Semester 2" /></div>
              <div className="field"><label htmlFor="a-li">LinkedIn or Facebook profile <span className="text-muted font-normal">(optional)</span></label><input id="a-li" name="facebook_url" className="input" placeholder="https://www.facebook.com/…" /></div>
            </fieldset>
            <fieldset className="grid gap-3"><legend className="eyebrow mb-3">Which wings fit you? Pick up to three</legend>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">{wings.map((w: any) => <label key={w.slug} className="check rounded-2xl border border-line bg-white/60 px-4 py-3 has-[:checked]:border-brand has-[:checked]:bg-lime-100 transition-colors cursor-pointer"><input type="checkbox" name="preferred_units" value={w.slug} /><span className="font-medium">{w.name}</span></label>)}</div>
            </fieldset>
            <fieldset className="grid gap-4"><legend className="eyebrow mb-3">In your words</legend>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="field"><label htmlFor="a-int">What are you into?</label><input id="a-int" name="interests" className="input" placeholder="marketing, agritech, finance" /></div>
                <div className="field"><label htmlFor="a-sk">What can you already do?</label><input id="a-sk" name="skills" className="input" placeholder="design, writing, Excel" /></div>
              </div>
              <div className="field"><label htmlFor="a-mot">Why BAUBC?</label><textarea id="a-mot" name="motivation" className="textarea" required /></div>
              <div className="field"><label htmlFor="a-exp">Clubs or projects you have been part of <span className="text-muted font-normal">(optional)</span></label><textarea id="a-exp" name="experience" className="textarea min-h-[80px]" /></div>
            </fieldset>
            <p className="hint">After activation you can add a photo, or pick a character avatar if you would rather not show your face.</p>
            <div className="grid gap-2">
              <label className="check"><input type="checkbox" name="consent" required /><span>I agree to the <Link href="/privacy" className="underline text-brand" target="_blank">privacy notice</Link>. BAUBC uses my details to process my application and run the club.</span></label>
              <label className="check"><input type="checkbox" name="photo_consent" /><span>I am happy to appear in club photos.</span></label>
            </div>
            <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
            <SubmitButton className="btn btn-primary btn-lg w-max" pendingText="Submitting…">Submit my application</SubmitButton>
          </ActionForm>
        ) : (
          <div className="glass-strong rounded-[28px] p-7 md:p-9 grid gap-3 reveal"><h2 className="display-md text-3xl">Recruitment is closed right now</h2><p className="text-ink-2">Follow BAUBC on Facebook to hear when the next cycle opens, or <Link href="/contact" className="underline text-brand">send us a message</Link> and we will let you know.</p></div>
        )}
      </section>
    </>
  );
}
