import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageTitle, Stat } from '@/components/portal/Shell';
import { Status } from '@/components/ui/Status';
import { ActionForm, SubmitButton } from '@/components/ui/forms';
import { EventForm } from '@/components/portal/EventForm';
import { addEventPerson, adminRegister, issueCertificates, recordOfflinePayment, removeEventPerson, saveTicketType, staffCancel } from '@/app/actions/portal';
import { withClaims } from '@/server/db';
import { requireSession } from '@/server/session';
import { fmtDateTime, fmtMoney } from '@/lib/format';

export default async function ManageEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession(`/app/events/manage/${id}`);
  const d = await withClaims(session.claims, async (tx) => {
    const e = await tx.one(`select * from app.events where id = $1`, [id]);
    if (!e) return null;
    return {
      e,
      tickets: await tx.query(`select *, price::text price from app.ticket_types where event_id = $1 order by sort, price`, [id]),
      regs: await tx.query(`select r.id, r.name, r.email, r.institution, r.team_name, r.status, r.source, r.created_at, t.name ticket,
          (select i.id::text from app.invoices i where i.registration_id = r.id and i.status = 'open' limit 1) open_invoice,
          (select i.amount::text from app.invoices i where i.registration_id = r.id and i.status = 'open' limit 1) due,
          exists (select 1 from app.checkins c where c.registration_id = r.id and c.result = 'ok') checked_in
        from app.registrations r join app.ticket_types t on t.id = r.ticket_type_id where r.event_id = $1 order by r.created_at desc limit 300`, [id]),
      people: await tx.query(`select id::text, name, role, title from app.event_people where event_id = $1 order by sort`, [id]),
      waitlist: await tx.one(`select count(*)::int n from app.waitlist_entries w join app.ticket_types t on t.id = w.ticket_type_id where t.event_id = $1 and w.status = 'waiting'`, [id]),
      certs: await tx.one(`select count(*)::int n from app.issued_documents where event_id = $1`, [id]),
    };
  });
  if (!d) notFound();
  const by = (s: string) => d.regs.filter((r: any) => r.status === s).length;
  const attended = d.regs.filter((r: any) => r.checked_in).length;
  return (
    <>
      <PageTitle label="Event" title={d.e.title} actions={<><Link href={`/events/${d.e.slug}`} className="btn btn-secondary btn-sm" target="_blank">Public page</Link><a href={`/app/export/registrations?event=${id}`} className="btn btn-secondary btn-sm">Download CSV</a><Link href={`/app/scan?event=${id}`} className="btn btn-primary btn-sm">Open scanner</Link></>}>
        <Status value={d.e.status} />
      </PageTitle>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Stat label="Confirmed" value={by('confirmed')} /><Stat label="Payment pending" value={by('pending_payment') + by('pending_verification')} /><Stat label="Waitlist" value={d.waitlist?.n ?? 0} /><Stat label="Checked in" value={attended} /><Stat label="Certificates" value={d.certs?.n ?? 0} />
      </div>
      <div className="grid xl:grid-cols-2 gap-6 items-start mb-6">
        <section className="panel grid gap-4">
          <h2 className="heading text-lg">Ticket types and capacity</h2>
          {d.tickets.map((t: any) => (
            <ActionForm key={t.id} action={saveTicketType} className="rounded-xl border border-line p-3 grid gap-3">
              <input type="hidden" name="id" value={t.id} />
              <div className="flex justify-between text-sm"><b>{t.name}</b><span className="text-muted tnum">{t.sold_count} sold · {t.held_count} held · {t.capacity - t.sold_count - t.held_count} left</span></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="field"><label htmlFor={`n-${t.id}`}>Name</label><input id={`n-${t.id}`} name="name" defaultValue={t.name} className="input" /></div>
                <div className="field"><label htmlFor={`p-${t.id}`}>Price (BDT)</label><input id={`p-${t.id}`} name="price" type="number" min="0" defaultValue={Number(t.price)} className="input" /></div>
                <div className="field"><label htmlFor={`c-${t.id}`}>Capacity</label><input id={`c-${t.id}`} name="capacity" type="number" min={t.sold_count + t.held_count} defaultValue={t.capacity} className="input" /></div>
                <div className="field"><label htmlFor={`a-${t.id}`}>Who</label><select id={`a-${t.id}`} name="audience" defaultValue={t.audience} className="select"><option value="public">Public</option><option value="members">Members only</option></select></div>
                <div className="field"><label htmlFor={`u-${t.id}`}>Unit</label><select id={`u-${t.id}`} name="unit" defaultValue={t.unit} className="select"><option value="person">Person</option><option value="team">Team</option></select></div>
                <div className="field"><label htmlFor={`tm-${t.id}`}>Team min</label><input id={`tm-${t.id}`} name="team_min" type="number" defaultValue={t.team_min ?? ''} className="input" /></div>
                <div className="field"><label htmlFor={`tx-${t.id}`}>Team max</label><input id={`tx-${t.id}`} name="team_max" type="number" defaultValue={t.team_max ?? ''} className="input" /></div>
                <label className="check self-end pb-2"><input type="checkbox" name="waitlist_enabled" defaultChecked={t.waitlist_enabled} />Waitlist</label>
              </div>
              <input type="hidden" name="description" value={t.description ?? ''} />
              <SubmitButton className="btn btn-secondary btn-sm w-max">Save</SubmitButton>
            </ActionForm>
          ))}
          <details><summary className="cursor-pointer text-brand font-semibold">Add a ticket type</summary>
            <ActionForm action={saveTicketType} className="grid sm:grid-cols-4 gap-2 mt-3 items-end">
              <input type="hidden" name="event_id" value={id} />
              <div className="field sm:col-span-2"><label htmlFor="nt-n">Name</label><input id="nt-n" name="name" className="input" required /></div>
              <div className="field"><label htmlFor="nt-p">Price</label><input id="nt-p" name="price" type="number" min="0" defaultValue={0} className="input" /></div>
              <div className="field"><label htmlFor="nt-c">Capacity</label><input id="nt-c" name="capacity" type="number" min="1" className="input" required /></div>
              <input type="hidden" name="audience" value="public" /><input type="hidden" name="unit" value="person" /><input type="hidden" name="waitlist_enabled" value="on" />
              <SubmitButton className="btn btn-secondary btn-sm">Add</SubmitButton>
            </ActionForm></details>
        </section>
        <section className="grid gap-6">
          <ActionForm action={adminRegister} resetOnSuccess className="panel grid gap-3">
            <h2 className="heading text-lg">Walk-in / assisted registration</h2>
            <div className="grid sm:grid-cols-2 gap-2">
              <div className="field"><label htmlFor="w-n">Name</label><input id="w-n" name="name" className="input" required /></div>
              <div className="field"><label htmlFor="w-e">Email</label><input id="w-e" name="email" type="email" className="input" required /></div>
              <div className="field"><label htmlFor="w-i">Institution</label><input id="w-i" name="institution" className="input" /></div>
              <div className="field"><label htmlFor="w-t">Ticket</label><select id="w-t" name="ticket_type_id" className="select">{d.tickets.map((t: any) => <option key={t.id} value={t.id}>{t.name} · {Number(t.price) ? fmtMoney(t.price) : 'free'}</option>)}</select></div>
            </div>
            <input type="hidden" name="source" value="walkin" />
            <SubmitButton className="btn btn-secondary">Register (uses the same inventory)</SubmitButton>
          </ActionForm>
          <ActionForm action={issueCertificates} className="panel grid gap-2">
            <h2 className="heading text-lg">Certificates</h2>
            <p className="text-sm text-ink-2">Issues a participation certificate to every confirmed attendee who was checked in by QR and does not have one yet.</p>
            <input type="hidden" name="event_id" value={id} />
            <SubmitButton className="btn btn-secondary w-max">Issue certificates ({attended} checked in)</SubmitButton>
          </ActionForm>
          <section className="panel grid gap-3">
            <h2 className="heading text-lg">Speakers, judges, mentors</h2>
            {d.people.map((p: any) => <ActionForm key={p.id} action={removeEventPerson} className="flex items-center justify-between gap-3 text-sm py-1.5 border-b border-line last:border-0"><input type="hidden" name="id" value={p.id} /><span><b>{p.name}</b> · {p.role}{p.title ? ` · ${p.title}` : ''}</span><SubmitButton className="btn btn-ghost btn-sm min-h-7 text-xs">Remove</SubmitButton></ActionForm>)}
            <ActionForm action={addEventPerson} resetOnSuccess className="grid sm:grid-cols-4 gap-2 items-end">
              <input type="hidden" name="event_id" value={id} />
              <div className="field"><label htmlFor="ep-n">Name</label><input id="ep-n" name="name" className="input" required /></div>
              <div className="field"><label htmlFor="ep-r">Role</label><select id="ep-r" name="role" className="select"><option>speaker</option><option>judge</option><option>mentor</option><option>host</option><option>guest</option></select></div>
              <div className="field"><label htmlFor="ep-t">Title</label><input id="ep-t" name="title" className="input" /></div>
              <SubmitButton className="btn btn-secondary btn-sm">Add</SubmitButton>
            </ActionForm>
          </section>
        </section>
      </div>
      <section className="grid gap-3 mb-6">
        <h2 className="heading text-lg">Registrations</h2>
        <div className="table-wrap"><table className="table"><thead><tr><th>Name</th><th>Ticket</th><th>Source</th><th>When</th><th>Status</th><th></th></tr></thead>
          <tbody>{d.regs.map((r: any) => (
            <tr key={r.id}><td><b>{r.name}</b><div className="text-xs text-muted">{r.email}{r.institution ? ` · ${r.institution}` : ''}{r.team_name ? ` · team ${r.team_name}` : ''}</div></td><td className="text-sm">{r.ticket}</td><td className="text-sm">{r.source}</td>
              <td className="text-sm whitespace-nowrap">{fmtDateTime(r.created_at)}</td><td><span className="flex gap-1 flex-wrap"><Status value={r.status} />{r.checked_in && <span className="chip chip-lock">In</span>}</span></td>
              <td><span className="flex flex-wrap gap-1.5 justify-end">
                {r.status === 'pending_payment' && r.open_invoice && (
                  <details className="relative"><summary className="btn btn-secondary btn-sm list-none cursor-pointer">Took payment</summary>
                    <ActionForm action={recordOfflinePayment} className="absolute right-0 z-10 mt-1 w-64 rounded-2xl bg-white border border-line shadow-[var(--shadow)] p-3 grid gap-2 text-left">
                      <input type="hidden" name="invoice_id" value={r.open_invoice} /><b className="text-sm">{fmtMoney(r.due)} received</b>
                      <select name="method" className="select min-h-9 text-sm" aria-label="How it was paid"><option value="cash">Cash at the desk</option><option value="bank_transfer">Bank transfer</option></select>
                      <input name="reference" className="input min-h-9 text-sm" placeholder="Receipt or bank reference" aria-label="Reference" />
                      <SubmitButton className="btn btn-primary btn-sm">Record for verification</SubmitButton>
                    </ActionForm></details>
                )}
                {['confirmed', 'pending_payment', 'pending_verification'].includes(r.status) && <ActionForm action={staffCancel}><input type="hidden" name="registration_id" value={r.id} /><SubmitButton className="btn btn-ghost btn-sm">Cancel</SubmitButton></ActionForm>}
              </span></td></tr>))}</tbody></table></div>
      </section>
      <details className="panel"><summary className="cursor-pointer heading text-lg">Edit event details</summary><div className="mt-4"><EventForm e={d.e} /></div></details>
    </>
  );
}
