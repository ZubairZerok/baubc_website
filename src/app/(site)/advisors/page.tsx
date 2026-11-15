import type { Metadata } from 'next';
import { PageHero } from '@/components/site/bits';
import { Avatar } from '@/components/ui/Avatar';
import { Empty } from '@/components/ui/Empty';
import { getPublicAdvisors } from '@/server/queries/public';

export const metadata: Metadata = { title: 'Advisors', description: 'Faculty advisors guiding BAUBC.' };

export default async function AdvisorsPage() {
  const advisors = await getPublicAdvisors();
  return (
    <>
      <PageHero label="Advisors" title={<>Guided by <em className="serif-i text-brand">faculty.</em></>}>Teachers of Bangladesh Agricultural University advise the club and sign off its important decisions, including every large payment.</PageHero>
      <div className="wrap py-14">
        {advisors.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {advisors.map((a: any, i: number) => (
              <article key={a.id} className="panel spot lift grid grid-cols-[auto_1fr] gap-4 reveal" style={{ ['--d' as any]: i % 3 }}>
                <Avatar name={a.full_name} photoUrl={a.photo_url} size={64} />
                <div className="grid gap-1 content-start"><span className="eyebrow">{a.title}</span><h2 className="heading text-xl">{a.full_name}</h2>{a.bio && <p className="text-sm text-ink-2 mt-1">{a.bio}</p>}</div>
              </article>
            ))}
          </div>
        ) : <Empty title="Advisor profiles are on their way">Advisors appear here once they choose to make their profile public.</Empty>}
      </div>
    </>
  );
}
