import { PageTitle } from '@/components/portal/Shell';
import { Empty } from '@/components/ui/Empty';
import { PerkCard } from '@/components/portal/Perks';
import { withClaims } from '@/server/db';
import { requireSession } from '@/server/session';
import { fmtNum } from '@/lib/format';

export default async function PerksPage() {
  const session = await requireSession('/app/perks');
  const d = await withClaims(session.claims, async (tx) => ({
    perks: await tx.query(`select p.id::text, p.title, p.partner, p.description, p.terms, p.category, p.icon, p.accent, p.mode, p.min_points, p.ends_at,
      (select revealed_value from app.perk_claims c where c.perk_id = p.id and c.person_id = authz.current_person_id()) mine
      from app.perks p where p.status = 'active' and now() >= p.starts_at and (p.ends_at is null or now() < p.ends_at) order by p.sort, p.created_at desc`),
    points: await tx.one(`select coalesce(sum(amount),0)::int v from app.point_ledger where person_id = authz.current_person_id()`),
    me: await tx.one(`select coalesce(display_name, full_name) nm from app.people where id = authz.current_person_id()`),
  }));
  const claimed = d.perks.filter((p: any) => p.mine).length;
  return (
    <>
      <PageTitle label={`${d.me?.nm ?? 'Member'} · Perks`} title={<>Your <em className="serif-i text-brand">perks</em></>}
        actions={<span className="flex gap-2"><span className="chip chip-live tnum">{fmtNum(d.points!.v)} verified points</span><span className="chip chip-info tnum">{claimed} claimed</span></span>}>
        Real rewards from partners who allowed the club to share them. Claim one and the code or link is saved to your account, here and in your notifications.
      </PageTitle>
      {d.perks.length ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch">
          {d.perks.map((p: any, i: number) => <PerkCard key={p.id} p={p} points={d.points!.v} i={i} />)}
        </div>
      ) : <Empty title="No perks right now">Partner benefits appear here as soon as the club publishes them.</Empty>}
    </>
  );
}
