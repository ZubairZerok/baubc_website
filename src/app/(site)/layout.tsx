import { SiteFooter, SiteHeader } from '@/components/site/chrome';
import { getSettings } from '@/server/queries/public';
import { getSession } from '@/server/session';

export const dynamic = 'force-dynamic';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, session] = await Promise.all([getSettings(), getSession()]);
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 btn btn-dark">Skip to content</a>
      <SiteHeader signedIn={!!session} features={settings.features} />
      <main id="main">{children}</main>
      <SiteFooter club={settings.club} social={settings.social} />
    </>
  );
}
