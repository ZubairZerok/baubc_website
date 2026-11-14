import { notFound } from 'next/navigation';
import Link from 'next/link';
import { withClaims } from '@/server/db';
import { requireSession } from '@/server/session';
import { env } from '@/server/env';
import { QR } from '@/components/ui/QR';
import { LogoMark } from '@/components/ui/Logo';
import { LedgerStamp } from '@/components/ui/Stamp';
import { fmtDate } from '@/lib/format';
import { PrintButton } from '../../PrintButton';

export const metadata = { title: 'Certificate', robots: { index: false } };

export default async function CertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const session = await requireSession(`/print/certificate/${code}`);
  const c = await withClaims(session.claims, (tx) => tx.one(`select * from app.issued_documents where verification_code = $1`, [code.toUpperCase()]));
  if (!c) notFound();
  const url = `${env.siteUrl}/verify/${c.verification_code}`;
  return (
    <div className="grid gap-4 justify-items-center px-4">
      <div className="no-print flex gap-3"><Link href="/app/record" className="btn btn-ghost">Back</Link><PrintButton /></div>
      <article className="relative w-full max-w-[1000px] aspect-[1.414/1] bg-[#FBFAF4] text-[#151913] shadow-[var(--shadow)] print:shadow-none overflow-hidden" style={{ colorScheme: 'light' }}>
        <svg viewBox="0 0 100 70" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
          {Array.from({ length: 16 }, (_, i) => <path key={i} d={`M0 ${50 + i * 1.6} C 30 ${46 + i * 1.6}, 60 ${54 + i * 1.6}, 100 ${40 + i * 1.2 - (i > 10 ? (i - 10) * 1.4 : 0)}`} stroke={i === 12 ? '#9BC531' : 'rgba(15,58,39,.16)'} strokeWidth={i === 12 ? 0.35 : 0.18} fill="none" />)}
        </svg>
        <div className="absolute inset-[3%] border border-[#0F3A27]/40" />
        <div className="relative h-full grid grid-rows-[auto_1fr_auto] p-[6%] gap-4">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3"><LogoMark size={44} /><div className="grid leading-tight"><b className="font-display text-xl">BAUBC</b><span className="text-[11px] tracking-wide uppercase text-[#6B6A5C]">Bangladesh Agricultural University Business Club</span></div></div>
            <span className="font-mono text-xs tracking-widest text-[#6B6A5C]">{c.serial_no}</span>
          </header>
          <div className="grid content-center gap-3 text-center justify-items-center">
            <span className="label text-[#0B7A4B]">{c.subtitle}</span>
            <p className="text-[#6B6A5C]">This certifies that</p>
            <h1 className="serif-i text-[clamp(2.2rem,5vw,4.4rem)] leading-none">{c.recipient_name}</h1>
            <p className="text-[#6B6A5C] max-w-[60ch]">{c.kind === 'participation' ? 'participated in' : c.kind === 'membership' ? 'is a member of BAUBC.' : 'is recognised for'}</p>
            <p className="display-md text-[clamp(1.4rem,3vw,2.4rem)] max-w-[24ch]">{c.title}</p>
          </div>
          <footer className="flex items-end justify-between gap-6">
            <div className="grid gap-1 text-sm"><span className="text-[#6B6A5C]">Issued {fmtDate(c.issued_at)}</span><span className="text-[#6B6A5C]">Verify at {url.replace(/^https?:\/\//, '')}</span>{c.revoked_at && <b className="text-[#C2412D]">REVOKED</b>}</div>
            <LedgerStamp size={84} year={new Date(c.issued_at).getFullYear()} />
            <QR value={url} size={110} />
          </footer>
        </div>
      </article>
    </div>
  );
}
