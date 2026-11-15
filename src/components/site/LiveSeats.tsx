'use client';
import { useEffect, useRef, useState } from 'react';

type T = { ticket_type_id: string; name: string; capacity: number; sold: number; held: number; seats_left: number; waitlist_count: number; sales_open: boolean; price: string; unit: string };

/** Live seat availability. Every seat is a diamond. Realtime broadcast when Supabase is configured, polling otherwise. */
export function LiveSeats({ eventId, initial, realtime }: { eventId: string; initial: T[]; realtime?: { url: string; key: string } }) {
  const [tickets, setTickets] = useState(initial);
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<'live' | 'polling'>('polling');
  const prev = useRef(initial);

  const apply = (next: T[]) => {
    const ch = new Set<string>();
    next.forEach((n) => { const p = prev.current.find((x) => x.ticket_type_id === n.ticket_type_id); if (p && (p.sold !== n.sold || p.held !== n.held)) ch.add(n.ticket_type_id); });
    prev.current = next; setTickets(next); setChanged(ch);
    if (ch.size) setTimeout(() => setChanged(new Set()), 700);
  };

  useEffect(() => {
    let stop = false; let timer: any; let channel: any; let client: any;
    const load = async () => { try { const r = await fetch(`/api/events/${eventId}/availability`, { cache: 'no-store' }); if (r.ok) apply((await r.json()).tickets); } catch { /* keep last known */ } };
    const poll = async () => { await load(); if (!stop) timer = setTimeout(poll, document.hidden ? 30000 : 10000); };
    (async () => {
      if (realtime?.url && realtime.key) {
        try {
          const { createClient } = await import('@supabase/supabase-js');
          client = createClient(realtime.url, realtime.key);
          channel = client.channel(`event:${eventId}:availability`).on('broadcast', { event: 'availability' }, load).subscribe((s: string) => { if (s === 'SUBSCRIBED') setMode('live'); });
        } catch { /* polling continues */ }
      }
      timer = setTimeout(poll, 10000);
    })();
    return () => { stop = true; clearTimeout(timer); if (client && channel) client.removeChannel(channel); };
  }, [eventId, realtime?.url, realtime?.key]);

  return (
    <div className="grid gap-6" aria-live="polite">
      {tickets.map((t) => {
        const cap = Math.max(t.capacity, 1), cells = Math.min(cap, 144), scale = cap / cells;
        const sold = Math.round(t.sold / scale), held = Math.round(t.held / scale), pct = t.seats_left / cap;
        const status = !t.sales_open ? ['Not open yet', 'chip-draft'] : t.seats_left <= 0 ? ['Sold out', 'chip-bad'] : pct <= 0.1 ? ['Almost full', 'chip-pend'] : ['Open', 'chip-live'];
        return (
          <div key={t.ticket_type_id} className="grid gap-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="label text-muted">{t.name}</p>
                <p className="display-md text-[2.6rem] tnum leading-none mt-1">{t.seats_left}<span className="text-sm text-muted font-sans font-medium tracking-normal"> of {t.capacity} {t.unit === 'team' ? 'team slots' : 'seats'} left</span></p>
              </div>
              <span className={`chip ${status[1]}`}>{status[0]}</span>
            </div>
            <div className="plot" role="img" aria-label={`${t.sold} taken, ${t.held} on hold, ${t.seats_left} open`}>
              {Array.from({ length: cells }, (_, i) => <i key={i} className={`${i < sold ? 'sold' : i < sold + held ? 'held' : ''} ${changed.has(t.ticket_type_id) && i >= sold - 1 && i <= sold + held ? 'sprout' : ''}`} />)}
            </div>
            {t.waitlist_count > 0 && <p className="text-sm text-muted">{t.waitlist_count} on the waitlist</p>}
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5"><i className="inline-block size-2.5 bg-brand diamond-clip" />Taken</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block size-2.5 bg-harvest diamond-clip" />On hold while paying</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block size-2.5 bg-brand/20 diamond-clip" />Open</span>
        <span className="ml-auto inline-flex items-center gap-1.5"><i className={`inline-block size-2 rounded-full ${mode === 'live' ? 'bg-leaf animate-pulse' : 'bg-muted'}`} />{mode === 'live' ? 'Live' : 'Refreshes every 10 s'}</span>
      </div>
    </div>
  );
}
