import { PageTitle } from '@/components/portal/Shell';
import { Status } from '@/components/ui/Status';
import { ActionForm, SubmitButton } from '@/components/ui/forms';
import { assignTask, createTask } from '@/app/actions/portal';
import { withClaims } from '@/server/db';
import { requireSession } from '@/server/session';
import { fmtDateTime } from '@/lib/format';

export default async function ManageTasksPage() {
  const session = await requireSession('/app/manage/tasks');
  const d = await withClaims(session.claims, async (tx) => ({
    types: await tx.query(`select key, name, default_points, max_points, validation_mode from app.task_types order by name`),
    units: await tx.query(`select id::text, name from app.org_units order by sort`),
    people: await tx.query(`select id::text, full_name, units from app.assignable_people()`),
    tasks: await tx.query(`select t.id, t.title, t.status, t.due_at, t.points, t.assignment_mode, tt.name type_name, u.name unit,
        (select count(*)::int from app.task_assignments a where a.task_id = t.id) assigned,
        (select count(*)::int from app.task_assignments a where a.task_id = t.id and a.status = 'approved') done
      from app.tasks t join app.task_types tt on tt.key = t.type_key left join app.org_units u on u.id = t.scope_unit_id order by t.created_at desc limit 50`),
  }));
  const scoped = session.scopes.filter((s) => s.role_key === 'team_lead');
  return (
    <>
      <PageTitle label="Work" title="Tasks">{scoped.length && !session.perms.includes('task.manage') ? `You manage tasks for ${scoped.map((s) => s.unit_name).join(', ')}.` : 'Create and assign tasks. Point values cannot exceed the task type maximum.'}</PageTitle>
      <div className="grid xl:grid-cols-[420px_1fr] gap-6 items-start">
        <ActionForm action={createTask} resetOnSuccess className="panel grid gap-3">
          <h2 className="heading text-lg">New task</h2>
          <div className="field"><label htmlFor="t-title">Title</label><input id="t-title" name="title" className="input" required /></div>
          <div className="field"><label htmlFor="t-type">Type</label><select id="t-type" name="type_key" className="select">{d.types.map((t: any) => <option key={t.key} value={t.key}>{t.name} ({t.validation_mode}, max {t.max_points})</option>)}</select></div>
          <div className="field"><label htmlFor="t-desc">Description</label><textarea id="t-desc" name="description" className="textarea min-h-[70px]" /></div>
          <div className="field"><label htmlFor="t-ins">Instructions and evidence required</label><textarea id="t-ins" name="instructions" className="textarea min-h-[70px]" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="field"><label htmlFor="t-pts">Points</label><input id="t-pts" name="points" type="number" min={0} className="input" placeholder="type default" /></div>
            <div className="field"><label htmlFor="t-due">Deadline</label><input id="t-due" name="due_at" type="datetime-local" className="input" /></div>
            <div className="field"><label htmlFor="t-pri">Priority</label><select id="t-pri" name="priority" className="select" defaultValue="normal"><option>low</option><option>normal</option><option>high</option><option>urgent</option></select></div>
            <div className="field"><label htmlFor="t-unit">Wing</label><select id="t-unit" name="scope_unit_id" className="select"><option value="">Club-wide</option>{d.units.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
            <div className="field"><label htmlFor="t-mode">Assignment</label><select id="t-mode" name="assignment_mode" className="select"><option value="individual">Assign people</option><option value="open_claim">Open: members claim</option></select></div>
            <div className="field"><label htmlFor="t-max">Max claims</label><input id="t-max" name="max_claims" type="number" min={1} className="input" /></div>
          </div>
          <div className="field"><label htmlFor="t-links">Reference links</label><input id="t-links" name="links" className="input" placeholder="https://… (space-separated)" /></div>
          <div className="field"><label htmlFor="t-as">Assign to</label>
            <select id="t-as" name="assignees" multiple className="select min-h-[140px]">{d.people.map((p: any) => <option key={p.id} value={p.id}>{p.full_name}{p.units ? ` · ${p.units}` : ''}</option>)}</select>
            <span className="hint">Hold Ctrl/⌘ to pick several. Leads can only assign people in their wing.</span></div>
          <SubmitButton>Create task</SubmitButton>
        </ActionForm>
        <section className="grid gap-3">
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Task</th><th>Type</th><th>Due</th><th className="text-right">Pts</th><th>Progress</th><th>Status</th></tr></thead>
            <tbody>{d.tasks.map((t: any) => (
              <tr key={t.id}><td className="font-semibold">{t.title}{t.unit && <div className="text-xs text-muted font-normal">{t.unit}</div>}</td><td className="text-sm">{t.type_name}</td>
                <td className="text-sm whitespace-nowrap">{t.due_at ? fmtDateTime(t.due_at) : '—'}</td><td className="text-right tnum">{t.points}</td>
                <td className="text-sm tnum">{t.done}/{t.assigned}{t.assignment_mode === 'open_claim' ? ' claimed' : ''}</td><td><Status value={t.status} /></td></tr>))}</tbody>
          </table></div>
          {d.tasks.length > 0 && (
            <ActionForm action={assignTask} className="panel grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
              <div className="field"><label htmlFor="at-task">Assign an existing task</label><select id="at-task" name="task_id" className="select">{d.tasks.filter((t: any) => t.status === 'published').map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}</select></div>
              <div className="field"><label htmlFor="at-p">Person</label><select id="at-p" name="assignees" className="select">{d.people.map((p: any) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></div>
              <SubmitButton className="btn btn-secondary">Assign</SubmitButton>
            </ActionForm>
          )}
        </section>
      </div>
    </>
  );
}
