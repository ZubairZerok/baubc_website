'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { setLang } from '@/app/actions/prefs';

export function LangToggle({ lang, dark = false }: { lang: 'en' | 'bn'; dark?: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className={`inline-flex rounded-full border p-0.5 text-xs font-semibold ${dark ? 'border-white/30' : 'border-line-strong'}`} role="group" aria-label="Language">
      {(['en', 'bn'] as const).map((l) => (
        <button key={l} type="button" disabled={pending} onClick={() => start(() => setLang(l))} aria-pressed={lang === l}
          className={`min-h-8 px-3 rounded-full transition-colors ${lang === l ? (dark ? 'bg-on-canopy text-canopy' : 'bg-ink text-paper') : ''}`}>
          {l === 'en' ? 'EN' : 'বাং'}
        </button>
      ))}
    </div>
  );
}

export function ThemeToggle() {
  const [mode, setMode] = useState<'light' | 'dark' | null>(null);
  useEffect(() => { setMode((document.documentElement.dataset.theme as any) ?? null); }, []);
  const next = () => {
    const isDark = mode ? mode === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    const m = isDark ? 'light' : 'dark';
    document.documentElement.dataset.theme = m;
    try { localStorage.setItem('theme', m); } catch {}
    setMode(m);
  };
  return (
    <button type="button" onClick={next} className="btn btn-ghost btn-sm" aria-label="Switch light or dark theme" title="Theme">
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
    </button>
  );
}

export function MobileMenu({ items, cta }: { items: { href: string; label: string }[]; cta: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; }, [open]);
  return (
    <div className="lg:hidden">
      <button type="button" className="btn btn-ghost btn-sm" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen((o) => !o)}>
        <span className="sr-only">Menu</span>
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d={open ? 'M6 6l12 12M18 6 6 18' : 'M4 7h16M4 12h16M4 17h10'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </button>
      {open && (
        <div id="mobile-nav" className="fixed inset-x-0 bottom-0 top-[64px] z-40 canopy on-canopy overflow-y-auto">
          <nav className="wrap py-8 grid gap-1" aria-label="Mobile">
            {items.map((it, i) => (
              <Link key={it.href} href={it.href} className="display-md text-4xl py-2 border-b border-white/10 reveal in" style={{ transitionDelay: `${i * 30}ms` }}>
                {it.label}
              </Link>
            ))}
            <div className="mt-6 flex flex-wrap gap-3">{cta}</div>
          </nav>
        </div>
      )}
    </div>
  );
}

/** Adds .in to .reveal elements as they enter the viewport (content is visible without JS). */
export function RevealObserver() {
  const path = usePathname();
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.reveal:not(.in)'));
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -5% 0px' });
    els.forEach((e) => io.observe(e));
    // never leave content hidden: reveal everything once the reader reaches the end, or after a few seconds of idling
    const all = () => document.querySelectorAll('.reveal:not(.in)').forEach((e) => e.classList.add('in'));
    const onScroll = () => { if (innerHeight + scrollY >= document.documentElement.scrollHeight - 80) all(); };
    addEventListener('scroll', onScroll, { passive: true });
    const t = setTimeout(all, 6000);
    return () => { io.disconnect(); removeEventListener('scroll', onScroll); clearTimeout(t); };
  }, [path]);
  return null;
}

/** Furrow Field: contour lines that bend into a rising market line as the hero scrolls away. */
export function FurrowCanvas({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!; const ctx = cv.getContext('2d')!;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const save = (navigator as any).connection?.saveData;
    let W = 0, H = 0, t = 0, raf = 0, running = false, visible = true;
    const size = () => { const r = cv.getBoundingClientRect(); const d = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    const progress = () => { const r = cv.getBoundingClientRect(); return Math.min(1, Math.max(0, -r.top / Math.max(1, r.height * 0.8))); };
    const market = (x: number) => { const u = x / W; return H * 0.88 - Math.pow(u, 1.7) * H * 0.62 - Math.sin(u * 22) * H * 0.018 * (1 - u * 0.4); };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const p = reduce || save ? 0.35 : 0.12 + progress() * 0.88, n = W < 640 ? 18 : 28;
      for (let i = 0; i < n; i++) {
        const base = H * 0.1 + (i / (n - 1)) * H * 0.92, sig = i === Math.round(n * 0.62);
        ctx.beginPath();
        for (let x = 0; x <= W; x += 8) {
          const field = base + Math.sin(x * 0.006 + t + i * 0.35) * 9 + Math.sin(x * 0.017 - t * 0.6 + i) * 3;
          const mk = market(x) + (i - n * 0.62) * H * 0.018;
          const y = field * (1 - p * 0.85) + mk * (p * 0.85);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.lineWidth = sig ? 2.2 : 1;
        ctx.strokeStyle = sig ? 'rgba(200,245,60,0.95)' : `rgba(82,196,138,${0.1 + (i / n) * 0.28})`;
        ctx.stroke();
      }
    };
    const loop = () => { if (!running) return; t += 0.006; draw(); raf = requestAnimationFrame(loop); };
    const start = () => { if (reduce || save || running || !visible || document.hidden) return; running = true; raf = requestAnimationFrame(loop); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    size(); draw(); start();
    const onResize = () => { size(); draw(); };
    const onScroll = () => { if (!running) draw(); };
    const onVis = () => (document.hidden ? stop() : start());
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); });
    io.observe(cv);
    addEventListener('resize', onResize); addEventListener('scroll', onScroll, { passive: true }); document.addEventListener('visibilitychange', onVis);
    return () => { stop(); io.disconnect(); removeEventListener('resize', onResize); removeEventListener('scroll', onScroll); document.removeEventListener('visibilitychange', onVis); };
  }, []);
  return <canvas ref={ref} aria-hidden="true" className={`absolute inset-0 h-full w-full ${className}`} />;
}

export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={async () => {
      try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* ignore */ }
    }}>{done ? 'Copied' : label}</button>
  );
}
