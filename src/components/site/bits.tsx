import Link from 'next/link';
import type { EventRow, PostRow } from '@/server/queries/public';
import { RAYS, Mark, Arrow } from '@/components/brand/Mark';
import { Kinetic } from './Kinetic';
import { CATEGORY_LABEL, fmtDate, fmtMoney, fmtNum } from '@/lib/format';

const TONES: Record<string, { bg: string; hot: string; ghost: string; fg: string }> = {
  canopy: { bg: 'linear-gradient(135deg,#028A49 0%,#014D2A 100%)', hot: '#DDFF6B', ghost: 'rgba(255,255,255,.13)', fg: '#fff' },
  harvest: { bg: 'linear-gradient(135deg,#EEFF9E 0%,#C9F53B 55%,#9FE04A 100%)', hot: '#016737', ghost: 'rgba(255,255,255,.55)', fg: '#0A2015' },
  river: { bg: 'linear-gradient(135deg,#0D3B24 0%,#062A19 100%)', hot: '#C9F53B', ghost: 'rgba(255,255,255,.09)', fg: '#fff' },
  paper: { bg: 'linear-gradient(135deg,#F8FFDD 0%,#D5F5DF 100%)', hot: '#016737', ghost: 'rgba(1,103,55,.13)', fg: '#0A2015' },
};

/** Generative cover: the logo's rays, cropped, turned and lit differently for every item. */
export function Cover({ tone = 'canopy', seed = 'x', label, title, numeral, className = '', photo, eager = false }: { tone?: string; seed?: string; label?: string | null; title?: string; numeral?: string | number | null; className?: string; photo?: string | null; eager?: boolean }) {
  const c = TONES[tone] ?? TONES.canopy;
  let h = 2166136261; for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const rnd = () => ((h = (Math.imul(h, 1103515245) + 12345) >>> 0) % 1000) / 1000;
  const rot = [0, 90, 180, 270][Math.floor(rnd() * 4)], s = 0.42 + rnd() * 0.3, tx = 210 + rnd() * 170, ty = 90 + rnd() * 150;
  const lit = RAYS.map(() => rnd() > 0.55); if (lit.filter(Boolean).length < 2) { lit[1] = true; lit[Math.floor(rnd() * 6)] = true; }
  return (
    <div className={`relative overflow-hidden isolate ${className}`} style={{ background: c.bg, color: c.fg }}>
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full -z-10 transition-transform duration-[900ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.07] group-hover:rotate-[1.5deg]" aria-hidden="true">
        <g transform={`translate(${tx} ${ty}) rotate(${rot}) scale(${s}) translate(-590 -436)`}>
          {RAYS.map((r, i) => <path key={r.id} d={r.d} fill={lit[i] ? c.hot : c.ghost} />)}
        </g>
      </svg>
      {photo && <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" referrerPolicy="no-referrer" className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.06]" />
        <span className="absolute inset-0 -z-10 bg-gradient-to-t from-black/45 via-transparent to-black/25" aria-hidden="true" />
      </>}
      <div className={`relative h-full p-4 sm:p-5 flex flex-col justify-between gap-3 ${photo ? 'text-white' : ''}`}>
        {label ? <span className="label opacity-90">{label}</span> : <span />}
        <div className="flex items-end justify-between gap-3">
          {title && <span className="display-md text-[clamp(1.3rem,1rem+1.2vw,2rem)] leading-[1.02] max-w-[13ch]">{title}</span>}
          {numeral != null && <span className="display text-[clamp(3.4rem,2rem+5vw,6rem)] leading-[.8] ml-auto" style={{ color: 'transparent', WebkitTextStroke: `1.5px ${c.fg}` }}>{String(numeral).padStart(2, '0')}</span>}
        </div>
      </div>
    </div>
  );
}

export function SectionHead({ label, title, children, className = '', center = false }: { label: string; title: React.ReactNode; children?: React.ReactNode; className?: string; center?: boolean }) {
  return (
    <div className={`grid gap-4 mb-10 md:mb-14 ${center ? 'justify-items-center text-center mx-auto max-w-3xl' : 'max-w-3xl'} ${className}`}>
      <span className="eyebrow reveal">{label}</span>
      <h2 className="display-md text-[clamp(2.1rem,1.3rem+3vw,3.8rem)] reveal" style={{ ['--d' as any]: 1 }}><Kinetic>{title}</Kinetic></h2>
      {children && <div className="text-ink-2 text-[1.08rem] max-w-2xl reveal" style={{ ['--d' as any]: 2 }}>{children}</div>}
    </div>
  );
}

