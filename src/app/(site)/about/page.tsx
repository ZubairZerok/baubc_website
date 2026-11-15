import type { Metadata } from 'next';
import Link from 'next/link';
import { Arrow, Diamond } from '@/components/brand/Mark';
import { PageHero, SectionHead } from '@/components/site/bits';
import { CountUp } from '@/components/site/client';
import { getSettings, getSocialTop, getWings } from '@/server/queries/public';
import { fmtNum } from '@/lib/format';

export const metadata: Metadata = { title: 'About', description: 'What Bangladesh Agricultural University Business Club is, what it believes and how it is organised.' };

export default async function AboutPage() {
  const [settings, wings, social] = await Promise.all([getSettings(), getWings(), getSocialTop()]);
  const beliefs = [
    ['Build first, talk second.', 'We learn by running real events, real campaigns and real analysis. Slides come after the work.'],
    ['Agriculture is a business frontier.', 'Food and farming are some of the biggest opportunities in Bangladesh. They need founders, and BAU is where the knowledge lives.'],
    ['Verified, not claimed.', 'Points, positions and certificates come from records that someone checked. That is why they mean something on a CV.'],
    ['The door stays open.', 'Every BAU student can apply. Members from every faculty make the club sharper.'],
  ];
  const pillars = [
    ['Agriculture', 'Food, farms and the rural economy: a field full of real business problems.'],
    ['Technology', 'AgriTech, data and digital tools that change how value gets made.'],
    ['Business strategy', 'Case analysis, pitching and the decisions behind ventures that last.'],
  ];
  return (
    <>
      <PageHero label="About BAUBC" title={<>An ecosystem, <em className="serif-i text-brand">not a club room.</em></>}>{settings.club.bio}</PageHero>

      <section className="wrap py-20 grid lg:grid-cols-2 gap-5">
        <div className="panel spot grid gap-4 content-start reveal">
          <span className="eyebrow">Mission</span>
          <h2 className="display-md text-[clamp(1.8rem,1.3rem+1.6vw,2.7rem)]">Turn students into founders and industry leaders.</h2>
          <p className="text-ink-2 text-[1.05rem]">We help members build global competence where agriculture, technology and business strategy meet, through case analysis, competitions, a startup summit and hands-on work running the club itself.</p>
        </div>
        <div className="relative isolate overflow-hidden rounded-[22px] canopy on-canopy p-[clamp(16px,2.4vw,26px)] grid gap-4 content-start reveal" style={{ ['--d' as any]: 1 }}>
          <div className="absolute inset-0 -z-10 pat-rays-light" aria-hidden="true" />
          <span className="eyebrow !text-lime-200">Vision</span>
          <h2 className="display-md text-[clamp(1.8rem,1.3rem+1.6vw,2.7rem)]">A generation of agri-business founders, <span className="serif-i text-lime-200">made at BAU.</span></h2>
          <p className="text-white/85 text-[1.05rem]">Bangladesh Agricultural University trains the people who understand food and farming best. BAUBC adds the venture skills that turn that knowledge into companies.</p>
        </div>
      </section>

      <section className="wrap pb-20">
        <SectionHead label="Three disciplines" title={<>Where we <span className="serif-i text-brand">stand.</span></>} />
        <div className="grid md:grid-cols-3 gap-5">
          {pillars.map(([t, d], i) => (
            <div key={t} className="panel spot lift grid gap-3 content-start reveal" style={{ ['--d' as any]: i }}>
              <span className="display text-6xl text-brand/20">0{i + 1}</span>
              <h3 className="display-md text-3xl">{t}</h3>
              <p className="text-ink-2">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative isolate lime-field py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 -z-10 pat-diamonds opacity-80" aria-hidden="true" />
        <div className="wrap">
          <SectionHead label="What we believe" title={<>Four rules we <span className="serif-i text-brand">actually follow.</span></>} />
          <div className="grid sm:grid-cols-2 gap-4">
            {beliefs.map(([t, d], i) => (
              <div key={t} className="glass-strong rounded-[24px] p-6 md:p-7 grid grid-cols-[auto_1fr] gap-4 reveal" style={{ ['--d' as any]: i }}>
                <span className="grid size-10 place-items-center bg-brand text-lime-200 font-bold diamond-clip text-sm">{i + 1}</span>
                <div className="grid gap-2"><h3 className="heading text-2xl">{t}</h3><p className="text-ink-2">{d}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap py-20">
        <SectionHead label="How we are organised" title={<>Six wings <span className="serif-i text-brand">run the club.</span></>}>Each wing has a lead, its own tasks and its own share of the work.</SectionHead>
        <div className="flex flex-wrap gap-2.5">
          {wings.map((w: any) => <Link key={w.slug} href={`/wings#${w.slug}`} className="glass rounded-full pl-4 pr-5 py-2.5 font-semibold inline-flex items-center gap-2.5 hover:bg-white transition-colors"><Diamond size={9} className="text-brand" />{w.name}</Link>)}
          <Link href="/wings" className="btn btn-primary">Meet the wings <Arrow /></Link>
        </div>
      </section>

      <section className="wrap pb-8">
        <SectionHead label="Who is listening" title={<>A campus audience, <span className="serif-i text-brand">paying attention.</span></>}>From the club&apos;s own Facebook insights, October to November 2026.</SectionHead>
        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[[settings.social.facebook_followers ?? 992, '', 'followers on Facebook'], [74, '%', 'are 18 to 24 years old'], [73, '%', 'live in Mymensingh'], [49, '%', 'are women: almost an even split']].map(([n, u, l], i) => (
            <div key={l as string} className="panel grid gap-1 reveal" style={{ ['--d' as any]: i }}><dd className="display text-[clamp(2.4rem,1.6rem+2.6vw,3.8rem)]"><CountUp value={n as number} />{u}</dd><dt className="text-sm text-muted">{l}</dt></div>
          ))}
        </dl>
        <div className="table-wrap reveal">
          <table className="table">
            <thead><tr><th>Most-watched posts</th><th className="text-right">Viewers</th><th className="text-right">Comments</th><th className="text-right">Shares</th></tr></thead>
            <tbody>{social.slice(0, 6).map((s: any) => <tr key={s.title}><td className="font-medium">{s.title}</td><td className="text-right tnum">{fmtNum(s.viewers)}</td><td className="text-right tnum">{fmtNum(s.comments)}</td><td className="text-right tnum">{fmtNum(s.shares)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </>
  );
}
