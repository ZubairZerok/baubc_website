import { ActionForm, SubmitButton } from '@/components/ui/forms';
import { saveEvent } from '@/app/actions/portal';
import { CATEGORY_LABEL } from '@/lib/format';

const local = (d?: string | null) => (d ? new Date(new Date(d).getTime() + 6 * 3600e3).toISOString().slice(0, 16) : '');

export function EventForm({ e }: { e?: any }) {
  return (
    <ActionForm action={saveEvent} className="grid gap-3">
      {e && <input type="hidden" name="id" value={e.id} />}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="field"><label htmlFor="ev-t">Title</label><input id="ev-t" name="title" className="input" required defaultValue={e?.title} /></div>
        {!e && <div className="field"><label htmlFor="ev-s">URL slug</label><input id="ev-s" name="slug" className="input" placeholder="auto from title" /></div>}
        <div className="field"><label htmlFor="ev-sub">Subtitle</label><input id="ev-sub" name="subtitle" className="input" defaultValue={e?.subtitle ?? ''} /></div>
        <div className="field"><label htmlFor="ev-c">Category</label><select id="ev-c" name="category" className="select" defaultValue={e?.category ?? 'workshop'}>{Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div className="field"><label htmlFor="ev-st">Status</label><select id="ev-st" name="status" className="select" defaultValue={e?.status ?? 'draft'}><option value="draft">Draft</option><option value="published">Published</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="archived">Archived</option></select></div>
        <div className="field"><label htmlFor="ev-v">Venue</label><input id="ev-v" name="venue" className="input" defaultValue={e?.venue ?? ''} /></div>
        <div className="field"><label htmlFor="ev-dl">Date label (shown when no exact date)</label><input id="ev-dl" name="date_label" className="input" defaultValue={e?.date_label ?? ''} placeholder="January 2027 · date to be announced" /></div>
        <div className="field"><label htmlFor="ev-sa">Starts</label><input id="ev-sa" name="starts_at" type="datetime-local" className="input" defaultValue={local(e?.starts_at)} /></div>
        <div className="field"><label htmlFor="ev-ea">Ends</label><input id="ev-ea" name="ends_at" type="datetime-local" className="input" defaultValue={local(e?.ends_at)} /></div>
        <div className="field"><label htmlFor="ev-ro">Registration opens</label><input id="ev-ro" name="reg_opens_at" type="datetime-local" className="input" defaultValue={local(e?.reg_opens_at)} /><span className="hint">Leave empty to keep registration closed.</span></div>
        <div className="field"><label htmlFor="ev-rc">Registration closes</label><input id="ev-rc" name="reg_closes_at" type="datetime-local" className="input" defaultValue={local(e?.reg_closes_at)} /></div>
        <div className="field"><label htmlFor="ev-el">Eligibility</label><input id="ev-el" name="eligibility" className="input" defaultValue={e?.eligibility ?? ''} /></div>
        <div className="field"><label htmlFor="ev-ct">Cover tone</label><select id="ev-ct" name="cover_tone" className="select" defaultValue={e?.cover_tone ?? 'canopy'}><option>canopy</option><option>harvest</option><option>river</option><option>paper</option></select></div>
      </div>
      <div className="field"><label htmlFor="ev-sum">Summary</label><textarea id="ev-sum" name="summary" className="textarea min-h-[70px]" defaultValue={e?.summary ?? ''} /></div>
      <div className="field"><label htmlFor="ev-b">Description (blank line = new paragraph)</label><textarea id="ev-b" name="body" className="textarea min-h-[140px]" defaultValue={e?.body ?? ''} /></div>
      <div className="field"><label htmlFor="ev-rp">Refund policy</label><input id="ev-rp" name="refund_policy" className="input" defaultValue={e?.refund_policy ?? ''} /></div>
      <label className="check"><input type="checkbox" name="featured" defaultChecked={e?.featured} />Feature on the home page</label>
      <SubmitButton>{e ? 'Save event' : 'Create event'}</SubmitButton>
    </ActionForm>
  );
}
