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
    <div role="status" className="fixed z-50 bottom-4 left-1/2 -translate-x-1/2 max-w-[92vw] rounded-xl bg-ink text-paper px-4 py-3 shadow-[var(--shadow)] flex items-center gap-3 text-sm">
      <span className="size-2 rounded-full bg-signal shrink-0" aria-hidden="true" />
      <span>{msg}</span>
      <button type="button" onClick={() => setMsg(null)} className="ml-2 opacity-70 hover:opacity-100" aria-label="Dismiss">✕</button>
    </div>
  );
}
