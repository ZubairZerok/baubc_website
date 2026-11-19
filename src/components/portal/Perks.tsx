'use client';
import { useActionState, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFormStatus } from 'react-dom';
import { claimPerkAction } from '@/app/actions/portal';
import type { ActionResult } from '@/components/ui/forms';
import { ACCENTS, PerkIcon } from './perk-icons';

type Perk = { id: string; title: string; partner: string; description: string; terms: string | null; category: string | null; icon: string; accent: string; mode: string; min_points: number; ends_at: string | null; mine: string | null };

function ClaimButton({ locked, label }: { locked: boolean; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={locked || pending} className="perk-btn" aria-live="polite">
      <span>{pending ? 'Claiming…' : label}</span>
    </button>
  );
}

export function PerkCard({ p, points, i }: { p: Perk; points: number; i: number }) {
  const [state, action] = useActionState<ActionResult, FormData>(claimPerkAction, null);
  const value = p.mine ?? (state?.ok ? (state.data?.value as string) : null);
  const [burst, setBurst] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (state?.ok) { setBurst(true); const t = setTimeout(() => setBurst(false), 1100); return () => clearTimeout(t); } }, [state]);
  const locked = points < p.min_points;
  const a = ACCENTS[p.accent] ?? ACCENTS.lime;
  return (
    <article className="perk glass reveal" style={{ ['--d' as any]: i % 4 }}>
      <div className="perk-tile" style={{ background: a.tile }}><PerkIcon icon={p.icon} accent={p.accent} size={48} /></div>
      <p className="label text-muted mt-7">{p.category ?? p.partner}</p>
      <h2 className="display-md text-[2rem] leading-[1.05] mt-1.5">{p.title}</h2>
      <p className="text-ink-2 mt-2">{p.description}</p>
      <p className="text-xs text-muted mt-2">{p.partner}{p.ends_at ? ` · until ${new Date(p.ends_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}{p.terms ? ` · ${p.terms}` : ''}</p>
      <div className="mt-auto pt-6 grid gap-3">
        {value && (
          <div className="perk-code">
            <span className="label text-muted">{p.mode === 'link' ? 'Your link' : 'Your code'}</span>
            {p.mode === 'link'
              ? <a href={value} target="_blank" rel="noopener noreferrer" className="font-mono text-sm break-all underline text-brand">{value}</a>
              : <button type="button" className="font-mono text-[1.05rem] font-semibold break-all text-left" onClick={async () => { try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* clipboard blocked */ } }}>{value} <span className="text-xs text-muted font-sans font-medium">{copied ? 'Copied' : 'Tap to copy'}</span></button>}
          </div>
        )}
        {value ? (
          <div className="perk-btn is-done" role="status"><span>Claimed ✓</span></div>
        ) : (
          <form action={action}><input type="hidden" name="perk_id" value={p.id} /><ClaimButton locked={locked} label={locked ? `Needs ${p.min_points} verified points` : 'Claim perk'} /></form>
        )}
        {state && !state.ok && <p role="alert" className="text-sm text-soil">{state.message}</p>}
      </div>
      {burst && <span className="perk-burst" aria-hidden="true">{Array.from({ length: 14 }, (_, k) => <i key={k} style={{ ['--k' as any]: k }} />)}</span>}
      {state?.ok && typeof document !== 'undefined' && createPortal(<div className="perk-toast" role="status"><b>✓</b>{p.title} {p.mode === 'link' ? 'link' : 'code'} delivered to your account</div>, document.body)}
    </article>
  );
}
