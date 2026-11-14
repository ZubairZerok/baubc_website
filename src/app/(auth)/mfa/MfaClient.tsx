'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export function MfaClient({ url, anonKey, next }: { url: string; anonKey: string; next: string }) {
  const [sb] = useState(() => createBrowserClient(url, anonKey));
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await sb.auth.mfa.listFactors();
      const verified = data?.totp?.find((f) => f.status === 'verified');
      if (verified) { setFactorId(verified.id); return; }
      const { data: en, error } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: `BAUBC ${new Date().toISOString().slice(0, 10)}` });
      if (error) { setMsg(error.message); return; }
      setFactorId(en.id); setQr(en.totp.qr_code); setSecret(en.totp.secret);
    })();
  }, [sb]);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault(); if (!factorId) return; setBusy(true); setMsg('');
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    setBusy(false);
    if (error) { setMsg('That code did not work. Check the time on your phone and try again.'); return; }
    window.location.href = next;
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-2"><span className="label text-green">Security</span><h1 className="display-md text-4xl">Two-step verification</h1>
        <p className="text-ink-2">{qr ? 'Your role handles money or decisions, so it needs an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…). Scan the code, then enter the 6-digit number.' : 'Enter the 6-digit code from your authenticator app.'}</p></div>
      {qr && <div className="panel grid justify-items-center gap-3"><img src={qr} alt="Authenticator QR code" width={200} height={200} className="bg-white rounded-lg p-2" />{secret && <p className="text-xs text-muted">Or enter this key: <span className="font-mono">{secret}</span></p>}</div>}
      <form onSubmit={verify} className="grid gap-4">
        <div className="field"><label htmlFor="code">6-digit code</label><input id="code" value={code} onChange={(e) => setCode(e.target.value)} className="input font-mono text-2xl tracking-[.4em] text-center" inputMode="numeric" pattern="\d{6}" maxLength={6} required autoComplete="one-time-code" /></div>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Verifying…' : 'Verify'}</button>
        {msg && <p className="text-soil text-sm" role="status">{msg}</p>}
      </form>
    </div>
  );
}
