import { PageTitle } from '@/components/portal/Shell';
import { Empty } from '@/components/ui/Empty';
import { ActionForm, SubmitButton } from '@/components/ui/forms';
import { claimPerk } from '@/app/actions/portal';
import { withClaims } from '@/server/db';
import { requireSession } from '@/server/session';
import { fmtDate } from '@/lib/format';

export default async function PerksPage() {
  const session = await requireSession('/app/perks');
  const d = await withClaims(session.claims, async (tx) => ({
    perks: await tx.query(`select p.*, (select revealed_value from app.perk_claims c where c.perk_id = p.id and c.person_id = authz.current_person_id()) mine from app.perks p where p.status = 'active' order by p.created_at desc`),
    points: await tx.one(`select coalesce(sum(amount),0)::int v from app.point_ledger where person_id = authz.current_person_id()`),
  }));
  return (
    <>
      <PageTitle label="Members" title="Perks">Benefits BAUBC is permitted to share with active members. Personal offers (for example student AI plans) are shared only as the provider&apos;s official link; eligibility is checked by the provider.</PageTitle>
      {d.perks.length ? (
        <div className="grid md:grid-cols-2 gap-4">
          {d.perks.map((p: any) => (
            <article key={p.id} className="panel grid gap-3">
              <div className="flex justify-between gap-3"><span className="label text-muted">{p.partner}</span>{p.ends_at && <span className="text-xs text-muted">until {fmtDate(p.ends_at)}</span>}</div>
              <h2 className="heading text-xl">{p.title}</h2>
              <p className="text-ink-2 text-sm">{p.description}</p>
              {p.terms && <p className="text-xs text-muted">{p.terms}</p>}
              {p.mine ? (
                <div className="rounded-lg bg-paper-2 p-3"><span className="label text-muted">Yours</span><p className="font-mono break-all">{p.mode === 'link' ? <a href={p.mine} target="_blank" rel="noopener noreferrer" className="underline text-link">{p.mine}</a> : p.mine}</p></div>
              ) : (
                <ActionForm action={claimPerk}><input type="hidden" name="perk_id" value={p.id} />
                  <SubmitButton className="btn btn-secondary btn-sm" disabled={d.points!.v < p.min_points}>{d.points!.v < p.min_points ? `Needs ${p.min_points} verified points` : 'Claim'}</SubmitButton></ActionForm>
              )}
            </article>
          ))}
        </div>
      ) : <Empty title="No perks right now">Partner benefits appear here.</Empty>}
    </>
  );
}
