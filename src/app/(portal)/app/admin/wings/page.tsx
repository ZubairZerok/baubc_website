import { PageTitle } from '@/components/portal/Shell';
import { ActionForm, SubmitButton } from '@/components/ui/forms';
import { Avatar } from '@/components/ui/Avatar';
import { assignUnit, endUnitMembership, saveUnit } from '@/app/actions/portal';
import { withClaims } from '@/server/db';
import { requireSession } from '@/server/session';

export default async function WingsAdmin() {
  const session = await requireSession('/app/admin/wings');
  const d = await withClaims(session.claims, async (tx) => ({
    units: await tx.query(`select id::text, name, slug, kind, summary, responsibilities, is_public, sort from app.org_units order by sort, name`),
    seats: await tx.query(`select um.id::text, um.unit_id::text, um.position_title, um.is_lead, p.full_name, p.photo_url, p.avatar
      from app.unit_memberships um join app.people p on p.id = um.person_id where um.ended_at is null order by um.is_lead desc, p.full_name`),
    members: await tx.query(`select p.id::text, p.full_name, m.member_no from app.memberships m join app.people p on p.id = m.person_id where m.status_key = 'active' order by p.full_name`),
  }));
  return (
    <>
      <PageTitle label="Structure" title="Wings & teams">Create the club&apos;s wings, describe what each one does, and place members in them. A lead can assign and review work for their own wing only.</PageTitle>
      <ActionForm action={assignUnit} resetOnSuccess className="panel mb-6 grid md:grid-cols-[1.2fr_1fr_1fr_auto_auto] gap-3 items-end">
        <div className="field"><label htmlFor="as-p">Member</label><select id="as-p" name="person_id" className="select" required>{d.members.map((m: any) => <option key={m.id} value={m.id}>{m.full_name} · {m.member_no}</option>)}</select></div>
        <div className="field"><label htmlFor="as-u">Wing</label><select id="as-u" name="unit_id" className="select" required>{d.units.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
        <div className="field"><label htmlFor="as-t">Position</label><input id="as-t" name="title" className="input" placeholder="Member, Coordinator…" /></div>
        <label className="check pb-3"><input type="checkbox" name="is_lead" />Lead</label>
        <SubmitButton className="btn btn-primary">Place</SubmitButton>
      </ActionForm>
      <div className="grid xl:grid-cols-2 gap-5 items-start">
        {d.units.map((u: any) => {
          const seats = d.seats.filter((s: any) => s.unit_id === u.id);
          return (
            <section key={u.id} className="panel grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="heading text-xl">{u.name}</h2><span className="flex gap-1.5"><span className="chip chip-draft">{u.kind}</span><span className={`chip ${u.is_public ? 'chip-ok' : 'chip-draft'}`}>{u.is_public ? 'On the website' : 'Hidden'}</span></span></div>
              <div className="grid gap-1.5">
                {seats.length ? seats.map((s: any) => (
                  <ActionForm key={s.id} action={endUnitMembership} className="flex items-center justify-between gap-3 rounded-2xl bg-white/70 border border-line px-3 py-2">
                    <input type="hidden" name="id" value={s.id} />
                    <span className="flex items-center gap-3 min-w-0"><Avatar name={s.full_name} photoUrl={s.photo_url} avatar={s.avatar} size={34} /><span className="grid leading-tight min-w-0"><b className="text-sm truncate">{s.full_name}</b><span className="text-xs text-muted">{s.position_title}</span></span>{s.is_lead && <span className="chip chip-live">Lead</span>}</span>
                    <SubmitButton className="btn btn-ghost btn-sm min-h-7 text-xs">Remove</SubmitButton>
                  </ActionForm>
                )) : <p className="text-sm text-muted">Nobody placed here yet.</p>}
              </div>
              <details><summary className="cursor-pointer font-semibold text-brand text-sm">Edit this wing</summary><UnitForm u={u} /></details>
            </section>
          );
        })}
        <section className="panel grid gap-3"><h2 className="heading text-xl">Add a wing</h2><UnitForm /></section>
      </div>
    </>
  );
}

function UnitForm({ u }: { u?: any }) {
  const k = u?.id ?? 'new';
  return (
    <ActionForm action={saveUnit} resetOnSuccess={!u} className="grid gap-3 mt-3">
      {u && <input type="hidden" name="id" value={u.id} />}
      <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3">
        <div className="field"><label htmlFor={`un-${k}`}>Name</label><input id={`un-${k}`} name="name" className="input" defaultValue={u?.name ?? ''} required /></div>
        <div className="field"><label htmlFor={`uk-${k}`}>Type</label><select id={`uk-${k}`} name="kind" className="select" defaultValue={u?.kind ?? 'wing'}><option value="wing">Wing</option><option value="department">Department</option><option value="team">Team</option><option value="committee">Committee</option></select></div>
        <div className="field w-24"><label htmlFor={`uo-${k}`}>Order</label><input id={`uo-${k}`} name="sort" type="number" className="input" defaultValue={u?.sort ?? 100} /></div>
      </div>
      <div className="field"><label htmlFor={`us-${k}`}>What this wing does, in one or two sentences</label><textarea id={`us-${k}`} name="summary" className="textarea min-h-[70px]" defaultValue={u?.summary ?? ''} /></div>
      <div className="field"><label htmlFor={`ur-${k}`}>Responsibilities <span className="text-muted font-normal">(one per line)</span></label><textarea id={`ur-${k}`} name="responsibilities" className="textarea min-h-[90px]" defaultValue={(u?.responsibilities ?? []).join('\n')} /></div>
      <label className="check"><input type="checkbox" name="is_public" defaultChecked={u ? u.is_public : true} />Show on the public Wings page</label>
      <SubmitButton className="btn btn-secondary btn-sm justify-self-start">{u ? 'Save wing' : 'Create wing'}</SubmitButton>
    </ActionForm>
  );
}
