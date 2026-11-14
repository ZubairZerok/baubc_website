import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero, PostCard } from '@/components/site/bits';
import { Empty } from '@/components/ui/Empty';
import { getPosts } from '@/server/queries/public';
import { getLang } from '@/lib/lang';

export const metadata: Metadata = { title: 'Insights', description: 'DECODED, BAUBC Case Studies and business analysis from Bangladesh Agricultural University Business Club.' };
const SERIES: Record<string, string> = { decoded: 'DECODED', 'case-studies': 'Case Studies', insights: 'Insights', news: 'News' };

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ series?: string }> }) {
  const [{ series }, lang, posts] = await Promise.all([searchParams, getLang(), getPosts()]);
  const list = posts.filter((p) => !series || p.series === series);
  const decoded = series === 'decoded';
  return (
    <>
      <PageHero label="Insights" title={<>The game <span className="serif-i">behind</span> the game</>} bn="ব্যবসার ভেতরের গল্প">
        DECODED breaks down famous films and stories as business decisions. BAUBC Case Studies takes on real market questions. All of it starts as a conversation on our Facebook page.
      </PageHero>
      <div className="wrap py-10 grid gap-8">
        <nav className="flex flex-wrap gap-2" aria-label="Series">
          <Link href="/insights" className={`btn btn-sm ${!series ? 'btn-dark' : 'btn-ghost'}`}>Everything</Link>
          {Object.entries(SERIES).map(([k, v]) => <Link key={k} href={`/insights?series=${k}`} className={`btn btn-sm ${series === k ? 'btn-dark' : 'btn-ghost'}`}>{v}</Link>)}
        </nav>
        {list.length ? (
          <div className={`grid gap-7 ${decoded ? 'grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
            {list.map((p) => <PostCard key={p.id} p={p} lang={lang} big={decoded} />)}
          </div>
        ) : <Empty title="Nothing here yet">New episodes appear here when they are published.</Empty>}
      </div>
    </>
  );
}
