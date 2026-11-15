import type { Metadata } from 'next';
import { PageHero } from '@/components/site/bits';
import { getSettings } from '@/server/queries/public';

export const metadata: Metadata = { title: 'Privacy notice' };

export default async function PrivacyPage() {
  const { club } = await getSettings();
  const s = [
    ['Who we are', `${club.name} (BAUBC), a student organisation of Bangladesh Agricultural University, Mymensingh. Contact: ${club.email}.`],
    ['What we collect', 'Application details (name, student ID, department, session, email, optional phone, optional social profile link, interests and skills), event registrations, task submissions, verified achievements and payment claims (the bKash Transaction ID and the last four digits of the sending number). We do not collect national ID numbers, passwords through forms, or bKash PINs.'],
    ['Why', 'To run membership, events, tasks and recognition; to issue certificates; to keep financial records accountable; and to contact you about things you signed up for.'],
    ['Who can see it', 'Access is limited by role. Public pages show only what you choose to make public. Phone numbers and personal emails are never public.'],
    ['Where it is stored', 'On managed cloud services outside Bangladesh (a database provider and an email delivery provider). Data is encrypted in transit. This arrangement is being reviewed under the Personal Data Protection Act, 2026.'],
    ['How long', 'Applications that were not selected are anonymised after 24 months. Financial and audit records are kept for at least five years. Other data is kept while you are a member or alumnus, unless you ask us to delete it where the law allows.'],
    ['Your choices', 'From your profile you can download your data, ask for corrections to verified fields, withdraw consent for public listing, and request deletion. You can also email us.'],
  ];
  return (
    <>
      <PageHero label="Privacy notice · version 2026-11" title={<>Your data, <em className="serif-i text-brand">handled with care.</em></>}>What BAUBC collects and why. This notice is subject to review by the club&apos;s advisors and legal counsel.</PageHero>
      <div className="wrap py-14 grid gap-4 max-w-3xl">
        {s.map(([h, b], i) => <section key={h} className="panel grid grid-cols-[auto_1fr] gap-4 reveal"><span className="grid size-9 place-items-center bg-lime-200 text-brand font-bold diamond-clip text-xs">{i + 1}</span><div className="grid gap-1.5"><h2 className="heading text-xl">{h}</h2><p className="text-ink-2">{b}</p></div></section>)}
      </div>
    </>
  );
}
