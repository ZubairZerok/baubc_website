import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Cover, PageHero, Paras, eventWhen, priceLabel } from '@/components/site/bits';
import { LiveSeats } from '@/components/site/LiveSeats';
import { RegisterForm } from '@/components/site/RegisterForm';
import { getAvailability, getEvent, getEventPeople } from '@/server/queries/public';
import { getSession } from '@/server/session';
import { CATEGORY_LABEL, fmtDateTime } from '@/lib/format';
import { env, hasSupabaseAuth } from '@/server/env';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const e = await getEvent((await params).slug);
  return e ? { title: e.title, description: e.summary ?? undefined, openGraph: { title: e.title, description: e.summary ?? undefined } } : { title: 'Event' };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [e, session] = await Promise.all([getEvent(slug), getSession()]);
  if (!e) notFound();
  const [tickets, people] = await Promise.all([getAvailability(e.id), getEventPeople(e.id)]);
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Event', name: e.title, description: e.summary,
    startDate: e.starts_at ?? undefined, endDate: e.ends_at ?? undefined,
    eventStatus: e.status === 'cancelled' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
    location: { '@type': 'Place', name: e.venue ?? 'Bangladesh Agricultural University', address: 'Mymensingh, Bangladesh' },
    organizer: { '@type': 'Organization', name: 'Bangladesh Agricultural University Business Club', url: env.siteUrl },
  };
  const facts: [string, string][] = [
    ['When', eventWhen(e)], ['Where', e.venue ?? 'To be announced'], ['Who can join', e.eligibility ?? 'Open to all'],
    ['Registration closes', e.reg_closes_at ? fmtDateTime(e.reg_closes_at) : 'To be announced'],
    ['Refunds', e.refund_policy ?? 'If you cancel, a refund request goes to the finance team for approval.'],
    ['Questions', e.contact_email ?? 'businessclub@bau.edu.bd'],
  ];
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero label={`${CATEGORY_LABEL[e.category] ?? e.category} · ${eventWhen(e)}`} title={e.title.replace(/^BAUBC /, '')} back={{ href: '/events', label: 'All events' }}>
        {e.subtitle}
      </PageHero>
      <div className="wrap py-12 grid lg:grid-cols-[1fr_440px] gap-10 items-start">
        <article className="grid gap-12 min-w-0">
          <div className="group"><Cover tone={e.cover_tone} seed={e.slug} label={CATEGORY_LABEL[e.category]} title={e.subtitle ?? undefined} className="aspect-[16/8] cut rounded-[28px] shadow-[var(--shadow)]" /></div>
          {e.summary && <p className="display-md text-[clamp(1.5rem,1.2rem+1vw,2.1rem)] !leading-[1.18] max-w-[32ch]">{e.summary}</p>}
          <Paras text={e.body} className="text-[1.08rem] text-ink-2" />
          {people.length > 0 && (
            <section className="grid gap-5">
              <h2 className="display-md text-3xl">On stage</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                {people.map((p: any, i: number) => (
                  <div key={i} className="panel grid gap-1.5 reveal" style={{ ['--d' as any]: i }}><span className="eyebrow">{p.role}</span><b className="heading text-lg">{p.name}</b>{p.title && <span className="text-sm text-muted">{p.title}</span>}</div>
                ))}
              </div>
            </section>
          )}
          <section className="grid gap-4">
            <h2 className="display-md text-3xl">Good to know</h2>
            <dl className="grid sm:grid-cols-2 gap-x-10">
              {facts.map(([k, v]) => <div key={k} className="py-4 border-b border-line grid gap-1"><dt className="label text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>)}
            </dl>
          </section>
        </article>

        <aside className="grid gap-5 lg:sticky lg:top-28">
          <div className="glass-strong rounded-[26px] p-6 grid gap-5">
            <div className="flex items-center justify-between gap-3"><span className="eyebrow">Seats, live</span>{priceLabel(e) && <span className="heading text-lg tnum">{priceLabel(e)}</span>}</div>
            {tickets.length > 0 ? <LiveSeats eventId={e.id} initial={tickets as any} realtime={hasSupabaseAuth ? { url: env.supabaseUrl, key: env.supabaseKey } : undefined} /> : <p className="text-muted text-sm">Ticket details are coming soon.</p>}
          </div>
          <div className="panel grid gap-4" id="register">
            <h2 className="display-md text-2xl">{e.reg_open ? 'Save your seat' : 'Registration'}</h2>
            {e.status === 'cancelled' ? <p className="text-soil font-medium">This event was cancelled.</p>
              : e.reg_open ? <RegisterForm tickets={tickets as any} signedIn={!!session} isMember={!!session?.isMember} defaultName={session?.name} defaultEmail={session?.email} />
              : <p className="text-ink-2">{e.reg_opens_at && new Date(e.reg_opens_at) > new Date() ? `Opens ${fmtDateTime(e.reg_opens_at)}.` : 'Registration has not opened yet. The date will be announced here and on our Facebook page.'}</p>}
          </div>
        </aside>
      </div>
    </>
  );
}
