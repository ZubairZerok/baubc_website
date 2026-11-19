import Link from 'next/link';
import { PageTitle } from '@/components/portal/Shell';
import { Empty } from '@/components/ui/Empty';
import { Avatar } from '@/components/ui/Avatar';
import { MemberOfMonth } from '@/components/site/MemberOfMonth';
import { withClaims } from '@/server/db';
import { requireSession } from '@/server/session';

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const session = await requireSession('/app/leaderboard');
  const scope = (await searchParams).scope === 'all' ? 'all' : 'month';
  const d = await withClaims(session.claims, async (tx) => ({
    rows: await tx.query(`select rank::int, full_name, wing, points::int, handle, photo_url from app.leaderboard($1)`, [scope]),
    me: await tx.one(`select coalesce(p.display_name, p.full_name) nm from app.people p where p.id = authz.current_person_id()`),
    award: await tx.one(`select * from app.public_recognition()`),
  }));
  const top = d.rows.slice(0, 3), rest = d.rows.slice(3);
  const order = [top[1], top[0], top[2]].filter(Boolean);
  return (
    <>
      <PageTitle label="Members" title="Leaderboard" actions={<><Link href="?scope=month" className={`btn btn-sm ${scope === 'month' ? 'btn-dark' : 'btn-secondary'}`}>This month</Link><Link href="?scope=all" className={`btn btn-sm ${scope === 'all' ? 'btn-dark' : 'btn-secondary'}`}>All time</Link></>}>
        Only verified points count: work a reviewer approved, events you were scanned into, and recognised achievements.
      </PageTitle>
      {d.rows.length ? (
        <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
          <div className="grid gap-5">
            <div className="grid grid-cols-3 gap-3 items-end">
              {order.map((r: any) => (
                <div key={r.rank} className={`relative rounded-[26px] p-4 grid gap-2 justify-items-center text-center ${r.rank === 1 ? 'lime-field pt-8 pb-7 shadow-[var(--shadow)]' : 'panel'}`}>
                  <span className={`absolute -top-3 grid place-items-center size-8 rounded-full font-display font-bold text-sm ${r.rank === 1 ? 'bg-brand text-white' : 'bg-ink text-white'}`}>{r.rank}</span>
                  <Avatar name={r.full_name} photoUrl={r.photo_url} size={r.rank === 1 ? 72 : 56} />
                  <b className="leading-tight">{r.full_name}</b>
                  <span className="text-xs text-ink-2">{r.wing ?? 'Member'}</span>
                  <span className="display-md text-3xl tnum">{r.points}</span>
                </div>
              ))}
            </div>
            {rest.length > 0 && (
              <div className="table-wrap"><table className="table"><thead><tr><th className="w-14">#</th><th>Member</th><th>Wing</th><th className="text-right">Points</th></tr></thead>
                <tbody>{rest.map((r: any) => <tr key={r.rank} className={r.full_name === d.me?.nm ? 'bg-lime-50' : ''}><td className="tnum text-muted">{r.rank}</td><td className="font-semibold">{r.full_name}{r.full_name === d.me?.nm && <span className="chip chip-live ml-2">You</span>}</td><td className="text-sm text-ink-2">{r.wing ?? '—'}</td><td className="text-right tnum font-semibold">{r.points}</td></tr>)}</tbody></table></div>
            )}
          </div>
          <aside className="grid gap-4">
            {d.award && <MemberOfMonth award={d.award as any} compact />}
            <div className="panel grid gap-2 text-sm"><b>How to climb</b>
              <p className="text-ink-2">Take a task from <Link href="/app/tasks" className="underline text-brand">your list</Link>, hand in the work, and a reviewer posts the points. Showing up to events counts too.</p></div>
          </aside>
        </div>
      ) : <Empty title="No points yet this month">The board fills up as reviewers approve work. Be the first on it.</Empty>}
    </>
  );
}
