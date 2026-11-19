import type { Metadata } from 'next';
import { Fragment } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Arrow, Mark } from '@/components/brand/Mark';
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
  const words = p.title.split(/\s+/);
  return (
    <article lang={bn ? 'bn' : 'en'} className={bn ? 'font-bangla' : ''}>
      <ReadingProgress />
      <header className="relative overflow-hidden lime-wash isolate">
        <div className="absolute inset-0 -z-10 pat-diamonds opacity-70 [mask-image:linear-gradient(90deg,transparent,#000_55%)]" aria-hidden="true" />
        <Mark size="46rem" className="pointer-events-none absolute -right-40 -top-24 -z-10 text-brand/[.07]" />
        <div className="wrap pt-32 pb-12 md:pt-40 md:pb-16 grid gap-6 max-w-5xl">
          <div className="flex flex-wrap gap-2 fade-up" style={{ ['--i' as any]: -3 }}>
            <Link href={`/insights?series=${p.series}`} className="tag hover:bg-white">← {t(seriesEn, seriesBn)}</Link>
            {p.episode_no && <span className="tag">Episode {String(p.episode_no).padStart(2, '0')}</span>}
            {bn && <span className="tag !bg-ink !text-lime-200 !border-transparent">বাংলা</span>}
          </div>
          <h1 className={`${bn ? 'font-bangla-display font-bold leading-[1.18] tracking-[-.01em]' : 'display'} text-[clamp(2.4rem,1.3rem+5vw,5.6rem)] max-w-[18ch]`}>
            {words.map((w, i) => <Fragment key={i}><span className="word-rise" style={{ ['--i' as any]: i }}><span>{w}</span></span>{i < words.length - 1 ? ' ' : ''}</Fragment>)}
          </h1>
          {p.dek && <p className={`text-ink-2 max-w-2xl fade-up ${bn ? 'text-[1.3rem] leading-[1.7]' : 'text-[1.2rem]'}`} style={{ ['--i' as any]: 1 }}>{p.dek}</p>}
          <div className="flex flex-wrap items-center gap-4 pt-1 fade-up" style={{ ['--i' as any]: 2 }}>
            <span className="author-chip">
              <span className="grid size-11 place-items-center rounded-[14px] bg-brand text-lime-200"><Mark size={26} /></span>
              <span className="grid leading-tight"><span className="text-xs text-muted">{t('Written by', 'লিখেছেন')}</span><b>{author}</b></span>
            </span>
            <span className="text-sm text-ink-2">{bn ? bnDate(p.published_at) : fmtDate(p.published_at, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <span className="text-sm text-ink-2">·</span>
            <span className="text-sm text-ink-2">{bn ? `${toBnDigits(String(mins))} মিনিটের পাঠ` : `${mins} min read`}</span>
          </div>
        </div>
      </header>

      <div className="wrap -mt-2 md:-mt-4">
        <div className="group reveal" data-r="scale"><Cover tone={p.cover_tone} seed={p.slug} label={p.cover_label} numeral={p.kind === 'episode' ? p.episode_no : null} className="aspect-[16/7] cut rounded-[28px] shadow-[var(--shadow)]" /></div>
      </div>

      <div className="wrap py-14 grid lg:grid-cols-[1fr_340px] gap-12 items-start">
        <div className="min-w-0 max-w-[70ch]">
          {p.body && <ArticleBody body={p.body} bn={bn} />}
          <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-line pt-6">
            <span className="author-chip"><span className="grid size-11 place-items-center rounded-[14px] bg-brand text-lime-200"><Mark size={26} /></span><span className="grid leading-tight"><span className="text-xs text-muted">{t('Written by', 'লিখেছেন')}</span><b>{author}</b></span></span>
            <span className="ml-auto"><CopyButton value={`${env.siteUrl}/insights/${p.slug}`} label={t('Copy link', 'লিংক কপি করুন')} /></span>
          </div>
        </div>
        <aside className="grid gap-4 lg:sticky lg:top-28">
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
              <p className="hint">From the club&apos;s Page insights. Meta updates these about once a day.</p>
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
