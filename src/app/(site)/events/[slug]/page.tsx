import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Cover, Paras, eventWhen, priceLabel } from '@/components/site/bits';
import { LiveSeats } from '@/components/site/LiveSeats';
import { RegisterForm } from '@/components/site/RegisterForm';
import { getAvailability, getEvent, getEventPeople } from '@/server/queries/public';
import { getSession } from '@/server/session';
import { getLang } from '@/lib/lang';
import { pick } from '@/lib/i18n';
import { CATEGORY_LABEL, fmtDateTime } from '@/lib/format';
import { env, hasSupabaseAuth } from '@/server/env';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const e = await getEvent((await params).slug);
  return e ? { title: e.title, description: e.summary ?? undefined, openGraph: { title: e.title, description: e.summary ?? undefined } } : { title: 'Event' };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [lang, e, session] = await Promise.all([getLang(), getEvent(slug), getSession()]);
  if (!e) notFound();
  const [tickets, people] = await Promise.all([getAvailability(e.id), getEventPeople(e.id)]);
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Event', name: e.title, description: e.summary,
    startDate: e.starts_at ?? undefined, endDate: e.ends_at ?? undefined,
    eventStatus: e.status === 'cancelled' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
    location: { '@type': 'Place', name: e.venue ?? 'Bangladesh Agricultural University', address: 'Mymensingh, Bangladesh' },
    organizer: { '@type': 'Organization', name: 'Bangladesh Agricultural University Business Club', url: env.siteUrl },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="relative canopy on-canopy isolate overflow-hidden">
        <Cover tone={e.cover_tone} seed={e.slug} className="absolute inset-0 -z-10 opacity-80" />
        <div className="wrap pt-14 pb-12 md:pt-20 md:pb-16 grid gap-5">
          <Link href="/events" className="label text-canopy-muted hover:text-signal w-max">← All events</Link>
          <span className="tag w-max max-w-full"><i>{CATEGORY_LABEL[e.category] ?? e.category}</i>{eventWhen(e, lang)}</span>
          <h1 className="display text-[clamp(2.6rem,1.4rem+5vw,6rem)] max-w-[16ch]">{pick(lang, e.title, e.title_bn)}</h1>
          {e.title_bn && lang === 'en' && <p className="bn-display text-2xl text-canopy-leaf" lang="bn">{e.title_bn}</p>}
          {e.subtitle && <p className="text-lg text-on-canopy/85 max-w-2xl">{e.subtitle}</p>}
        </div>
      </section>

      <div className="wrap py-12 grid lg:grid-cols-[1fr_420px] gap-10 items-start">
        <article className="grid gap-10 min-w-0">
          {e.summary && <p className="text-xl text-ink-2 max-w-[60ch]">{e.summary}</p>}
          <Paras text={e.body} className="text-[1.05rem]" />
          {people.length > 0 && (
            <section className="grid gap-4">
              <h2 className="heading text-2xl">Speakers and judges</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                {people.map((p: any, i: number) => (
                  <div key={i} className="panel grid gap-1"><span className="label text-muted">{p.role}</span><b>{p.name}</b>{p.title && <span className="text-sm text-muted">{p.title}</span>}</div>
                ))}
              </div>
            </section>
          )}
          <section className="grid gap-3">
            <h2 className="heading text-2xl">Good to know</h2>
            <dl className="grid sm:grid-cols-2 gap-x-8">
              {[
                ['When', eventWhen(e, lang)], ['Where', e.venue ?? 'To be announced'], ['Who can join', e.eligibility ?? 'Open'],
                ['Registration closes', e.reg_closes_at ? fmtDateTime(e.reg_closes_at) : 'To be announced'],
                ['Refunds', e.refund_policy ?? 'If you cancel, a refund request goes to the finance team for approval.'],
                ['Questions', e.contact_email ?? 'businessclub@bau.edu.bd'],
              ].map(([k, v]) => (
                <div key={k} className="py-3 border-b border-line grid gap-1"><dt className="label text-muted">{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          </section>
        </article>

        <aside className="grid gap-5 lg:sticky lg:top-24">
          <div className="panel grid gap-5">
            <div className="flex items-center justify-between gap-3">
              <span className="label text-muted">Term sheet</span>
              {priceLabel(e, lang) && <span className="font-semibold tnum">{priceLabel(e, lang)}</span>}
            </div>
            {tickets.length > 0 && <LiveSeats eventId={e.id} initial={tickets as any} realtime={hasSupabaseAuth ? { url: env.supabaseUrl, key: env.supabaseKey } : undefined} />}
          </div>
          <div className="panel grid gap-4" id="register">
            <h2 className="heading text-xl">{e.reg_open ? 'Register' : 'Registration'}</h2>
            {e.status === 'cancelled' ? <p className="text-soil">This event was cancelled.</p>
              : e.reg_open ? <RegisterForm tickets={tickets as any} signedIn={!!session} isMember={!!session?.isMember} defaultName={session?.name} defaultEmail={session?.email} />
              : <p className="text-muted">{e.reg_opens_at && new Date(e.reg_opens_at) > new Date() ? `Opens ${fmtDateTime(e.reg_opens_at)}.` : 'Registration opens soon. Dates are announced here and on the BAUBC Facebook page.'}</p>}
          </div>
        </aside>
      </div>
    </>
  );
}
