import type { Metadata } from 'next';
import { PageHero } from '@/components/site/bits';
import { getSettings } from '@/server/queries/public';

export const metadata: Metadata = { title: 'Privacy notice' };

export default async function PrivacyPage() {
  const { club } = await getSettings();
  const s = [
    ['Who we are', `${club.name} (BAUBC), a student organisation of Bangladesh Agricultural University, Mymensingh. Contact: ${club.email}.`],
    ['What we collect', 'Application details (name, student ID, department, session, email, optional phone, optional social profile links, interests and skills), event registrations, task submissions, verified achievements and payment claims (bKash Transaction ID and the last 4 digits of the sending number). We do not collect national ID numbers, passwords through forms, or bKash PINs.'],
    ['Why', 'To run membership, events, tasks and recognition; to issue certificates; to keep financial records accountable; and to contact you about things you signed up for.'],
    ['Who can see it', 'Access is limited by role. Public pages show only what you choose to make public. Phone numbers and personal emails are never public.'],
    ['Where it is stored', 'On managed cloud services (database in Singapore, email delivery provider). Data is encrypted in transit. This is being reviewed under the Personal Data Protection Act, 2026.'],
    ['How long', 'Applications that were not selected are anonymised after 24 months. Financial and audit records are kept for at least five years. Other data is kept while you are a member or alumnus, unless you ask us to delete it where the law allows.'],
    ['Your choices', 'You can download your data, request corrections to verified fields, withdraw consent for public listing or photos, and ask for deletion. Email us to make a request.'],
  ];
  return (
    <>
      <PageHero label="Privacy notice · version 2026-11" title={<>Your data, <span className="serif-i">handled carefully</span></>} bn="গোপনীয়তা নোটিশ">This notice explains what BAUBC collects and why. It is subject to review by the club&apos;s advisors and legal counsel.</PageHero>
      <div className="wrap py-12 grid gap-6 max-w-3xl">
        {s.map(([h, b]) => <section key={h} className="grid gap-2 border-b border-line pb-6"><h2 className="heading text-xl">{h}</h2><p className="text-ink-2">{b}</p></section>)}
      </div>
    </>
  );
}
