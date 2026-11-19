import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { fmtNum } from '@/lib/format';

type Award = { period: string; full_name: string; citation: string; wing: string | null; handle?: string | null; photo_url?: string | null; points?: number | null };

const monthLabel = (d: string) => new Date(d).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** The trailer's Member of the Month card: spinning ring, light rays, a shine that sweeps across. */
export function MemberOfMonth({ award, compact = false, className = '' }: { award: Award; compact?: boolean; className?: string }) {
  const body = (
    <div className={`mom group relative isolate overflow-hidden rounded-[32px] text-center ${compact ? 'p-6' : 'p-8 md:p-10'} ${className}`}>
      <div className="mom-rays" aria-hidden="true" />
      <div className="absolute inset-0 -z-10 pat-diamonds opacity-60" aria-hidden="true" />
      <span className="mom-shine" aria-hidden="true" />
      <span className="tag !bg-ink !text-lime-200 !border-transparent mx-auto">★ Member of the Month</span>
      <div className={`relative mx-auto ${compact ? 'mt-6 size-28' : 'mt-8 size-40'}`}>
        <span className="mom-ring" aria-hidden="true" />
        <span className="absolute -inset-[5px] rounded-full bg-white" aria-hidden="true" />
        <Avatar name={award.full_name} photoUrl={award.photo_url} size={compact ? 112 : 160} className="!rounded-full relative" />
        <span className={`absolute grid place-items-center rounded-full bg-harvest border-4 border-white text-ink ${compact ? '-right-1 bottom-0 size-10 text-lg' : '-right-1 bottom-1 size-12 text-xl'}`} aria-hidden="true">★</span>
      </div>
      <p className={`display-md mt-6 ${compact ? 'text-3xl' : 'text-[clamp(2.2rem,1.6rem+2vw,3.4rem)]'}`}>{award.full_name}</p>
      <p className="serif-i text-brand text-2xl mt-1">{monthLabel(award.period)}</p>
      {award.wing && <p className="text-sm text-muted mt-1">{award.wing}</p>}
      <p className={`text-ink-2 mx-auto mt-4 max-w-md ${compact ? 'text-sm' : ''}`}>“{award.citation}”</p>
      {award.points != null && award.points > 0 && (
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white border border-line px-4 py-2 text-sm font-semibold"><span className="tnum">{fmtNum(award.points)}</span> verified points that month</div>
      )}
      {award.handle && <p className="mt-5 text-sm font-semibold text-brand link-arrow justify-center">View profile →</p>}
    </div>
  );
  return award.handle ? <Link href={`/members/${award.handle}`} className="block reveal" data-r="scale" aria-label={`Member of the Month: ${award.full_name}`}>{body}</Link> : <div className="reveal" data-r="scale">{body}</div>;
}
