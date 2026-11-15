'use client';
import { useActionState } from 'react';
import { SubmitButton } from '@/components/ui/forms';
import { CopyButton } from '@/components/site/client';
import { setupAdmins } from '@/app/actions/setup';

export function SetupForm() {
  const [state, action] = useActionState(setupAdmins, null);
  if (state?.ok && state.data) {
    return (
      <div className="grid gap-4">
        <div className="grid gap-2"><span className="eyebrow">Done</span><h1 className="display-md text-4xl">The club has its two keys.</h1>
          <p className="text-ink-2 text-sm">{state.data.emailed ? 'Each person has been emailed their link. They are also shown here once, in case an email goes missing.' : 'Email is not connected yet, so copy each link and send it to that person privately. They are shown only once.'} A link works one time, for 72 hours.</p></div>
        {state.data.links.map((l: any) => (
          <div key={l.email} className="rounded-2xl bg-white/70 border border-white p-3.5 grid gap-2">
            <div className="grid leading-tight"><b>{l.name}</b><span className="text-xs text-muted">{l.email}</span></div>
            <code className="text-xs break-all bg-lime-50 rounded-lg p-2">{l.url}</code>
            <CopyButton value={l.url} label="Copy link" />
          </div>
        ))}
        <p className="hint">After activating, each Super Admin turns on two-step verification from Profile. Then delete SETUP_TOKEN from the hosting environment.</p>
      </div>
    );
  }
  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-2"><span className="eyebrow">First run</span><h1 className="display-md text-4xl">Name the two Super Admins.</h1>
        <p className="text-ink-2 text-sm">This page works once. The club always has exactly two Super Admins, so that no single person can approve their own request.</p></div>
      {[1, 2].map((i) => (
        <fieldset key={i} className="grid sm:grid-cols-2 gap-3">
          <legend className="label text-muted mb-1.5">Super Admin {i}</legend>
          <div className="field"><label htmlFor={`n${i}`}>Full name</label><input id={`n${i}`} name={`name${i}`} className="input" required autoComplete="off" /></div>
          <div className="field"><label htmlFor={`e${i}`}>Email</label><input id={`e${i}`} name={`email${i}`} type="email" className="input" required autoComplete="off" /></div>
        </fieldset>
      ))}
      <div className="field"><label htmlFor="st">Setup code</label><input id="st" name="setup_token" type="password" className="input font-mono" required autoComplete="off" /><span className="hint">The SETUP_TOKEN value you saved in the hosting environment.</span></div>
      <SubmitButton className="btn btn-primary btn-lg" pendingText="Creating…">Create both and get their links</SubmitButton>
      {state?.message && !state.ok && <p role="alert" className="text-sm text-soil">{state.message}</p>}
    </form>
  );
}
