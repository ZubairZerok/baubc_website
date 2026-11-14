import { PageTitle } from '@/components/portal/Shell';
import { Status } from '@/components/ui/Status';
import { ActionForm, SubmitButton } from '@/components/ui/forms';
import { deleteAnnouncement, saveAnnouncement, savePost } from '@/app/actions/portal';
import { withClaims } from '@/server/db';
import { can, requireSession } from '@/server/session';
import { fmtDate, relTime } from '@/lib/format';

export default async function ContentAdmin({ searchParams }: { searchParams: Promise<{ post?: string }> }) {
  const session = await requireSession('/app/admin/content');
  const { post } = await searchParams;
  const d = await withClaims(session.claims, async (tx) => ({
    ann: await tx.query(`select id, title, audience, pinned, publish_at from app.announcements order by publish_at desc limit 30`),
    posts: can(session, 'cms.edit') ? await tx.query(`select id, slug, title, series, episode_no, status, published_at from app.posts order by coalesce(published_at, created_at) desc`) : [],
    edit: post && can(session, 'cms.edit') ? await tx.one(`select * from app.posts where id = $1`, [post]) : null,
  }));
  const p = d.edit;
  return (
    <>
      <PageTitle label="Website" title="Website & notices">Edit public content without a developer. Changes appear on the site immediately.</PageTitle>
      <div className="grid xl:grid-cols-2 gap-6 items-start">
        <section className="grid gap-4">
          <ActionForm action={saveAnnouncement} resetOnSuccess className="panel grid gap-3">
            <h2 className="heading text-lg">Publish an announcement</h2>
            <div className="field"><label htmlFor="an-t">Title</label><input id="an-t" name="title" className="input" required /></div>
            <div className="field"><label htmlFor="an-tb">Title (বাংলা)</label><input id="an-tb" name="title_bn" className="input" lang="bn" /></div>
            <div className="field"><label htmlFor="an-b">Message</label><textarea id="an-b" name="body" className="textarea" required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="field"><label htmlFor="an-a">Audience</label><select id="an-a" name="audience" className="select"><option value="members">Members</option><option value="teachers">Teachers</option><option value="staff">Staff</option><option value="all_signed_in">Everyone signed in</option><option value="public">Public website</option></select></div>
              <label className="check self-end pb-2"><input type="checkbox" name="pinned" />Pin to top</label>
            </div>
            <SubmitButton>Publish</SubmitButton>
          </ActionForm>
          <div className="panel grid gap-1">
            <h2 className="heading text-lg mb-1">Recent announcements</h2>
            {d.ann.map((a: any) => (
              <ActionForm key={a.id} action={deleteAnnouncement} className="flex justify-between gap-3 py-2 border-b border-line last:border-0 text-sm">
                <input type="hidden" name="id" value={a.id} />
                <span><b>{a.title}</b> <span className="text-muted">· {a.audience}{a.pinned ? ' · pinned' : ''} · {relTime(a.publish_at)}</span></span>
                <SubmitButton className="btn btn-ghost btn-sm">Remove</SubmitButton>
              </ActionForm>
            ))}
          </div>
        </section>
        {can(session, 'cms.edit') && (
          <section className="grid gap-4">
            <ActionForm action={savePost} className="panel grid gap-3" key={p?.id ?? 'new'}>
              <h2 className="heading text-lg">{p ? 'Edit post' : 'New insight or episode'}</h2>
              {p && <input type="hidden" name="id" value={p.id} />}
              <div className="field"><label htmlFor="po-t">Title</label><input id="po-t" name="title" className="input" required defaultValue={p?.title} /></div>
              <div className="field"><label htmlFor="po-d">Standfirst</label><input id="po-d" name="dek" className="input" defaultValue={p?.dek ?? ''} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="field"><label htmlFor="po-s">Series</label><select id="po-s" name="series" className="select" defaultValue={p?.series ?? 'insights'}><option value="decoded">DECODED</option><option value="case-studies">Case Studies</option><option value="insights">Insights</option><option value="news">News</option></select></div>
                <div className="field"><label htmlFor="po-k">Kind</label><select id="po-k" name="kind" className="select" defaultValue={p?.kind ?? 'article'}><option value="episode">Episode</option><option value="article">Article</option><option value="news">News</option></select></div>
                <div className="field"><label htmlFor="po-e">Episode no.</label><input id="po-e" name="episode_no" type="number" className="input" defaultValue={p?.episode_no ?? ''} /></div>
                <div className="field col-span-2"><label htmlFor="po-l">Cover label</label><input id="po-l" name="cover_label" className="input" defaultValue={p?.cover_label ?? ''} placeholder="EP 05 · TITLE · YEAR" /></div>
                <div className="field"><label htmlFor="po-c">Cover tone</label><select id="po-c" name="cover_tone" className="select" defaultValue={p?.cover_tone ?? 'canopy'}><option>canopy</option><option>harvest</option><option>river</option><option>paper</option></select></div>
              </div>
              <div className="field"><label htmlFor="po-b">Body (blank line = new paragraph)</label><textarea id="po-b" name="body" className="textarea min-h-[180px]" defaultValue={p?.body ?? ''} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="field"><label htmlFor="po-fb">Facebook post link</label><input id="po-fb" name="facebook_url" className="input" defaultValue={p?.facebook_url ?? ''} /></div>
                <div className="field"><label htmlFor="po-yt">YouTube link</label><input id="po-yt" name="youtube_url" className="input" defaultValue={p?.youtube_url ?? ''} /></div>
              </div>
              <div className="field"><label htmlFor="po-st">Status</label><select id="po-st" name="status" className="select" defaultValue={p?.status ?? 'draft'}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></div>
              <input type="hidden" name="title_bn" value={p?.title_bn ?? ''} />
              <SubmitButton>{p ? 'Save' : 'Create'}</SubmitButton>
            </ActionForm>
            <div className="table-wrap"><table className="table"><thead><tr><th>Post</th><th>Status</th><th></th></tr></thead>
              <tbody>{d.posts.map((x: any) => <tr key={x.id}><td><b>{x.title}</b><div className="text-xs text-muted">{x.series}{x.episode_no ? ` · EP ${x.episode_no}` : ''} · {fmtDate(x.published_at)}</div></td><td><Status value={x.status} /></td><td><a className="btn btn-ghost btn-sm border-line" href={`?post=${x.id}`}>Edit</a></td></tr>)}</tbody></table></div>
          </section>
        )}
      </div>
    </>
  );
}
