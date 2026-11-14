import type { Metadata } from 'next';
import Link from 'next/link';
import { EventCard, PageHero } from '@/components/site/bits';
import { Empty } from '@/components/ui/Empty';
import { getEvents } from '@/server/queries/public';
import { getLang } from '@/lib/lang';
import { CATEGORY_LABEL } from '@/lib/format';

export const metadata: Metadata = { title: 'Events', description: 'Startup Summit, case competitions, pitch events, olympiads and hackathons by BAUBC.' };

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ category?: string; when?: string }> }) {
  const [{ category, when }, lang, events] = await Promise.all([searchParams, getLang(), getEvents()]);
  const cats = Array.from(new Set(events.map((e) => e.category)));
  const isPast = (e: (typeof events)[number]) => e.status === 'completed' || (!!e.ends_at && new Date(e.ends_at) < new Date());
  const list = events.filter((e) => (!category || e.category === category) && (when === 'past' ? isPast(e) : !isPast(e)));
  const q = (o: Record<string, string | undefined>) => '?' + new URLSearchParams(Object.entries({ category, when, ...o }).filter(([, v]) => v) as [string, string][]).toString();
  return (
    <>
      <PageHero label={lang === 'bn' ? 'ইভেন্ট' : 'Events'} title={<>Where ideas <span className="serif-i">meet a stage</span></>} bn="আইডিয়া থেকে মঞ্চে">
        The Startup Summit, case competitions, pitch nights, olympiads and hackathons. Seats update live as people register.
      </PageHero>
      <div className="wrap py-10 grid gap-8">
        <nav className="flex flex-wrap gap-2" aria-label="Filter events">
          <Link href={q({ when: undefined })} className={`btn btn-sm ${when !== 'past' ? 'btn-dark' : 'btn-ghost'}`}>Upcoming</Link>
          <Link href={q({ when: 'past' })} className={`btn btn-sm ${when === 'past' ? 'btn-dark' : 'btn-ghost'}`}>Past</Link>
          <span className="w-px bg-line mx-1" />
          <Link href={q({ category: undefined })} className={`btn btn-sm ${!category ? 'btn-secondary' : 'btn-ghost'}`}>All</Link>
          {cats.map((c) => <Link key={c} href={q({ category: c })} className={`btn btn-sm ${category === c ? 'btn-secondary' : 'btn-ghost'}`}>{CATEGORY_LABEL[c] ?? c}</Link>)}
        </nav>
        {list.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">{list.map((e) => <EventCard key={e.id} e={e} lang={lang} />)}</div>
        ) : (
          <Empty title={when === 'past' ? 'No past events yet' : 'Nothing scheduled in this category'}>
            Past events, results and galleries appear here after each event. Follow BAUBC on Facebook for announcements.
          </Empty>
        )}
      </div>
    </>
  );
}
