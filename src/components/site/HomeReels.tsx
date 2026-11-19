import Link from 'next/link';
import { Arrow } from '@/components/brand/Mark';
import { SectionHead } from '@/components/site/bits';
import { ReelsRail } from '@/components/site/Reels';
import { getChannelMedia } from '@/server/youtube';

/** Streams in after the rest of the home page, so a slow YouTube never delays the first paint. */
export async function HomeReels() {
  const m = await getChannelMedia();
  const items = [...m.shorts, ...m.videos].sort((a, b) => (b.published ?? '').localeCompare(a.published ?? '')).slice(0, 12);
  if (!items.length) return null;
  return (
    <section className="relative isolate overflow-hidden py-24 md:py-32">
      <div className="absolute inset-0 -z-10 lime-wash" aria-hidden="true" />
      <div className="absolute inset-0 -z-10 pat-rays opacity-70" aria-hidden="true" />
      <div className="wrap">
        <div className="grid md:grid-cols-[1fr_auto] gap-6 items-end">
          <SectionHead label="Reels · YouTube" title={<>BAUBC, <span className="serif-i text-brand">in motion.</span></>} className="!mb-0">
            DECODED episodes, case studies and club life. Tap any reel to watch it right here.
          </SectionHead>
          <div className="flex flex-wrap gap-3 reveal">
            <Link href="/reels" className="btn btn-secondary">All reels</Link>
            <a href={m.channelUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Subscribe <Arrow /></a>
          </div>
        </div>
        <div className="mt-10"><ReelsRail reels={items} channelUrl={m.channelUrl} /></div>
      </div>
    </section>
  );
}
