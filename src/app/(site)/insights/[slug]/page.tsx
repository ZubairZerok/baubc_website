import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Arrow, Mark } from '@/components/brand/Mark';
import { Kinetic } from '@/components/site/Kinetic';
import { Cover, PostCard } from '@/components/site/bits';
import { ArticleBody, keyLines, readingMinutes, toBnDigits } from '@/components/site/Article';
import { CopyButton, ReadingProgress } from '@/components/site/client';
import { getPost, getPosts, getSettings } from '@/server/queries/public';
import { env } from '@/server/env';
import { fmtDate, fmtNum } from '@/lib/format';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getPost((await params).slug);
  return p ? { title: p.title, description: p.dek ?? undefined, openGraph: { type: 'article', title: p.title, description: p.dek ?? undefined, locale: p.lang === 'bn' ? 'bn_BD' : 'en_GB' } } : { title: 'Insight' };
}

const SERIES: Record<string, [string, string]> = { decoded: ['DECODED', 'ডিকোডেড'], 'case-studies': ['Case Studies', 'কেস স্টাডি'], news: ['Club news', 'ক্লাবের খবর'], insights: ['Deep dives', 'গভীর পাঠ'] };
const BN_MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const bnDate = (d: string | null) => { if (!d) return ''; const x = new Date(new Date(d).getTime() + 6 * 3600e3); return `${toBnDigits(String(x.getUTCDate()))} ${BN_MONTHS[x.getUTCMonth()]} ${toBnDigits(String(x.getUTCFullYear()))}`; };

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [p, all, settings] = await Promise.all([getPost(slug), getPosts(), getSettings()]);
  if (!p) notFound();
  const bn = p.lang === 'bn';
  const t = (en: string, b: string) => (bn ? b : en);
  const [seriesEn, seriesBn] = SERIES[p.series ?? 'insights'] ?? SERIES.insights;
  const siblings = all.filter((x) => x.id !== p.id && (x.series === p.series || x.lang === p.lang)).slice(0, 3);
  const keys = keyLines(p.body);
  const mins = readingMinutes(p.body, bn);
  const author = p.author_name ?? 'BAUBC';
  return (
    <article lang={bn ? 'bn' : 'en'} className={bn ? 'font-bangla' : ''}>
      <ReadingProgress />
      <header className="relative overflow-hidden lime-wash isolate">
        <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
        <div className="contour-drift" aria-hidden="true" />
        <Mark size="40rem" className="pointer-events-none absolute -right-48 -top-28 -z-10 text-brand/[.06]" />
        <div className="wrap pt-32 pb-10 md:pt-40 md:pb-14 grid justify-items-center text-center gap-6 max-w-5xl">
          <div className="flex flex-wrap justify-center gap-2 fade-up" style={{ ['--i' as any]: -3 }}>
            <Link href={`/insights?series=${p.series}`} className="tag hover:bg-white">← {t(seriesEn, seriesBn)}</Link>
            {p.episode_no && <span className="tag">Episode {String(p.episode_no).padStart(2, '0')}</span>}
            {bn && <span className="tag !bg-ink !text-lime-200 !border-transparent">বাংলা</span>}
          </div>
          <h1 className={`${bn ? 'font-bangla-display font-bold leading-[1.22] tracking-[-.005em]' : 'display'} text-[clamp(2.3rem,1.2rem+4.6vw,5.4rem)] max-w-[20ch]`}><Kinetic>{p.title}</Kinetic></h1>
          {p.dek && <p className={`text-ink-2 max-w-[46ch] fade-up ${bn ? 'text-[1.32rem] leading-[1.75]' : 'text-[1.22rem] leading-[1.6]'}`} style={{ ['--i' as any]: 2 }}>{p.dek}</p>}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-1 fade-up" style={{ ['--i' as any]: 3 }}>
            <span className="author-chip">
              <span className="grid size-11 place-items-center rounded-[14px] bg-brand text-lime-200"><Mark size={26} /></span>
              <span className="grid leading-tight text-left"><span className="text-xs text-muted">{t('Written by', 'লিখেছেন')}</span><b>{author}</b></span>
            </span>
            <span className="text-sm text-ink-2">{bn ? bnDate(p.published_at) : fmtDate(p.published_at, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <span className="size-1.5 rounded-full bg-brand/40" aria-hidden="true" />
            <span className="text-sm text-ink-2">{bn ? `${toBnDigits(String(mins))} মিনিটের পাঠ` : `${mins} min read`}</span>
          </div>
        </div>
      </header>

      {/* cover: a 2.39:1 film frame that opens like a projector shutter */}
      <figure className="wrap -mt-4 md:-mt-6 relative z-10">
        <div className="cine-wrap">
          <div className="cine group">
            {p.cover_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={p.cover_url} alt="" referrerPolicy="no-referrer" fetchPriority="high" />
              : <Cover tone={p.cover_tone} seed={p.slug} numeral={p.kind === 'episode' ? p.episode_no : null} className="cine-fill !absolute inset-0" />}
            {p.cover_label && <figcaption className="cine-cap"><span className="tag !bg-white/85 !text-ink">{p.cover_label}</span></figcaption>}
          </div>
        </div>
      </figure>

      {/* reading column centred on the page; key lines ride alongside on wide screens */}
      <div className="mx-auto w-full max-w-[1520px] px-5 sm:px-8 pt-10 pb-16 grid xl:grid-cols-[minmax(0,1fr)_minmax(0,46rem)_minmax(0,1fr)] gap-x-12 gap-y-12 items-start">
        <div className="hidden xl:block" aria-hidden="true" />
        <div className="min-w-0 w-full max-w-[46rem] mx-auto">
          {p.body && <ArticleBody body={p.body} bn={bn} />}
          <div className="mt-14 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
            <span className="author-chip"><span className="grid size-11 place-items-center rounded-[14px] bg-brand text-lime-200"><Mark size={26} /></span><span className="grid leading-tight"><span className="text-xs text-muted">{t('Written by', 'লিখেছেন')}</span><b>{author}</b></span></span>
            <CopyButton value={`${env.siteUrl}/insights/${p.slug}`} label={t('Copy link', 'লিংক কপি করুন')} />
          </div>
        </div>
        <aside className="grid gap-4 xl:sticky xl:top-28 w-full max-w-[46rem] mx-auto xl:max-w-[21rem] xl:mx-0">
          {keys.length > 0 && (
            <nav className="keylines glass-strong rounded-[24px] p-6 grid gap-3" aria-label={t('Key lines', 'মূল কথা')}>
              <span className="eyebrow">{t('Key lines', 'মূল কথা')}</span>
              <ol className="grid gap-3">
                {keys.map((k, i) => (
                  <li key={i} className="reveal" style={{ ['--d' as any]: i }}>
                    <a href={`#key-${i + 1}`} className="flex gap-3 group">
                      <span className="mt-1 grid size-6 shrink-0 place-items-center bg-lime-300 text-ink text-[11px] font-bold diamond-clip">{bn ? toBnDigits(String(i + 1)) : i + 1}</span>
                      <span className="text-[.98rem] leading-snug group-hover:text-brand transition-colors">{k}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}
          {p.stats && (
            <div className="glass-strong rounded-[24px] p-5 grid gap-4">
              <span className="eyebrow">On Facebook</span>
              <dl className="grid grid-cols-2 gap-4">
                {[['Viewers', p.stats.viewers], ['Views', p.stats.views], ['Likes', p.stats.likes], ['Comments', p.stats.comments]].filter(([, v]) => v != null).map(([k, v]) => (
                  <div key={k as string}><dd className="display-md text-3xl tnum">{fmtNum(v as number)}</dd><dt className="text-xs text-muted">{k}</dt></div>
                ))}
              </dl>
            </div>
          )}
          {(p.facebook_url || settings.social.facebook_url) && <a href={p.facebook_url ?? settings.social.facebook_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">{t('BAUBC on Facebook', 'ফেসবুকে বাউবিসি')} <Arrow /></a>}
          {(p.youtube_url || settings.social.youtube_url) && <a href={p.youtube_url ?? settings.social.youtube_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">{t('BAUBC on YouTube', 'ইউটিউবে বাউবিসি')} <Arrow /></a>}
        </aside>
      </div>
      {siblings.length > 0 && (
        <section className="wrap pt-8 grid gap-7" lang="en">
          <h2 className="display-md text-3xl font-display">{t(`More from ${seriesEn}`, 'আরও পড়ুন')}</h2>
          <div className="grid sm:grid-cols-3 gap-6">{siblings.map((s, i) => <PostCard key={s.id} p={s} i={i} />)}</div>
        </section>
      )}
    </article>
  );
}
