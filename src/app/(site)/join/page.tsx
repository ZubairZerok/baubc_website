import type { Metadata } from 'next';
import Link from 'next/link';
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
    ['Apply', 'Fill in the application. We never ask for a password in a form.'],
    ['Activate', 'We email you a one-time link. You set your own password and can follow your application.'],
    ['Review', 'The HR wing reviews applications and may ask for more information or an interview.'],
    ['Welcome', 'Finalised members get a member number, a wing, tasks and verified records.'],
  ];
  return (
    <>
      <PageHero label={`Recruitment ${cycle?.label ?? ''}`} title={<>Join the <span className="serif-i">ecosystem</span></>} bn="বিএইউবিসিতে যোগ দিন">
        {open ? <>Applications are open{cycle?.closes_at ? <> until <b>{fmtDate(cycle.closes_at)}</b></> : null}. Every Bangladesh Agricultural University student can apply.</>
          : 'BAUBC recruits once a year. Recruitment dates are announced here and on the BAUBC Facebook page.'}
      </PageHero>
      <section className="wrap py-12 grid gap-10">
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-line border border-line">
          {steps.map(([t, d], i) => <li key={t} className="bg-paper p-6 grid gap-2 content-start reveal"><span className="label text-green">Step {i + 1}</span><h2 className="heading text-xl">{t}</h2><p className="text-sm text-ink-2">{d}</p></li>)}
        </ol>
        {open && cycle?.intake_form_url ? (
          <div className="panel grid md:grid-cols-[1fr_auto] gap-6 items-center">
            <div className="grid gap-2"><h2 className="heading text-2xl">Apply with the official form</h2><p className="text-ink-2">Sign in with your Google account when the form asks: it confirms your email, and your BAUBC account is created from your application automatically.</p></div>
            <a href={cycle.intake_form_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Open the application form</a>
          </div>
        ) : open ? (
          <ActionForm action={applyAction} className="panel grid gap-5">
            <h2 className="heading text-2xl">Application</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="field"><label htmlFor="a-name">Full name (English)</label><input id="a-name" name="full_name" className="input" required autoComplete="name" /></div>
              <div className="field"><label htmlFor="a-bn">Full name (বাংলা) <span className="text-muted font-normal">(optional)</span></label><input id="a-bn" name="full_name_bn" className="input" lang="bn" /></div>
              <div className="field"><label htmlFor="a-email">Email</label><input id="a-email" name="email" type="email" className="input" required autoComplete="email" /><span className="hint">Your activation link is sent here.</span></div>
              <div className="field"><label htmlFor="a-phone">Phone</label><input id="a-phone" name="phone" className="input" inputMode="tel" autoComplete="tel" /><span className="hint">Visible only to HR. Never public.</span></div>
              <div className="field"><label htmlFor="a-sid">Student ID</label><input id="a-sid" name="student_id" className="input" required /></div>
              <div className="field"><label htmlFor="a-dept">Department</label><input id="a-dept" name="department" className="input" required /></div>
              <div className="field"><label htmlFor="a-sess">Session</label><input id="a-sess" name="session" className="input" placeholder="2024-25" required /></div>
              <div className="field"><label htmlFor="a-batch">Level / semester</label><input id="a-batch" name="batch" className="input" placeholder="Level 1 Semester 2" /></div>
              <div className="field"><label htmlFor="a-fb">Facebook profile <span className="text-muted font-normal">(optional)</span></label><input id="a-fb" name="facebook_url" className="input" placeholder="https://www.facebook.com/..." /></div>
              <div className="field"><label htmlFor="a-li">LinkedIn <span className="text-muted font-normal">(optional)</span></label><input id="a-li" name="linkedin_url" className="input" placeholder="https://www.linkedin.com/in/..." /></div>
            </div>
            <fieldset className="grid gap-2"><legend className="field-label mb-1">Preferred wings (up to 3)</legend>
              <div className="grid sm:grid-cols-3 gap-2">{wings.map((w: any) => <label key={w.slug} className="check"><input type="checkbox" name="preferred_units" value={w.slug} />{w.name}</label>)}</div>
            </fieldset>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="field"><label htmlFor="a-int">Interests</label><input id="a-int" name="interests" className="input" placeholder="marketing, agritech, finance" /></div>
              <div className="field"><label htmlFor="a-sk">Skills</label><input id="a-sk" name="skills" className="input" placeholder="design, writing, Excel" /></div>
            </div>
            <div className="field"><label htmlFor="a-mot">Why do you want to join?</label><textarea id="a-mot" name="motivation" className="textarea" required /></div>
            <div className="field"><label htmlFor="a-exp">Previous club or organisational experience</label><textarea id="a-exp" name="experience" className="textarea" /></div>
            <div className="field"><label htmlFor="a-bio">Short bio <span className="text-muted font-normal">(optional, max 600 characters)</span></label><textarea id="a-bio" name="bio" maxLength={600} className="textarea" /></div>
            <p className="hint">Photo: after activation you can upload a photo or choose a character avatar if you prefer not to show your face.</p>
            <label className="check"><input type="checkbox" name="consent" required /><span>I agree to the <Link href="/privacy" className="underline text-link" target="_blank">privacy notice</Link>. BAUBC uses my details to process my application and run the club.</span></label>
            <label className="check"><input type="checkbox" name="photo_consent" /><span>I am happy to appear in club photos.</span></label>
            <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
            <SubmitButton pendingText="Submitting…">Submit application</SubmitButton>
          </ActionForm>
        ) : (
          <div className="panel grid gap-2"><h2 className="heading text-2xl">Recruitment is not open right now</h2><p className="text-ink-2">Follow BAUBC on Facebook to hear when the next cycle opens, or <Link href="/contact" className="underline text-link">send us a message</Link>.</p></div>
        )}
      </section>
    </>
  );
}
