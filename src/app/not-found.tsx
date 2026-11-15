import Link from 'next/link';
import { Arrow, Mark } from '@/components/brand/Mark';

export default function NotFound() {
  return (
    <main className="relative min-h-dvh isolate overflow-hidden grid place-items-center">
      <div className="hero-mesh -z-10" aria-hidden="true"><i /><i /><i /><i /></div>
      <Mark size="70rem" className="pointer-events-none absolute -right-72 -bottom-72 -z-10 text-white/50" />
      <div className="wrap text-center grid gap-6 justify-items-center py-24">
        <span className="tag"><i>404</i>Off the map</span>
        <h1 className="display text-[clamp(3.2rem,2rem+6vw,7rem)] max-w-[12ch]">This ray leads <em className="serif-i text-brand">nowhere.</em></h1>
        <p className="text-ink-2 max-w-md text-lg">The page you are looking for does not exist, or it has moved.</p>
        <div className="flex flex-wrap justify-center gap-3"><Link href="/" className="btn btn-primary btn-lg">Back to home <Arrow /></Link><Link href="/events" className="btn btn-secondary btn-lg">See events</Link></div>
      </div>
    </main>
  );
}
