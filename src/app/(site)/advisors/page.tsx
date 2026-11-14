import type { Metadata } from 'next';
import { PageHero } from '@/components/site/bits';
import { Empty } from '@/components/ui/Empty';
import { getPublicAdvisors } from '@/server/queries/public';

export const metadata: Metadata = { title: 'Advisors', description: 'Faculty advisors guiding BAUBC.' };

export default async function AdvisorsPage() {
  const advisors = await getPublicAdvisors();
  return (
    <>
      <PageHero label="Advisors" title={<>Guided by <span className="serif-i">faculty</span></>} bn="উপদেষ্টা শিক্ষকবৃন্দ">Faculty members of Bangladesh Agricultural University advise the club and approve important decisions.</PageHero>
      <div className="wrap py-12">
        {advisors.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {advisors.map((a: any) => (
              <article key={a.id} className="panel grid gap-2 reveal"><span className="label text-muted">{a.title}</span><h2 className="heading text-xl">{a.full_name}</h2>{a.full_name_bn && <p className="text-green" lang="bn">{a.full_name_bn}</p>}{a.bio && <p className="text-sm text-ink-2">{a.bio}</p>}</article>
            ))}
          </div>
        ) : <Empty title="Advisor profiles are on their way">Advisors appear here after they choose to make their profile public.</Empty>}
      </div>
    </>
  );
}
