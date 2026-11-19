import Link from 'next/link';
import { PageTitle } from '@/components/portal/Shell';
import { Status } from '@/components/ui/Status';
import { LedgerStamp } from '@/components/ui/Stamp';
import { ActionForm, SubmitButton } from '@/components/ui/forms';
import { AvatarStudio } from '@/components/portal/AvatarStudio';
import { openPrivacyRequest, requestCorrection, updateProfile } from '@/app/actions/portal';
import { withClaims } from '@/server/db';
import { requireSession } from '@/server/session';
import { env, hasSupabaseAuth } from '@/server/env';
import { fmtDate } from '@/lib/format';

const PRIVACY_KIND: Record<string, string> = { access: 'Send me a copy of my data', correction: 'Correct my data', erasure: 'Delete my account and data', withdraw_consent: 'Withdraw a consent I gave', objection: 'Stop using my data for something' };

export default async function ProfilePage() {
  const session = await requireSession('/app/profile');
  const d = await withClaims(session.claims, async (tx) => ({
    p: await tx.one(`select * from app.people where id = authz.current_person_id()`),
    contact: await tx.one(`select phone from app.person_contacts where person_id = authz.current_person_id()`),
    reqs: await tx.query(`select field, new_value, status, decision_note, created_at from app.profile_change_requests where person_id = authz.current_person_id() order by created_at desc limit 10`),
    privacy: await tx.query(`select kind, status, created_at, due_at from app.privacy_requests where person_id = authz.current_person_id() order by created_at desc limit 5`),
  }));
  const p = d.p!;
  const locked = !!p.verified_locked_at;
  return (
    <>
      <PageTitle label="Account" title="Profile" actions={hasSupabaseAuth ? <><Link href="/mfa" className="btn btn-secondary btn-sm">Two-step verification</Link><Link href="/account/password" className="btn btn-secondary btn-sm">Change password</Link></> : undefined}>
        Your verified details are locked by the club. Everything on the right is yours to shape.
      </PageTitle>
      <div className="grid xl:grid-cols-2 gap-6 items-start">
        <div className="grid gap-6">
          <section className="panel grid gap-3 content-start">
            <div className="flex items-center justify-between"><h2 className="heading text-lg">Verified details</h2>{locked && <LedgerStamp size={44} />}</div>
            <dl className="grid">
              {[['Name', p.full_name], ['Email', p.email], ['Student ID', p.student_id], ['Department', p.academic_department], ['Session', p.academic_session], ['Level', p.batch_level], ['Phone', d.contact?.phone]].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-4 py-2 border-b border-line"><dt className="text-muted">{k}</dt><dd className="font-semibold text-right break-all">{v || '—'}</dd></div>
              ))}
            </dl>
            {locked ? <p className="hint">Verified on {fmtDate(p.verified_locked_at)}. To change one, send a correction request.</p> : <p className="hint">These details come from your application.</p>}
            <details className="mt-1"><summary className="cursor-pointer font-semibold text-brand">Request a correction</summary>
              <ActionForm action={requestCorrection} resetOnSuccess className="grid gap-3 mt-3">
                <div className="field"><label htmlFor="cf">What is wrong</label><select id="cf" name="field" className="select"><option value="full_name">Name</option><option value="student_id">Student ID</option><option value="academic_department">Department</option><option value="academic_session">Session</option><option value="batch_level">Level</option></select></div>
                <div className="field"><label htmlFor="cv">Correct value</label><input id="cv" name="new_value" className="input" required /></div>
                <div className="field"><label htmlFor="cr">Why</label><input id="cr" name="reason" className="input" required placeholder="Spelling on my university ID card" /></div>
                <SubmitButton className="btn btn-secondary w-max">Send request</SubmitButton>
              </ActionForm>
            </details>
            {d.reqs.length > 0 && <ul className="text-sm grid gap-1.5 mt-2">{d.reqs.map((r: any, i: number) => <li key={i} className="flex justify-between gap-2"><span>{r.field.replace(/_/g, ' ')}: “{r.new_value}”{r.decision_note ? ` · ${r.decision_note}` : ''}</span><Status value={r.status} /></li>)}</ul>}
          </section>
          <section className="panel grid gap-3 content-start">
            <h2 className="heading text-lg">Your data</h2>
            <p className="text-sm text-ink-2">You can take a copy of everything the club holds about you at any time. Other requests are answered within 30 days.</p>
            <a href="/app/export/my-data" className="btn btn-secondary btn-sm w-max">Download my data</a>
            <details><summary className="cursor-pointer font-semibold text-brand">Make a privacy request</summary>
              <ActionForm action={openPrivacyRequest} resetOnSuccess className="grid gap-3 mt-3">
                <div className="field"><label htmlFor="pk">I want to</label><select id="pk" name="kind" className="select">{Object.entries(PRIVACY_KIND).filter(([k]) => k !== 'access').map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div className="field"><label htmlFor="pd">Details</label><textarea id="pd" name="details" className="textarea min-h-[80px]" placeholder="Tell us exactly what you want changed or removed." /></div>
                <SubmitButton className="btn btn-secondary w-max">Send request</SubmitButton>
              </ActionForm>
            </details>
            {d.privacy.length > 0 && <ul className="text-sm grid gap-1.5">{d.privacy.map((r: any, i: number) => <li key={i} className="flex justify-between gap-2"><span>{PRIVACY_KIND[r.kind]} · sent {fmtDate(r.created_at)}</span><Status value={r.status} /></li>)}</ul>}
          </section>
        </div>
        <ActionForm action={updateProfile} className="panel grid gap-5 content-start">
          <h2 className="heading text-lg">Public profile</h2>
          <AvatarStudio name={p.full_name} initial={p.avatar} photoUrl={p.photo_url} upload={hasSupabaseAuth ? { url: env.supabaseUrl, key: env.supabaseKey, userId: session.userId } : null} />
          <div className="field"><label htmlFor="dn">Display name</label><input id="dn" name="display_name" className="input" defaultValue={p.display_name ?? ''} placeholder={p.full_name} /></div>
          <div className="field"><label htmlFor="bio">Short bio</label><textarea id="bio" name="bio" maxLength={600} className="textarea" defaultValue={p.bio ?? ''} placeholder="What you are building, studying or curious about." /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="field"><label htmlFor="int">Interests</label><input id="int" name="interests" className="input" defaultValue={(p.interests ?? []).join(', ')} placeholder="Agritech, marketing" /></div>
            <div className="field"><label htmlFor="sk">Skills</label><input id="sk" name="skills" className="input" defaultValue={(p.skills ?? []).join(', ')} placeholder="Excel, public speaking" /><span className="hint">Shown on your CV as self-declared.</span></div>
            <div className="field"><label htmlFor="fb">Facebook</label><input id="fb" name="facebook_url" className="input" defaultValue={p.facebook_url ?? ''} placeholder="https://www.facebook.com/…" /></div>
            <div className="field"><label htmlFor="li">LinkedIn</label><input id="li" name="linkedin_url" className="input" defaultValue={p.linkedin_url ?? ''} placeholder="https://www.linkedin.com/in/…" /></div>
          </div>
          <label className="check"><input type="checkbox" name="public_profile" defaultChecked={p.public_profile} /><span>Show me on the public Members page and give me a public profile page. Your phone, email and student ID are never shown.</span></label>
          <div className="field"><label htmlFor="handle">Profile address</label>
            <div className="flex items-center rounded-[14px] border border-line-strong bg-white focus-within:border-brand overflow-hidden"><span className="pl-3.5 text-muted text-sm whitespace-nowrap">/members/</span><input id="handle" name="handle" className="input !border-0 !shadow-none !pl-1" defaultValue={p.handle ?? ''} placeholder="your-name" pattern="[a-z0-9][a-z0-9-]{1,38}[a-z0-9]" maxLength={40} /></div>
            <span className="hint">Lowercase letters, digits and dashes. {p.handle && p.public_profile ? <Link href={`/members/${p.handle}`} className="underline text-brand">View your public profile</Link> : 'Created automatically when you go public.'}</span></div>
          <fieldset className="grid gap-2"><legend className="label text-muted mb-1">Show on my public profile</legend>
            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2">
              {([['department', 'Department'], ['session', 'Session'], ['bio', 'Bio'], ['socials', 'Facebook and LinkedIn'], ['skills', 'Skills and interests'], ['achievements', 'Verified achievements'], ['rank', 'Points, rank and events attended']] as const).map(([k, l]) => (
                <label key={k} className="check"><input type="checkbox" name={`show_${k}`} defaultChecked={p.public_fields?.[k] !== false} /><span>{l}</span></label>
              ))}
            </div>
          </fieldset>
          <SubmitButton className="btn btn-primary justify-self-start">Save profile</SubmitButton>
        </ActionForm>
      </div>
    </>
  );
}
