import Link from 'next/link';
import type { EventRow, PostRow } from '@/server/queries/public';
import { CATEGORY_LABEL, fmtDate, fmtMoney, fmtNum } from '@/lib/format';
import { pick, type Lang } from '@/lib/i18n';

const TONES: Record<string, { bg: string; line: string; accent: string; fg: string }> = {
  canopy: { bg: '#07140E', line: 'rgba(82,196,138,.35)', accent: '#C8F53C', fg: '#F6F5EE' },
  harvest: { bg: '#2A1E0A', line: 'rgba(233,162,59,.45)', accent: '#E9A23B', fg: '#F6F5EE' },
  river: { bg: '#0B1A33', line: 'rgba(142,178,242,.4)', accent: '#C8F53C', fg: '#F6F5EE' },
  paper: { bg: '#ECEADF', line: 'rgba(15,58,39,.28)', accent: '#0F3A27', fg: '#151913' },
};

/** Generative cover: furrow contours that rise into a market line, keyed by a seed string. */
export function Cover({ tone = 'canopy', seed = 'x', label, title, className = '', letterbox = false }: { tone?: string; seed?: string; label?: string | null; title?: string; className?: string; letterbox?: boolean }) {
  const c = TONES[tone] ?? TONES.canopy;
  let h = 0; for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = (n: number) => ((h = (h * 1103515245 + 12345) >>> 0) % 1000) / 1000 * n;
  const lines = Array.from({ length: 14 }, (_, i) => {
    const y = 14 + i * 6.2, a = 2 + rnd(5), b = rnd(6), rise = i > 8 ? (i - 8) * 3.2 : 0;
    return `M0 ${y} C 30 ${y - a}, 55 ${y + b}, 100 ${y - rise - a}`;
  });
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: c.bg }} aria-hidden={!title}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {lines.map((d, i) => <path key={i} d={d} stroke={i === 10 ? c.accent : c.line} strokeWidth={i === 10 ? 0.9 : 0.4} fill="none" vectorEffect="non-scaling-stroke" />)}
      </svg>
      {letterbox && <><div className="absolute inset-x-0 top-0 h-[9%] bg-black/70" /><div className="absolute inset-x-0 bottom-0 h-[9%] bg-black/70" /></>}
      {(label || title) && (
        <div className={`relative h-full px-4 sm:px-5 flex flex-col justify-between gap-3 ${letterbox ? 'py-[12%]' : 'py-4 sm:py-5'}`} style={{ color: c.fg }}>
          {label && <span className="label opacity-80">{label}</span>}
          {title && <span className="serif-i text-2xl sm:text-3xl leading-[1.05] max-w-[14ch]">{title}</span>}
        </div>
      )}
    </div>
  );
}

export function SectionHead({ label, title, children, className = '' }: { label: string; title: React.ReactNode; children?: React.ReactNode; className?: string }) {
  return (
    <div className={`grid gap-3 max-w-3xl mb-8 md:mb-12 reveal ${className}`}>
      <span className="label text-green">{label}</span>
      <h2 className="display-md text-[clamp(1.9rem,1.3rem+2.4vw,3.1rem)]">{title}</h2>
      {children && <div className="text-ink-2 max-w-2xl">{children}</div>}
    </div>
  );
}

export function eventWhen(e: Pick<EventRow, 'starts_at' | 'date_label'>, lang: Lang = 'en') {
  return e.date_label || (e.starts_at ? fmtDate(e.starts_at, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }, lang) : 'To be announced');
}

export function priceLabel(e: Pick<EventRow, 'min_price' | 'max_price'>, lang: Lang = 'en') {
  const min = Number(e.min_price ?? 0), max = Number(e.max_price ?? 0);
  if (!e.min_price) return '';
  const free = lang === 'bn' ? 'বিনামূল্যে' : 'Free';
  if (max === 0) return free;
  if (min === max) return fmtMoney(min, lang);
  return `${min === 0 ? free : fmtMoney(min, lang)} – ${fmtMoney(max, lang)}`;
}

export function EventCard({ e, lang }: { e: EventRow; lang: Lang }) {
  const left = e.capacity - e.sold - e.held;
  return (
    <Link href={`/events/${e.slug}`} className="group card overflow-hidden grid hover:border-line-strong transition-colors reveal">
      <Cover tone={e.cover_tone} seed={e.slug} label={`${CATEGORY_LABEL[e.category] ?? e.category} · ${eventWhen(e, lang)}`} className="aspect-[16/9]" />
      <div className="p-5 grid gap-3">
        <h3 className="heading text-xl group-hover:text-link transition-colors">{pick(lang, e.title, e.title_bn)}</h3>
        {e.subtitle && <p className="text-muted text-sm">{e.subtitle}</p>}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {e.reg_open ? <span className="chip chip-live">{lang === 'bn' ? 'নিবন্ধন চলছে' : 'Registration open'}</span>
            : e.status === 'completed' ? <span className="chip chip-lock">Completed</span>
            : <span className="chip chip-draft">{lang === 'bn' ? 'শীঘ্রই' : 'Coming soon'}</span>}
          {e.reg_open && e.capacity > 0 && <span className="chip chip-info tnum">{fmtNum(left, lang)} {lang === 'bn' ? 'আসন বাকি' : 'seats left'}</span>}
          {priceLabel(e, lang) && <span className="text-sm text-muted tnum">{priceLabel(e, lang)}</span>}
        </div>
      </div>
    </Link>
  );
}

export function PostCard({ p, lang, big = false }: { p: PostRow; lang: Lang; big?: boolean }) {
  return (
    <Link href={`/insights/${p.slug}`} className="group grid gap-3 reveal">
      <Cover tone={p.cover_tone} seed={p.slug} label={p.cover_label} title={big ? p.title.split(':')[0] : undefined} letterbox={p.series === 'decoded'} className={`rounded-xl ${big ? 'aspect-[4/5] sm:aspect-[3/4]' : 'aspect-[16/10]'}`} />
      <div className="grid gap-1.5">
        <h3 className={`heading ${big ? 'text-xl' : 'text-lg'} group-hover:text-link transition-colors`}>{pick(lang, p.title, p.title_bn)}</h3>
        {p.dek && <p className="text-muted text-sm line-clamp-2">{p.dek}</p>}
        {p.stats?.viewers && <p className="label text-muted tnum">{fmtNum(p.stats.viewers, lang)} viewers on Facebook</p>}
      </div>
    </Link>
  );
}

export function Paras({ text, className = '' }: { text?: string | null; className?: string }) {
  if (!text) return null;
  return <div className={`prose-baubc ${className}`}>{text.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</div>;
}

export function PageHero({ label, title, children, bn }: { label: string; title: React.ReactNode; children?: React.ReactNode; bn?: string }) {
  return (
    <section className="border-b border-line">
      <div className="wrap pt-14 pb-12 md:pt-20 md:pb-16 grid gap-5">
        <span className="label text-green">{label}</span>
        <h1 className="display text-[clamp(2.6rem,1.4rem+5.5vw,6rem)] max-w-[16ch]">{title}</h1>
        {bn && <p className="bn-display text-2xl md:text-3xl text-green" lang="bn">{bn}</p>}
        {children && <div className="text-ink-2 text-lg max-w-2xl">{children}</div>}
      </div>
    </section>
  );
}
