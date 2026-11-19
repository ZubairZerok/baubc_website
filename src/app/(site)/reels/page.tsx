import type { Metadata } from 'next';
import { Arrow } from '@/components/brand/Mark';
import { PageHero } from '@/components/site/bits';
import { ReelsGrid } from '@/components/site/Reels';
import { getChannelMedia } from '@/server/youtube';

export const metadata: Metadata = { title: 'Reels', description: 'Short videos from BAUBC: events, pitches, case studies and club life, straight from our YouTube channel.' };
export const revalidate = 3600;

export default async function ReelsPage() {
  const m = await getChannelMedia();
  const empty = !m.shorts.length && !m.videos.length;
  return (
    <>
      <PageHero label="Reels" title={<>BAUBC, <em className="serif-i text-brand">in motion.</em></>}>
        Events, pitches, case studies and club life, straight from our YouTube channel. New uploads appear here by themselves.
      </PageHero>
      <div className="wrap py-14 grid gap-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-ink-2">{m.handle}{m.source === 'rss' || m.source === 'api' ? ' · updated hourly from YouTube' : ''}</p>
          <a href={m.channelUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Subscribe on YouTube <Arrow /></a>
        </div>
        {empty ? (
          <a href={m.channelUrl} target="_blank" rel="noopener noreferrer" className="reel-more reel-card !aspect-auto min-h-[280px] rounded-[32px] reveal">
            <span className="grid place-items-center gap-3 text-center p-10"><b className="display-md text-3xl">Watch our reels on YouTube</b><span className="text-ink-2">{m.handle}</span></span>
          </a>
        ) : <ReelsGrid reels={m.shorts} videos={m.videos} channelUrl={m.channelUrl} />}
      </div>
    </>
  );
}
