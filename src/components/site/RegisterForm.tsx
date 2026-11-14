'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ActionForm, SubmitButton } from '@/components/ui/forms';
import { registerAction, waitlistAction } from '@/app/actions/public';

type T = { ticket_type_id: string; name: string; description: string | null; audience: string; unit: string; price: string; seats_left: number; sales_open: boolean; waitlist_enabled: boolean };

export function RegisterForm({ tickets, signedIn, isMember, defaultName, defaultEmail }: { tickets: T[]; signedIn: boolean; isMember: boolean; defaultName?: string; defaultEmail?: string }) {
  const open = tickets.filter((t) => t.sales_open);
  const [sel, setSel] = useState(open.find((t) => t.seats_left > 0)?.ticket_type_id ?? open[0]?.ticket_type_id);
  const ticket = useMemo(() => open.find((t) => t.ticket_type_id === sel), [open, sel]);
  const [idem] = useState(() => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Math.random())));
  if (!open.length) return <p className="text-muted">Registration is not open yet. Follow BAUBC on Facebook for the opening date.</p>;
  const membersOnly = ticket?.audience === 'members' && !isMember;
  const soldOut = (ticket?.seats_left ?? 0) <= 0;

  return (
    <div className="grid gap-5">
      <fieldset className="grid gap-2">
        <legend className="field-label mb-1">Choose a ticket</legend>
        {open.map((t) => (
          <label key={t.ticket_type_id} className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-colors ${sel === t.ticket_type_id ? 'border-link bg-paper-2' : 'border-line hover:border-line-strong'}`}>
            <input type="radio" name="tt" className="mt-1 accent-[var(--brand)]" checked={sel === t.ticket_type_id} onChange={() => setSel(t.ticket_type_id)} />
            <span className="grid gap-0.5 flex-1">
              <span className="flex justify-between gap-3 font-semibold"><span>{t.name}</span><span className="tnum">{Number(t.price) === 0 ? 'Free' : `৳ ${Number(t.price).toLocaleString('en-IN')}`}</span></span>
              {t.description && <span className="text-sm text-muted">{t.description}</span>}
              <span className="text-xs text-muted">{t.seats_left > 0 ? `${t.seats_left} left` : 'Sold out'}{t.audience === 'members' ? ' · members only' : ''}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {membersOnly ? (
        <p className="text-sm">This ticket is for active BAUBC members. <Link href="/login" className="text-link underline">Sign in</Link> or <Link href="/join" className="text-link underline">join the club</Link>.</p>
      ) : soldOut ? (
        ticket?.waitlist_enabled ? (
          <ActionForm action={waitlistAction} className="grid gap-3">
            <input type="hidden" name="ticket_type_id" value={ticket.ticket_type_id} />
            <p className="text-sm text-ink-2">This ticket is sold out. Join the waitlist: when a seat frees up we hold it for you for 12 hours and email you.</p>
            {!signedIn && <div className="grid sm:grid-cols-2 gap-3">
              <div className="field"><label htmlFor="wl-name">Name</label><input id="wl-name" name="name" className="input" required /></div>
              <div className="field"><label htmlFor="wl-email">Email</label><input id="wl-email" name="email" type="email" className="input" required /></div>
            </div>}
            <SubmitButton className="btn btn-secondary">Join the waitlist</SubmitButton>
          </ActionForm>
        ) : <p className="text-muted">Sold out.</p>
      ) : (
        <ActionForm action={registerAction} className="grid gap-4">
          <input type="hidden" name="ticket_type_id" value={ticket?.ticket_type_id} />
          <input type="hidden" name="idem" value={`${idem}:${ticket?.ticket_type_id}`} />
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="field"><label htmlFor="r-name">Full name</label><input id="r-name" name="name" className="input" required defaultValue={defaultName} autoComplete="name" /></div>
            <div className="field"><label htmlFor="r-email">Email</label><input id="r-email" name="email" type="email" className="input" required defaultValue={defaultEmail} readOnly={signedIn} autoComplete="email" /><span className="hint">Your ticket and payment link go here.</span></div>
            <div className="field"><label htmlFor="r-phone">Phone <span className="text-muted font-normal">(optional)</span></label><input id="r-phone" name="phone" className="input" inputMode="tel" autoComplete="tel" /></div>
            <div className="field"><label htmlFor="r-inst">University / organisation</label><input id="r-inst" name="institution" className="input" placeholder="e.g. Bangladesh Agricultural University" /></div>
          </div>
          {ticket?.unit === 'team' && (
            <div className="grid gap-3 rounded-xl border border-line p-4">
              <div className="field"><label htmlFor="r-team">Team name</label><input id="r-team" name="team_name" className="input" required /></div>
              <div className="field"><label htmlFor="r-members">Other team members</label>
                <textarea id="r-members" name="team_members" className="textarea" placeholder={'One per line: Name, email\nNusrat Jahan, nusrat@example.com'} />
                <span className="hint">You are the team captain. List everyone else, one per line.</span></div>
            </div>
          )}
          <label className="check"><input type="checkbox" name="consent" required /> <span>I agree to the <Link href="/privacy" className="underline text-link" target="_blank">privacy notice</Link>: my details are used to run this event.</span></label>
          <label className="check"><input type="checkbox" name="photo_consent" /> <span>I am happy to appear in event photos published by BAUBC.</span></label>
          <SubmitButton pendingText="Holding your seat…">{Number(ticket?.price ?? 0) > 0 ? 'Hold my seat and pay' : 'Register'}</SubmitButton>
          {Number(ticket?.price ?? 0) > 0 && <p className="hint">Your seat is held while you pay with bKash Send Money and submit the Transaction ID. Nothing is charged here.</p>}
        </ActionForm>
      )}
    </div>
  );
}
