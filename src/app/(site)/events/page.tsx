import type { Metadata } from 'next';
import Link from 'next/link';
import { EventCard, PageHero } from '@/components/site/bits';
import { Empty } from '@/components/ui/Empty';
import { getEvents } from '@/server/queries/public';
import { CATEGORY_LABEL } from '@/lib/format';

export const metadata: Metadata = { title: 'Events', description: 'Startup Summit, case competitions, pitch nights, olympiads and hackathons by BAUBC.' };

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ category?: string; when?: string }> }) {
  const [{ category, when }, events] = await Promise.all([searchParams, getEvents()]);
  const cats = Array.from(new Set(events.map((e) => e.category)));
  const isPast = (e: (typeof events)[number]) => e.status === 'completed' || (!!e.ends_at && new Date(e.ends_at) < new Date());
  const list = events.filter((e) => (!category || e.category === category) && (when === 'past' ? isPast(e) : !isPast(e)));
  const q = (o: Record<string, string | undefined>) => '?' + new URLSearchParams(Object.entries({ category, when, ...o }).filter(([, v]) => v) as [string, string][]).toString();
  const pill = (on: boolean) => `btn btn-sm ${on ? 'btn-primary' : 'btn-secondary'}`;
  return (
    <>
      <PageHero label="Events" title={<>Take <em className="serif-i text-brand">the stage.</em></>}>
        A summit, a case competition, a pitch night, an olympiad and a hackathon. Every seat is counted live, so what you see is what is left.
      </PageHero>
      <div className="wrap py-12 grid gap-9">
        <nav className="flex flex-wrap items-center gap-2" aria-label="Filter events">
          <Link href={q({ when: undefined })} className={pill(when !== 'past')}>Upcoming</Link>
          <Link href={q({ when: 'past' })} className={pill(when === 'past')}>Past</Link>
          <span className="mx-1 size-2 bg-brand/30 diamond-clip" aria-hidden="true" />
          <Link href={q({ category: undefined })} className={pill(!category)}>Everything</Link>
          {cats.map((c) => <Link key={c} href={q({ category: c })} className={pill(category === c)}>{CATEGORY_LABEL[c] ?? c}</Link>)}
        </nav>
        {list.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">{list.map((e, i) => <EventCard key={e.id} e={e} i={i} />)}</div>
        ) : (
          <Empty title={when === 'past' ? 'No past events yet' : 'Nothing scheduled here yet'}>
            {when === 'past' ? 'Results, photos and certificates appear here after each event.' : 'New dates are announced on this page first, then on Facebook.'}
          </Empty>
        )}
      </div>
    </>
  );
}
