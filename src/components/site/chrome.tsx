import Link from 'next/link';
import { LogoTile, Mark, Arrow, Diamond } from '@/components/brand/Mark';
import { HeaderShell, MobileMenu, NavLinks, RevealObserver } from './client';
import { isPreview } from '@/server/env';

type Social = { facebook_url?: string; youtube_url?: string; linkedin_url?: string };

export function SiteHeader({ signedIn, features }: { signedIn: boolean; features: Record<string, any> }) {
  const items = [
    { href: '/about', label: 'About' },
    { href: '/events', label: 'Events' },
    { href: '/insights', label: 'Insights' },
    { href: '/reels', label: 'Reels' },
    { href: '/wings', label: 'Wings' },
    ...(features.members_directory !== false ? [{ href: '/members', label: 'Members' }] : []),
    { href: '/contact', label: 'Contact' },
  ];
  return (
    <>
      <HeaderShell>
        <Link href="/" className="flex items-center gap-2.5 font-display font-bold tracking-tight text-[1.12rem]" aria-label="BAUBC home">
          <LogoTile size={38} /> <span>BAUBC</span>
        </Link>
        <NavLinks items={items} />
        <div className="flex items-center gap-1.5">
          <Link href={signedIn ? '/app' : '/login'} className="btn btn-ghost btn-sm hidden sm:inline-flex">{signedIn ? 'My workspace' : 'Sign in'}</Link>
          <Link href="/join" className="btn btn-primary btn-sm">Join <Arrow size={12} /></Link>
          <MobileMenu items={[{ href: '/', label: 'Home' }, ...items]} signedIn={signedIn} />
        </div>
      </HeaderShell>
      <RevealObserver />
    </>
  );
}

export function SiteFooter({ club, social }: { club: Record<string, any>; social: Social }) {
  const col = (title: string, links: [string, string][]) => (
    <div className="grid gap-2.5 content-start">
      <p className="label text-lime-200">{title}</p>
      {links.map(([href, label]) => <Link key={href} href={href} className="text-white/85 hover:text-lime-200 transition-colors w-max">{label}</Link>)}
    </div>
  );
  return (
    <footer className="relative canopy on-canopy mt-28 overflow-hidden isolate">
      <div className="absolute inset-0 -z-10 pat-rays-light" aria-hidden="true" />
      <Mark size="62rem" className="pointer-events-none absolute -right-52 -bottom-72 -z-10 text-white/[.07]" />
      <div className="wrap pt-20 pb-12 grid gap-14">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] items-end">
          <p className="display text-[clamp(2.6rem,1.4rem+5vw,5.6rem)] max-w-[11ch]">Plant ideas. <span className="serif-i text-lime-200">Harvest</span> founders.</p>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link href="/join" className="btn btn-lime btn-lg">Join the club <Arrow /></Link>
            <Link href="/contact" className="btn btn-ghost btn-lg">Partner with us</Link>
          </div>
        </div>
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] border-t border-white/15 pt-10">
          <div className="grid gap-4 content-start">
            <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-white text-brand"><Mark size={30} /></span><span className="display-md text-2xl">BAUBC</span></div>
            <p className="text-canopy-muted max-w-sm text-sm">{club.name}. A student organisation of Bangladesh Agricultural University, Mymensingh 2202.</p>
            <p className="font-mono text-sm">{club.email}</p>
          </div>
          {col('The club', [['/about', 'About'], ['/wings', 'Wings'], ['/advisors', 'Advisors'], ['/members', 'Members'], ['/join', 'Join BAUBC']])}
          {col('Explore', [['/events', 'Events'], ['/insights', 'Insights'], ['/reels', 'Reels'], ['/gallery', 'Gallery'], ['/resources', 'Resources'], ['/verify', 'Verify a certificate']])}
          <div className="grid gap-2.5 content-start">
            <p className="label text-lime-200">Follow</p>
            {([['Facebook', social.facebook_url], ['YouTube', social.youtube_url], ['LinkedIn', social.linkedin_url]] as const).filter(([, u]) => u).map(([n, u]) => (
              <a key={n} href={u} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-2 text-white/85 hover:text-lime-200 transition-colors w-max">{n}<Arrow size={11} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></a>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-3 text-xs text-canopy-muted">
          <span className="inline-flex items-center gap-2"><Diamond size={7} className="text-lime-300" />© {new Date().getFullYear()} Bangladesh Agricultural University Business Club</span>
          <span className="flex gap-5"><Link href="/privacy" className="hover:text-lime-200">Privacy</Link><Link href="/login" className="hover:text-lime-200">Sign in</Link></span>
        </div>
      </div>
      {isPreview && <div className="fixed left-3 bottom-3 z-40 glass-strong rounded-full px-3 py-1.5 text-[11px] font-semibold text-ink no-print flex items-center gap-2"><Diamond size={7} className="text-harvest" />Preview mode · sample data · <a href="/login" className="underline">try a role</a></div>}
    </footer>
  );
}
