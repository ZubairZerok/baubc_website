const COLORS: Record<string, string> = { content: 'var(--brand)', research: 'var(--river)', events: 'var(--harvest)', operations: 'var(--leaf)', social: 'var(--soil)', leadership: 'var(--green)', participation: 'var(--muted)' };

function arc(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  const p = (r: number, a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = p(r1, a0), [x1, y1] = p(r1, a1), [x2, y2] = p(r0, a1), [x3, y3] = p(r0, a0);
  return `M${x0} ${y0}A${r1} ${r1} 0 ${large} 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 ${large} 0 ${x3} ${y3}Z`;
}

/** Growth Rings: one ring per year, thickness = verified points, segments = categories. */
export function GrowthRings({ data }: { data: { y: number; category: string; pts: number }[] }) {
  const years = Array.from(new Set(data.map((d) => d.y))).sort();
  const totals = years.map((y) => data.filter((d) => d.y === y).reduce((a, d) => a + Math.max(0, d.pts), 0));
  const max = Math.max(1, ...totals);
  const total = data.reduce((a, d) => a + d.pts, 0);
  let r = 52; const paths: React.ReactNode[] = [];
  years.forEach((y, yi) => {
    const sum = totals[yi]; if (!sum) return;
    const th = 7 + (sum / max) * 12; let a = -Math.PI / 2;
    data.filter((d) => d.y === y && d.pts > 0).forEach((d) => {
      const span = (d.pts / sum) * Math.PI * 2;
      paths.push(<path key={`${y}-${d.category}`} d={arc(130, 130, r, r + th, a + 0.025, a + span - 0.025)} style={{ fill: COLORS[d.category] ?? 'var(--muted)' }}><title>{`${y} · ${d.category}: ${d.pts} pts`}</title></path>);
      a += span;
    });
    r += th + 4;
  });
  const cats = Array.from(new Set(data.map((d) => d.category)));
  return (
    <figure className="grid gap-3 w-full max-w-[260px]">
      <svg viewBox="0 0 260 260" role="img" aria-label={`Growth rings: ${total} verified points across ${years.length} year(s)`}>
        {!years.length && <circle cx="130" cy="130" r="40" style={{ fill: 'none', stroke: 'var(--line-strong)' }} strokeDasharray="3 4" />}
        {paths}
        <text x="130" y="128" textAnchor="middle" style={{ font: '700 26px var(--font-bricolage)', fill: 'var(--ink)' }}>{total}</text>
        <text x="130" y="146" textAnchor="middle" style={{ font: '500 7px var(--font-geist-mono)', letterSpacing: '.06em', fill: 'var(--muted)' }}>VERIFIED PTS</text>
      </svg>
      <figcaption className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted justify-center">
        {cats.map((c) => <span key={c} className="inline-flex items-center gap-1"><i className="inline-block size-2.5 rounded-sm" style={{ background: COLORS[c] ?? 'var(--muted)' }} />{c}</span>)}
        {years.length > 0 && <span>· {years[0]}–{years[years.length - 1]}</span>}
      </figcaption>
    </figure>
  );
}
