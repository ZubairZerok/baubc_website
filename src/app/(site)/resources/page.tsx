import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageHero } from '@/components/site/bits';
import { Empty } from '@/components/ui/Empty';
import { getResources, getSettings } from '@/server/queries/public';

export const metadata: Metadata = { title: 'Resources' };

export default async function ResourcesPage() {
  const [items, settings] = await Promise.all([getResources(), getSettings()]);
  if (settings.features.resources === false) notFound();
  return (
    <>
      <PageHero label="Resources" title={<>Guides, decks <span className="serif-i">and reading</span></>} bn="রিসোর্স">Material the club shares publicly. Members see more after signing in.</PageHero>
      <div className="wrap py-12">
        {items.length ? (
          <div className="grid md:grid-cols-2 gap-4">
            {items.map((r: any) => (
              <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" className="panel grid gap-1.5 hover:border-line-strong reveal">
                <span className="label text-muted">{r.category}</span><h2 className="heading text-lg">{r.title}</h2>{r.description && <p className="text-sm text-ink-2">{r.description}</p>}
              </a>
            ))}
          </div>
        ) : <Empty title="Resources are being prepared">Reports and guides will be published here.</Empty>}
      </div>
    </>
  );
}
