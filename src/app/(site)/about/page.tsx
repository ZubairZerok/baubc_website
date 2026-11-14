import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero, SectionHead } from '@/components/site/bits';
import { getSettings, getSocialTop, getWings } from '@/server/queries/public';
import { getLang } from '@/lib/lang';
import { fmtNum } from '@/lib/format';

export const metadata: Metadata = { title: 'About', description: 'Mission, values and structure of Bangladesh Agricultural University Business Club.' };

export default async function AboutPage() {
  const [lang, settings, wings, social] = await Promise.all([getLang(), getSettings(), getWings(), getSocialTop()]);
  const values = [
    ['Build, then talk', 'We learn by running real events, real campaigns and real analysis.'],
    ['Agriculture is a business frontier', 'Food and farming are among the biggest opportunities in Bangladesh, and they need founders.'],
    ['Verified, not claimed', 'Points, positions and certificates come from verified records, so they mean something on a CV.'],
    ['Open doors', 'Every BAU student can apply. Members from every faculty make the club stronger.'],
  ];
  return (
    <>
      <PageHero label="About BAUBC" title={<>An innovation ecosystem <span className="serif-i">on campus</span></>} bn="ক্যাম্পাসে উদ্ভাবনের ইকোসিস্টেম">{settings.club.bio}</PageHero>
      <section className="wrap py-16 grid lg:grid-cols-2 gap-12">
        <div className="grid gap-5 content-start reveal">
          <span className="label text-green">Mission</span>
          <h2 className="display-md text-4xl">Turn students into founders and industry leaders</h2>
          <p className="text-ink-2 text-lg">We help members build global competence at the intersection of agriculture, technology and business strategy, through case analysis, competitions, a startup summit and hands-on work for the club itself.</p>
        </div>
        <div className="grid gap-5 content-start reveal">
          <span className="label text-green">Vision</span>
          <h2 className="display-md text-4xl">A generation of agri-business founders from BAU</h2>
          <p className="text-ink-2 text-lg">Bangladesh Agricultural University in Mymensingh trains the people who understand food and farming best. BAUBC adds the business and venture skills to turn that knowledge into companies.</p>
        </div>
      </section>
      <section className="wrap pb-16">
        <SectionHead label="Values" title="How we work" />
        <div className="grid sm:grid-cols-2 gap-px bg-line border border-line">
          {values.map(([t, d], i) => <div key={t} className="bg-paper p-7 grid gap-3 reveal"><span className="label text-muted">0{i + 1}</span><h3 className="heading text-2xl">{t}</h3><p className="text-ink-2">{d}</p></div>)}
        </div>
      </section>
      <section className="wrap pb-16">
        <SectionHead label="Structure" title="Wings that run the club">Each wing has a lead, its own tasks and its own share of the club&apos;s work. <Link href="/wings" className="underline text-link">See all wings →</Link></SectionHead>
        <div className="flex flex-wrap gap-2">{wings.map((w: any) => <Link key={w.slug} href={`/wings#${w.slug}`} className="tag hover:border-link"><i>WING</i>{w.name}</Link>)}</div>
      </section>
      <section className="wrap pb-8">
        <SectionHead label="Our audience" title="Who follows BAUBC">From the club&apos;s Facebook insights, Oct–Nov 2026: about three-quarters of followers are 18–24, most are in Mymensingh and Dhaka, and the audience is balanced between men and women.</SectionHead>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Top posts</th><th className="text-right">Viewers</th><th className="text-right">Comments</th><th className="text-right">Shares</th></tr></thead>
            <tbody>{social.slice(0, 6).map((s: any) => <tr key={s.title}><td>{s.title}</td><td className="text-right tnum">{fmtNum(s.viewers, lang)}</td><td className="text-right tnum">{fmtNum(s.comments, lang)}</td><td className="text-right tnum">{fmtNum(s.shares, lang)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </>
  );
}
