import type { Metadata } from 'next';
import Link from 'next/link';
import { asSystem } from '@/server/db';
import { isPreview } from '@/server/env';
import { SetupForm } from './SetupForm';

export const metadata: Metadata = { title: 'First-run setup', robots: { index: false } };

export default async function SetupPage() {
  const needs = isPreview ? false : await asSystem(async (tx) => !!(await tx.one(`select app.needs_setup() v`))?.v).catch(() => false);
  if (!needs) {
    return (
      <div className="grid gap-3">
        <span className="eyebrow">Setup</span><h1 className="display-md text-4xl">{isPreview ? 'Not needed in preview.' : 'Already set up.'}</h1>
        <p className="text-ink-2 text-sm">{isPreview ? 'The preview runs on sample people. Connect the live database to create the real Super Admins.' : 'The Super Admins exist. New people are added from People & roles inside the workspace.'}</p>
        <Link href="/login" className="btn btn-primary justify-self-start">Go to sign in</Link>
      </div>
    );
  }
  return <SetupForm />;
}
