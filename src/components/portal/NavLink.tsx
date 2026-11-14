'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function NavLink({ href, label, badge }: { href: string; label: string; badge?: number }) {
  const path = usePathname();
  const active = href === '/app' ? path === '/app' : path === href || path.startsWith(href + '/');
  return (
    <Link href={href} aria-current={active ? 'page' : undefined}
      className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[.92rem] transition-colors ${active ? 'bg-brand text-paper font-semibold' : 'text-ink-2 hover:bg-paper-2 hover:text-ink'}`}>
      <span>{label}</span>
      {!!badge && <span className={`min-w-6 h-6 px-1.5 rounded-full text-[11px] font-bold grid place-items-center tnum ${active ? 'bg-signal text-on-signal' : 'bg-tint-pend text-harvest-text'}`} style={!active ? { background: 'var(--tint-pend)' } : undefined}>{badge}</span>}
    </Link>
  );
}
