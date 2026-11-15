import { RAYS } from '@/components/brand/Mark';

/** A member's verified work drawn as their own burst: one ray per kind of contribution, longer with more points. */
const SLOTS = [
  { key: 'content', label: 'Content', ray: 0 },
  { key: 'leadership', label: 'Leadership', ray: 1 },
  { key: 'research', label: 'Research', ray: 2 },
  { key: 'events', label: 'Events', ray: 3 },
  { key: 'operations', label: 'Operations', ray: 4 },
  { key: 'community', label: 'Community', ray: 5 },
];

export function RayChart({ data }: { data: { category: string; pts: number }[] }) {
  const sum = (k: string) => data.filter((d) => (k === 'community' ? ['social', 'participation'].includes(d.category) : d.category === k)).reduce((a, d) => a + d.pts, 0);
  const vals = SLOTS.map((s) => ({ ...s, pts: Math.max(0, sum(s.key)) }));
  const max = Math.max(1, ...vals.map((v) => v.pts));
  const total = data.reduce((a, d) => a + d.pts, 0);
  return (
    <figure className="grid gap-4 w-full">
      <div className="relative mx-auto w-full max-w-[300px]">
        <div className="absolute inset-[12%] rounded-full lime-field blur-2xl opacity-60" aria-hidden="true" />
        <svg viewBox="120 90 820 820" className="relative w-full" role="img" aria-label={`Your burst: ${total} verified points. ${vals.map((v) => `${v.label} ${v.pts}`).join(', ')}.`}>
          {vals.map((v) => (
            <g key={v.key}>
              <path d={RAYS[v.ray].d} fill="rgba(1,103,55,.1)" />
              {v.pts > 0 && <g style={{ transformBox: 'view-box' as any, transformOrigin: '590px 436px', transform: `scale(${0.38 + 0.62 * (v.pts / max)})` }}>
                <path d={RAYS[v.ray].d} fill={v.ray === 1 ? '#8FD313' : '#016737'} className="ray-grow" style={{ ['--i' as any]: v.ray }}><title>{`${v.label}: ${v.pts} points`}</title></path>
              </g>}
            </g>
          ))}
        </svg>
      </div>
      <figcaption className="grid grid-cols-2 gap-x-5 gap-y-1.5 text-sm">
        {vals.map((v) => <span key={v.key} className="flex items-center justify-between gap-2 border-b border-line pb-1"><span className="flex items-center gap-2"><i className={`inline-block size-2.5 diamond-clip ${v.ray === 1 ? 'bg-lime-500' : 'bg-brand'}`} />{v.label}</span><b className="tnum">{v.pts}</b></span>)}
      </figcaption>
    </figure>
  );
}
