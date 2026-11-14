import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
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
      <PageHero label="Gallery" title={<>Moments from <span className="serif-i">the field</span></>} bn="মুহূর্তগুলো">Photos and videos from BAUBC events.</PageHero>
      <div className="wrap py-12">
        {albums.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {albums.map((a: any) => (
              <a key={a.id} href={a.external_url ?? '#'} target="_blank" rel="noopener noreferrer" className="group grid gap-3 reveal">
                {a.cover_url ? <img src={a.cover_url} alt={a.title} className="rounded-xl aspect-[4/3] object-cover" loading="lazy" /> : <Cover seed={a.title} tone="canopy" className="rounded-xl aspect-[4/3]" />}
                <div><h2 className="heading text-lg group-hover:text-link">{a.title}</h2><p className="text-sm text-muted">{[a.photo_count && `${a.photo_count} photos`, a.taken_on && fmtDate(a.taken_on)].filter(Boolean).join(' · ')}</p></div>
              </a>
            ))}
          </div>
        ) : (
          <Empty title="Albums are added after each event" action={<div className="flex gap-3 flex-wrap justify-center">
            {settings.social.facebook_url && <a className="btn btn-secondary" href={settings.social.facebook_url} target="_blank" rel="noopener noreferrer">Photos on Facebook</a>}
            {settings.social.youtube_url && <a className="btn btn-ghost" href={settings.social.youtube_url} target="_blank" rel="noopener noreferrer">Videos on YouTube</a>}</div>}>
            Until then, our photos and videos live on Facebook and YouTube.
          </Empty>
        )}
      </div>
    </>
  );
}
