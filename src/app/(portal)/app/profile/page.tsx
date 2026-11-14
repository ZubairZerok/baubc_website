import { PageTitle } from '@/components/portal/Shell';
import { Status } from '@/components/ui/Status';
import { LedgerStamp } from '@/components/ui/Stamp';
import { ActionForm, SubmitButton } from '@/components/ui/forms';
import { requestCorrection, updateProfile } from '@/app/actions/portal';
import { withClaims } from '@/server/db';
import { requireSession } from '@/server/session';
import { hasSupabaseAuth } from '@/server/env';
import { fmtDate } from '@/lib/format';
import Link from 'next/link';

export default async function ProfilePage() {
  const session = await requireSession('/app/profile');
  const d = await withClaims(session.claims, async (tx) => ({
    p: await tx.one(`select * from app.people where id = authz.current_person_id()`),
    contact: await tx.one(`select phone from app.person_contacts where person_id = authz.current_person_id()`),
    reqs: await tx.query(`select field, new_value, status, decision_note, created_at from app.profile_change_requests where person_id = authz.current_person_id() order by created_at desc limit 10`),
  }));
  const p = d.p!;
  const locked = !!p.verified_locked_at;
  return (
    <>
      <PageTitle label="Account" title="Profile" actions={hasSupabaseAuth ? <><Link href="/mfa" className="btn btn-ghost btn-sm">Two-step verification</Link><Link href="/account/password" className="btn btn-ghost btn-sm">Change password</Link></> : undefined} />
      <div className="grid xl:grid-cols-2 gap-6">
        <section className="panel grid gap-3 content-start">
          <div className="flex items-center justify-between"><h2 className="heading text-lg">Verified details</h2>{locked && <LedgerStamp size={40} />}</div>
          <dl className="grid">
            {[['Name', p.full_name], ['বাংলা নাম', p.full_name_bn], ['Email', p.email], ['Student ID', p.student_id], ['Department', p.academic_department], ['Session', p.academic_session], ['Level', p.batch_level], ['Phone', d.contact?.phone]].map(([k, v]) => (
              <div key={k as string} className="flex justify-between gap-4 py-2 border-b border-line"><dt className="text-muted">{k}</dt><dd className="font-semibold text-right" lang={k === 'বাংলা নাম' ? 'bn' : undefined}>{v || '—'}</dd></div>
            ))}
          </dl>
          {locked ? <p className="hint">These fields were verified on {fmtDate(p.verified_locked_at)}. Use a correction request to change them.</p> : <p className="hint">These details come from your application.</p>}
          <details className="mt-2"><summary className="cursor-pointer font-semibold text-link">Request a correction</summary>
            <ActionForm action={requestCorrection} className="grid gap-3 mt-3">
              <div className="field"><label htmlFor="cf">Field</label><select id="cf" name="field" className="select"><option value="full_name">Name (English)</option><option value="full_name_bn">Name (বাংলা)</option><option value="student_id">Student ID</option><option value="academic_department">Department</option><option value="academic_session">Session</option><option value="batch_level">Level</option></select></div>
              <div className="field"><label htmlFor="cv">Correct value</label><input id="cv" name="new_value" className="input" required /></div>
              <div className="field"><label htmlFor="cr">Why</label><input id="cr" name="reason" className="input" required placeholder="e.g. spelling on my university ID card" /></div>
              <SubmitButton className="btn btn-secondary w-max">Send request</SubmitButton>
            </ActionForm>
          </details>
          {d.reqs.length > 0 && <ul className="text-sm grid gap-1 mt-2">{d.reqs.map((r: any, i: number) => <li key={i} className="flex justify-between gap-2"><span>{r.field}: “{r.new_value}”{r.decision_note ? ` · ${r.decision_note}` : ''}</span><Status value={r.status} /></li>)}</ul>}
        </section>
        <ActionForm action={updateProfile} className="panel grid gap-4 content-start">
          <h2 className="heading text-lg">Public profile</h2>
          <div className="field"><label htmlFor="dn">Display name</label><input id="dn" name="display_name" className="input" defaultValue={p.display_name ?? ''} /></div>
          <div className="field"><label htmlFor="bio">Short bio</label><textarea id="bio" name="bio" maxLength={600} className="textarea" defaultValue={p.bio ?? ''} /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="field"><label htmlFor="int">Interests</label><input id="int" name="interests" className="input" defaultValue={(p.interests ?? []).join(', ')} /></div>
            <div className="field"><label htmlFor="sk">Skills</label><input id="sk" name="skills" className="input" defaultValue={(p.skills ?? []).join(', ')} /><span className="hint">Shown on your CV as self-declared.</span></div>
            <div className="field"><label htmlFor="fb">Facebook</label><input id="fb" name="facebook_url" className="input" defaultValue={p.facebook_url ?? ''} placeholder="https://www.facebook.com/…" /></div>
            <div className="field"><label htmlFor="li">LinkedIn</label><input id="li" name="linkedin_url" className="input" defaultValue={p.linkedin_url ?? ''} placeholder="https://www.linkedin.com/in/…" /></div>
          </div>
          <fieldset className="grid gap-2"><legend className="field-label mb-1">Avatar</legend>
            <p className="hint">Prefer not to show your face? Choose a character avatar instead of a photo.</p>
            <div className="flex flex-wrap gap-2">{['initials', 'cap', 'hijab', 'glasses', 'curly'].map((st) => <label key={st} className="check border border-line rounded-lg px-3 py-2"><input type="radio" name="avatar_style" value={st} defaultChecked={(p.avatar?.style ?? 'initials') === st} />{st}</label>)}</div>
            <input type="hidden" name="avatar_tone" value={p.avatar?.tone ?? 'leaf'} />
          </fieldset>
          <label className="check"><input type="checkbox" name="public_profile" defaultChecked={p.public_profile} /><span>Show me in the public Members directory (only after my membership is finalised; phone and email are never shown).</span></label>
          <SubmitButton>Save profile</SubmitButton>
        </ActionForm>
      </div>
    </>
  );
}
