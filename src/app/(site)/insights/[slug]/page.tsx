import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Arrow } from '@/components/brand/Mark';
import { Cover, PageHero, Paras, PostCard } from '@/components/site/bits';
import { getPost, getPosts, getSettings } from '@/server/queries/public';
import { fmtDate, fmtNum } from '@/lib/format';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getPost((await params).slug);
  return p ? { title: p.title, description: p.dek ?? undefined, openGraph: { type: 'article', title: p.title, description: p.dek ?? undefined } } : { title: 'Insight' };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [p, all, settings] = await Promise.all([getPost(slug), getPosts(), getSettings()]);
  if (!p) notFound();
  const siblings = all.filter((x) => x.series === p.series && x.id !== p.id).slice(0, 3);
  const seriesName = p.series === 'decoded' ? 'DECODED' : p.series === 'case-studies' ? 'Case Studies' : p.series === 'news' ? 'Club news' : 'Deep dives';
  return (
    <article>
      <PageHero label={`${seriesName}${p.episode_no ? ` · Episode ${String(p.episode_no).padStart(2, '0')}` : ''} · ${fmtDate(p.published_at)}`} title={p.title} back={{ href: `/insights?series=${p.series}`, label: seriesName }}>
        {p.dek}
      </PageHero>
      <div className="wrap py-12 grid lg:grid-cols-[1fr_320px] gap-12 items-start">
        <div className="grid gap-10 min-w-0">
          <div className="group"><Cover tone={p.cover_tone} seed={p.slug} label={p.cover_label} numeral={p.kind === 'episode' ? p.episode_no : null} className="aspect-[16/8] cut rounded-[28px] shadow-[var(--shadow)]" /></div>
          <Paras text={p.body} className="text-[1.14rem] leading-[1.7] text-ink-2" />
          <p className="text-sm text-muted">By {p.author_name ?? 'BAUBC'}</p>
        </div>
        <aside className="grid gap-4 lg:sticky lg:top-28">
          {p.stats && (
            <div className="glass-strong rounded-[24px] p-5 grid gap-4">
              <span className="eyebrow">On Facebook</span>
              <dl className="grid grid-cols-2 gap-4">
                {[['Viewers', p.stats.viewers], ['Views', p.stats.views], ['Likes', p.stats.likes], ['Comments', p.stats.comments]].filter(([, v]) => v != null).map(([k, v]) => (
                  <div key={k as string}><dd className="display-md text-3xl tnum">{fmtNum(v as number)}</dd><dt className="text-xs text-muted">{k}</dt></div>
                ))}
              </dl>
              <p className="hint">From the club&apos;s Page insights. Meta updates these about once a day.</p>
            </div>
          )}
          {(p.facebook_url || settings.social.facebook_url) && <a href={p.facebook_url ?? settings.social.facebook_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Watch on Facebook <Arrow /></a>}
          {(p.youtube_url || settings.social.youtube_url) && <a href={p.youtube_url ?? settings.social.youtube_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">BAUBC on YouTube <Arrow /></a>}
        </aside>
      </div>
      {siblings.length > 0 && (
        <section className="wrap pt-8 grid gap-7">
          <h2 className="display-md text-3xl">More from {seriesName}</h2>
          <div className="grid sm:grid-cols-3 gap-6">{siblings.map((s, i) => <PostCard key={s.id} p={s} i={i} />)}</div>
        </section>
      )}
    </article>
  );
}
