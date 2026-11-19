import 'server-only';
import { cache } from 'react';
import { env, isPreview } from './env';
import { getSettings } from './queries/public';
import { withClaims } from './db';

export type Video = { id: string; title: string; published: string | null; kind: 'short' | 'video'; views: number | null };
export type ChannelMedia = { handle: string; channelUrl: string; channelId: string | null; shorts: Video[]; videos: Video[]; source: 'api' | 'rss' | 'pinned' | 'none' };

const HOUR = 3600;
const UA = 'Mozilla/5.0 (compatible; BAUBC-site/1.0; +https://github.com/ZubairZerok/baubc_website)';
const timeout = (ms: number) => AbortSignal.timeout(ms);

/** Pull the 11-character video ID out of any YouTube link (or a bare ID). */
export function youtubeId(v: string): string | null {
  const m = v.trim().match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})(?![\w-])/) ?? v.trim().match(/^([\w-]{11})$/);
  return m ? m[1] : null;
}

const decode = (s: string) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").trim();

/** Parses a YouTube Atom feed (no XML library needed: the format is small and fixed). */
export function parseFeed(xml: string, kind?: 'short' | 'video'): Video[] {
  const out: Video[] = [];
  for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const e = m[1];
    const id = e.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/)?.[1];
    if (!id) continue;
    const href = e.match(/<link[^>]+rel="alternate"[^>]+href="([^"]+)"/)?.[1] ?? '';
    out.push({
      id,
      title: decode(e.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ''),
      published: e.match(/<published>([^<]+)<\/published>/)?.[1] ?? null,
      kind: kind ?? (href.includes('/shorts/') ? 'short' : 'video'),
      views: Number(e.match(/<media:statistics[^>]*views="(\d+)"/)?.[1] ?? NaN) || null,
    });
  }
  return out;
}

async function getText(url: string, revalidate = HOUR): Promise<string | null> {
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'en', cookie: 'CONSENT=YES+1; SOCS=CAI' }, signal: timeout(4500), next: { revalidate } });
    return r.ok ? await r.text() : null;
  } catch { return null; }
}

/** Finds the UC… channel ID behind a @handle by reading the public channel page (cached for a day). */
async function resolveChannelId(handle: string): Promise<string | null> {
  const html = await getText(`https://www.youtube.com/${encodeURIComponent(handle)}`, 24 * HOUR);
  if (!html) return null;
  return html.match(/"(?:channelId|externalId|browseId)":"(UC[\w-]{22})"/)?.[1]
    ?? html.match(/youtube\.com\/channel\/(UC[\w-]{22})/)?.[1] ?? null;
}

