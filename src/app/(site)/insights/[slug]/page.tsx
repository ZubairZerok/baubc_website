import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Cover, Paras, PostCard } from '@/components/site/bits';
import { getPost, getPosts, getSettings } from '@/server/queries/public';
import { getLang } from '@/lib/lang';
import { fmtDate, fmtNum } from '@/lib/format';
import { pick } from '@/lib/i18n';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getPost((await params).slug);
  return p ? { title: p.title, description: p.dek ?? undefined, openGraph: { type: 'article', title: p.title, description: p.dek ?? undefined } } : { title: 'Insight' };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [lang, p, all, settings] = await Promise.all([getLang(), getPost(slug), getPosts(), getSettings()]);
  if (!p) notFound();
  const siblings = all.filter((x) => x.series === p.series && x.id !== p.id).slice(0, 3);
  const isDecoded = p.series === 'decoded';
  return (
    <article>
      <section className={`${isDecoded ? 'canopy on-canopy' : 'border-b border-line'}`}>
        <div className="wrap pt-12 pb-10 md:pt-16 grid lg:grid-cols-[1.2fr_1fr] gap-10 items-end">
          <div className="grid gap-5">
            <Link href={`/insights?series=${p.series}`} className={`label w-max ${isDecoded ? 'text-canopy-muted hover:text-signal' : 'text-muted hover:text-link'}`}>← {isDecoded ? 'DECODED' : p.series === 'case-studies' ? 'Case Studies' : 'Insights'}</Link>
            {p.cover_label && <span className="tag w-max max-w-full"><i>{p.kind === 'episode' ? 'EP' : p.kind.toUpperCase()}</i>{p.cover_label}</span>}
            <h1 className={`${isDecoded ? 'serif-i text-[clamp(2.4rem,1.4rem+4vw,5rem)] leading-[1.02]' : 'display text-[clamp(2.2rem,1.3rem+3.6vw,4.4rem)]'} max-w-[20ch]`}>{pick(lang, p.title, p.title_bn)}</h1>
            {p.dek && <p className={`text-xl max-w-[52ch] ${isDecoded ? 'text-on-canopy/80' : 'text-ink-2'}`}>{p.dek}</p>}
            <p className={`text-sm ${isDecoded ? 'text-canopy-muted' : 'text-muted'}`}>{p.author_name ?? 'BAUBC'} · {fmtDate(p.published_at, undefined, lang)}</p>
          </div>
          <Cover tone={p.cover_tone} seed={p.slug} label={p.cover_label} letterbox={isDecoded} className="rounded-2xl aspect-[16/10]" />
        </div>
      </section>
      <div className="wrap py-12 grid lg:grid-cols-[1fr_300px] gap-12">
        <Paras text={p.body} className="text-[1.1rem] leading-relaxed" />
        <aside className="grid gap-4 content-start">
          {p.stats && (
            <div className="panel grid gap-3">
              <span className="label text-muted">On Facebook</span>
              <dl className="grid grid-cols-2 gap-3">
                {[['Viewers', p.stats.viewers], ['Views', p.stats.views], ['Likes', p.stats.likes], ['Comments', p.stats.comments]].filter(([, v]) => v != null).map(([k, v]) => (
                  <div key={k as string}><dt className="text-xs text-muted">{k}</dt><dd className="heading text-2xl tnum">{fmtNum(v as number, lang)}</dd></div>
                ))}
              </dl>
              <p className="hint">From the club&apos;s Page insights (updated daily by Meta).</p>
            </div>
          )}
          {(p.facebook_url || settings.social.facebook_url) && <a href={p.facebook_url ?? settings.social.facebook_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">Watch on Facebook</a>}
          {settings.social.youtube_url && <a href={p.youtube_url ?? settings.social.youtube_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">BAUBC on YouTube</a>}
        </aside>
      </div>
      {siblings.length > 0 && (
        <section className="wrap pb-8 grid gap-6">
          <h2 className="heading text-2xl">More from this series</h2>
          <div className="grid sm:grid-cols-3 gap-6">{siblings.map((s) => <PostCard key={s.id} p={s} lang={lang} />)}</div>
        </section>
      )}
    </article>
  );
}
