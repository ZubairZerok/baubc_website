import Link from 'next/link';
import { LogoTile, Mark } from '@/components/brand/Mark';

export const dynamic = 'force-dynamic';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh isolate overflow-hidden flex flex-col">
      <div className="hero-mesh -z-10" aria-hidden="true"><i /><i /><i /><i /></div>
      <Mark size="64rem" className="pointer-events-none absolute -right-72 -bottom-72 -z-10 text-white/55" />
      <header className="wrap pt-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-display font-bold text-[1.12rem]"><LogoTile size={38} />BAUBC</Link>
        <Link href="/" className="btn btn-secondary btn-sm">Back to the site</Link>
      </header>
      <main className="flex-1 grid place-items-center px-4 py-10">
        <div className="glass-strong rounded-[30px] w-full max-w-[520px] p-7 sm:p-9 page-enter">{children}</div>
      </main>
      <p className="wrap pb-6 text-center text-xs text-ink-2">Accounts are created by BAUBC from applications and invitations. Nobody can sign themselves up.</p>
    </div>
  );
}
