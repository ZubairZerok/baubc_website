'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Video = { id: string; title: string; published: string | null; kind: 'short' | 'video'; views: number | null };

const compact = (n: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

/** Thumbnail with a graceful chain: portrait Shorts frame → standard frame → a branded poster. */
function Thumb({ v, className = '' }: { v: Video; className?: string }) {
  const srcs = v.kind === 'short' ? [`https://i.ytimg.com/vi/${v.id}/oar2.jpg`, `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`] : [`https://i.ytimg.com/vi/${v.id}/maxresdefault.jpg`, `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`];
  const [i, setI] = useState(0);
  const img = useRef<HTMLImageElement>(null);
  // an image that failed before hydration never fires onError: check once on mount
  useEffect(() => { const el = img.current; if (el && el.complete && el.naturalWidth === 0) setI((x) => x + 1); }, [i]);
  if (i >= srcs.length) {
    return (
      <span className={`reel-poster ${className}`} aria-hidden="true">
        <svg viewBox="150 120 760 760" className="w-1/2 opacity-90"><path fill="currentColor" d="M292 250 382 161 541 321 545 363H405ZM667 271 760 364 675 450 581 357ZM191 387H545L549 492 640 489V838H517V609L353 773 260 680 424 514H191ZM665 488 708 486 871 648 782 737 665 620Z" /></svg>
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={img} src={srcs[i]} alt="" loading="lazy" decoding="async" className={`absolute inset-0 h-full w-full object-cover ${className}`} onError={() => setI((x) => x + 1)} onLoad={(e) => { if ((e.target as HTMLImageElement).naturalWidth <= 120) setI((x) => x + 1); }} />;
}

function Player({ list, index, onClose, onMove, channelUrl }: { list: Video[]; index: number; onClose: () => void; onMove: (d: number) => void; channelUrl: string }) {
  const v = list[index];
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') onMove(1); if (e.key === 'ArrowLeft') onMove(-1); };
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    addEventListener('keydown', onKey);
    return () => { removeEventListener('keydown', onKey); document.documentElement.style.overflow = overflow; prev?.focus?.(); };
  }, [onClose, onMove]);
  const short = v.kind === 'short';
  return createPortal(
    <div className="reel-lightbox" role="dialog" aria-modal="true" aria-label={v.title || 'BAUBC reel'} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`reel-stage ${short ? 'is-short' : 'is-video'}`} key={v.id}>
        <Thumb v={v} className="opacity-60 blur-[2px] scale-105" />
        <iframe src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0&playsinline=1&modestbranding=1`} title={v.title || 'BAUBC reel'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      </div>
      <div className="reel-bar">
        <span className="min-w-0 grid"><b className="truncate">{v.title || 'BAUBC reel'}</b><span className="text-xs text-white/65">{index + 1} of {list.length}{v.views ? ` · ${compact(v.views)} views` : ''}</span></span>
        <a href={short ? `https://www.youtube.com/shorts/${v.id}` : `https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer" className="btn btn-lime btn-sm">Open on YouTube</a>
      </div>
      <button type="button" className="reel-nav left-3 md:left-8" onClick={() => onMove(-1)} aria-label="Previous reel" disabled={index === 0}>←</button>
      <button type="button" className="reel-nav right-3 md:right-8" onClick={() => onMove(1)} aria-label="Next reel" disabled={index === list.length - 1}>→</button>
      <button type="button" ref={closeRef} className="reel-close" onClick={onClose} aria-label="Close player">✕</button>
      <a href={channelUrl} target="_blank" rel="noopener noreferrer" className="sr-only">BAUBC on YouTube</a>
    </div>,
    document.body,
  );
}

function Card({ v, i, onOpen, wide = v.kind === 'video' }: { v: Video; i: number; onOpen: () => void; wide?: boolean }) {
  return (
    <button type="button" onClick={onOpen} className={`reel-card group reveal ${wide ? 'is-wide' : ''}`} style={{ ['--d' as any]: i % 6 }} aria-label={`Play ${v.title || 'reel'}`}>
      <Thumb v={v} className="transition-transform duration-[900ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.07]" />
      <span className="reel-shade" aria-hidden="true" />
      <span className="reel-play" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg></span>
      <span className="reel-meta">
        {v.views ? <span className="reel-chip">{compact(v.views)} views</span> : <span className="reel-chip">{v.kind === 'short' ? 'Short' : 'Video'}</span>}
        {v.title && <span className="reel-title">{v.title}</span>}
      </span>
    </button>
  );
}

/** Horizontal rail of 9:16 reels with snap scrolling, arrow controls and an in-page player. */
export function ReelsRail({ reels, channelUrl, dark = false }: { reels: Video[]; channelUrl: string; dark?: boolean }) {
  const rail = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const move = useCallback((d: number) => setOpen((o) => (o == null ? o : Math.min(reels.length - 1, Math.max(0, o + d)))), [reels.length]);
  const close = useCallback(() => setOpen(null), []);
  const onScroll = () => { const el = rail.current; if (!el) return; setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 }); };
  useEffect(onScroll, []);
  const by = (d: number) => rail.current?.scrollBy({ left: d * rail.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <div className={`relative ${dark ? 'reels-dark' : ''}`}>
      <div ref={rail} onScroll={onScroll} className={`reels-rail ${edge.start ? 'at-start' : ''} ${edge.end ? 'at-end' : ''}`}>
        {reels.map((v, i) => <Card key={v.id} v={v} i={i} onOpen={() => setOpen(i)} />)}
        <a href={channelUrl} target="_blank" rel="noopener noreferrer" className="reel-card reel-more reveal" style={{ ['--d' as any]: reels.length % 6 }}>
          <span className="grid place-items-center gap-3 text-center p-6">
            <span className="grid size-14 place-items-center rounded-2xl bg-[#FF0033] text-white"><svg viewBox="0 0 24 24" width="26" height="26"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg></span>
            <b className="display-md text-2xl leading-tight">More on our channel</b>
            <span className="text-sm opacity-75">Subscribe for every new reel</span>
          </span>
        </a>
      </div>
      <div className="hidden md:flex gap-2 justify-end mt-5">
        <button type="button" className="reel-arrow" onClick={() => by(-1)} disabled={edge.start} aria-label="Scroll reels left">←</button>
        <button type="button" className="reel-arrow" onClick={() => by(1)} disabled={edge.end} aria-label="Scroll reels right">→</button>
      </div>
      {open != null && <Player list={reels} index={open} onClose={close} onMove={move} channelUrl={channelUrl} />}
    </div>
  );
}

/** Grid version for the /reels page (Shorts first, long videos below). */
export function ReelsGrid({ reels, videos, channelUrl }: { reels: Video[]; videos: Video[]; channelUrl: string }) {
  const all = [...reels, ...videos];
  const [open, setOpen] = useState<number | null>(null);
  const move = useCallback((d: number) => setOpen((o) => (o == null ? o : Math.min(all.length - 1, Math.max(0, o + d)))), [all.length]);
  const close = useCallback(() => setOpen(null), []);
  return (
    <>
      {reels.length > 0 && <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">{reels.map((v, i) => <Card key={v.id} v={v} i={i} wide={false} onOpen={() => setOpen(i)} />)}</div>}
      {videos.length > 0 && (
        <div className="grid gap-6 mt-14">
          <h2 className="display-md text-3xl">Long-form</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{videos.map((v, i) => <Card key={v.id} v={v} i={i} wide onOpen={() => setOpen(reels.length + i)} />)}</div>
        </div>
      )}
      {open != null && <Player list={all} index={open} onClose={close} onMove={move} channelUrl={channelUrl} />}
    </>
  );
}
