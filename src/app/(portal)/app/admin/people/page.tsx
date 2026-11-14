import { PageTitle } from '@/components/portal/Shell';
import { ActionForm, SubmitButton } from '@/components/ui/forms';
import { confirmChange, grantMandate, grantRole, invitePerson, revokeRole } from '@/app/actions/portal';
import { withClaims } from '@/server/db';
import { can, requireSession } from '@/server/session';
import { fmtDate, fmtMoney, relTime } from '@/lib/format';

export default async function PeopleAdmin({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await requireSession('/app/admin/people');
  const { q } = await searchParams;
  const d = await withClaims(session.claims, async (tx) => ({
    people: await tx.query(`select p.id, p.full_name, p.email, p.kind, p.status, p.user_id is not null activated, m.member_no,
        coalesce((select jsonb_agg(jsonb_build_object('id', ra.id, 'role', ra.role_key, 'unit', u.name)) from app.role_assignments ra left join app.org_units u on u.id = ra.scope_id where ra.person_id = p.id and ra.revoked_at is null), '[]') roles,
        coalesce((select jsonb_agg(jsonb_build_object('cats', am.categories, 'max', am.max_amount)) from app.approval_mandates am where am.person_id = p.id and am.revoked_at is null), '[]') mandates
      from app.people p left join app.memberships m on m.person_id = p.id
      where $1::text is null or p.full_name ilike '%' || $1 || '%' or p.email ilike '%' || $1 || '%' order by p.kind, p.full_name limit 200`, [q ?? null]),
    roles: await tx.query(`select key, name, is_privileged from app.roles order by sort`),
    units: await tx.query(`select id::text, name from app.org_units order by sort`),
    pending: session.isSuperAdmin ? await tx.query(`select c.*, (select full_name from app.people where id = c.requested_by) by, c.requested_by = authz.current_person_id() mine from app.pending_privileged_changes c where c.confirmed_at is null and c.rejected_at is null and c.expires_at > now() order by c.created_at`) : [],
  }));
  return (
    <>
      <PageTitle label="Access" title="People & roles">Nobody can create their own account or grant themselves a role. Privileged roles (Super Admin, Teacher Approver, Finance Officer, HR) and approval mandates need a second Super Admin to confirm.</PageTitle>
      {d.pending.length > 0 && (
        <section className="panel mb-6 grid gap-3 border-harvest">
          <h2 className="heading text-lg">Waiting for confirmation</h2>
          {d.pending.map((c: any) => (
            <ActionForm key={c.id} action={confirmChange} className="flex flex-wrap items-center justify-between gap-3 py-2 border-b border-line last:border-0">
              <input type="hidden" name="id" value={c.id} />
              <span><b>{c.summary}</b><span className="text-sm text-muted"> · requested by {c.by} {relTime(c.created_at)} · expires {fmtDate(c.expires_at)}</span></span>
              {c.mine ? <span className="text-sm text-muted">Another Super Admin must confirm</span> : <span className="flex gap-2"><SubmitButton name="decision" value="confirm" className="btn btn-primary btn-sm">Confirm 🔐</SubmitButton><SubmitButton name="decision" value="reject" className="btn btn-ghost btn-sm border-line">Reject</SubmitButton></span>}
            </ActionForm>
          ))}
        </section>
      )}
      <div className="grid xl:grid-cols-3 gap-6 mb-6 items-start">
        {can(session, 'identity.invite') && (
          <ActionForm action={invitePerson} resetOnSuccess className="panel grid gap-3">
            <h2 className="heading text-lg">Invite someone</h2>
            <p className="text-sm text-ink-2">Creates the account and emails a one-time activation link. Use this for teachers, advisors and staff.</p>
            <div className="field"><label htmlFor="iv-n">Full name</label><input id="iv-n" name="full_name" className="input" required /></div>
            <div className="field"><label htmlFor="iv-e">Email</label><input id="iv-e" name="email" type="email" className="input" required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="field"><label htmlFor="iv-k">Type</label><select id="iv-k" name="kind" className="select"><option value="teacher">Teacher</option><option value="student">Student</option><option value="staff">Staff</option><option value="external">External</option></select></div>
              <div className="field"><label htmlFor="iv-r">Role</label><select id="iv-r" name="role" className="select"><option value="">None</option>{d.roles.map((r: any) => <option key={r.key} value={r.key}>{r.name}{r.is_privileged ? ' (needs 2nd SA)' : ''}</option>)}</select></div>
            </div>
            <SubmitButton>Send invitation</SubmitButton>
          </ActionForm>
        )}
        {can(session, 'rbac.manage') && (
          <ActionForm action={grantRole} className="panel grid gap-3">
            <h2 className="heading text-lg">Grant a role</h2>
            <div className="field"><label htmlFor="gr-p">Person</label><select id="gr-p" name="person_id" className="select">{d.people.map((p: any) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></div>
            <div className="field"><label htmlFor="gr-r">Role</label><select id="gr-r" name="role" className="select">{d.roles.map((r: any) => <option key={r.key} value={r.key}>{r.name}</option>)}</select></div>
            <div className="field"><label htmlFor="gr-u">Scope (team leads)</label><select id="gr-u" name="scope_id" className="select"><option value="">Whole club</option>{d.units.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
            <div className="field"><label htmlFor="gr-v">Valid until</label><input id="gr-v" name="valid_until" type="date" className="input" /></div>
            <SubmitButton className="btn btn-secondary">Grant</SubmitButton>
          </ActionForm>
        )}
        {session.isSuperAdmin && (
          <ActionForm action={grantMandate} className="panel grid gap-3">
            <h2 className="heading text-lg">Approval mandate</h2>
            <p className="text-sm text-ink-2">A teacher gets decision power only through a mandate: categories plus a maximum amount.</p>
            <div className="field"><label htmlFor="md-p">Person</label><select id="md-p" name="person_id" className="select">{d.people.filter((p: any) => p.kind === 'teacher' || p.roles.length).map((p: any) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></div>
            <fieldset className="grid gap-1"><legend className="field-label mb-1">Categories</legend>{['finance_disbursement', 'finance_refund', 'points_award'].map((c) => <label key={c} className="check"><input type="checkbox" name="categories" value={c} defaultChecked={c === 'finance_disbursement'} />{c.replace(/_/g, ' ')}</label>)}</fieldset>
            <div className="grid grid-cols-2 gap-3">
              <div className="field"><label htmlFor="md-m">Max amount (BDT)</label><input id="md-m" name="max_amount" type="number" min="0" defaultValue={20000} className="input" /></div>
              <div className="field"><label htmlFor="md-v">Valid until</label><input id="md-v" name="valid_until" type="date" className="input" /></div>
            </div>
            <SubmitButton className="btn btn-secondary">Request mandate</SubmitButton>
          </ActionForm>
        )}
      </div>
      <form className="flex gap-2 mb-3"><input name="q" defaultValue={q} className="input max-w-sm" placeholder="Search name or email" aria-label="Search people" /><button className="btn btn-ghost border-line">Search</button></form>
      <div className="table-wrap"><table className="table"><thead><tr><th>Person</th><th>Type</th><th>Roles & mandates</th><th>Account</th></tr></thead>
        <tbody>{d.people.map((p: any) => (
          <tr key={p.id}><td><b>{p.full_name}</b><div className="text-xs text-muted">{p.email}{p.member_no ? ` · ${p.member_no}` : ''}</div></td><td className="text-sm">{p.kind}</td>
            <td className="grid gap-1">{p.roles.map((r: any) => (
              <ActionForm key={r.id} action={revokeRole} className="flex items-center gap-2 text-sm"><input type="hidden" name="assignment_id" value={r.id} /><span className="chip chip-info">{r.role}{r.unit ? ` · ${r.unit}` : ''}</span>
                {can(session, 'rbac.manage') && <><input name="reason" className="input min-h-7 text-xs w-28" placeholder="reason" /><SubmitButton className="btn btn-ghost btn-sm min-h-7 text-xs">Revoke</SubmitButton></>}</ActionForm>))}
              {p.mandates.map((m: any, i: number) => <span key={i} className="text-xs text-muted">Mandate: {m.cats.join(', ')} up to {fmtMoney(m.max)}</span>)}</td>
            <td className="text-sm">{p.activated ? 'Active' : 'Invited'}{p.status !== 'active' ? ` · ${p.status}` : ''}</td></tr>))}</tbody></table></div>
    </>
  );
}
