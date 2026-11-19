import { PageTitle } from '@/components/portal/Shell';
import { Status } from '@/components/ui/Status';
import { ActionForm, SubmitButton } from '@/components/ui/forms';
import { savePerk } from '@/app/actions/portal';
import { PerkIcon, ACCENTS } from '@/components/portal/perk-icons';
import { withClaims } from '@/server/db';
import { requireSession } from '@/server/session';
import { fmtDate } from '@/lib/format';

export default async function PerksAdmin() {
  const session = await requireSession('/app/admin/perks');
  const d = await withClaims(session.claims, async (tx) => ({
    perks: await tx.query(`select p.*, s.total::int total, s.remaining::int remaining, s.claims::int claims from app.perks p left join app.perk_stock() s on s.perk_id = p.id order by (p.status = 'active') desc, p.created_at desc`),
  }));
  return (
    <>
      <PageTitle label="Members" title="Member perks">Offers the club is allowed to pass on to active members. Each one records who gave permission to share it, so nothing is handed out that the partner did not agree to.</PageTitle>
      <div className="grid xl:grid-cols-2 gap-5 items-start">
        <section className="panel grid gap-3"><h2 className="heading text-xl">Add a perk</h2><PerkForm /></section>
        {d.perks.map((p: any) => (
          <section key={p.id} className="panel grid gap-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-3"><span className="grid size-14 place-items-center rounded-2xl" style={{ background: (ACCENTS[p.accent] ?? ACCENTS.lime).tile }}><PerkIcon icon={p.icon} accent={p.accent} size={30} /></span><div className="grid"><span className="label text-muted">{p.category ?? p.partner}</span><h2 className="heading text-xl">{p.title}</h2></div></div>
              <span className="flex gap-1.5 items-center"><Status value={p.status} /><span className="chip chip-info">{p.claims} claimed</span>{p.mode === 'unique_codes' && <span className={`chip ${p.remaining ? 'chip-ok' : 'chip-bad'}`}>{p.remaining}/{p.total} codes left</span>}</span>
            </div>
            <p className="text-sm text-ink-2">{p.description}</p>
            <p className="text-xs text-muted">Permission: {p.distribution_permission}{p.ends_at ? ` · ends ${fmtDate(p.ends_at)}` : ''}{p.min_points ? ` · needs ${p.min_points} points` : ''}</p>
            <details><summary className="cursor-pointer font-semibold text-brand text-sm">Edit or add codes</summary><PerkForm p={p} /></details>
          </section>
        ))}
      </div>
    </>
  );
}

function PerkForm({ p }: { p?: any }) {
  const k = p?.id ?? 'new';
  return (
    <ActionForm action={savePerk} resetOnSuccess={!p} className="grid gap-3 mt-2">
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="field"><label htmlFor={`pt-${k}`}>Offer</label><input id={`pt-${k}`} name="title" className="input" defaultValue={p?.title ?? ''} placeholder="20% off printing" required /></div>
        <div className="field"><label htmlFor={`pp-${k}`}>Partner</label><input id={`pp-${k}`} name="partner" className="input" defaultValue={p?.partner ?? ''} required /></div>
      </div>
      <div className="field"><label htmlFor={`pd-${k}`}>What members get</label><textarea id={`pd-${k}`} name="description" className="textarea min-h-[70px]" defaultValue={p?.description ?? ''} required /></div>
      <div className="field"><label htmlFor={`pm-${k}`}>Terms</label><input id={`pm-${k}`} name="terms" className="input" defaultValue={p?.terms ?? ''} placeholder="One use per member, show your member number" /></div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="field"><label htmlFor={`po-${k}`}>How it is given</label><select id={`po-${k}`} name="mode" className="select" defaultValue={p?.mode ?? 'shared_code'}><option value="shared_code">One code for everyone</option><option value="unique_codes">A different code each</option><option value="link">A link</option></select></div>
        <div className="field"><label htmlFor={`pc-${k}`}>Shared code</label><input id={`pc-${k}`} name="shared_code" className="input font-mono" defaultValue={p?.shared_code ?? ''} /></div>
        <div className="field"><label htmlFor={`pu-${k}`}>Link</label><input id={`pu-${k}`} name="url" type="url" className="input" defaultValue={p?.url ?? ''} placeholder="https://" /></div>
        <div className="field"><label htmlFor={`pn-${k}`}>Minimum points</label><input id={`pn-${k}`} name="min_points" type="number" min="0" className="input" defaultValue={p?.min_points ?? 0} /></div>
        <div className="field"><label htmlFor={`pe-${k}`}>Ends on</label><input id={`pe-${k}`} name="ends_on" type="date" className="input" defaultValue={p?.ends_at ? new Date(p.ends_at).toISOString().slice(0, 10) : ''} /></div>
        <div className="field"><label htmlFor={`pk-${k}`}>Category label</label><input id={`pk-${k}`} name="category" className="input" defaultValue={p?.category ?? ''} placeholder="AI, Learning, Events" /></div>
        <div className="field"><label htmlFor={`pi-${k}`}>Icon</label><select id={`pi-${k}`} name="icon" className="select" defaultValue={p?.icon ?? 'gift'}>{[['burst', 'Starburst'], ['book', 'Book'], ['ticket', 'Ticket'], ['chat', 'Conversation'], ['gift', 'Gift'], ['laptop', 'Laptop'], ['cup', 'Cup'], ['star', 'Star']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <div className="field"><label htmlFor={`pa-${k}`}>Colour</label><select id={`pa-${k}`} name="accent" className="select" defaultValue={p?.accent ?? 'lime'}>{Object.keys(ACCENTS).map((v) => <option key={v} value={v}>{v}</option>)}</select></div>
        <div className="field"><label htmlFor={`po2-${k}`}>Order</label><input id={`po2-${k}`} name="sort" type="number" className="input" defaultValue={p?.sort ?? 100} /></div>
        <div className="field"><label htmlFor={`ps-${k}`}>Status</label><select id={`ps-${k}`} name="status" className="select" defaultValue={p?.status ?? 'active'}><option value="active">Live</option><option value="draft">Draft</option><option value="ended">Ended</option></select></div>
      </div>
      <div className="field"><label htmlFor={`pg-${k}`}>Who allowed the club to share this</label><input id={`pg-${k}`} name="distribution_permission" className="input" defaultValue={p?.distribution_permission ?? ''} placeholder="Email from the shop owner, 3 Nov 2026" required /></div>
      <div className="field"><label htmlFor={`px-${k}`}>{p ? 'Add one-time codes' : 'One-time codes'} <span className="text-muted font-normal">(one per line; only for “a different code each”)</span></label><textarea id={`px-${k}`} name="codes" className="textarea font-mono min-h-[70px]" /></div>
      <SubmitButton className="btn btn-primary btn-sm justify-self-start">{p ? 'Save perk' : 'Add perk'}</SubmitButton>
    </ActionForm>
  );
}
