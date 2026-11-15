import type { Metadata } from 'next';
import { PageHero } from '@/components/site/bits';
import { verifyLookupAction } from '@/app/actions/public';

export const metadata: Metadata = { title: 'Verify a certificate' };

export default function VerifyPage() {
  return (
    <>
      <PageHero label="Verification" title={<>Check it <em className="serif-i text-brand">yourself.</em></>}>Every BAUBC certificate carries a serial number and a code. Scan the QR on the certificate, or type the code here.</PageHero>
      <div className="wrap py-14 max-w-2xl">
        <form action={verifyLookupAction} className="glass-strong rounded-[26px] p-7 grid gap-4">
          <div className="field"><label htmlFor="code">Verification code or serial number</label><input id="code" name="code" className="input font-mono uppercase" required placeholder="BAUBC-CERT-2027-000123" /></div>
          <button className="btn btn-primary btn-lg w-max">Verify</button>
        </form>
      </div>
    </>
  );
}
