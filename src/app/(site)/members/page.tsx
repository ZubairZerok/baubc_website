import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHero } from '@/components/site/bits';
import { Empty } from '@/components/ui/Empty';
import { getPublicMembers, getSettings } from '@/server/queries/public';

export const metadata: Metadata = { title: 'Members', description: 'Finalised BAUBC members who chose to appear in the public directory.' };

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('');
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return <div className="size-14 rounded-full grid place-items-center font-display font-bold text-lg text-[#07140E]" style={{ background: `hsl(${70 + (h % 80)} 60% 72%)` }} aria-hidden="true">{initials}</div>;
}

export default async function MembersPage() {
  const [members, settings] = await Promise.all([getPublicMembers(), getSettings()]);
  if (settings.features.members_directory === false) notFound();
  return (
    <>
      <PageHero label="Members" title={<>The people <span className="serif-i">behind</span> BAUBC</>} bn="আমাদের সদস্যরা">
        Only finalised members who opted in appear here. Contact details are never shown.
      </PageHero>
      <div className="wrap py-12">
        {members.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((m: any) => (
              <article key={m.id} className="panel grid grid-cols-[auto_1fr] gap-4 items-start reveal">
                <Avatar name={m.full_name} />
                <div className="grid gap-1 min-w-0">
                  <h2 className="heading text-lg">{m.display_name || m.full_name}</h2>
                  {m.full_name_bn && <p className="text-sm text-green" lang="bn">{m.full_name_bn}</p>}
                  <p className="text-sm text-muted">{[m.academic_department, m.academic_session].filter(Boolean).join(' · ')}</p>
                  {(m.positions?.length > 0 || m.units?.length > 0) && <p className="text-sm">{m.positions?.length ? m.positions.join(', ') + ' · ' : ''}{m.units.join(', ')}</p>}
                  {m.bio && <p className="text-sm text-ink-2 line-clamp-3 mt-1">{m.bio}</p>}
                  <div className="flex gap-3 text-sm mt-1">{m.linkedin_url && <a href={m.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-link underline">LinkedIn</a>}{m.facebook_url && <a href={m.facebook_url} target="_blank" rel="noopener noreferrer" className="text-link underline">Facebook</a>}</div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty title="The directory opens after recruitment is finalised" action={<Link href="/join" className="btn btn-primary">Join BAUBC</Link>}>
            Members choose whether to appear here once their membership is finalised.
          </Empty>
        )}
      </div>
    </>
  );
}
