import type { Metadata } from 'next';
import { PageHero } from '@/components/site/bits';
import { ActionForm, SubmitButton } from '@/components/ui/forms';
import { contactAction } from '@/app/actions/public';
import { getSettings } from '@/server/queries/public';

export const metadata: Metadata = { title: 'Contact', description: 'Contact Bangladesh Agricultural University Business Club for partnerships, sponsorship, speaking and membership.' };

export default async function ContactPage() {
  const { club, social } = await getSettings();
  return (
    <>
      <PageHero label="Contact" title={<>Let&apos;s build <span className="serif-i">something</span></>} bn="যোগাযোগ করুন">Partnerships, sponsorship, speaking invitations, media or membership questions.</PageHero>
      <div className="wrap py-12 grid lg:grid-cols-[1fr_380px] gap-10 items-start">
        <ActionForm action={contactAction} resetOnSuccess className="panel grid gap-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="field"><label htmlFor="c-name">Your name</label><input id="c-name" name="name" className="input" required autoComplete="name" /></div>
            <div className="field"><label htmlFor="c-email">Email</label><input id="c-email" name="email" type="email" className="input" required autoComplete="email" /></div>
            <div className="field"><label htmlFor="c-org">Organisation <span className="text-muted font-normal">(optional)</span></label><input id="c-org" name="organization" className="input" /></div>
            <div className="field"><label htmlFor="c-cat">Topic</label>
              <select id="c-cat" name="category" className="select" defaultValue="general">
                <option value="general">General question</option><option value="sponsorship">Sponsorship</option><option value="partnership">Partnership</option>
                <option value="speaker">Speaking at an event</option><option value="media">Media</option><option value="membership">Membership</option>
              </select></div>
          </div>
          <div className="field"><label htmlFor="c-msg">Message</label><textarea id="c-msg" name="message" className="textarea" required minLength={10} maxLength={4000} /></div>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
          <SubmitButton pendingText="Sending…">Send message</SubmitButton>
        </ActionForm>
        <aside className="grid gap-4">
          <div className="panel grid gap-2"><span className="label text-muted">Email</span><p className="font-mono">{club.email}</p></div>
          <div className="panel grid gap-2"><span className="label text-muted">Where</span><p>{club.location}</p></div>
          <div className="panel grid gap-2"><span className="label text-muted">Follow</span>
            <div className="flex flex-wrap gap-2">
              {social.facebook_url && <a href={social.facebook_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost">Facebook</a>}
              {social.youtube_url && <a href={social.youtube_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost">YouTube</a>}
              {social.linkedin_url && <a href={social.linkedin_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost">LinkedIn</a>}
            </div></div>
        </aside>
      </div>
    </>
  );
}
