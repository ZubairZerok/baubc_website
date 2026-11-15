import type { Metadata } from 'next';
import Link from 'next/link';
import { Arrow, RAYS } from '@/components/brand/Mark';
import { PageHero } from '@/components/site/bits';
import { WingsBurst } from '@/components/site/client';
import { getWings } from '@/server/queries/public';

export const metadata: Metadata = { title: 'Wings', description: 'The six wings that run BAUBC.' };

export default async function WingsPage() {
  const wings = await getWings();
  return (
    <>
      <PageHero label="Wings" title={<>Six rays. <em className="serif-i text-brand">Six wings.</em></>}>Every member belongs to a wing. Leads hand out the work, review it and put names forward for recognition.</PageHero>
      <section className="wrap py-16"><div className="reveal" data-r="scale"><WingsBurst wings={wings as any} /></div></section>
      <section className="wrap pb-6 grid md:grid-cols-2 gap-5">
        {wings.map((w: any, i: number) => (
          <article id={w.slug} key={w.slug} className="panel spot lift grid grid-cols-[auto_1fr] gap-5 scroll-mt-28 reveal" style={{ ['--d' as any]: i % 2 }}>
            <svg viewBox="120 90 820 820" className="size-20 shrink-0" aria-hidden="true">{RAYS.map((r, j) => <path key={r.id} d={r.d} fill={j === i % 6 ? '#016737' : 'rgba(1,103,55,.14)'} />)}</svg>
            <div className="grid gap-3 content-start">
              <span className="eyebrow">Wing {String(i + 1).padStart(2, '0')}</span>
              <h2 className="display-md text-[1.9rem]">{w.name}</h2>
              {w.summary && <p className="text-ink-2">{w.summary}</p>}
              {w.responsibilities?.length > 0 && <ul className="flex flex-wrap gap-2">{w.responsibilities.map((r: string) => <li key={r} className="chip chip-ok">{r}</li>)}</ul>}
            </div>
          </article>
        ))}
      </section>
      <section className="wrap pt-10"><div className="glass-strong rounded-[28px] p-8 md:p-10 flex flex-wrap items-center justify-between gap-5 reveal">
        <p className="display-md text-[clamp(1.6rem,1.2rem+1.4vw,2.4rem)] max-w-[22ch]">Know which ray is yours?</p>
        <Link href="/join" className="btn btn-primary btn-lg">Apply to join <Arrow /></Link>
      </div></section>
    </>
  );
}
