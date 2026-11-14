'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { checkIn } from '@/app/actions/portal';

type Result = { result: string; name?: string; team?: string; ticket?: string; message?: string; first_scan_at?: string; first_scanner?: string };
const QUEUE_KEY = 'baubc_scan_queue';

export function Scanner({ events, initialEvent }: { events: { id: string; title: string }[]; initialEvent?: string }) {
  const [eventId, setEventId] = useState(initialEvent ?? '');
  const [code, setCode] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [camera, setCamera] = useState(false);
  const [online, setOnline] = useState(true);
  const [queued, setQueued] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  const busy = useRef(false);
  const last = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const device = useRef('');

  useEffect(() => {
    try { device.current = localStorage.getItem('baubc_device') || crypto.randomUUID(); localStorage.setItem('baubc_device', device.current); } catch { device.current = 'web'; }
    const upd = () => setOnline(navigator.onLine); upd();
    addEventListener('online', upd); addEventListener('offline', upd);
    try { setQueued(JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]').length); } catch {}
    return () => { removeEventListener('online', upd); removeEventListener('offline', upd); };
  }, []);

  const submit = useCallback(async (raw: string) => {
    const c = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!c || !eventId || busy.current) return;
    if (last.current.code === c && Date.now() - last.current.at < 3000) return;
    last.current = { code: c, at: Date.now() };
    busy.current = true;
    if (!navigator.onLine) {
      try { const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); q.push({ c, eventId, at: new Date().toISOString() }); localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); setQueued(q.length); } catch {}
      setResult({ result: 'queued', message: 'Offline: saved and will sync when the connection returns. Check the attendee’s name on their ticket.' });
      busy.current = false; return;
    }
    const r = (await checkIn(c, eventId, device.current)) as Result;
    setResult(r); setCode('');
    try { navigator.vibrate?.(r.result === 'ok' ? 60 : [80, 60, 80]); } catch {}
    busy.current = false;
  }, [eventId]);

  useEffect(() => {
    if (!online) return;
    (async () => {
      let q: any[] = [];
      try { q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch {}
      if (!q.length) return;
      for (const item of q) await checkIn(item.c, item.eventId, device.current);
      try { localStorage.setItem(QUEUE_KEY, '[]'); } catch {}
      setQueued(0);
    })();
  }, [online]);

  useEffect(() => {
    if (!camera) return;
    let stream: MediaStream | null = null; let stop = false; let reader: any; let controls: any;
    (async () => {
      try {
        if ('BarcodeDetector' in window) {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          if (!video.current) return;
          video.current.srcObject = stream; await video.current.play();
          const det = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          const tick = async () => {
            if (stop || !video.current) return;
            try { const codes = await det.detect(video.current); if (codes[0]?.rawValue) await submit(codes[0].rawValue); } catch {}
            setTimeout(tick, 250);
          };
          tick();
        } else {
          const { BrowserQRCodeReader } = await import('@zxing/browser');
          reader = new BrowserQRCodeReader();
          controls = await reader.decodeFromVideoDevice(undefined, video.current!, (res: any) => { if (res) submit(res.getText()); });
        }
      } catch { setCamera(false); setResult({ result: 'error', message: 'Camera unavailable. Type the code instead.' }); }
    })();
    return () => { stop = true; stream?.getTracks().forEach((t) => t.stop()); controls?.stop?.(); };
  }, [camera, submit]);

  const tone = !result ? '' : result.result === 'ok' ? 'bg-[#0B7A4B] text-white' : result.result === 'duplicate' || result.result === 'queued' ? 'bg-[#E9A23B] text-[#151913]' : 'bg-[#C2412D] text-white';
  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">
      <div className="grid gap-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="field min-w-[240px] flex-1"><label htmlFor="sc-ev">Event</label><select id="sc-ev" className="select" value={eventId} onChange={(e) => setEventId(e.target.value)}>{events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}</select></div>
          <button type="button" className={`btn ${camera ? 'btn-secondary' : 'btn-primary'}`} onClick={() => setCamera((c) => !c)}>{camera ? 'Stop camera' : 'Start camera'}</button>
        </div>
        <div className="relative rounded-2xl overflow-hidden bg-canopy aspect-[4/3] grid place-items-center">
          <video ref={video} className={`absolute inset-0 h-full w-full object-cover ${camera ? '' : 'hidden'}`} muted playsInline />
          {!camera && <p className="text-canopy-muted text-sm px-6 text-center">Camera is off. Start it to scan, or type the ticket code below.</p>}
          {camera && <div className="absolute inset-[18%] border-2 border-signal rounded-xl pointer-events-none" />}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); submit(code); }} className="flex gap-2">
          <input aria-label="Ticket code" value={code} onChange={(e) => setCode(e.target.value)} className="input font-mono uppercase tracking-widest" placeholder="Ticket code" />
          <button className="btn btn-dark">Check in</button>
        </form>
        <p className="text-xs text-muted">{online ? 'Online' : 'Offline'}{queued ? ` · ${queued} scans waiting to sync` : ''}</p>
      </div>
      <div aria-live="assertive" className={`rounded-2xl p-6 min-h-[220px] grid content-center gap-2 ${tone || 'panel'}`}>
        {!result ? <p className="text-muted">Results appear here in large text.</p> : (
          <>
            <span className="label opacity-80">{result.result === 'ok' ? 'Welcome' : result.result === 'duplicate' ? 'Already checked in' : result.result === 'queued' ? 'Saved offline' : result.result === 'wrong_event' ? 'Wrong event' : 'Not valid'}</span>
            {result.name && <p className="display-md text-4xl">{result.name}</p>}
            {result.team && <p>Team {result.team}</p>}
            {result.ticket && <p className="opacity-90">{result.ticket}</p>}
            {result.result === 'duplicate' && <p className="text-sm">First scan {result.first_scan_at ? new Date(result.first_scan_at).toLocaleTimeString('en-GB', { timeZone: 'Asia/Dhaka' }) : ''} by {result.first_scanner ?? 'staff'}</p>}
            {result.message && <p className="text-sm">{result.message}</p>}
          </>
        )}
      </div>
    </div>
  );
}
