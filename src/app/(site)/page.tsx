import Link from 'next/link';
import { FurrowCanvas } from '@/components/site/client';
import { Cover, EventCard, PostCard, SectionHead, eventWhen, priceLabel } from '@/components/site/bits';
import { getEvents, getPosts, getRecruitment, getSettings, getStats } from '@/server/queries/public';
import { getLang } from '@/lib/lang';
import { pick, t } from '@/lib/i18n';
import { CATEGORY_LABEL, fmtNum } from '@/lib/format';

export default async function Home() {
  const [lang, events, posts, stats, settings, cycle] = await Promise.all([getLang(), getEvents(), getPosts(), getStats(), getSettings(), getRecruitment()]);
  const featured = events.find((e) => e.featured) ?? events[0];
  const upcoming = events.filter((e) => e.status === 'published' && e.id !== featured?.id).slice(0, 4);
  const decoded = posts.filter((p) => p.series === 'decoded' && p.kind === 'episode').sort((a, b) => (a.episode_no ?? 0) - (b.episode_no ?? 0));
  const latest = posts.filter((p) => p.series !== 'decoded').slice(0, 3);
  const top = [...decoded].sort((a, b) => (b.stats?.viewers ?? 0) - (a.stats?.viewers ?? 0))[0];
  const left = featured ? featured.capacity - featured.sold - featured.held : 0;

  const signals = [
    featured && `${pick(lang, featured.title, featured.title_bn)} · ${featured.reg_open ? `${fmtNum(left, lang)} ${t(lang, 'seats_left').toLowerCase()}` : eventWhen(featured, lang)}`,
    top && `DECODED · ${top.cover_label?.split('·').slice(1).join('·').trim()} · ${fmtNum(top.stats.viewers, lang)} viewers`,
    cycle && `Recruitment ${cycle.label} · ${cycle.status === 'open' ? 'applications open' : 'opening soon'}`,
    posts.find((p) => p.series === 'case-studies') && `BAUBC Case Studies · ${posts.find((p) => p.series === 'case-studies')!.title}`,
  ].filter(Boolean) as string[];

  return (
    <>
      {/* HERO */}
      <section className="relative canopy on-canopy overflow-hidden isolate" aria-labelledby="hero-title">
        <FurrowCanvas className="-z-10" />
        <div className="absolute inset-0 -z-10" style={{ background: 'linear-gradient(90deg, rgb(7 20 14 / .92) 0%, rgb(7 20 14 / .6) 45%, rgb(7 20 14 / 0) 80%)' }} />
        <div className="wrap pt-16 pb-14 md:pt-28 md:pb-20 grid gap-7">
          <span className="tag w-max max-w-full"><i>BAUBC</i>{lang === 'bn' ? 'বাংলাদেশ কৃষি বিশ্ববিদ্যালয়' : 'Bangladesh Agricultural University'}</span>
          <h1 id="hero-title" className="display text-[clamp(3.2rem,1.3rem+8vw,9rem)] max-w-[12ch]">
            {t(lang, 'hero_line1')} <span className="serif-i text-signal">{t(lang, 'hero_line2')}</span>
          </h1>
          <p className={lang === 'bn' ? 'text-xl text-canopy-leaf' : 'bn-display text-[clamp(1.6rem,1rem+2.4vw,2.8rem)] text-canopy-leaf'} lang={lang === 'bn' ? 'en' : 'bn'}>{t(lang, 'hero_bn')}</p>
          <p className="max-w-[58ch] text-[1.08rem] text-on-canopy/85">{t(lang, 'hero_lede')}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/join" className="btn btn-primary">{t(lang, 'cta_join')}</Link>
            <Link href="/events" className="btn btn-ghost">{t(lang, 'cta_events')}</Link>
          </div>
        </div>
        {signals.length > 0 && (
          <div className="ticker border-t border-white/10 overflow-hidden whitespace-nowrap" aria-label="Club signals">
            <div className="ticker-run py-3.5 label text-canopy-muted">
              {[...signals, ...signals].map((s, i) => (
                <span key={i} aria-hidden={i >= signals.length}>
                  {i % signals.length === 0 && <i className="inline-block size-[7px] rounded-full bg-signal mr-2 align-middle" />}
                  <b className="text-on-canopy font-semibold">{s.split(' · ')[0]}</b>{s.includes(' · ') ? ' · ' + s.split(' · ').slice(1).join(' · ') : ''}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* PILLARS */}
      <section className="wrap py-20 md:py-28">
        <SectionHead label={t(lang, 'pillars_label')} title={t(lang, 'pillars_title')}>{settings.club.bio}</SectionHead>
        <div className="grid md:grid-cols-3 gap-px bg-line border border-line">
          {([['pillar_agri', 'pillar_agri_d', '01'], ['pillar_tech', 'pillar_tech_d', '02'], ['pillar_strategy', 'pillar_strategy_d', '03']] as const).map(([k, d, n]) => (
            <div key={k} className="bg-paper p-7 grid gap-4 content-start reveal">
              <span className="label text-muted">{n}</span>
              <h3 className="display-md text-3xl">{t(lang, k)}</h3>
              <p className="text-ink-2">{t(lang, d)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* NEXT UP */}
      {featured && (
        <section className="wrap pb-20 md:pb-28">
          <SectionHead label={t(lang, 'next_up')} title={pick(lang, featured.title, featured.title_bn)}>{featured.summary}</SectionHead>
          <div className="grid lg:grid-cols-[1.35fr_1fr] gap-5 reveal">
            <Cover tone={featured.cover_tone} seed={featured.slug} label={`${CATEGORY_LABEL[featured.category]} · ${eventWhen(featured, lang)}`} title={featured.subtitle ?? undefined} className="rounded-2xl min-h-[280px]" />
            <div className="panel grid gap-0 content-start">
              <span className="label text-muted mb-3">Term sheet</span>
              {[
                ['When', eventWhen(featured, lang)],
                ['Where', featured.venue ?? 'To be announced'],
                ['Fee', priceLabel(featured, lang) || '—'],
                ['Eligibility', featured.eligibility ?? 'Open'],
                ['Registration', featured.reg_open ? `Open · ${fmtNum(left, lang)} seats left` : 'Opens soon'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-6 py-3 border-b border-line text-[.95rem]"><span className="text-muted">{k}</span><span className="font-semibold text-right">{v}</span></div>
              ))}
              <div className="flex flex-wrap gap-3 pt-5">
                <Link href={`/events/${featured.slug}`} className="btn btn-primary">{featured.reg_open ? t(lang, 'register') : 'See details'}</Link>
                <Link href="/events" className="btn btn-ghost">All events</Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* DECODED */}
      {decoded.length > 0 && (
        <section className="canopy on-canopy py-20 md:py-28">
          <div className="wrap">
            <div className="grid md:grid-cols-[1fr_auto] gap-6 items-end mb-10 reveal">
              <div className="grid gap-3 max-w-2xl">
                <span className="label text-signal">Series</span>
                <h2 className="display-md text-[clamp(2rem,1.2rem+3vw,3.6rem)]"><span className="serif-i">DECODED</span> · The Game Behind the Game</h2>
                <p className="text-on-canopy/80">{t(lang, 'decoded_lede')}</p>
              </div>
              <Link href="/insights?series=decoded" className="btn btn-ghost w-max">{t(lang, 'all_episodes')}</Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {decoded.map((p) => <PostCard key={p.id} p={p} lang={lang} big />)}
            </div>
          </div>
        </section>
      )}

      {/* NUMBERS */}
      <section className="wrap py-20 md:py-24">
        <SectionHead label={t(lang, 'impact_label')} title={lang === 'bn' ? 'ক্যাম্পাস থেকে শুরু, বাড়ছে প্রতিদিন' : 'Started on campus, growing every week'}>
          {lang === 'bn' ? 'ফেসবুক পরিসংখ্যান: আগস্ট–নভেম্বর ২০২৬।' : `Facebook figures from the club's own Page insights, August–November 2026.`}
        </SectionHead>
        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-line border border-line">
          {[
            [fmtNum(stats.social_followers ?? 0, lang), lang === 'bn' ? 'ফেসবুক অনুসারী' : 'Facebook followers'],
            [fmtNum(stats.social_viewers ?? 0, lang), lang === 'bn' ? 'শীর্ষ ১০ পোস্টে দর্শক' : 'Viewers across our top 10 posts'],
            [fmtNum((stats.episodes ?? 0), lang), lang === 'bn' ? 'প্রকাশিত পর্ব' : 'Episodes published'],
            [fmtNum(stats.wings ?? 0, lang), lang === 'bn' ? 'উইং' : 'Wings'],
          ].map(([n, l]) => (
            <div key={l} className="bg-paper p-6 md:p-8 grid gap-2 reveal">
              <dt className="order-2 text-muted text-sm">{l}</dt>
              <dd className="order-1 display-md text-[clamp(2.4rem,1.6rem+3vw,4rem)] tnum">{n}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* PROGRAMMES */}
      {upcoming.length > 0 && (
        <section className="wrap pb-20 md:pb-28">
          <SectionHead label={lang === 'bn' ? 'আয়োজন' : 'Programmes'} title={lang === 'bn' ? 'প্রতিযোগিতা, পিচ ও হ্যাকাথন' : 'Competitions, pitches and hackathons'} />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{upcoming.map((e) => <EventCard key={e.id} e={e} lang={lang} />)}</div>
        </section>
      )}

      {/* JOIN */}
      <section className="wrap pb-20 md:pb-28">
        <div className="relative overflow-hidden rounded-3xl canopy on-canopy isolate reveal">
          <Cover tone="canopy" seed="join" className="absolute inset-0 -z-10 opacity-70" />
          <div className="p-8 md:p-14 grid md:grid-cols-[1.4fr_1fr] gap-8 items-end">
            <div className="grid gap-4">
              <span className="label text-signal">{cycle ? `Recruitment ${cycle.label}` : 'Recruitment'}</span>
              <h2 className="display-md text-[clamp(2rem,1.2rem+3vw,3.6rem)] max-w-[14ch]">{lang === 'bn' ? 'আপনার উদ্যোগের যাত্রা এখানেই শুরু' : 'Your founder journey starts here'}</h2>
              <p className="text-on-canopy/80 max-w-xl">{lang === 'bn' ? 'প্রতি বছর সদস্য নিয়োগ হয়। আবেদন করুন, অ্যাকাউন্ট সক্রিয় করুন, এবং ড্যাশবোর্ডে আপনার আবেদনের অবস্থা দেখুন।' : 'BAUBC recruits every year. Apply once, activate your account, and follow your application from your own dashboard.'}</p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Link href="/join" className="btn btn-primary">{cycle?.status === 'open' ? 'Apply now' : 'How to join'}</Link>
              <Link href="/wings" className="btn btn-ghost">Explore the wings</Link>
            </div>
          </div>
        </div>
      </section>

      {/* LATEST */}
      {latest.length > 0 && (
        <section className="wrap pb-8">
          <SectionHead label={t(lang, 'nav_insights')} title={lang === 'bn' ? 'সাম্প্রতিক বিশ্লেষণ' : 'Latest analysis'} />
          <div className="grid md:grid-cols-3 gap-6">{latest.map((p) => <PostCard key={p.id} p={p} lang={lang} />)}</div>
        </section>
      )}
    </>
  );
}
