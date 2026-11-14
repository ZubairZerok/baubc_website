import type { Metadata } from 'next';
import Link from 'next/link';
import { withClaims } from '@/server/db';
import { rateLimit } from '@/server/ratelimit';
import { LedgerStamp } from '@/components/ui/Stamp';
import { fmtDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Certificate verification', robots: { index: false } };

export default async function VerifyCodePage({ params }: { params: Promise<{ code: string }> }) {
  const code = decodeURIComponent((await params).code).toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 40);
  const allowed = await rateLimit('verify', 10, 60_000);
  const doc = allowed ? await withClaims(null, (tx) => tx.one(`select * from app.verify_document($1)`, [code])) : undefined;
  return (
    <div className="wrap py-16 max-w-2xl grid gap-6">
      <Link href="/verify" className="label text-muted hover:text-link w-max">← Verify another</Link>
      {!allowed ? <div className="panel">Too many lookups. Please wait a minute.</div>
        : !doc ? (
          <div className="panel grid gap-2 border-soil"><h1 className="heading text-2xl">No certificate found</h1><p className="text-ink-2">Check the code for typos. If the certificate looks official but is not found here, it was not issued by BAUBC.</p></div>
        ) : (
          <div className={`panel grid gap-5 ${doc.status === 'valid' ? '' : 'border-soil'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="grid gap-1"><span className="label text-muted">{doc.subtitle}</span><h1 className="heading text-3xl">{doc.title}</h1></div>
              {doc.status === 'valid' ? <LedgerStamp size={64} year={new Date(doc.issued_at).getFullYear()} className="stamp-in" /> : <span className="chip chip-bad">Revoked</span>}
            </div>
            <dl className="grid gap-0">
              {[['Issued to', doc.recipient_name], ['Serial', doc.serial_no], ['Issued', fmtDate(doc.issued_at)], ['Issued by', 'Bangladesh Agricultural University Business Club'],
                ['Status', doc.status === 'valid' ? 'Valid' : `Revoked on ${fmtDate(doc.revoked_at)}`]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-6 py-3 border-b border-line"><dt className="text-muted">{k}</dt><dd className="font-semibold text-right">{v}</dd></div>
              ))}
            </dl>
            <p className="hint">This page shows only what is needed to confirm authenticity.</p>
          </div>
        )}
    </div>
  );
}
