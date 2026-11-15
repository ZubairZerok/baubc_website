'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function NavLink({ href, label, badge, exact }: { href: string; label: string; badge?: number; exact?: boolean }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(href + '/');
  return (
    <Link href={href} aria-current={active ? 'page' : undefined}
      className={`group flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-[.92rem] transition-all ${active ? 'bg-brand text-white font-semibold shadow-[0_8px_18px_-10px_rgb(1_103_55/.8)]' : 'text-ink-2 hover:bg-white/80 hover:text-ink'}`}>
      <span className="flex items-center gap-2.5"><span className={`size-[7px] diamond-clip transition-all ${active ? 'bg-lime-300 scale-125' : 'bg-brand/25 group-hover:bg-brand/60'}`} />{label}</span>
      {!!badge && <span className={`min-w-6 h-6 px-1.5 rounded-full text-[11px] font-bold grid place-items-center tnum ${active ? 'bg-lime-300 text-ink' : 'bg-[var(--tint-pend)] text-harvest-text'}`}>{badge}</span>}
    </Link>
  );
}
