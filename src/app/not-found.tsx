import Link from 'next/link';
import { Cover } from '@/components/site/bits';

export default function NotFound() {
  return (
    <main className="relative min-h-[70vh] canopy on-canopy isolate overflow-hidden grid place-items-center">
      <Cover tone="canopy" seed="404" className="absolute inset-0 -z-10" />
      <div className="wrap text-center grid gap-5 justify-items-center py-24">
        <span className="tag"><i>404</i>Off the field</span>
        <h1 className="display text-[clamp(3rem,2rem+5vw,6rem)]">This furrow <span className="serif-i text-signal">ends here.</span></h1>
        <p className="text-on-canopy/80 max-w-md">The page you are looking for does not exist or has moved.</p>
        <div className="flex gap-3"><Link href="/" className="btn btn-primary">Go home</Link><Link href="/events" className="btn btn-ghost">See events</Link></div>
      </div>
    </main>
  );
}
