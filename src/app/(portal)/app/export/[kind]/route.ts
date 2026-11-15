import { NextResponse } from 'next/server';
import { withClaims } from '@/server/db';
import { can, getSession } from '@/server/session';

const cell = (v: unknown) => {
  let s = v == null ? '' : Array.isArray(v) ? v.join('; ') : v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // spreadsheet formula injection guard
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (rows: Record<string, unknown>[], cols: string[]) => '﻿' + [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\r\n');
const file = (body: string, name: string, type = 'text/csv; charset=utf-8') =>
  new NextResponse(body, { headers: { 'Content-Type': type, 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store' } });
const today = () => new Date().toISOString().slice(0, 10);

/** Exports run under the caller's own row-level security, and each one is written to the audit log. */
export async function GET(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL('/login', req.url));
  const q = new URL(req.url).searchParams;
  const deny = () => new NextResponse('Not allowed', { status: 403 });

  if (kind === 'my-data') {
    const data = await withClaims(session.claims, async (tx) => (await tx.one(`select app.my_data() d`))?.d);
    return file(JSON.stringify(data, null, 2), `baubc-my-data-${today()}.json`, 'application/json; charset=utf-8');
  }
  if (kind === 'applications') {
    if (!can(session, 'membership.review')) return deny();
    const rows = await withClaims(session.claims, async (tx) => {
      await tx.query(`select app.audit('export.applications','application',null,null,$1::jsonb)`, [JSON.stringify({ status: q.get('status') })]);
      return tx.query(`select p.full_name, p.email, p.student_id, p.academic_department department, p.academic_session session, p.batch_level level, a.status_key status, a.preferred_units, a.submitted_at, a.late_submission late
        from app.applications a join app.people p on p.id = a.person_id where ($1::text is null or a.status_key = $1) order by a.submitted_at desc`, [q.get('status') || null]);
    });
    return file(csv(rows, ['full_name', 'email', 'student_id', 'department', 'session', 'level', 'status', 'preferred_units', 'submitted_at', 'late']), `baubc-applications-${today()}.csv`);
  }
  if (kind === 'members') {
    if (!can(session, 'people.read') && !can(session, 'membership.review')) return deny();
    const rows = await withClaims(session.claims, async (tx) => {
      await tx.query(`select app.audit('export.members','membership',null,null,null)`);
      return tx.query(`select m.member_no, p.full_name, p.email, p.student_id, p.academic_department department, p.academic_session session, m.status_key status, m.finalized_at::date joined_on,
          (select string_agg(u.name || ' (' || um.position_title || ')', '; ') from app.unit_memberships um join app.org_units u on u.id = um.unit_id where um.person_id = p.id and um.ended_at is null) wings,
          coalesce((select sum(l.amount) from app.point_ledger l where l.person_id = p.id), 0)::int points
        from app.memberships m join app.people p on p.id = m.person_id order by m.member_no`);
    });
    return file(csv(rows, ['member_no', 'full_name', 'email', 'student_id', 'department', 'session', 'status', 'joined_on', 'wings', 'points']), `baubc-members-${today()}.csv`);
  }
  if (kind === 'registrations') {
    const event = q.get('event') ?? '';
    if (!/^[0-9a-f-]{36}$/.test(event)) return new NextResponse('Missing event', { status: 400 });
    const rows = await withClaims(session.claims, async (tx) => {
      const ok = await tx.one(`select (authz.has_perm('event.manage') or authz.has_perm('event.manage','event',$1::uuid)) v`, [event]);
      if (!ok?.v) return null;
      await tx.query(`select app.audit('export.registrations','event',$1,null,null)`, [event]);
      return tx.query(`select r.name, r.email, r.phone, r.institution, r.team_name, t.name ticket, r.status, r.source, r.created_at,
          exists (select 1 from app.checkins c where c.registration_id = r.id and c.result = 'ok') checked_in
        from app.registrations r join app.ticket_types t on t.id = r.ticket_type_id where r.event_id = $1 order by r.created_at`, [event]);
    });
    if (!rows) return deny();
    return file(csv(rows, ['name', 'email', 'phone', 'institution', 'team_name', 'ticket', 'status', 'source', 'created_at', 'checked_in']), `baubc-registrations-${today()}.csv`);
  }
  return new NextResponse('Not found', { status: 404 });
}
