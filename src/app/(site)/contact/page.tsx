import type { Metadata } from 'next';
import { Arrow } from '@/components/brand/Mark';
import { PageHero } from '@/components/site/bits';
import { ActionForm, SubmitButton } from '@/components/ui/forms';
import { CopyButton } from '@/components/site/client';
import { contactAction } from '@/app/actions/public';
import { getSettings } from '@/server/queries/public';

export const metadata: Metadata = { title: 'Contact', description: 'Contact BAUBC about partnerships, sponsorship, speaking and membership.' };

export default async function ContactPage() {
  const { club, social } = await getSettings();
  return (
    <>
      <PageHero label="Contact" title={<>Let&apos;s build <em className="serif-i text-brand">something.</em></>}>Sponsoring the Summit, speaking at an event, partnering on a programme or just curious: tell us, and a person will reply.</PageHero>
      <div className="wrap py-14 grid lg:grid-cols-[1fr_380px] gap-8 items-start">
        <ActionForm action={contactAction} resetOnSuccess className="panel grid gap-4 reveal">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="field"><label htmlFor="c-name">Your name</label><input id="c-name" name="name" className="input" required autoComplete="name" /></div>
            <div className="field"><label htmlFor="c-email">Email</label><input id="c-email" name="email" type="email" className="input" required autoComplete="email" /></div>
            <div className="field"><label htmlFor="c-org">Organisation <span className="text-muted font-normal">(optional)</span></label><input id="c-org" name="organization" className="input" autoComplete="organization" /></div>
            <div className="field"><label htmlFor="c-cat">What is it about?</label>
              <select id="c-cat" name="category" className="select" defaultValue="general">
                <option value="general">A general question</option><option value="sponsorship">Sponsorship</option><option value="partnership">Partnership</option>
                <option value="speaker">Speaking at an event</option><option value="media">Media</option><option value="membership">Membership</option>
              </select></div>
          </div>
          <div className="field"><label htmlFor="c-msg">Message</label><textarea id="c-msg" name="message" className="textarea min-h-[150px]" required minLength={10} maxLength={4000} /></div>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
          <SubmitButton className="btn btn-primary btn-lg w-max" pendingText="Sending…">Send message</SubmitButton>
        </ActionForm>
        <aside className="grid gap-4">
          <div className="glass-strong rounded-[24px] p-6 grid gap-2 reveal"><span className="eyebrow">Email</span><p className="font-mono break-all">{club.email}</p><CopyButton value={club.email ?? ''} label="Copy address" /></div>
          <div className="glass-strong rounded-[24px] p-6 grid gap-2 reveal" style={{ ['--d' as any]: 1 }}><span className="eyebrow">Find us</span><p>{club.location}</p></div>
          <div className="glass-strong rounded-[24px] p-6 grid gap-3 reveal" style={{ ['--d' as any]: 2 }}><span className="eyebrow">Follow</span>
            <div className="grid gap-2">
              {([['Facebook', social.facebook_url], ['YouTube', social.youtube_url], ['LinkedIn', social.linkedin_url]] as const).filter(([, u]) => u).map(([n, u]) => <a key={n} href={u} target="_blank" rel="noopener noreferrer" className="link-arrow w-max">{n}<Arrow size={12} /></a>)}
            </div></div>
        </aside>
      </div>
    </>
  );
}
