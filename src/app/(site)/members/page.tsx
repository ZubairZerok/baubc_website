import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Arrow } from '@/components/brand/Mark';
import { PageHero } from '@/components/site/bits';
import { Avatar } from '@/components/ui/Avatar';
import { Empty } from '@/components/ui/Empty';
import { getPublicMembers, getSettings } from '@/server/queries/public';

export const metadata: Metadata = { title: 'Members', description: 'BAUBC members who chose to appear in the public directory.' };

export default async function MembersPage() {
  const [members, settings] = await Promise.all([getPublicMembers(), getSettings()]);
  if (settings.features.members_directory === false) notFound();
  return (
    <>
      <PageHero label="Members" title={<>The people <em className="serif-i text-brand">doing the work.</em></>}>Only finalised members who opted in appear here. Phone numbers and emails are never shown.</PageHero>
      <div className="wrap py-14">
        {members.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {members.map((m: any, i: number) => (
              <article key={m.id} className="panel spot lift grid grid-cols-[auto_1fr] gap-4 items-start reveal" style={{ ['--d' as any]: i % 3 }}>
                <Avatar name={m.full_name} photoUrl={m.photo_url} avatar={m.avatar} size={64} />
                <div className="grid gap-1 min-w-0">
                  <h2 className="heading text-lg">{m.display_name || m.full_name}</h2>
                  {(m.positions?.length > 0 || m.units?.length > 0) && <p className="text-sm font-medium text-brand">{[...(m.positions ?? []), ...(m.positions?.length ? [] : m.units ?? [])].join(' · ')}</p>}
                  <p className="text-sm text-muted">{[m.academic_department, m.academic_session].filter(Boolean).join(' · ')}</p>
                  {m.bio && <p className="text-sm text-ink-2 line-clamp-3 mt-1">{m.bio}</p>}
                  <div className="flex gap-4 text-sm mt-1.5">
                    {m.linkedin_url && <a href={m.linkedin_url} target="_blank" rel="noopener noreferrer" className="link-arrow">LinkedIn<Arrow size={11} /></a>}
                    {m.facebook_url && <a href={m.facebook_url} target="_blank" rel="noopener noreferrer" className="link-arrow">Facebook<Arrow size={11} /></a>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty title="The directory opens after recruitment" action={<Link href="/join" className="btn btn-primary">Join BAUBC <Arrow /></Link>}>Members choose whether to appear here once their membership is finalised.</Empty>
        )}
      </div>
    </>
  );
}
