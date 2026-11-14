import { PageTitle } from '@/components/portal/Shell';
import { withClaims } from '@/server/db';
import { requireSession } from '@/server/session';
import { fmtDateTime } from '@/lib/format';

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await requireSession('/app/admin/audit');
  const { q } = await searchParams;
  const d = await withClaims(session.claims, async (tx) => ({
    rows: await tx.query(`select a.id::text, a.occurred_at, a.action, a.entity_type, a.entity_id, a.after, left(a.hash, 12) hash, p.full_name actor
      from audit.audit_log a left join app.people p on p.id = a.actor_person_id where $1::text is null or a.action ilike '%' || $1 || '%' or a.entity_type ilike '%' || $1 || '%' order by a.id desc limit 200`, [q ?? null]),
    chain: session.isSuperAdmin ? await tx.one(`select ok, checked::int from app.verify_audit_chain()`) : null,
  }));
  return (
    <>
      <PageTitle label="Governance" title="Audit log">Append-only and hash-chained: each entry includes the hash of the one before, so editing history breaks the chain.</PageTitle>
      {d.chain && <div className={`panel mb-5 ${d.chain.ok ? '' : 'border-soil'}`}><b>{d.chain.ok ? '✓ Chain verified' : '✗ Chain broken'}</b> · {d.chain.checked} entries checked</div>}
      <form className="flex gap-2 mb-3"><input name="q" defaultValue={q} className="input max-w-sm" placeholder="Filter by action or entity" aria-label="Filter" /><button className="btn btn-ghost border-line">Filter</button></form>
      <div className="table-wrap"><table className="table"><thead><tr><th>#</th><th>When</th><th>Who</th><th>Action</th><th>Entity</th><th>Details</th><th>Hash</th></tr></thead>
        <tbody>{d.rows.map((r: any) => <tr key={r.id}><td className="tnum text-muted">{r.id}</td><td className="whitespace-nowrap text-sm">{fmtDateTime(r.occurred_at)}</td><td className="text-sm">{r.actor ?? 'System'}</td><td className="text-sm font-semibold">{r.action}</td><td className="text-xs font-mono">{r.entity_type}</td><td className="text-xs text-muted max-w-[320px] truncate">{r.after ? JSON.stringify(r.after) : ''}</td><td className="font-mono text-xs text-muted">{r.hash}</td></tr>)}</tbody></table></div>
    </>
  );
}