async function viaApi(handle: string, channelId: string | null): Promise<{ id: string; shorts: Video[]; videos: Video[] } | null> {
  const key = env.youtubeApiKey;
  const api = async (path: string) => { try { const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}&key=${key}`, { signal: timeout(4500), next: { revalidate: HOUR } }); return r.ok ? await r.json() : null; } catch { return null; } };
  const ch = await api(`channels?part=id&${channelId ? `id=${channelId}` : `forHandle=${encodeURIComponent(handle)}`}`);
  const id: string | undefined = ch?.items?.[0]?.id;
  if (!id) return null;
  const list = async (pl: string, kind: 'short' | 'video') => {
    const j = await api(`playlistItems?part=snippet,contentDetails&maxResults=24&playlistId=${pl}${id.slice(2)}`);
    return (j?.items ?? []).map((it: any): Video => ({ id: it.contentDetails?.videoId, title: it.snippet?.title ?? '', published: it.contentDetails?.videoPublishedAt ?? null, kind, views: null }))
      .filter((v: Video) => v.id && v.title !== 'Private video' && v.title !== 'Deleted video');
  };
  const [shorts, videos] = await Promise.all([list('UUSH', 'short'), list('UULF', 'video')]);
  const ids = [...shorts, ...videos].map((v) => v.id).slice(0, 50);
  if (ids.length) {
    const stats = await api(`videos?part=statistics&id=${ids.join(',')}`);
    const views = new Map<string, number>((stats?.items ?? []).map((x: any) => [x.id, Number(x.statistics?.viewCount ?? 0)]));
    for (const v of [...shorts, ...videos]) v.views = views.get(v.id) ?? null;
  }
  return { id, shorts, videos };
}

async function viaRss(channelId: string) {
  // "UUSH…" is the channel's Shorts playlist, "UULF…" its long videos; the channel feed fills any gaps (premieres, lives).
  const tail = channelId.slice(2);
  const [sh, lf, all] = await Promise.all([
    getText(`https://www.youtube.com/feeds/videos.xml?playlist_id=UUSH${tail}`),
    getText(`https://www.youtube.com/feeds/videos.xml?playlist_id=UULF${tail}`),
    getText(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`),
  ]);
  const seen = new Map<string, Video>();
  for (const v of [...(sh ? parseFeed(sh, 'short') : []), ...(lf ? parseFeed(lf, 'video') : []), ...(all ? parseFeed(all) : [])]) {
    const prev = seen.get(v.id);
    seen.set(v.id, prev ? { ...prev, views: prev.views ?? v.views, kind: prev.kind === 'short' || v.kind === 'short' ? 'short' : 'video' } : v);
  }
  const items = [...seen.values()].sort((a, b) => (b.published ?? '').localeCompare(a.published ?? ''));
  const shorts = items.filter((v) => v.kind === 'short'), videos = items.filter((v) => v.kind === 'video');
  return shorts.length || videos.length ? { shorts, videos } : null;
}

/** Club channel reels for the site. Never throws: YouTube being slow or down just means pinned reels or a link. */
export const getChannelMedia = cache(async (): Promise<ChannelMedia> => {
  const [settings, yt] = await Promise.all([
    getSettings(),
    withClaims(null, async (tx) => (await tx.one<{ value: any }>(`select value from app.site_settings where key = 'youtube'`))?.value ?? {}),
  ]);
  const handle: string = yt.handle || '@businessclubofbau';
  const channelUrl: string = settings.social.youtube_url || `https://www.youtube.com/${handle}`;
  const pinned: Video[] = (Array.isArray(yt.featured) ? yt.featured : []).map((id: string) => ({ id, title: '', published: null, kind: 'short' as const, views: null }));
  const base = { handle, channelUrl };
  const merge = (list: Video[]) => [...pinned.map((p) => list.find((v) => v.id === p.id) ?? p), ...list.filter((v) => !pinned.some((p) => p.id === v.id))];

  {
    if (env.youtubeApiKey) {
      const r = await viaApi(handle, yt.channel_id || null);
      if (r) return { ...base, channelId: r.id, shorts: merge(r.shorts), videos: r.videos, source: 'api' };
    }
    const channelId: string | null = yt.channel_id || (await resolveChannelId(handle));
    if (channelId) {
      const r = await viaRss(channelId);
      if (r) return { ...base, channelId, shorts: merge(r.shorts), videos: r.videos, source: 'rss' };
    }
  }
  if (!pinned.length && isPreview) {
    // Preview mode without network access: sample cards so the layout and player can be tried. Never used with a real database.
    const sample = ['How a market really works', 'Inside the Summit', 'Pitch in 60 seconds', 'Agri-tech on campus', 'Meet the wings', 'Case study recap'];
    return { ...base, channelId: null, shorts: sample.map((t, i) => ({ id: `previewReel${i}`, title: `Sample reel: ${t}`, published: null, kind: 'short' as const, views: 1200 * (i + 2) })), videos: [], source: 'pinned' };
  }
  return { ...base, channelId: yt.channel_id || null, shorts: pinned, videos: [], source: pinned.length ? 'pinned' : 'none' };
});
