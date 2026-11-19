import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Arrow, Mark } from '@/components/brand/Mark';
import { Avatar } from '@/components/ui/Avatar';
import { CopyButton } from '@/components/site/client';
import { getPublicProfile, getSettings } from '@/server/queries/public';
import { env } from '@/server/env';
import { fmtDate, fmtNum } from '@/lib/format';

type Params = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = await getPublicProfile((await params).handle);
  if (!p) return { title: 'Member', robots: { index: false } };
  const role = p.units.find((u) => u.lead)?.title ?? p.units[0]?.name ?? (p.kind === 'teacher' ? 'Advisor' : 'Member');
  return { title: p.name, description: `${p.name} · ${role} at BAUBC`, robots: { index: false, follow: true }, openGraph: { title: `${p.name} · BAUBC`, type: 'profile' } };
}

const month = (d: string) => new Date(d).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const KIND: Record<string, string> = { position: 'Position', award: 'Award', contribution: 'Contribution', leadership: 'Leadership', recognition: 'Recognition' };

export default async function ProfilePage({ params }: Params) {
  const { handle } = await params;
  const [p, settings] = await Promise.all([getPublicProfile(handle), getSettings()]);
  if (!p || settings.features.members_directory === false) notFound();
  const lead = p.units.find((u) => u.lead);
  const isMom = p.awards.length > 0;
  const latestAward = p.awards[0];
  const facts = [p.department, p.session && `Session ${p.session}`, p.member_since && `Member since ${new Date(p.member_since).getFullYear()}`].filter(Boolean) as string[];
  const url = `${env.siteUrl}/members/${p.handle}`;

  return (
    <article>
      {/* ── HERO ───────────────────────────── */}
      <section className="relative overflow-hidden lime-wash isolate">
        <div className="absolute inset-0 -z-10 pat-diamonds opacity-70 [mask-image:linear-gradient(90deg,transparent,#000_55%)]" aria-hidden="true" />
        <Mark size="44rem" className="pointer-events-none absolute -right-40 -top-24 -z-10 text-brand/[.07]" />
        <div className="wrap pt-32 pb-14 md:pt-40 md:pb-20 grid gap-10 lg:grid-cols-[auto_1fr_auto] items-center">
          <Link href="/members" className="tag w-max hover:bg-white fade-up lg:col-span-3" style={{ ['--i' as any]: -3 }}>← All members</Link>
          <div className="relative w-max fade-up" style={{ ['--i' as any]: -2 }}>
            {isMom && <span className="mom-ring sq !-inset-2.5" aria-hidden="true" />}
            {isMom && <span className="absolute -inset-1 rounded-[30%] bg-white" aria-hidden="true" />}
            <Avatar name={p.full_name} photoUrl={p.photo_url} avatar={p.avatar} size={176} className="relative shadow-[var(--shadow)] !ring-4" />
            {isMom && <span className="absolute -right-2 -bottom-2 grid size-14 place-items-center rounded-full bg-harvest border-4 border-white text-2xl" title="Member of the Month">★</span>}
          </div>
          <div className="grid gap-3 min-w-0">
            <div className="flex flex-wrap gap-2 fade-up" style={{ ['--i' as any]: -2 }}>
              {isMom && <span className="tag !bg-ink !text-lime-200 !border-transparent">★ Member of the Month · {month(latestAward.period)}</span>}
              {p.kind === 'teacher' ? <span className="tag">Advisor</span> : <span className="tag">BAUBC member</span>}
            </div>
            <h1 className="display text-[clamp(2.8rem,1.6rem+5vw,6rem)] break-words"><span className="line-rise"><span>{p.name}</span></span></h1>
            {p.full_name_bn && <p className="font-bangla text-2xl text-ink-2 fade-up" lang="bn">{p.full_name_bn}</p>}
            {(lead || p.units.length > 0) && (
              <p className="text-lg font-semibold text-brand fade-up" style={{ ['--i' as any]: 0 }}>
                {lead?.title ? `${lead.title} · ${lead.name}` : p.units.map((u) => u.name).join(' · ')}
              </p>
            )}
            {facts.length > 0 && <p className="text-ink-2 fade-up" style={{ ['--i' as any]: 1 }}>{facts.join(' · ')}</p>}
            <div className="flex flex-wrap gap-2.5 pt-2 fade-up" style={{ ['--i' as any]: 2 }}>
              {p.linkedin_url && <a href={p.linkedin_url} target="_blank" rel="noopener noreferrer me" className="btn btn-primary btn-sm">LinkedIn <Arrow size={12} /></a>}
              {p.facebook_url && <a href={p.facebook_url} target="_blank" rel="noopener noreferrer me" className="btn btn-secondary btn-sm">Facebook <Arrow size={12} /></a>}
              <CopyButton value={url} label="Copy profile link" />
            </div>
          </div>
          {p.stats && (
            <dl className="grid grid-cols-3 lg:grid-cols-1 gap-3 lg:w-56 fade-up" style={{ ['--i' as any]: 1 }}>
              {([['Points', p.stats.points_total], ['Rank this month', p.stats.rank_month ? `#${p.stats.rank_month}` : '—'], ['Events attended', p.stats.events]] as const).map(([k, v]) => (
                <div key={k} className="glass-strong rounded-[22px] px-4 py-3.5 grid">
                  <dd className="display-md text-[clamp(1.6rem,1.2rem+1.4vw,2.4rem)] tnum leading-none">{typeof v === 'number' ? fmtNum(v) : v}</dd>
                  <dt className="text-xs text-muted mt-1.5">{k}</dt>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      <div className="wrap py-14 grid lg:grid-cols-[1fr_360px] gap-10 items-start">
        <div className="grid gap-10 min-w-0">
          {p.bio && (
            <section className="grid gap-3 reveal">
              <span className="eyebrow">About</span>
              <p className="text-[clamp(1.25rem,1.05rem+.7vw,1.6rem)] leading-[1.5] text-ink max-w-[46ch]">{p.bio}</p>
            </section>
          )}

          {p.awards.length > 0 && (
            <section className="grid gap-4">
              <span className="eyebrow reveal">Recognition</span>
              {p.awards.map((a, i) => (
                <div key={a.period} className="mom relative isolate overflow-hidden rounded-[28px] p-6 md:p-8 grid gap-2 reveal" style={{ ['--d' as any]: i }}>
                  <span className="mom-shine" aria-hidden="true" />
                  <span className="label text-green">★ Member of the Month · {month(a.period)}</span>
                  <p className="display-md text-2xl md:text-3xl max-w-[30ch]">“{a.citation}”</p>
                </div>
              ))}
            </section>
          )}

          {p.achievements.length > 0 && (
            <section className="grid gap-4">
              <span className="eyebrow reveal">Verified record</span>
              <ol className="relative grid gap-3 border-l-2 border-line pl-6">
                {p.achievements.map((a, i) => (
                  <li key={`${a.title}-${a.on}`} className="relative panel !p-5 grid gap-1 reveal" style={{ ['--d' as any]: i % 4 }}>
                    <span className="absolute -left-[33px] top-6 size-3.5 bg-brand diamond-clip" aria-hidden="true" />
                    <span className="label text-muted">{KIND[a.kind] ?? a.kind} · {fmtDate(a.on, { month: 'short', year: 'numeric' })} <span className="chip chip-ok ml-1.5">Verified</span></span>
                    <b className="heading text-lg">{a.title}</b>
                    {a.description && <p className="text-sm text-ink-2">{a.description}</p>}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {!p.bio && !p.awards.length && !p.achievements.length && (
            <p className="text-ink-2 reveal">{p.name} keeps a quiet profile. Their verified work shows up here as it is recorded.</p>
          )}
        </div>

        <aside className="grid gap-4 lg:sticky lg:top-28">
          {p.units.length > 0 && (
            <div className="glass-strong rounded-[24px] p-6 grid gap-3 reveal">
              <span className="eyebrow">Wings</span>
              {p.units.map((u) => (
                <Link key={u.slug} href={`/wings#${u.slug}`} className="flex items-center justify-between gap-3 group">
                  <span className="grid"><b className="group-hover:text-brand transition-colors">{u.name}</b>{u.title && <span className="text-sm text-muted">{u.title}</span>}</span>
                  {u.lead && <span className="chip chip-live">Lead</span>}
                </Link>
              ))}
            </div>
          )}
          {(p.skills.length > 0 || p.interests.length > 0) && (
            <div className="glass-strong rounded-[24px] p-6 grid gap-3 reveal" style={{ ['--d' as any]: 1 }}>
              <span className="eyebrow">Skills & interests</span>
              <div className="flex flex-wrap gap-2">{[...p.skills, ...p.interests].map((s) => <span key={s} className="tag !text-[.8rem] !normal-case !tracking-normal">{s}</span>)}</div>
            </div>
          )}
          <div className="rounded-[24px] border border-line p-5 text-sm text-muted grid gap-1.5 reveal" style={{ ['--d' as any]: 2 }}>
            <b className="text-ink">What you see here</b>
            <p>{p.name.split(' ')[0]} chose to show this profile and each detail on it. Phone numbers, email addresses and student IDs are never public.</p>
            <Link href="/contact" className="link-arrow w-max text-brand font-semibold">Contact the club <Arrow size={11} /></Link>
          </div>
        </aside>
      </div>
    </article>
  );
}
