import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Arrow } from '@/components/brand/Mark';
import { Cover, PageHero } from '@/components/site/bits';
import { Empty } from '@/components/ui/Empty';
import { getGallery, getSettings } from '@/server/queries/public';
import { fmtDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Gallery' };

export default async function GalleryPage() {
  const [albums, settings] = await Promise.all([getGallery(), getSettings()]);
  if (settings.features.gallery === false) notFound();
  return (
    <>
      <PageHero label="Gallery" title={<>Proof that it <em className="serif-i text-brand">happened.</em></>}>Photos and videos from BAUBC events.</PageHero>
      <div className="wrap py-14">
        {albums.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {albums.map((a: any, i: number) => (
              <a key={a.id} href={a.external_url ?? '#'} target="_blank" rel="noopener noreferrer" className="group grid gap-3 reveal" style={{ ['--d' as any]: i % 3 }}>
                {a.cover_url ? <img src={a.cover_url} alt={a.title} className="rounded-[20px] aspect-[4/3] object-cover cut shadow-[var(--shadow-sm)]" loading="lazy" /> : <Cover seed={a.title} tone="harvest" className="rounded-[20px] aspect-[4/3] cut shadow-[var(--shadow-sm)]" />}
                <div><h2 className="heading text-lg group-hover:text-brand transition-colors flex items-center gap-2">{a.title}<Arrow size={12} /></h2><p className="text-sm text-muted">{[a.photo_count && `${a.photo_count} photos`, a.taken_on && fmtDate(a.taken_on)].filter(Boolean).join(' · ')}</p></div>
              </a>
            ))}
          </div>
        ) : (
          <Empty title="Albums land here after each event" action={<div className="flex gap-3 flex-wrap justify-center">
            {settings.social.facebook_url && <a className="btn btn-primary" href={settings.social.facebook_url} target="_blank" rel="noopener noreferrer">Photos on Facebook <Arrow /></a>}
            {settings.social.youtube_url && <a className="btn btn-secondary" href={settings.social.youtube_url} target="_blank" rel="noopener noreferrer">Videos on YouTube <Arrow /></a>}</div>}>
            Until then, our photos and videos live on Facebook and YouTube.
          </Empty>
        )}
      </div>
    </>
  );
}