export function eventWhen(e: Pick<EventRow, 'starts_at' | 'date_label'>) {
  return e.date_label || (e.starts_at ? fmtDate(e.starts_at, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : 'To be announced');
}

export function priceLabel(e: Pick<EventRow, 'min_price' | 'max_price'>) {
  if (e.min_price == null) return '';
  const min = Number(e.min_price), max = Number(e.max_price ?? 0);
  if (max === 0) return 'Free';
  if (min === max) return fmtMoney(min);
  return `${min === 0 ? 'Free' : fmtMoney(min)} – ${fmtMoney(max)}`;
}

export function EventCard({ e, i = 0 }: { e: EventRow; i?: number }) {
  const left = e.capacity - e.sold - e.held;
  return (
    <Link href={`/events/${e.slug}`} className="group card spot lift overflow-hidden grid reveal" style={{ ['--d' as any]: i % 4 }}>
      <Cover tone={e.cover_tone} seed={e.slug} label={CATEGORY_LABEL[e.category] ?? e.category} className="aspect-[16/10] cut" />
      <div className="p-5 grid gap-3">
        <span className="label text-muted">{eventWhen(e)}</span>
        <h3 className="heading text-[1.35rem] group-hover:text-brand transition-colors">{e.title}</h3>
        {e.subtitle && <p className="text-muted text-sm">{e.subtitle}</p>}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {e.reg_open ? <span className="chip chip-live">Registration open</span> : e.status === 'completed' ? <span className="chip chip-lock">Completed</span> : <span className="chip chip-draft">Dates soon</span>}
          {e.reg_open && e.capacity > 0 && <span className="chip chip-ok tnum">{fmtNum(left)} seats left</span>}
          {priceLabel(e) && <span className="text-sm text-muted tnum">{priceLabel(e)}</span>}
          <Arrow className="ml-auto text-brand opacity-0 -translate-x-1 translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0" />
        </div>
      </div>
    </Link>
  );
}

export function PostCard({ p, i = 0, dark = false }: { p: PostRow; i?: number; dark?: boolean }) {
  return (
    <Link href={`/insights/${p.slug}`} className="group grid gap-4 reveal" style={{ ['--d' as any]: i % 4 }} lang={p.lang === 'bn' ? 'bn' : undefined}>
      <Cover tone={p.cover_tone} seed={p.slug} label={p.cover_label} photo={p.cover_url} numeral={p.kind === 'episode' && !p.cover_url ? p.episode_no : null} className="aspect-[4/3] cut rounded-[20px] shadow-[var(--shadow-sm)]" />
      <div className="grid gap-1.5">
        {p.lang === 'bn' && <span className={`label ${dark ? 'text-lime-200' : 'text-green'}`}>বাংলা · {p.author_name ?? 'বাউবিসি'}</span>}
        <h3 className={`heading text-[1.2rem] transition-colors ${p.lang === 'bn' ? 'post-bn !text-[1.32rem]' : ''} ${dark ? 'group-hover:text-lime-200' : 'group-hover:text-brand'}`}>{p.title}</h3>
        {p.dek && <p className={`text-sm line-clamp-2 ${p.lang === 'bn' ? 'font-bangla !text-[.98rem]' : ''} ${dark ? 'text-canopy-muted' : 'text-muted'}`}>{p.dek}</p>}
        {p.stats?.viewers && <p className={`label tnum ${dark ? 'text-lime-200' : 'text-green'}`}>{fmtNum(p.stats.viewers)} viewers on Facebook</p>}
      </div>
    </Link>
  );
}

export function Paras({ text, className = '' }: { text?: string | null; className?: string }) {
  if (!text) return null;
  return <div className={`prose-baubc ${className}`}>{text.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</div>;
}

/** Inner-page hero: lime wash, the mark cropped large on the right, a glass crumb on the left. */
export function PageHero({ label, title, children, back }: { label: string; title: React.ReactNode; children?: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <section className="relative overflow-hidden lime-wash isolate">
      <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
      <div className="contour-drift" aria-hidden="true" />
      <div className="absolute inset-0 -z-10 pat-diamonds opacity-50 [mask-image:linear-gradient(90deg,transparent,#000_70%)]" aria-hidden="true" />
      <Mark size="46rem" className="pointer-events-none absolute -right-40 -top-24 -z-10 text-brand/[.07] float-a" />
      <div className="wrap pt-36 pb-14 md:pt-44 md:pb-20 grid gap-5">
        {back ? <Link href={back.href} className="tag w-max hover:bg-white fade-up" style={{ ['--i' as any]: -3 }}>← {back.label}</Link> : null}
        <span className="eyebrow fade-up" style={{ ['--i' as any]: -3 }}>{label}</span>
        <h1 className="display text-[clamp(2.8rem,1.4rem+6vw,6.6rem)] max-w-[15ch]"><Kinetic>{title}</Kinetic></h1>
        {children && <div className="text-ink-2 text-[1.15rem] max-w-2xl fade-up" style={{ ['--i' as any]: 0 }}>{children}</div>}
      </div>
    </section>
  );
}
