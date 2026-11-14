import Link from 'next/link';
import { LogoMark } from '@/components/ui/Logo';
import { FurrowCanvas } from '@/components/site/client';

export const dynamic = 'force-dynamic';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh grid lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden lg:flex canopy on-canopy isolate overflow-hidden p-10 flex-col justify-between">
        <FurrowCanvas className="-z-10 opacity-80" />
        <Link href="/" className="flex items-center gap-3 font-display font-bold text-xl"><LogoMark size={36} />BAUBC</Link>
        <div className="grid gap-4 max-w-md">
          <p className="display text-6xl">Grow founders <span className="serif-i text-signal">from the field.</span></p>
          <p className="text-canopy-muted">Accounts are created by BAUBC from applications and invitations. No one can sign themselves up.</p>
        </div>
      </aside>
      <main className="flex flex-col p-5 sm:p-10">
        <Link href="/" className="lg:hidden flex items-center gap-2 font-display font-bold mb-8"><LogoMark />BAUBC</Link>
        <div className="my-auto w-full max-w-md mx-auto">{children}</div>
      </main>
    </div>
  );
}
