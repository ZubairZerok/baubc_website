'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RAYS, Mark, Arrow } from '@/components/brand/Mark';

/** Adds .in to .reveal elements as they enter the viewport. Content is never left hidden. */
export function RevealObserver() {
  const path = usePathname();
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.reveal:not(.in)'));
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -6% 0px' });
    els.forEach((e) => io.observe(e));
    const all = () => document.querySelectorAll('.reveal:not(.in)').forEach((e) => e.classList.add('in'));
    const onScroll = () => { if (innerHeight + scrollY >= document.documentElement.scrollHeight - 80) all(); };
    addEventListener('scroll', onScroll, { passive: true });
    const t = setTimeout(all, 7000);
    // glass spotlight: one listener for every .spot element
    const onMove = (e: PointerEvent) => {
      const el = (e.target as HTMLElement)?.closest?.('.spot') as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`); el.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    addEventListener('pointermove', onMove, { passive: true });
    return () => { io.disconnect(); removeEventListener('scroll', onScroll); removeEventListener('pointermove', onMove); clearTimeout(t); };
  }, [path]);
  return null;
}

export function HeaderShell({ children }: { children: React.ReactNode }) {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const on = () => setSolid(scrollY > 24);
    on(); addEventListener('scroll', on, { passive: true });
    return () => removeEventListener('scroll', on);
  }, []);
  return (
    <header className="fixed inset-x-0 z-40 no-print" style={{ top: 'max(12px, env(safe-area-inset-top, 0px))' }}>
      <div className="wrap">
        <div className={`flex h-[60px] items-center justify-between gap-3 rounded-[20px] pl-3 pr-2.5 transition-all duration-500 ${solid ? 'glass-strong' : 'glass'}`}>{children}</div>
      </div>
    </header>
  );
}

export function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav className="hidden lg:flex items-center gap-0.5" aria-label="Main">
      {items.map((it) => {
        const on = path === it.href || path.startsWith(it.href + '/');
        return (
          <Link key={it.href} href={it.href} aria-current={on ? 'page' : undefined}
            className={`relative px-3.5 py-2 rounded-xl text-[.93rem] font-medium transition-colors ${on ? 'text-brand' : 'text-ink-2 hover:text-ink hover:bg-white/60'}`}>
            {it.label}
            {on && <span className="absolute left-1/2 -bottom-0.5 size-[7px] -translate-x-1/2 bg-brand diamond-clip" />}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileMenu({ items, signedIn }: { items: { href: string; label: string }[]; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);
  return (
    <div className="lg:hidden">
      <button type="button" className="btn btn-ghost btn-sm !px-2.5" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen((o) => !o)}>
        <span className="sr-only">Menu</span>
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d={open ? 'M6 6l12 12M18 6 6 18' : 'M4 8h16M4 16h11'} stroke="currentColor" strokeWidth="2" strokeLinecap="square" /></svg>
      </button>
      {open && (
        <div id="mobile-nav" className="fixed inset-0 z-[-1] lime-field overflow-y-auto">
          <Mark className="absolute -right-24 -bottom-16 w-[130vw] max-w-none text-white/45" size="130vw" />
          <nav className="wrap relative pt-28 pb-10 grid gap-1" aria-label="Mobile">
            {items.map((it, i) => (
              <Link key={it.href} href={it.href} className="display text-[2.7rem] py-1.5 flex items-center justify-between fade-up" style={{ ['--i' as any]: i * 0.5 - 3 }}>
                {it.label}<Arrow size={22} />
              </Link>
            ))}
            <div className="mt-6 flex flex-wrap gap-3 fade-up" style={{ ['--i' as any]: 1 }}>
              <Link href="/join" className="btn btn-primary btn-lg">Join the club</Link>
              <Link href={signedIn ? '/app' : '/login'} className="btn btn-secondary btn-lg">{signedIn ? 'My workspace' : 'Sign in'}</Link>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}

/** Hero mark: six glass rays that burst out, with the diamond as the live spark. Follows the pointer slightly. */
export function HeroBurst({ className = '' }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches || matchMedia('(pointer: coarse)').matches) return;
    let raf = 0;
    const on = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = (e.clientX / innerWidth - 0.5) * 2, y = (e.clientY / innerHeight - 0.5) * 2;
        el.style.transform = `translate3d(${x * -14}px, ${y * -10}px, 0) rotate(${x * 1.2}deg)`;
      });
    };
    addEventListener('pointermove', on, { passive: true });
    return () => { removeEventListener('pointermove', on); cancelAnimationFrame(raf); };
  }, []);
  return (
    <svg ref={ref} viewBox="120 90 820 820" className={`burst transition-transform duration-700 ease-out ${className}`} aria-hidden="true">
      <defs>
        <linearGradient id="hb-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".92" /><stop offset="1" stopColor="#fff" stopOpacity=".42" /></linearGradient>
        <linearGradient id="hb-green" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#028A49" /><stop offset="1" stopColor="#014D2A" /></linearGradient>
        <filter id="hb-shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="26" stdDeviation="22" floodColor="#014D2A" floodOpacity=".28" /></filter>
      </defs>
      <g filter="url(#hb-shadow)">
        {RAYS.map((r, i) => r.id === 'r2'
          ? <path key={r.id} d={r.d} className="ray spark" style={{ ['--i' as any]: i }} fill="url(#hb-green)" />
          : <path key={r.id} d={r.d} className="ray" style={{ ['--i' as any]: i }} fill="url(#hb-glass)" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />)}
      </g>
    </svg>
  );
}

/** Counts up once when visible. */
export function CountUp({ value, className = '' }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(value);
  useEffect(() => {
    const el = ref.current; if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setN(0);
    let raf = 0; let started = false;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || started) return; started = true;
      const t0 = performance.now(), dur = 1400;
      const tick = (t: number) => { const p = Math.min(1, (t - t0) / dur); setN(Math.round(value * (1 - Math.pow(1 - p, 4)))); if (p < 1) raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value]);
  return <span ref={ref} className={`tnum ${className}`}>{n.toLocaleString('en-IN')}</span>;
}

/** The journey: a rail whose spark (the logo's diamond) travels down the page as you scroll. */
export function Journey({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const stages = Array.from(el.querySelectorAll<HTMLElement>('.stage'));
    let raf = 0;
    const update = () => {
      const r = el.getBoundingClientRect(); const mid = innerHeight * 0.55;
      const p = Math.min(1, Math.max(0, (mid - r.top) / Math.max(1, r.height)));
      el.style.setProperty('--p', String(p));
      stages.forEach((s) => { const sr = s.getBoundingClientRect(); s.classList.toggle('on', sr.top < mid + 40); });
    };
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    update(); addEventListener('scroll', on, { passive: true }); addEventListener('resize', on);
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, []);
  return (
    <div ref={ref} className="relative pl-12 md:pl-20">
      <div className="rail" aria-hidden="true"><span className="rail-spark-ring" /><span className="rail-spark" /></div>
      {children}
    </div>
  );
}

type Wing = { slug: string; name: string; summary: string | null; responsibilities: string[] };
/** The logo, interactive: each ray is one wing of the club. */
export function WingsBurst({ wings, compact = false }: { wings: Wing[]; compact?: boolean }) {
  const [active, setActive] = useState(0);
  const list = wings.slice(0, 6);
  const w = list[active];
  if (!list.length) return null;
  return (
    <div className={`grid gap-8 items-center ${compact ? 'lg:grid-cols-[minmax(0,460px)_1fr]' : 'lg:grid-cols-[minmax(0,560px)_1fr]'}`}>
      <div className="relative mx-auto w-full max-w-[560px]">
        <div className="absolute inset-[8%] rounded-full lime-field blur-3xl opacity-70" aria-hidden="true" />
        <svg viewBox="120 90 820 820" className="relative w-full" role="group" aria-label="The six wings of BAUBC, drawn as the six rays of the logo">
          {RAYS.map((r, i) => list[i] && (
            <path key={r.id} d={r.d} className={`wing-ray ${i === active ? 'on' : ''}`} tabIndex={0} role="button" aria-label={list[i].name} aria-pressed={i === active}
              onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onClick={() => setActive(i)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(i); } }} />
          ))}
        </svg>
      </div>
      <div className="grid gap-5 min-w-0">
        <div className="glass-strong rounded-[26px] p-6 md:p-8 grid gap-4 min-h-[250px] content-start" aria-live="polite">
          <span className="eyebrow">Ray {String(active + 1).padStart(2, '0')} of 06</span>
          <h3 className="display-md text-[clamp(1.8rem,1.3rem+1.6vw,2.6rem)]" key={w.slug}><span className="fade-up block" style={{ animationDelay: '0ms' }}>{w.name}</span></h3>
          {w.summary && <p className="text-ink-2 text-[1.05rem]">{w.summary}</p>}
          {w.responsibilities?.length > 0 && (
            <ul className="flex flex-wrap gap-2">{w.responsibilities.map((r) => <li key={r} className="chip chip-ok">{r}</li>)}</ul>
          )}
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Wings">
          {list.map((x, i) => (
            <button key={x.slug} type="button" role="tab" aria-selected={i === active} onClick={() => setActive(i)} onMouseEnter={() => setActive(i)}
              className={`btn btn-sm ${i === active ? 'btn-primary' : 'btn-secondary'}`}>{x.name}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn btn-secondary btn-sm" onClick={async () => {
      try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* ignore */ }
    }}>{done ? 'Copied' : label}</button>
  );
}
