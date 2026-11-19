import { Suspense } from 'react';
import { HomeReels } from '@/components/site/HomeReels';
import Link from 'next/link';
import { Arrow, Diamond, Mark } from '@/components/brand/Mark';
import { LedgerStamp } from '@/components/ui/Stamp';
import { CountUp, HeroBurst, Journey, WingsBurst } from '@/components/site/client';
import { Cover, EventCard, PostCard, SectionHead, eventWhen, priceLabel } from '@/components/site/bits';
import { MemberOfMonth } from '@/components/site/MemberOfMonth';
import { getEvents, getPosts, getRecognition, getRecruitment, getSettings, getStats, getWings } from '@/server/queries/public';
import { CATEGORY_LABEL, fmtDate, fmtNum } from '@/lib/format';

export default async function Home() {
  const [events, posts, stats, settings, cycle, wings, motm] = await Promise.all([getEvents(), getPosts(), getStats(), getSettings(), getRecruitment(), getWings(), getRecognition()]);
  const featured = events.find((e) => e.featured) ?? events[0];
  const others = events.filter((e) => e.status === 'published' && e.id !== featured?.id).slice(0, 4);
  const decoded = posts.filter((p) => p.series === 'decoded' && p.kind === 'episode').sort((a, b) => (a.episode_no ?? 0) - (b.episode_no ?? 0));
  const latest = posts.filter((p) => p.series !== 'decoded').slice(0, 3);
  const top = [...decoded].sort((a, b) => (b.stats?.viewers ?? 0) - (a.stats?.viewers ?? 0))[0];
  const left = featured ? featured.capacity - featured.sold - featured.held : 0;
  const taken = featured && featured.capacity ? Math.round(((featured.sold + featured.held) / featured.capacity) * 48) : 0;
  const programmes = ['Startup Summit', 'Case Competition', 'The Pitch Arena', 'Business Olympiad', 'AgriTech Hackathon', 'DECODED', 'BAUBC Case Studies'];
  const open = cycle?.status === 'open';

  const stages = [
    { k: 'Spark', t: 'Get curious.', b: 'Start with DECODED and BAUBC Case Studies. We take famous films and real markets apart and show you the business decisions inside them.', href: '/insights', cta: 'Watch and read' },
    { k: 'Root', t: 'Find your wing.', b: 'Six wings run the club: research, media, events, partnerships, people and technology. Pick the one that fits how you think, then get to work.', href: '/wings', cta: 'Meet the wings' },
    { k: 'Grow', t: 'Do real work.', b: 'Take on tasks with real deadlines. Your lead reviews what you make, and every approved piece earns points on a record nobody can edit. Not even you.', href: '/join', cta: 'How membership works' },
    { k: 'Pitch', t: 'Take the stage.', b: 'The Startup Summit, case competitions, the Pitch Arena, the Olympiad and the Hackathon. Bring a team, bring an idea, and defend it in front of people who build things.', href: '/events', cta: 'See what is coming' },
    { k: 'Harvest', t: 'Leave with proof.', b: 'Certificates anyone can check with a QR code, and a CV built only from work that was actually verified. Evidence, not adjectives.', href: '/verify', cta: 'Verify a certificate' },
  ];

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden" aria-labelledby="hero-title">
        <div className="hero-mesh -z-10" aria-hidden="true"><i /><i /><i /><i /></div>
        <div className="wrap pt-32 md:pt-40 pb-14 md:pb-20 grid lg:grid-cols-[1.08fr_.92fr] gap-6 items-center">
          <div className="grid gap-7 relative z-10">
            <span className="tag w-max max-w-full fade-up" style={{ ['--i' as any]: -3 }}><Diamond size={8} className="text-brand" />Bangladesh Agricultural University Business Club</span>
            <h1 id="hero-title" className="display text-[clamp(3.5rem,1.1rem+8.8vw,9.4rem)]">
              <span className="line-rise" style={{ ['--i' as any]: 0 }}><span>Plant ideas.</span></span>
              <span className="line-rise" style={{ ['--i' as any]: 1 }}><span><em className="serif-i text-brand pr-[.06em]">Harvest</em> founders.</span></span>
            </h1>
            <p className="max-w-[54ch] text-[1.14rem] text-ink-2 fade-up" style={{ ['--i' as any]: 1 }}>
              BAUBC is the student-run innovation ecosystem at BAU, Mymensingh. We decode how real businesses work, build in teams, and put student founders on a real stage, where agriculture, technology and business strategy meet.
            </p>
            <div className="flex flex-wrap gap-3 fade-up" style={{ ['--i' as any]: 2 }}>
              <Link href="/join" className="btn btn-primary btn-lg">Join the club <Arrow /></Link>
              <Link href="/events" className="btn btn-secondary btn-lg">See what&apos;s on</Link>
            </div>
            <dl className="flex flex-wrap gap-x-8 gap-y-3 pt-2 fade-up" style={{ ['--i' as any]: 3 }}>
              {[[stats.social_followers ?? 0, 'followers'], [stats.social_viewers ?? 0, 'viewers on our top posts'], [stats.wings ?? 0, 'wings']].map(([n, l]) => (
                <div key={l as string} className="flex items-baseline gap-2"><dd className="heading text-2xl tnum">{fmtNum(n as number)}</dd><dt className="text-sm text-ink-2">{l}</dt></div>
              ))}
            </dl>
          </div>

          <div className="relative mx-auto w-full max-w-[620px] lg:max-w-none lg:-mr-10 -mt-4 lg:mt-0">
            <HeroBurst className="w-full" />
            {featured && (
              <Link href={`/events/${featured.slug}`} className="group glass-strong float-a absolute left-0 top-[6%] w-[min(58%,290px)] rounded-[22px] p-4 grid gap-2 hover:!bg-white transition-colors">
                <span className="label text-green flex items-center gap-1.5"><span className="size-[7px] bg-brand diamond-clip animate-pulse" />Next up</span>
                <b className="heading text-[1.05rem] leading-tight">{featured.title}</b>
                <span className="text-xs text-ink-2">{eventWhen(featured)}</span>
                <span className="plot mt-1" aria-hidden="true">{Array.from({ length: 48 }, (_, i) => <i key={i} className={i < taken ? 'sold' : ''} />)}</span>
                <span className="text-xs font-semibold flex items-center justify-between">{featured.reg_open ? `${fmtNum(left)} seats left` : 'Registration opens soon'}<Arrow size={12} className="text-brand" /></span>
              </Link>
            )}
            {top && (
              <Link href={`/insights/${top.slug}`} className="glass-strong float-b absolute right-[2%] bottom-[7%] w-[min(56%,270px)] rounded-[22px] p-4 grid gap-1.5 hover:!bg-white transition-colors">
                <span className="label text-green">Most watched</span>
                <b className="heading text-[1.02rem] leading-tight">DECODED: {top.title.split(':')[0]}</b>
                <span className="text-xs text-ink-2 tnum">{fmtNum(top.stats.viewers)} viewers · {fmtNum(top.stats.comments)} comments</span>
              </Link>
            )}
            <span className="glass float-c absolute right-[8%] top-[10%] rounded-full px-3.5 py-2 text-xs font-semibold hidden sm:flex items-center gap-2"><Diamond size={8} className="text-brand" />{open ? 'Recruitment is open' : `Recruitment ${cycle?.label ?? ''}`}</span>
          </div>
        </div>

        <div className="marquee canopy on-canopy py-4" aria-label="BAUBC programmes">
          <div className="marquee-run display-md text-[clamp(1.3rem,1rem+1.2vw,2rem)] uppercase">
            {[...programmes, ...programmes].map((p, i) => (
              <span key={i} className="inline-flex items-center gap-[2.2rem]" aria-hidden={i >= programmes.length}>{p}<Diamond size={14} className="text-lime-300" /></span>
            ))}
          </div>
        </div>
      </section>

      {/* ── THE JOURNEY ──────────────────────────────────────── */}
      <section className="wrap pt-24 md:pt-36 pb-12">
        <SectionHead label="The journey" title={<>Every founder starts <span className="serif-i text-brand">as a seed.</span></>}>
          This is how a curious student turns into someone who can start things. Follow the spark down the page.
        </SectionHead>
        <Journey>
          {stages.map((s, i) => (
            <article key={s.k} className="stage grid lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] gap-8 items-center py-9 md:py-12 border-b border-line last:border-0">
              <div className="grid md:grid-cols-[auto_1fr] gap-3 md:gap-9 items-start">
                <span className="stage-no display text-[clamp(3.6rem,2rem+5vw,7.2rem)] leading-[.8]">0{i + 1}</span>
                <div className="grid gap-3 max-w-xl">
                  <span className="label text-green">{s.k}</span>
                  <h3 className="display-md text-[clamp(1.9rem,1.4rem+1.6vw,2.9rem)]">{s.t}</h3>
                  <p className="text-ink-2 text-[1.06rem]">{s.b}</p>
                  <Link href={s.href} className="link-arrow w-max mt-1">{s.cta}<Arrow size={13} /></Link>
                </div>
              </div>
              <div className="hidden lg:block">
                {i === 0 && top && <Cover tone={top.cover_tone} seed={top.slug} label={top.cover_label} numeral={top.episode_no} className="aspect-[16/10] cut rounded-[22px] shadow-[var(--shadow)]" />}
                {i === 1 && <div className="flex flex-wrap gap-2 justify-end">{wings.slice(0, 6).map((w: any) => <span key={w.slug} className="glass rounded-full px-4 py-2 text-sm font-semibold">{w.name}</span>)}</div>}
                {i === 2 && (
                  <div className="glass-strong rounded-[22px] p-5 grid gap-3">
                    <span className="label text-muted">How a task becomes a record</span>
                    {['You submit the work', 'Your lead reviews it', 'Points land on your ledger'].map((x, j) => (
                      <div key={x} className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-full bg-brand text-lime-200 text-sm font-bold">{j + 1}</span><span className="font-semibold">{x}</span>{j === 2 && <LedgerStamp size={34} className="ml-auto" />}</div>
                    ))}
                  </div>
                )}
                {i === 3 && featured && (
                  <div className="glass-strong rounded-[22px] p-5 grid gap-2">
                    <span className="label text-muted">{CATEGORY_LABEL[featured.category]}</span>
                    <b className="heading text-xl">{featured.title}</b>
                    <span className="text-sm text-ink-2">{eventWhen(featured)} · {featured.venue ?? 'Venue to be announced'}</span>
                  </div>
                )}
                {i === 4 && (
                  <div className="glass-strong rounded-[22px] p-5 flex items-center gap-4">
                    <LedgerStamp size={76} />
                    <div className="grid gap-1"><span className="label text-muted">Every certificate</span><b className="heading text-lg">Has a serial, a QR code and a public check.</b></div>
                  </div>
                )}
              </div>
            </article>
          ))}
        </Journey>
      </section>

      {/* ── SIX WINGS ────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden py-24 md:py-32">
        <div className="absolute inset-0 -z-10 lime-wash rotate-180" aria-hidden="true" />
        <div className="absolute inset-0 -z-10 pat-rays opacity-60" aria-hidden="true" />
        <div className="wrap">
          <SectionHead label="Six wings" title={<>Our logo has six rays. <span className="serif-i text-brand">So does the club.</span></>}>
            Hover a ray, or tap a name, to meet the wing behind it.
          </SectionHead>
          <div className="reveal" data-r="scale"><WingsBurst wings={wings as any} /></div>
        </div>
      </section>

      {/* ── NEXT UP ──────────────────────────────────────────── */}
      {featured && (
        <section className="wrap py-24 md:py-32">
          <SectionHead label="Next up" title={<>{featured.title.replace(/^BAUBC /, '')}<span className="text-brand">.</span></>}>{featured.summary}</SectionHead>
          <div className="group grid lg:grid-cols-[1.25fr_1fr] gap-5 reveal" data-r="scale">
            <Cover tone={featured.cover_tone} seed={featured.slug} label={`${CATEGORY_LABEL[featured.category]} · ${eventWhen(featured)}`} title={featured.subtitle ?? undefined} className="cut rounded-[28px] min-h-[300px] shadow-[var(--shadow)]" />
            <div className="panel spot grid gap-0 content-start">
              <span className="eyebrow mb-3">Term sheet</span>
              {[['When', eventWhen(featured)], ['Where', featured.venue ?? 'To be announced'], ['Entry', priceLabel(featured) || 'To be announced'], ['Who', featured.eligibility ?? 'Open to all'],
                ['Seats', featured.reg_open ? `${fmtNum(left)} of ${fmtNum(featured.capacity)} left` : `${fmtNum(featured.capacity)} planned`]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-6 py-3 border-b border-line text-[.96rem]"><span className="text-muted">{k}</span><span className="font-semibold text-right">{v}</span></div>
              ))}
              <div className="flex flex-wrap gap-3 pt-5">
                <Link href={`/events/${featured.slug}`} className="btn btn-primary">{featured.reg_open ? 'Register now' : 'See the details'} <Arrow /></Link>
                <Link href="/events" className="btn btn-ghost">All events</Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── DECODED ──────────────────────────────────────────── */}
      {decoded.length > 0 && (
        <section className="relative isolate canopy on-canopy py-24 md:py-32 overflow-hidden">
          <div className="absolute inset-0 -z-10 pat-diamonds-light" aria-hidden="true" />
          <Mark size="54rem" className="pointer-events-none absolute -left-64 -top-40 -z-10 text-white/[.06]" />
          <div className="wrap">
            <div className="grid md:grid-cols-[1fr_auto] gap-6 items-end mb-12">
              <div className="grid gap-4 max-w-3xl">
                <span className="eyebrow !text-lime-200 reveal">Our flagship series</span>
                <h2 className="display-md text-[clamp(2.2rem,1.3rem+3.4vw,4.2rem)] reveal" style={{ ['--d' as any]: 1 }}>DECODED: <span className="serif-i text-lime-200">the game behind the game.</span></h2>
                <p className="text-white/85 text-[1.08rem] max-w-2xl reveal" style={{ ['--d' as any]: 2 }}>Spider-Man was a licensing bet. Titanic was a budget crisis. Barbie was a marketing machine. Monpura beat a downturn. We take the story apart and show you the business inside.</p>
              </div>
              <Link href="/insights?series=decoded" className="btn btn-lime w-max reveal">All episodes <Arrow /></Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">{decoded.map((p, i) => <PostCard key={p.id} p={p} i={i} dark />)}</div>
          </div>
        </section>
      )}

      {/* ── REELS (YouTube) ── */}
      <Suspense fallback={null}><HomeReels /></Suspense>

      {/* ── NUMBERS ──────────────────────────────────────────── */}
      <section className="relative isolate lime-field py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 -z-10 pat-diamonds opacity-80" aria-hidden="true" />
        <div className="wrap">
          <SectionHead label="In numbers" title={<>Small club. <span className="serif-i text-brand">Loud signal.</span></>}>Facebook figures come from the club&apos;s own Page insights, August to November 2026.</SectionHead>
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[[stats.social_followers ?? 0, 'Facebook followers'], [stats.social_viewers ?? 0, 'Viewers across our top ten posts'], [stats.episodes ?? 0, 'Episodes published'], [stats.events ?? 0, 'Programmes on the calendar']].map(([n, l], i) => (
              <div key={l as string} className="glass-strong rounded-[24px] p-6 md:p-7 grid gap-2 reveal" style={{ ['--d' as any]: i }}>
                <dd className="display text-[clamp(2.6rem,1.6rem+3.4vw,4.6rem)]"><CountUp value={n as number} /></dd>
                <dt className="text-ink-2 text-sm">{l}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── PROGRAMMES ───────────────────────────────────────── */}
      {others.length > 0 && (
        <section className="wrap py-24 md:py-32">
          <SectionHead label="Programmes" title={<>Four more ways <span className="serif-i text-brand">to test yourself.</span></>}>Dates are announced here first. Seats update live once registration opens.</SectionHead>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{others.map((e, i) => <EventCard key={e.id} e={e} i={i} />)}</div>
        </section>
      )}

      {/* ── MEMBER OF THE MONTH + JOIN ───────────────────────── */}
      <section className="wrap pb-10">
        <div className={`grid gap-5 ${motm ? 'lg:grid-cols-[1fr_1.5fr]' : ''}`}>
          {motm && <MemberOfMonth award={motm} compact />}
          <div className="relative isolate overflow-hidden rounded-[32px] canopy on-canopy cut reveal" data-r="scale">
            <div className="absolute inset-0 -z-10 pat-rays-light" aria-hidden="true" />
            <Mark size="34rem" className="pointer-events-none absolute -right-28 -bottom-40 -z-10 text-lime-300/25" />
            <div className="p-8 md:p-14 grid gap-5 max-w-2xl">
              <span className="eyebrow !text-lime-200">{open ? `Recruitment ${cycle?.label} is open` : `Recruitment ${cycle?.label ?? ''}`}</span>
              <h2 className="display-md text-[clamp(2.2rem,1.3rem+3.2vw,4rem)]">There is a seat with <span className="serif-i text-lime-200">your name on it.</span></h2>
              <p className="text-white/85 text-[1.06rem]">We recruit once a year. Apply once, set your own password from the link we email you, and follow your application from your own dashboard.</p>
              <div className="flex flex-wrap gap-3 pt-1">
                <Link href="/join" className="btn btn-lime btn-lg">{open ? 'Apply now' : 'How to join'} <Arrow /></Link>
                <Link href="/wings" className="btn btn-ghost btn-lg">Explore the wings</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LATEST ───────────────────────────────────────────── */}
      {latest.length > 0 && (
        <section className="wrap pt-20 md:pt-28">
          <SectionHead label="Insights" title={<>Fresh from <span className="serif-i text-brand">the feed.</span></>} />
          <div className="grid md:grid-cols-3 gap-6">{latest.map((p, i) => <PostCard key={p.id} p={p} i={i} />)}</div>
        </section>
      )}
    </>
  );
}
