import { PageTitle } from '@/components/portal/Shell';
import { Status } from '@/components/ui/Status';
import { ActionForm, SubmitButton } from '@/components/ui/forms';
import { deleteAlbum, deleteAnnouncement, deleteResource, deleteSocialPost, saveAlbum, saveAnnouncement, savePost, saveResource, saveSocialPost } from '@/app/actions/portal';
import { withClaims } from '@/server/db';
import { can, requireSession } from '@/server/session';
import { fmtDate, fmtNum, relTime } from '@/lib/format';

const TABS = [['notices', 'Notices'], ['posts', 'Insights & episodes'], ['library', 'Resources & gallery'], ['reach', 'Reach numbers']] as const;

export default async function ContentAdmin({ searchParams }: { searchParams: Promise<{ post?: string; tab?: string }> }) {
  const session = await requireSession('/app/admin/content');
  const sp = await searchParams;
  const cms = can(session, 'cms.edit');
  const tab = sp.post ? 'posts' : sp.tab && (cms || sp.tab === 'notices') ? sp.tab : 'notices';
  const d = await withClaims(session.claims, async (tx) => ({
    ann: await tx.query(`select id, title, audience, pinned, publish_at from app.announcements order by publish_at desc limit 30`),
    posts: cms ? await tx.query(`select id, slug, title, series, episode_no, status, published_at from app.posts order by coalesce(published_at, created_at) desc`) : [],
    edit: sp.post && cms ? await tx.one(`select * from app.posts where id = $1`, [sp.post]) : null,
    resources: cms ? await tx.query(`select id, title, url, category, audience from app.resources order by created_at desc`) : [],
    albums: cms ? await tx.query(`select id, title, external_url, photo_count, taken_on from app.gallery_albums order by coalesce(taken_on, created_at::date) desc`) : [],
    events: cms ? await tx.query(`select id::text, title from app.events order by created_at desc limit 40`) : [],
    social: cms ? await tx.query(`select id, platform, title, post_type, permalink, published_at, viewers, views, likes, comments, shares, captured_at from app.social_posts order by coalesce(viewers, views, 0) desc limit 40`) : [],
  }));
  const p = d.edit;
  return (
    <>
      <PageTitle label="Website" title="Website & notices">Change what the public site says without a developer. Everything here goes live the moment you save.</PageTitle>
      <nav className="flex flex-wrap gap-2 mb-6">{TABS.filter(([k]) => cms || k === 'notices').map(([k, l]) => <a key={k} href={`?tab=${k}`} className={`btn btn-sm ${tab === k ? 'btn-dark' : 'btn-secondary'}`}>{l}</a>)}</nav>

      {tab === 'notices' && (
        <div className="grid xl:grid-cols-2 gap-6 items-start">
          <ActionForm action={saveAnnouncement} resetOnSuccess className="panel grid gap-3">
            <h2 className="heading text-lg">Publish a notice</h2>
            <div className="field"><label htmlFor="an-t">Title</label><input id="an-t" name="title" className="input" required /></div>
            <div className="field"><label htmlFor="an-b">Message</label><textarea id="an-b" name="body" className="textarea" required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="field"><label htmlFor="an-a">Who sees it</label><select id="an-a" name="audience" className="select"><option value="members">Members</option><option value="teachers">Teachers</option><option value="staff">Staff</option><option value="all_signed_in">Everyone signed in</option><option value="public">Public website</option></select></div>
              <label className="check self-end pb-2"><input type="checkbox" name="pinned" />Pin to the top</label>
            </div>
            <SubmitButton className="btn btn-primary justify-self-start">Publish</SubmitButton>
          </ActionForm>
          <div className="panel grid gap-1">
            <h2 className="heading text-lg mb-1">Recent notices</h2>
            {d.ann.length ? d.ann.map((a: any) => (
              <ActionForm key={a.id} action={deleteAnnouncement} className="flex justify-between gap-3 py-2 border-b border-line last:border-0 text-sm">
                <input type="hidden" name="id" value={a.id} />
                <span><b>{a.title}</b> <span className="text-muted">· {a.audience.replace(/_/g, ' ')}{a.pinned ? ' · pinned' : ''} · {relTime(a.publish_at)}</span></span>
                <SubmitButton className="btn btn-ghost btn-sm">Remove</SubmitButton>
              </ActionForm>
            )) : <p className="text-sm text-muted">Nothing published yet.</p>}
          </div>
        </div>
      )}

      {tab === 'posts' && cms && (
        <div className="grid xl:grid-cols-[1.1fr_1fr] gap-6 items-start">
          <ActionForm action={savePost} className="panel grid gap-3" key={p?.id ?? 'new'}>
            <h2 className="heading text-lg">{p ? 'Edit post' : 'New insight or episode'}</h2>
            {p && <input type="hidden" name="id" value={p.id} />}
            <div className="field"><label htmlFor="po-t">Title</label><input id="po-t" name="title" className="input" required defaultValue={p?.title} /></div>
            <div className="field"><label htmlFor="po-d">One-line summary</label><input id="po-d" name="dek" className="input" defaultValue={p?.dek ?? ''} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="field"><label htmlFor="po-s">Series</label><select id="po-s" name="series" className="select" defaultValue={p?.series ?? 'insights'}><option value="decoded">DECODED</option><option value="case-studies">Case Studies</option><option value="insights">Insights</option><option value="news">News</option></select></div>
              <div className="field"><label htmlFor="po-k">Kind</label><select id="po-k" name="kind" className="select" defaultValue={p?.kind ?? 'article'}><option value="episode">Episode</option><option value="article">Article</option><option value="news">News</option></select></div>
              <div className="field"><label htmlFor="po-e">Episode no.</label><input id="po-e" name="episode_no" type="number" className="input" defaultValue={p?.episode_no ?? ''} /></div>
              <div className="field col-span-2"><label htmlFor="po-l">Cover label</label><input id="po-l" name="cover_label" className="input" defaultValue={p?.cover_label ?? ''} placeholder="EP 05 · TITLE · YEAR" /></div>
              <div className="field"><label htmlFor="po-c">Cover colour</label><select id="po-c" name="cover_tone" className="select" defaultValue={p?.cover_tone ?? 'canopy'}><option value="canopy">Green</option><option value="harvest">Lime</option><option value="river">Deep green</option><option value="paper">Light</option></select></div>
            </div>
            <div className="field"><label htmlFor="po-img">Cover photo link <span className="text-muted font-normal">(optional, https://; use a photo the club has the right to use)</span></label><input id="po-img" name="cover_url" type="url" className="input" defaultValue={p?.cover_url ?? ''} placeholder="https://" /></div>
            <div className="field"><label htmlFor="po-b">Body <span className="text-muted font-normal">(leave a blank line between paragraphs)</span></label><textarea id="po-b" name="body" className="textarea min-h-[200px]" defaultValue={p?.body ?? ''} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="field"><label htmlFor="po-fb">Facebook post link</label><input id="po-fb" name="facebook_url" className="input" defaultValue={p?.facebook_url ?? ''} /></div>
              <div className="field"><label htmlFor="po-yt">YouTube link</label><input id="po-yt" name="youtube_url" className="input" defaultValue={p?.youtube_url ?? ''} /></div>
            </div>
            <div className="field"><label htmlFor="po-st">Status</label><select id="po-st" name="status" className="select" defaultValue={p?.status ?? 'draft'}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></div>
            <div className="flex gap-2"><SubmitButton className="btn btn-primary">{p ? 'Save post' : 'Create post'}</SubmitButton>{p && <a href="?tab=posts" className="btn btn-ghost">New post instead</a>}</div>
          </ActionForm>
          <div className="table-wrap"><table className="table"><thead><tr><th>Post</th><th>Status</th><th></th></tr></thead>
            <tbody>{d.posts.map((x: any) => <tr key={x.id}><td><b>{x.title}</b><div className="text-xs text-muted">{x.series}{x.episode_no ? ` · EP ${x.episode_no}` : ''}{x.published_at ? ` · ${fmtDate(x.published_at)}` : ''}</div></td><td><Status value={x.status} /></td><td><a className="btn btn-secondary btn-sm" href={`?post=${x.id}`}>Edit</a></td></tr>)}</tbody></table></div>
        </div>
      )}

      {tab === 'library' && cms && (
        <div className="grid xl:grid-cols-2 gap-6 items-start">
          <section className="grid gap-4">
            <ActionForm action={saveResource} resetOnSuccess className="panel grid gap-3">
              <h2 className="heading text-lg">Add a resource</h2>
              <p className="text-sm text-ink-2">A guide, deck or template that lives in Google Drive or anywhere with a link.</p>
              <div className="field"><label htmlFor="rs-t">Title</label><input id="rs-t" name="title" className="input" required /></div>
              <div className="field"><label htmlFor="rs-u">Link</label><input id="rs-u" name="url" type="url" className="input" placeholder="https://drive.google.com/…" required /></div>
              <div className="field"><label htmlFor="rs-d">What it is</label><input id="rs-d" name="description" className="input" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="field"><label htmlFor="rs-c">Type</label><select id="rs-c" name="category" className="select"><option value="guide">Guide</option><option value="report">Report</option><option value="deck">Deck</option><option value="template">Template</option><option value="reading">Reading</option><option value="form">Form</option></select></div>
                <div className="field"><label htmlFor="rs-a">Who sees it</label><select id="rs-a" name="audience" className="select"><option value="public">Everyone</option><option value="members">Members</option><option value="teachers">Teachers</option><option value="staff">Staff</option></select></div>
              </div>
              <SubmitButton className="btn btn-primary justify-self-start">Add resource</SubmitButton>
            </ActionForm>
            <div className="panel grid gap-1"><h3 className="heading text-base mb-1">Resources ({d.resources.length})</h3>
              {d.resources.length ? d.resources.map((r: any) => <ActionForm key={r.id} action={deleteResource} className="flex justify-between gap-3 py-2 border-b border-line last:border-0 text-sm"><input type="hidden" name="id" value={r.id} /><span><a href={r.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline decoration-line-strong">{r.title}</a> <span className="text-muted">· {r.category} · {r.audience}</span></span><SubmitButton className="btn btn-ghost btn-sm">Remove</SubmitButton></ActionForm>) : <p className="text-sm text-muted">No resources yet.</p>}</div>
          </section>
          <section className="grid gap-4">
            <ActionForm action={saveAlbum} resetOnSuccess className="panel grid gap-3">
              <h2 className="heading text-lg">Add a photo album</h2>
              <p className="text-sm text-ink-2">Photos stay where they already are (a Facebook album or a Drive folder). The gallery links to them.</p>
              <div className="field"><label htmlFor="al-t">Title</label><input id="al-t" name="title" className="input" required /></div>
              <div className="field"><label htmlFor="al-u">Album link</label><input id="al-u" name="external_url" type="url" className="input" placeholder="https://www.facebook.com/media/set/…" required /></div>
              <div className="field"><label htmlFor="al-d">Caption</label><input id="al-d" name="description" className="input" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="field"><label htmlFor="al-n">Photos</label><input id="al-n" name="photo_count" type="number" min="0" className="input" /></div>
                <div className="field"><label htmlFor="al-o">Taken on</label><input id="al-o" name="taken_on" type="date" className="input" /></div>
                <div className="field"><label htmlFor="al-e">Event</label><select id="al-e" name="event_id" className="select"><option value="">None</option>{d.events.map((e: any) => <option key={e.id} value={e.id}>{e.title}</option>)}</select></div>
              </div>
              <SubmitButton className="btn btn-primary justify-self-start">Add album</SubmitButton>
            </ActionForm>
            <div className="panel grid gap-1"><h3 className="heading text-base mb-1">Albums ({d.albums.length})</h3>
              {d.albums.length ? d.albums.map((a: any) => <ActionForm key={a.id} action={deleteAlbum} className="flex justify-between gap-3 py-2 border-b border-line last:border-0 text-sm"><input type="hidden" name="id" value={a.id} /><span><b>{a.title}</b> <span className="text-muted">{a.photo_count ? `· ${a.photo_count} photos` : ''}{a.taken_on ? ` · ${fmtDate(a.taken_on)}` : ''}</span></span><SubmitButton className="btn btn-ghost btn-sm">Remove</SubmitButton></ActionForm>) : <p className="text-sm text-muted">No albums yet.</p>}</div>
          </section>
        </div>
      )}

      {tab === 'reach' && cms && (
        <div className="grid xl:grid-cols-[400px_1fr] gap-6 items-start">
          <ActionForm action={saveSocialPost} resetOnSuccess className="panel grid gap-3">
            <h2 className="heading text-lg">Record a post&apos;s numbers</h2>
            <p className="text-sm text-ink-2">Copy these from Meta Business Suite. Saving the same link again updates the numbers. The follower count is in Settings.</p>
            <div className="field"><label htmlFor="sp-t">Post title</label><input id="sp-t" name="title" className="input" required /></div>
            <div className="field"><label htmlFor="sp-l">Post link</label><input id="sp-l" name="permalink" type="url" className="input" placeholder="https://www.facebook.com/…" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="field"><label htmlFor="sp-p">Platform</label><select id="sp-p" name="platform" className="select"><option value="facebook">Facebook</option><option value="youtube">YouTube</option><option value="linkedin">LinkedIn</option><option value="instagram">Instagram</option></select></div>
              <div className="field"><label htmlFor="sp-k">Type</label><select id="sp-k" name="post_type" className="select"><option value="reel">Reel</option><option value="video">Video</option><option value="photo">Photo</option><option value="post">Post</option></select></div>
              <div className="field"><label htmlFor="sp-o">Posted on</label><input id="sp-o" name="published_on" type="date" className="input" /></div>
              {['viewers', 'views', 'likes', 'comments', 'shares'].map((k) => <div className="field" key={k}><label htmlFor={`sp-${k}`}>{k[0].toUpperCase() + k.slice(1)}</label><input id={`sp-${k}`} name={k} type="number" min="0" className="input" /></div>)}
            </div>
            <SubmitButton className="btn btn-primary justify-self-start">Save numbers</SubmitButton>
          </ActionForm>
          <div className="table-wrap"><table className="table"><thead><tr><th>Post</th><th className="text-right">Viewers</th><th className="text-right">Views</th><th className="text-right">Likes</th><th></th></tr></thead>
            <tbody>{d.social.length ? d.social.map((x: any) => <tr key={x.id}><td><b>{x.title}</b><div className="text-xs text-muted">{x.platform}{x.post_type ? ` · ${x.post_type}` : ''} · updated {relTime(x.captured_at)}</div></td>
              <td className="text-right tnum">{x.viewers != null ? fmtNum(x.viewers) : '—'}</td><td className="text-right tnum">{x.views != null ? fmtNum(x.views) : '—'}</td><td className="text-right tnum">{x.likes != null ? fmtNum(x.likes) : '—'}</td>
              <td><ActionForm action={deleteSocialPost}><input type="hidden" name="id" value={x.id} /><SubmitButton className="btn btn-ghost btn-sm min-h-7 text-xs">Remove</SubmitButton></ActionForm></td></tr>) : <tr><td colSpan={5} className="text-muted">No post numbers recorded yet.</td></tr>}</tbody></table></div>
        </div>
      )}
    </>
  );
}
