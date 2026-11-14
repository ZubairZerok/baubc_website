import Link from 'next/link';
import { LogoMark } from '@/components/ui/Logo';
import { LangToggle, MobileMenu, RevealObserver, ThemeToggle } from './client';
import { t, type Lang } from '@/lib/i18n';
import { isPreview } from '@/server/env';

type Social = { facebook_url?: string; youtube_url?: string; linkedin_url?: string };

export function SiteHeader({ lang, signedIn, features }: { lang: Lang; signedIn: boolean; features: Record<string, any> }) {
  const items = [
    { href: '/about', label: t(lang, 'nav_about') },
    { href: '/events', label: t(lang, 'nav_events') },
    { href: '/insights', label: t(lang, 'nav_insights') },
    { href: '/wings', label: t(lang, 'nav_wings') },
    ...(features.members_directory !== false ? [{ href: '/members', label: t(lang, 'nav_members') }] : []),
    { href: '/contact', label: t(lang, 'nav_contact') },
  ];
  const cta = (
    <>
      <Link href={signedIn ? '/app' : '/login'} className="btn btn-ghost btn-sm">{signedIn ? t(lang, 'nav_dashboard') : t(lang, 'nav_login')}</Link>
      <Link href="/join" className="btn btn-primary btn-sm">{t(lang, 'nav_join')}</Link>
    </>
  );
  return (
    <>
      {isPreview && (
        <div className="bg-harvest text-[#151913] text-center text-xs font-semibold py-1.5 px-4">{t(lang, 'preview_banner')}</div>
      )}
      <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-md" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
        <div className="wrap flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 font-display font-bold tracking-tight text-[1.05rem]" aria-label="BAUBC home">
            <LogoMark /> <span>BAUBC</span>
          </Link>
          <nav className="hidden lg:flex items-center gap-1" aria-label="Main">
            {items.map((it) => (
              <Link key={it.href} href={it.href} className="px-3 py-2 rounded-lg text-[.93rem] font-medium text-ink-2 hover:text-ink hover:bg-paper-2 transition-colors">{it.label}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block"><LangToggle lang={lang} /></div>
            <ThemeToggle />
            <div className="hidden lg:flex items-center gap-2">{cta}</div>
            <MobileMenu items={[{ href: '/', label: t(lang, 'nav_home') }, ...items, { href: '/join', label: t(lang, 'nav_join') }]} cta={<><LangToggle lang={lang} dark />{cta}</>} />
          </div>
        </div>
      </header>
      <RevealObserver />
    </>
  );
}

export function SiteFooter({ lang, club, social }: { lang: Lang; club: Record<string, any>; social: Social }) {
  return (
    <footer className="canopy on-canopy mt-24">
      <div className="wrap py-16 grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="grid gap-4 content-start">
          <div className="flex items-center gap-3"><LogoMark size={36} /><span className="display-md text-2xl">BAUBC</span></div>
          <p className="text-canopy-muted max-w-sm text-sm">{lang === 'bn' ? club.name_bn : club.name}. {t(lang, 'footer_note')}</p>
          <p className="font-mono text-sm text-on-canopy">{club.email}</p>
        </div>
        <FooterCol title="Club" links={[['/about', t(lang, 'nav_about')], ['/wings', t(lang, 'nav_wings')], ['/advisors', t(lang, 'nav_advisors')], ['/members', t(lang, 'nav_members')], ['/join', t(lang, 'nav_join')]]} />
        <FooterCol title="Explore" links={[['/events', t(lang, 'nav_events')], ['/insights', t(lang, 'nav_insights')], ['/gallery', t(lang, 'nav_gallery')], ['/resources', t(lang, 'nav_resources')], ['/verify', t(lang, 'nav_verify')]]} />
        <div className="grid gap-3 content-start">
          <p className="label text-canopy-muted">{t(lang, 'follow')}</p>
          {social.facebook_url && <a className="hover:text-signal" href={social.facebook_url} target="_blank" rel="noopener noreferrer">Facebook</a>}
          {social.youtube_url && <a className="hover:text-signal" href={social.youtube_url} target="_blank" rel="noopener noreferrer">YouTube</a>}
          {social.linkedin_url && <a className="hover:text-signal" href={social.linkedin_url} target="_blank" rel="noopener noreferrer">LinkedIn</a>}
          <Link className="hover:text-signal" href="/contact">{t(lang, 'nav_contact')}</Link>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="wrap py-5 flex flex-wrap justify-between gap-3 text-xs text-canopy-muted">
          <span>© {new Date().getFullYear()} Bangladesh Agricultural University Business Club</span>
          <span className="flex gap-4"><Link href="/privacy" className="hover:text-signal">{t(lang, 'privacy')}</Link><Link href="/login" className="hover:text-signal">{t(lang, 'nav_login')}</Link></span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="grid gap-3 content-start">
      <p className="label text-canopy-muted">{title}</p>
      {links.map(([href, label]) => <Link key={href} href={href} className="hover:text-signal">{label}</Link>)}
    </div>
  );
}
