import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Arrow } from '@/components/brand/Mark';
import { PageHero } from '@/components/site/bits';
import { Avatar } from '@/components/ui/Avatar';
import { Empty } from '@/components/ui/Empty';
import { MemberOfMonth } from '@/components/site/MemberOfMonth';
import { getPublicMembers, getRecognition, getSettings } from '@/server/queries/public';

export const metadata: Metadata = { title: 'Members', description: 'BAUBC members who chose to appear in the public directory.' };

export default async function MembersPage() {
  const [members, settings, motm] = await Promise.all([getPublicMembers(), getSettings(), getRecognition()]);
  if (settings.features.members_directory === false) notFound();
  return (
    <>
      <PageHero label="Members" title={<>The people <em className="serif-i text-brand">doing the work.</em></>}>Only finalised members who opted in appear here. Phone numbers and emails are never shown.</PageHero>
      <div className="wrap py-14 grid gap-10">
        {motm?.handle && <div className="max-w-xl mx-auto w-full"><MemberOfMonth award={motm} compact /></div>}
        {members.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {members.map((m: any, i: number) => (
              <Link key={m.id} href={m.handle ? `/members/${m.handle}` : '/members'} className="group panel spot lift grid grid-cols-[auto_1fr] gap-4 items-start reveal" style={{ ['--d' as any]: i % 3 }}>
                <span className="relative">
                  <Avatar name={m.full_name} photoUrl={m.photo_url} avatar={m.avatar} size={64} />
                  {m.is_mom && <span className="absolute -right-1.5 -bottom-1.5 grid size-6 place-items-center rounded-full bg-harvest border-2 border-white text-[11px]" title="Member of the Month">★</span>}
                </span>
                <div className="grid gap-1 min-w-0">
                  <h2 className="heading text-lg group-hover:text-brand transition-colors">{m.display_name || m.full_name}</h2>
                  {(m.positions?.length > 0 || m.units?.length > 0) && <p className="text-sm font-medium text-brand">{[...(m.positions ?? []), ...(m.positions?.length ? [] : m.units ?? [])].join(' · ')}</p>}
                  <p className="text-sm text-muted">{[m.academic_department, m.academic_session].filter(Boolean).join(' · ')}</p>
                  {m.bio && <p className="text-sm text-ink-2 line-clamp-3 mt-1">{m.bio}</p>}
                  <span className="text-sm font-semibold text-brand mt-1.5 inline-flex items-center gap-1.5">View profile <Arrow size={11} className="transition-transform group-hover:translate-x-1" /></span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Empty title="The directory opens after recruitment" action={<Link href="/join" className="btn btn-primary">Join BAUBC <Arrow /></Link>}>Members choose whether to appear here once their membership is finalised.</Empty>
        )}
      </div>
    </>
  );
}
