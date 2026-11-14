import type { Metadata } from 'next';
import { asSystem } from '@/server/db';
import { sha256 } from '@/server/crypto';
import { isPreview } from '@/server/env';
import { ActionForm, SubmitButton } from '@/components/ui/forms';
import { activateAccount } from '@/app/actions/auth';

export const metadata: Metadata = { title: 'Activate your account', robots: { index: false } };

export default async function ActivatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const prov = await asSystem(async (tx) => (await tx.one(`select app.lookup_provision($1) p`, [sha256(token)]))?.p);
  if (!prov) return <div className="grid gap-3"><h1 className="display-md text-4xl">Link expired</h1><p className="text-ink-2">This activation link has expired or was already used. Ask the BAUBC team for a new one at businessclub@bau.edu.bd.</p></div>;
  return (
    <div className="grid gap-6">
      <div className="grid gap-2"><span className="label text-green">Activate</span><h1 className="display-md text-4xl">Welcome, {prov.full_name.split(' ')[0]}</h1>
        <p className="text-ink-2">Set your own password for <b>{prov.email}</b>. BAUBC never asks for your password by email or form.</p></div>
      <ActionForm action={activateAccount} className="grid gap-4">
        <input type="hidden" name="token" value={token} />
        {isPreview ? <p className="hint">Preview mode: no password is needed; you will be signed in directly.</p> : (<>
          <div className="field"><label htmlFor="pw">New password</label><input id="pw" name="password" type="password" className="input" minLength={10} required autoComplete="new-password" /><span className="hint">At least 10 characters. Paste from a password manager is fine.</span></div>
          <div className="field"><label htmlFor="pw2">Repeat password</label><input id="pw2" name="confirm" type="password" className="input" minLength={10} required autoComplete="new-password" /></div>
        </>)}
        <SubmitButton pendingText="Activating…">Activate my account</SubmitButton>
      </ActionForm>
    </div>
  );
}
