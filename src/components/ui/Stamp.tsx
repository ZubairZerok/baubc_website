import { MARK_PATH } from '@/components/brand/Mark';

/** Verified stamp: the club mark inside a ring of text. Marks records that are locked and official. */
export function LedgerStamp({ year = new Date().getFullYear(), size = 44, className = '' }: { year?: number | string; size?: number; className?: string }) {
  const id = `ring-${size}-${year}`;
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" className={`shrink-0 ${className}`} role="img" aria-label="Verified record">
      <defs><path id={id} d="M22,22 m-17.4,0 a17.4,17.4 0 1,1 34.8,0 a17.4,17.4 0 1,1 -34.8,0" /></defs>
      <circle cx="22" cy="22" r="21" fill="#016737" />
      <circle cx="22" cy="22" r="13.2" fill="none" stroke="#E0FF73" strokeWidth=".7" strokeDasharray="1.2 1.6" />
      <g transform="translate(12.6 12.4) scale(.0186)"><path d={MARK_PATH} fill="#fff" /></g>
      <text style={{ font: '600 5.6px var(--font-geist-mono), monospace', letterSpacing: '.14em', fill: '#E0FF73' }}>
        <textPath href={`#${id}`}>VERIFIED · BAUBC · {year} · VERIFIED ·</textPath>
      </text>
    </svg>
  );
}
