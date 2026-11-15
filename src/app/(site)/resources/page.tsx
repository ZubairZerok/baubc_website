import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Arrow } from '@/components/brand/Mark';
import { PageHero } from '@/components/site/bits';
import { Empty } from '@/components/ui/Empty';
import { getResources, getSettings } from '@/server/queries/public';

export const metadata: Metadata = { title: 'Resources' };

export default async function ResourcesPage() {
  const [items, settings] = await Promise.all([getResources(), getSettings()]);
  if (settings.features.resources === false) notFound();
  return (
    <>
      <PageHero label="Resources" title={<>Take what <em className="serif-i text-brand">you need.</em></>}>Guides, decks and reading the club shares publicly. Members see more after signing in.</PageHero>
      <div className="wrap py-14">
        {items.length ? (
          <div className="grid md:grid-cols-2 gap-5">
            {items.map((r: any, i: number) => (
              <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" className="group panel spot lift grid gap-2 reveal" style={{ ['--d' as any]: i % 2 }}>
                <span className="eyebrow">{r.category}</span><h2 className="heading text-xl flex items-center gap-2 group-hover:text-brand transition-colors">{r.title}<Arrow size={13} /></h2>{r.description && <p className="text-sm text-ink-2">{r.description}</p>}
              </a>
            ))}
          </div>
        ) : <Empty title="Resources are being prepared">Reports and guides will be published here.</Empty>}
      </div>
    </>
  );
}
