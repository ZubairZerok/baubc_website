import type { Metadata } from 'next';
import { Arrow } from '@/components/brand/Mark';
import { PageHero } from '@/components/site/bits';
import { CopyButton } from '@/components/site/client';
import { ContactDesk } from '@/components/site/ContactDesk';
import { getSettings } from '@/server/queries/public';

export const metadata: Metadata = { title: 'Contact', description: 'BAU students, companies and organisations: ask a question, get help, or propose a collaboration with BAUBC.' };

export default async function ContactPage() {
  const { club, social } = await getSettings();
  return (
    <>
      <PageHero label="Contact desk" title={<>Talk to <em className="serif-i text-brand">a real person.</em></>}>
        BAU students with a question or an idea, companies planning a sponsorship, partnership or hiring drive, or anyone who wants to work with us: tell us who you are and what you need, and the right wing picks it up.
      </PageHero>
      <div className="wrap py-14 grid lg:grid-cols-[1fr_360px] gap-8 items-start">
        <ContactDesk email={club.email ?? 'businessclub@bau.edu.bd'} />
        <aside className="grid gap-4 lg:sticky lg:top-28">
          <div className="glass-strong rounded-[24px] p-6 grid gap-3 reveal">
            <span className="eyebrow">Who answers</span>
            {[['Students', 'Questions, help and membership go to the HR and Research wings.'], ['Companies', 'Sponsorship, partnerships and hiring go to External Relations.'], ['Media', 'Press and content requests go to the Media wing.']].map(([t, d]) => (
              <div key={t} className="flex gap-3"><span className="mt-1.5 size-2.5 shrink-0 bg-brand diamond-clip" /><span className="grid"><b className="text-sm">{t}</b><span className="text-sm text-ink-2">{d}</span></span></div>
            ))}
          </div>
          <div className="glass-strong rounded-[24px] p-6 grid gap-2 reveal" style={{ ['--d' as any]: 1 }}><span className="eyebrow">Email</span><p className="font-mono break-all">{club.email}</p><CopyButton value={club.email ?? ''} label="Copy address" /></div>
          <div className="glass-strong rounded-[24px] p-6 grid gap-2 reveal" style={{ ['--d' as any]: 2 }}><span className="eyebrow">Find us</span><p>{club.location}</p></div>
          <div className="glass-strong rounded-[24px] p-6 grid gap-3 reveal" style={{ ['--d' as any]: 3 }}><span className="eyebrow">Follow</span>
            <div className="grid gap-2">
              {([['Facebook', social.facebook_url], ['YouTube', social.youtube_url], ['LinkedIn', social.linkedin_url]] as const).filter(([, u]) => u).map(([n, u]) => <a key={n} href={u} target="_blank" rel="noopener noreferrer" className="link-arrow w-max">{n}<Arrow size={12} /></a>)}
            </div></div>
        </aside>
      </div>
    </>
  );
}
