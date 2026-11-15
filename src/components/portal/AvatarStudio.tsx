'use client';
import { useRef, useState, useTransition } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Avatar, HAIRS, SKINS, TOPS, specFor, type AvatarSpec } from '@/components/ui/Avatar';
import { setMyPhoto } from '@/app/actions/portal';

const HAIR_LABEL: Record<string, string> = { short: 'Short', long: 'Long', bun: 'Bun', curly: 'Curly', hijab: 'Hijab', cap: 'Cap' };

/** Shrinks the chosen picture to a 512px square WebP in the browser, so nothing large ever leaves the phone. */
async function squareWebp(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const side = Math.min(img.width, img.height);
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  c.getContext('2d')!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 512, 512);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Could not read that image'))), 'image/webp', 0.86));
}

export function AvatarStudio({ name, initial, photoUrl, upload }: { name: string; initial?: AvatarSpec | null; photoUrl?: string | null; upload?: { url: string; key: string; userId: string } | null }) {
  const [spec, setSpec] = useState(() => specFor(name, initial));
  const [photo, setPhoto] = useState(photoUrl ?? null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();
  const file = useRef<HTMLInputElement>(null);

  const onPick = (f?: File) => {
    if (!f || !upload) return;
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) return setNote({ ok: false, text: 'Choose a JPG, PNG or WebP picture.' });
    start(async () => {
      try {
        const blob = await squareWebp(f);
        const supabase = createBrowserClient(upload.url, upload.key);
        const path = `${upload.userId}/avatar.webp`;
        const { error } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/webp', cacheControl: '3600' });
        if (error) throw new Error(error.message);
        const url = `${upload.url}/storage/v1/object/public/avatars/${path}?v=${Date.now()}`;
        const r = await setMyPhoto(url);
        if (!r?.ok) throw new Error(r?.message ?? 'Could not save the photo');
        setPhoto(url); setNote({ ok: true, text: 'Photo updated.' });
      } catch (e) { setNote({ ok: false, text: e instanceof Error ? e.message : 'Upload failed. Please try again.' }); }
    });
  };
  const removePhoto = () => start(async () => {
    const r = await setMyPhoto(null);
    if (r?.ok) { setPhoto(null); setNote({ ok: true, text: r.message }); } else setNote({ ok: false, text: r?.message ?? 'Could not remove the photo' });
  });

  const swatch = (on: boolean) => `size-9 rounded-full border-2 transition-transform ${on ? 'border-brand scale-110 shadow-[0_0_0_3px_#fff_inset]' : 'border-white hover:scale-105'}`;
  return (
    <fieldset className="grid gap-4">
      <legend className="field-label mb-2">How you appear</legend>
      <div className="grid sm:grid-cols-[auto_1fr] gap-5 items-start">
        <div className="grid gap-2 justify-items-center">
          <div className="rounded-[30%] p-1.5 lime-field"><Avatar name={name} photoUrl={photo} avatar={spec} size={112} /></div>
          <span className="text-xs text-muted">{photo ? 'Your photo' : 'Character avatar'}</span>
        </div>
        <div className="grid gap-3.5">
          <p className="hint">Prefer not to show your face? Build a character instead. It is used anywhere your picture would be.</p>
          <div className="grid gap-1.5"><span className="label text-muted">Style</span>
            <div className="flex flex-wrap gap-1.5">{HAIRS.map((h) => <button type="button" key={h} onClick={() => setSpec({ ...spec, hair: h })} aria-pressed={spec.hair === h} className={`chip cursor-pointer ${spec.hair === h ? 'chip-live' : 'chip-draft'}`}>{HAIR_LABEL[h]}</button>)}
              <button type="button" onClick={() => setSpec({ ...spec, glasses: !spec.glasses })} aria-pressed={spec.glasses} className={`chip cursor-pointer ${spec.glasses ? 'chip-live' : 'chip-draft'}`}>Glasses</button></div></div>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <div className="grid gap-1.5"><span className="label text-muted">Skin</span><div className="flex gap-2">{SKINS.map((c, i) => <button type="button" key={c} onClick={() => setSpec({ ...spec, skin: i })} aria-label={`Skin tone ${i + 1}`} aria-pressed={spec.skin === i} className={swatch(spec.skin === i)} style={{ background: c }} />)}</div></div>
            <div className="grid gap-1.5"><span className="label text-muted">Colour</span><div className="flex gap-2">{TOPS.map((c, i) => <button type="button" key={c} onClick={() => setSpec({ ...spec, top: i })} aria-label={`Colour ${i + 1}`} aria-pressed={spec.top === i} className={swatch(spec.top === i)} style={{ background: c }} />)}</div></div>
          </div>
          <input type="hidden" name="avatar_hair" value={spec.hair} /><input type="hidden" name="avatar_skin" value={spec.skin} /><input type="hidden" name="avatar_top" value={spec.top} /><input type="hidden" name="avatar_glasses" value={spec.glasses ? 'on' : ''} />
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-line">
            {upload ? (<>
              <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => onPick(e.target.files?.[0])} aria-label="Choose a photo" />
              <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => file.current?.click()}><span>{busy ? 'Working…' : photo ? 'Change photo' : 'Use a photo instead'}</span></button>
              {photo && <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={removePhoto}><span>Remove photo</span></button>}
            </>) : <span className="hint">Photo upload turns on when the site is connected to its live database.</span>}
            {note && <span role="status" className={`text-sm ${note.ok ? 'text-green' : 'text-soil'}`}>{note.text}</span>}
          </div>
        </div>
      </div>
    </fieldset>
  );
}
