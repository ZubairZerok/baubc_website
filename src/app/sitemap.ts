import type { MetadataRoute } from 'next';
import { getEvents, getPosts, getSettings } from '@/server/queries/public';
import { env } from '@/server/env';

export const revalidate = 3600;

/** Every public page. Member profiles are left out on purpose: they are public by consent, not for search engines. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [events, posts, settings] = await Promise.all([getEvents().catch(() => []), getPosts().catch(() => []), getSettings()]);
  const f = settings.features;
  const pages = ['', '/about', '/events', '/insights', '/reels', '/wings', '/advisors', '/contact', '/join', '/verify', '/privacy',
    ...(f.members_directory !== false ? ['/members'] : []), ...(f.gallery !== false ? ['/gallery'] : []), ...(f.resources !== false ? ['/resources'] : []), ...(f.leaderboard === 'public' ? ['/leaderboard'] : [])];
  return [
    ...pages.map((p) => ({ url: `${env.siteUrl}${p}`, changeFrequency: p === '' ? 'daily' as const : 'weekly' as const, priority: p === '' ? 1 : 0.7 })),
    ...events.filter((e) => e.status !== 'draft').map((e) => ({ url: `${env.siteUrl}/events/${e.slug}`, changeFrequency: 'daily' as const, priority: 0.8 })),
    ...posts.map((p) => ({ url: `${env.siteUrl}/insights/${p.slug}`, lastModified: p.published_at ?? undefined, changeFrequency: 'monthly' as const, priority: 0.6 })),
  ];
}
