import type { Metadata } from 'next';
import { PageHero } from '@/components/site/bits';
import { verifyLookupAction } from '@/app/actions/public';

export const metadata: Metadata = { title: 'Verify a certificate' };

export default function VerifyPage() {
  return (
    <>
      <PageHero label="Verification" title={<>Verify a <span className="serif-i">certificate</span></>} bn="সনদ যাচাই">Every BAUBC certificate has a serial number and a verification code. Scan the QR on the certificate or enter the code here.</PageHero>
      <div className="wrap py-12 max-w-2xl">
        <form action={verifyLookupAction} className="panel grid gap-3">
          <div className="field"><label htmlFor="code">Verification code or serial number</label><input id="code" name="code" className="input font-mono uppercase" required placeholder="e.g. BAUBC-CERT-2027-000123" /></div>
          <button className="btn btn-primary w-max">Verify</button>
        </form>
      </div>
    </>
  );
}
