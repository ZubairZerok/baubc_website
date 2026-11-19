import type { MetadataRoute } from 'next';
import { env } from '@/server/env';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/app', '/api', '/print', '/tickets', '/activate', '/setup', '/mfa', '/reset', '/account'] }],
    sitemap: `${env.siteUrl}/sitemap.xml`,
  };
}
