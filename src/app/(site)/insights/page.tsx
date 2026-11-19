import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero, PostCard } from '@/components/site/bits';
import { Empty } from '@/components/ui/Empty';
import { getPosts } from '@/server/queries/public';

export const metadata: Metadata = { title: 'Insights', description: 'DECODED, BAUBC Case Studies and business analysis from Bangladesh Agricultural University Business Club.' };
const SERIES: Record<string, string> = { decoded: 'DECODED', 'case-studies': 'Case Studies', insights: 'Deep dives', news: 'Club news' };

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ series?: string; lang?: string }> }) {
  const [{ series, lang }, posts] = await Promise.all([searchParams, getPosts()]);
  const list = posts.filter((p) => (!series || p.series === series) && (!lang || p.lang === lang));
  return (
    <>
      <PageHero label="Insights" title={<>The game <em className="serif-i text-brand">behind</em> the game.</>}>
        DECODED takes famous films apart as business decisions. BAUBC Case Studies answers real market questions. Every piece starts as a conversation on our Facebook page.
      </PageHero>
      <div className="wrap py-12 grid gap-9">
        <nav className="flex flex-wrap gap-2" aria-label="Series">
          <Link href="/insights" className={`btn btn-sm ${!series && !lang ? 'btn-primary' : 'btn-secondary'}`}>Everything</Link>
          <Link href="/insights?lang=bn" lang="bn" className={`btn btn-sm font-bangla ${lang === 'bn' ? 'btn-primary' : 'btn-secondary'}`}>বাংলা লেখা</Link>
          {Object.entries(SERIES).map(([k, v]) => <Link key={k} href={`/insights?series=${k}`} className={`btn btn-sm ${series === k ? 'btn-primary' : 'btn-secondary'}`}>{v}</Link>)}
        </nav>
        {list.length ? <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">{list.map((p, i) => <PostCard key={p.id} p={p} i={i} />)}</div>
          : <Empty title="Nothing here yet">New episodes appear here the day they are published.</Empty>}
      </div>
    </>
  );
}
