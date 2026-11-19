import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageHero } from '@/components/site/bits';
import { Empty } from '@/components/ui/Empty';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { MemberOfMonth } from '@/components/site/MemberOfMonth';
import { getLeaderboard, getRecognition, getSettings } from '@/server/queries/public';
import { fmtNum } from '@/lib/format';

export const metadata: Metadata = { title: 'Leaderboard' };

export default async function LeaderboardPage() {
  const settings = await getSettings();
  if (settings.features.leaderboard !== 'public') notFound();
  const [month, all, motm] = await Promise.all([getLeaderboard('month'), getLeaderboard('all'), getRecognition()]);
  const Board = ({ title, rows }: { title: string; rows: typeof month }) => (
    <div className="panel grid gap-3 content-start">
      <h2 className="display-md text-2xl">{title}</h2>
      {rows.length ? rows.slice(0, 15).map((r) => (
        <div key={`${r.rank}-${r.full_name}`} className="flex items-center gap-3 py-2 border-b border-line last:border-0">
          <span className={`grid size-8 place-items-center text-xs font-bold diamond-clip ${Number(r.rank) <= 3 ? 'bg-brand text-lime-200' : 'bg-paper-2'}`}>{r.rank}</span>
          <Avatar name={r.full_name} photoUrl={r.photo_url} size={36} />
          <span className="grid">{r.handle ? <Link href={`/members/${r.handle}`} className="font-bold hover:text-brand transition-colors">{r.full_name}</Link> : <b>{r.full_name}</b>}{r.wing && <span className="text-xs text-muted">{r.wing}</span>}</span>
          <span className="ml-auto heading tnum">{fmtNum(r.points)}</span>
        </div>
      )) : <p className="text-sm text-muted">No verified points yet.</p>}
    </div>
  );
  return (
    <>
      <PageHero label="Leaderboard" title={<>Work that <em className="serif-i text-brand">was verified.</em></>}>Points come only from tasks a reviewer approved. Nobody can edit their own.</PageHero>
      <div className="wrap py-14 grid gap-8">{motm && <div className="max-w-xl mx-auto w-full"><MemberOfMonth award={motm} compact /></div>}{month.length || all.length ? <div className="grid md:grid-cols-2 gap-5"><Board title="This month" rows={month} /><Board title="All time" rows={all} /></div> : <Empty title="The board is empty">Points appear as tasks are reviewed.</Empty>}</div>
    </>
  );
}
