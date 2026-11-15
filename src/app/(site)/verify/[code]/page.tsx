import type { Metadata } from 'next';
import Link from 'next/link';
import { withClaims } from '@/server/db';
import { rateLimit } from '@/server/ratelimit';
import { LedgerStamp } from '@/components/ui/Stamp';
import { Mark } from '@/components/brand/Mark';
import { fmtDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Certificate verification', robots: { index: false } };

export default async function VerifyCodePage({ params }: { params: Promise<{ code: string }> }) {
  const code = decodeURIComponent((await params).code).toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 40);
  const allowed = await rateLimit('verify', 10, 60_000);
  const doc = allowed ? await withClaims(null, (tx) => tx.one(`select * from app.verify_document($1)`, [code])) : undefined;
  return (
    <section className="relative isolate overflow-hidden lime-wash min-h-[78vh]">
      <div className="absolute inset-0 -z-10 pat-diamonds opacity-60" aria-hidden="true" />
      <div className="wrap pt-36 md:pt-44 pb-16 max-w-2xl grid gap-6">
        <Link href="/verify" className="tag w-max hover:bg-white">← Verify another</Link>
        {!allowed ? <div className="panel">Too many lookups. Please wait a minute and try again.</div>
          : !doc ? (
            <div className="panel grid gap-2 !border-soil"><h1 className="display-md text-3xl">No certificate found</h1><p className="text-ink-2">Check the code for typos. If a certificate looks official but is not found here, BAUBC did not issue it.</p></div>
          ) : (
            <div className={`relative isolate overflow-hidden glass-strong rounded-[28px] p-7 md:p-9 grid gap-6 ${doc.status === 'valid' ? '' : '!border-soil'}`}>
              <Mark size="24rem" className="pointer-events-none absolute -right-24 -bottom-28 -z-10 text-brand/[.06]" />
              <div className="flex items-start justify-between gap-4">
                <div className="grid gap-2"><span className="eyebrow">{doc.subtitle}</span><h1 className="display-md text-[clamp(1.8rem,1.4rem+1.6vw,2.6rem)]">{doc.title}</h1></div>
                {doc.status === 'valid' ? <LedgerStamp size={76} year={new Date(doc.issued_at).getFullYear()} className="stamp-in" /> : <span className="chip chip-bad">Revoked</span>}
              </div>
              <dl className="grid gap-0">
                {[['Issued to', doc.recipient_name], ['Serial', doc.serial_no], ['Issued', fmtDate(doc.issued_at, { day: 'numeric', month: 'long', year: 'numeric' })], ['Issued by', 'Bangladesh Agricultural University Business Club'],
                  ['Status', doc.status === 'valid' ? 'Valid' : `Revoked on ${fmtDate(doc.revoked_at)}`]].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-6 py-3 border-b border-line last:border-0"><dt className="text-muted">{k}</dt><dd className="font-semibold text-right">{v}</dd></div>
                ))}
              </dl>
              <p className="hint">This page shows only what is needed to confirm the certificate is real.</p>
            </div>
          )}
      </div>
    </section>
  );
}
