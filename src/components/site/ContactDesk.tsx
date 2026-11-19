'use client';
import { startTransition, useActionState, useState } from 'react';
import { contactAction } from '@/app/actions/public';
import type { ActionResult } from '@/components/ui/forms';

type Sender = 'bau_student' | 'company' | 'other';
const WHO: { k: Sender; title: string; sub: string; icon: React.ReactNode }[] = [
  { k: 'bau_student', title: 'I study at BAU', sub: 'Questions, help with an idea, joining the club', icon: <path d="M3 9l9-5 9 5-9 5zM7 11.5V16c3 2.5 7 2.5 10 0v-4.5M21 9v6" /> },
  { k: 'company', title: 'Company or organisation', sub: 'Sponsorship, partnerships, hiring, talks', icon: <><path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M3 21h18" /><path d="M8 8h3M8 12h3M8 16h3" /></> },
  { k: 'other', title: 'Someone else', sub: 'Teachers, alumni, media, other clubs', icon: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></> },
];
const PURPOSES: Record<Sender, [string, string][]> = {
  bau_student: [['query', 'Ask a question'], ['help', 'Get help with an idea'], ['membership', 'Joining the club'], ['collaboration', 'Collaborate on a project']],
  company: [['collaboration', 'Collaborate'], ['sponsorship', 'Sponsor an event'], ['recruitment', 'Hire our members'], ['speaker', 'Give a talk'], ['query', 'Ask a question']],
  other: [['query', 'Ask a question'], ['collaboration', 'Collaborate'], ['media', 'Media or press'], ['speaker', 'Invite us to speak'], ['help', 'Need help']],
};

function Send({ pending }: { pending: boolean }) {
  return <button type="submit" disabled={pending} className="btn btn-primary btn-lg w-full sm:w-max"><span>{pending ? 'Sending…' : 'Send message'}</span></button>;
}

export function ContactDesk({ email }: { email: string }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(contactAction, null);
  const [who, setWho] = useState<Sender>('bau_student');
  const [purpose, setPurpose] = useState('query');
  const [channel, setChannel] = useState<'email' | 'phone' | 'whatsapp'>('email');
  const [len, setLen] = useState(0);

  if (state?.ok) {
    const ch = state.data?.channel ?? 'email';
    return (
      <div className="panel desk-done grid gap-6 justify-items-center text-center py-12" role="status">
        <span className="desk-check" aria-hidden="true"><svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
        <div className="grid gap-2"><h2 className="display-md text-[clamp(2rem,1.5rem+2vw,3rem)]">Message received.</h2><p className="text-ink-2 max-w-md">A person from the club reads every message. We reply {ch === 'email' ? 'by email' : ch === 'phone' ? 'with a phone call' : 'on WhatsApp'}, usually within two working days.</p></div>
        <div className="grid gap-1"><span className="label text-muted">Your reference</span><span className="font-mono text-[clamp(1.6rem,1.2rem+1.6vw,2.4rem)] font-bold tracking-wider text-brand">{state.data?.reference}</span><span className="text-sm text-muted">Quote it if you write again. A copy is on its way to your inbox.</span></div>
        <ol className="desk-steps">
          {['We read it', 'The right wing picks it up', 'You hear back'].map((t, i) => <li key={t} style={{ ['--i' as any]: i }}><b>{i + 1}</b>{t}</li>)}
        </ol>
      </div>
    );
  }

  return (
    // submitted by hand so a failed attempt never clears what the person typed
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => action(fd)); }} className="panel grid gap-8">
      <fieldset className="grid gap-3">
        <legend className="desk-legend"><span>1</span>Who are you?</legend>
        <div className="grid sm:grid-cols-3 gap-3">
          {WHO.map((w) => (
            <label key={w.k} className={`desk-card ${who === w.k ? 'is-on' : ''}`}>
              <input type="radio" name="sender_type" value={w.k} checked={who === w.k} onChange={() => { setWho(w.k); setPurpose(PURPOSES[w.k][0][0]); }} className="sr-only" />
              <span className="desk-icon"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{w.icon}</svg></span>
              <b className="heading text-[1.05rem]">{w.title}</b>
              <span className="text-sm text-muted">{w.sub}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="desk-legend"><span>2</span>What do you need?</legend>
        <div className="flex flex-wrap gap-2">
          {PURPOSES[who].map(([k, l]) => (
            <label key={k} className={`desk-chip ${purpose === k ? 'is-on' : ''}`}>
              <input type="radio" name="category" value={k} checked={purpose === k} onChange={() => setPurpose(k)} className="sr-only" />{l}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="desk-legend"><span>3</span>Tell us about it</legend>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="field"><label htmlFor="c-name">Your name</label><input id="c-name" name="name" className="input" required minLength={2} maxLength={120} autoComplete="name" /></div>
          <div className="field"><label htmlFor="c-email">Email</label><input id="c-email" name="email" type="email" className="input" required maxLength={200} autoComplete="email" /></div>
          {who === 'bau_student' && <>
            <div className="field desk-reveal"><label htmlFor="c-dept">Department <span className="text-muted font-normal">(optional)</span></label><input id="c-dept" name="student_department" className="input" maxLength={120} placeholder="Agricultural Economics" /></div>
            <div className="field desk-reveal"><label htmlFor="c-sess">Session <span className="text-muted font-normal">(optional)</span></label><input id="c-sess" name="student_session" className="input" maxLength={20} placeholder="2024-25" /></div>
          </>}
          {who === 'company' && <>
            <div className="field desk-reveal"><label htmlFor="c-org">Company or organisation</label><input id="c-org" name="organization" className="input" required maxLength={200} autoComplete="organization" /></div>
            <div className="field desk-reveal"><label htmlFor="c-role">Your role <span className="text-muted font-normal">(optional)</span></label><input id="c-role" name="role_title" className="input" maxLength={120} autoComplete="organization-title" placeholder="Partnerships lead" /></div>
            <div className="field desk-reveal sm:col-span-2"><label htmlFor="c-web">Website <span className="text-muted font-normal">(optional)</span></label><input id="c-web" name="website" className="input" maxLength={200} inputMode="url" placeholder="https://" /></div>
          </>}
          {who === 'other' && <div className="field desk-reveal sm:col-span-2"><label htmlFor="c-org2">Organisation <span className="text-muted font-normal">(optional)</span></label><input id="c-org2" name="organization" className="input" maxLength={200} autoComplete="organization" /></div>}
        </div>
        <div className="field"><label htmlFor="c-subj">Subject <span className="text-muted font-normal">(optional)</span></label><input id="c-subj" name="subject" className="input" maxLength={140} /></div>
        <div className="field"><label htmlFor="c-msg">Message</label>
          <textarea id="c-msg" name="message" className="textarea min-h-[160px]" required minLength={10} maxLength={4000} onChange={(e) => setLen(e.target.value.length)}
            placeholder={who === 'company' ? 'What you have in mind, timing, and who we should talk to.' : 'What you need and anything that helps us help you.'} />
          <span className={`hint text-right tnum ${len > 3800 ? '!text-soil' : ''}`}>{len} / 4000</span></div>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="desk-legend"><span>4</span>How should we reply?</legend>
        <div className="desk-seg" role="radiogroup" aria-label="Reply by">
          {(['email', 'phone', 'whatsapp'] as const).map((c) => (
            <label key={c} className={channel === c ? 'is-on' : ''}><input type="radio" name="preferred_channel" value={c} checked={channel === c} onChange={() => setChannel(c)} className="sr-only" />{c === 'email' ? 'Email' : c === 'phone' ? 'Call me' : 'WhatsApp'}</label>
          ))}
        </div>
        {channel !== 'email' && (
          <div className="grid sm:grid-cols-2 gap-4 desk-reveal">
            <div className="field"><label htmlFor="c-phone">Phone number</label><input id="c-phone" name="phone" type="tel" inputMode="tel" className="input" required pattern="\+?[0-9][0-9 \-]{6,19}" placeholder="01XXXXXXXXX" autoComplete="tel" /></div>
            <div className="field"><label htmlFor="c-when">Best time</label><select id="c-when" name="callback_window" className="select" defaultValue="Afternoon (12–5 pm)"><option>Morning (9 am–12)</option><option>Afternoon (12–5 pm)</option><option>Evening (5–9 pm)</option></select></div>
          </div>
        )}
      </fieldset>

      <input type="text" name="fax" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
        <p className="text-xs text-muted max-w-md">We use your details only to answer this message. Phone numbers are seen only by the team member who replies. Prefer email? Write to <span className="font-mono">{email}</span>.</p>
        <Send pending={pending} />
      </div>
      {state && !state.ok && <p role="alert" className="text-sm text-soil -mt-4">{state.message}</p>}
    </form>
  );
}
