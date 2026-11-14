'use client';
import { useEffect, useRef, useState } from 'react';

type T = { ticket_type_id: string; name: string; capacity: number; sold: number; held: number; seats_left: number; waitlist_count: number; sales_open: boolean; price: string; unit: string };

/** Live seat availability: Supabase Realtime broadcast when configured, otherwise polling the cached endpoint. */
export function LiveSeats({ eventId, initial, realtime }: { eventId: string; initial: T[]; realtime?: { url: string; key: string } }) {
  const [tickets, setTickets] = useState(initial);
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<'live' | 'polling'>('polling');
  const prev = useRef(initial);

  const apply = (next: T[]) => {
    const ch = new Set<string>();
    next.forEach((n) => { const p = prev.current.find((x) => x.ticket_type_id === n.ticket_type_id); if (p && (p.sold !== n.sold || p.held !== n.held)) ch.add(n.ticket_type_id); });
    prev.current = next; setTickets(next); setChanged(ch);
    if (ch.size) setTimeout(() => setChanged(new Set()), 600);
  };

  useEffect(() => {
    let stop = false; let timer: any; let channel: any; let client: any;
    const poll = async () => {
      try { const r = await fetch(`/api/events/${eventId}/availability`, { cache: 'no-store' }); if (r.ok) apply((await r.json()).tickets); } catch {}
      if (!stop) timer = setTimeout(poll, document.hidden ? 30000 : 10000);
    };
    (async () => {
      if (realtime?.url && realtime.key) {
        try {
          const { createClient } = await import('@supabase/supabase-js');
          client = createClient(realtime.url, realtime.key);
          channel = client.channel(`event:${eventId}:availability`).on('broadcast', { event: 'availability' }, () => {
            fetch(`/api/events/${eventId}/availability`, { cache: 'no-store' }).then((r) => r.json()).then((d) => apply(d.tickets)).catch(() => {});
          }).subscribe((s: string) => { if (s === 'SUBSCRIBED') setMode('live'); });
        } catch {}
      }
      timer = setTimeout(poll, 10000);
    })();
    return () => { stop = true; clearTimeout(timer); if (client && channel) client.removeChannel(channel); };
  }, [eventId, realtime?.url, realtime?.key]);

  return (
    <div className="grid gap-5" aria-live="polite">
      {tickets.map((t) => {
        const cap = Math.max(t.capacity, 1);
        const cells = Math.min(cap, 120);
        const scale = cap / cells;
        const sold = Math.round(t.sold / scale), held = Math.round(t.held / scale);
        const pct = t.seats_left / cap;
        const status = !t.sales_open ? ['Not open', 'chip-draft'] : t.seats_left <= 0 ? ['Sold out', 'chip-bad'] : pct <= 0.1 ? ['Almost full', 'chip-pend'] : ['Open', 'chip-live'];
        return (
          <div key={t.ticket_type_id} className="grid gap-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="label text-muted">{t.name}</p>
                <p className="display-md text-4xl tnum">{t.seats_left}<span className="text-base text-muted font-sans font-medium tracking-normal"> / {t.capacity} {t.unit === 'team' ? 'team slots' : 'seats'} left</span></p>
              </div>
              <span className={`chip ${status[1]}`}>{status[0]}</span>
            </div>
            <div className="plot" role="img" aria-label={`${t.sold} taken, ${t.held} on hold, ${t.seats_left} open`}>
              {Array.from({ length: cells }, (_, i) => (
                <i key={i} className={`${i < sold ? 'sold' : i < sold + held ? 'held' : ''} ${changed.has(t.ticket_type_id) && i >= sold - 1 && i <= sold + held ? 'sprout' : ''}`} />
              ))}
            </div>
            {t.waitlist_count > 0 && <p className="text-sm text-muted">{t.waitlist_count} on the waitlist</p>}
          </div>
        );
      })}
      <div className="flex flex-wrap gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5"><i className="inline-block size-3 rounded-[2px] bg-brand" />Taken</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block size-3 rounded-[2px] border border-harvest" style={{ background: 'repeating-linear-gradient(135deg,var(--harvest) 0 2px,transparent 2px 5px)' }} />On hold (payment pending)</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block size-3 rounded-[2px] border border-line-strong" />Open</span>
        <span className="ml-auto">{mode === 'live' ? 'Live' : 'Updates every 10 s'}</span>
      </div>
    </div>
  );
}
