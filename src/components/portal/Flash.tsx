'use client';
import { useEffect, useState } from 'react';

/** One-shot toast for actions whose form disappears after success (queue items). */
export function Flash({ message }: { message: string | null }) {
  const [msg, setMsg] = useState(message);
  useEffect(() => {
    setMsg(message);
    if (!message) return;
    document.cookie = 'flash=; Max-Age=0; path=/';
    const t = setTimeout(() => setMsg(null), 6000);
    return () => clearTimeout(t);
  }, [message]);
  if (!msg) return null;
  return (
    <div role="status" className="fade-up fixed z-50 bottom-5 left-1/2 -translate-x-1/2 max-w-[92vw] rounded-full bg-ink text-white pl-4 pr-3 py-2.5 shadow-[var(--shadow)] flex items-center gap-3 text-sm">
      <span className="size-2.5 diamond-clip bg-lime-300 shrink-0" aria-hidden="true" />
      <span>{msg}</span>
      <button type="button" onClick={() => setMsg(null)} className="ml-2 opacity-70 hover:opacity-100" aria-label="Dismiss">✕</button>
    </div>
  );
}
