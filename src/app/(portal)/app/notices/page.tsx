import { PageTitle } from '@/components/portal/Shell';
import { Empty } from '@/components/ui/Empty';
import { withClaims } from '@/server/db';
import { requireSession } from '@/server/session';
import { fmtDateTime } from '@/lib/format';

export default async function NoticesPage() {
  const session = await requireSession('/app/notices');
  const d = await withClaims(session.claims, async (tx) => ({
    notices: await tx.query(`select id, title, body, audience, pinned, publish_at from app.announcements order by pinned desc, publish_at desc limit 50`),
    resources: await tx.query(`select title, description, url, category, audience from app.resources where audience <> 'public' order by created_at desc`),
  }));
  return (
    <>
      <PageTitle label="Communications" title="Notices">Announcements for your role, plus documents shared with you.</PageTitle>
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="grid gap-3 content-start">
          {d.notices.length ? d.notices.map((n: any) => (
            <article key={n.id} className="panel grid gap-2">
              <div className="flex flex-wrap items-center gap-2 justify-between"><h2 className="heading text-lg">{n.title}</h2><span className="flex gap-2">{n.pinned && <span className="chip chip-lock">Pinned</span>}<span className="chip chip-info">{n.audience}</span></span></div>
              <p className="text-ink-2 whitespace-pre-line">{n.body}</p>
              <span className="text-xs text-muted">{fmtDateTime(n.publish_at)}</span>
            </article>
          )) : <Empty title="No notices">You are all caught up.</Empty>}
        </div>
        <aside className="panel grid gap-2 content-start">
          <h2 className="heading text-lg">Shared documents</h2>
          {d.resources.length ? d.resources.map((r: any) => <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer" className="py-2 border-b border-line last:border-0 grid"><b className="text-sm">{r.title}</b><span className="text-xs text-muted">{r.category} · {r.audience}</span></a>)
            : <p className="text-sm text-muted">Nothing shared yet.</p>}
        </aside>
      </div>
    </>
  );
}
