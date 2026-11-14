export function LedgerStamp({ year = new Date().getFullYear(), size = 44, className = '' }: { year?: number | string; size?: number; className?: string }) {
  const id = `ring-${size}-${year}`;
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" className={`shrink-0 ${className}`} role="img" aria-label="Verified record">
      <defs><path id={id} d="M22,22 m-17.5,0 a17.5,17.5 0 1,1 35,0 a17.5,17.5 0 1,1 -35,0" /></defs>
      <circle cx="22" cy="22" r="20.5" style={{ fill: 'none', stroke: 'var(--brand)' }} strokeWidth="1.2" />
      <circle cx="22" cy="22" r="15" style={{ fill: 'none', stroke: 'var(--brand)' }} strokeWidth=".6" strokeDasharray="1.5 1.5" />
      <path d="M17.5 21v-2.5a4.5 4.5 0 0 1 9 0V21h1v7h-11v-7zm2 0h5v-2.5a2.5 2.5 0 0 0-5 0z" style={{ fill: 'var(--brand)' }} />
      <text style={{ font: "600 7.2px/1 var(--font-geist-mono), monospace", letterSpacing: '.12em', fill: 'var(--brand)' }}>
        <textPath href={`#${id}`}>VERIFIED · BAUBC · {year} ·</textPath>
      </text>
    </svg>
  );
}
