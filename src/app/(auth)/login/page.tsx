import type { Metadata } from 'next';
import Link from 'next/link';
import { asSystem } from '@/server/db';
import { env, hasSupabaseAuth, isPreview } from '@/server/env';
import { ActionForm, SubmitButton } from '@/components/ui/forms';
import { googleSignIn, passwordSignIn, previewSignIn } from '@/app/actions/auth';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

const PERSONA_ORDER = ['super_admin', 'teacher_approver', 'teacher', 'hr', 'team_lead', 'finance_officer', 'event_manager', 'content_editor'];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = '/app' } = await searchParams;
  if (isPreview) {
    const people = await asSystem((tx) => tx.query(`
      select u.id::text user_id, p.full_name, p.email,
        coalesce((select array_agg(ra.role_key) from app.role_assignments ra where ra.person_id = p.id and ra.revoked_at is null), '{}') roles,
        exists (select 1 from app.memberships m where m.person_id = p.id and m.status_key = 'active') member,
        (select a.status_key from app.applications a where a.person_id = p.id order by a.submitted_at desc limit 1) app_status
      from auth.users u join app.people p on p.user_id = u.id where u.id::text like 'a0000000-0000-4000-8000-0000000000%' order by u.id`));
    const label = (r: any) => {
      const role = PERSONA_ORDER.find((k) => r.roles.includes(k));
      const names: Record<string, string> = { super_admin: 'Super Admin', teacher_approver: 'Teacher Approver', teacher: 'Teacher', hr: 'HR Officer', team_lead: 'Team Lead', finance_officer: 'Finance Officer', event_manager: 'Event Manager', content_editor: 'Content Editor' };
      return role ? names[role] : r.member ? 'Member' : r.app_status ? 'Applicant' : 'Signed-in user';
    };
    return (
      <div className="grid gap-6">
        <div className="grid gap-2"><span className="eyebrow !text-harvest-text">Preview mode</span><h1 className="display-md text-4xl">Step into a role.</h1>
          <p className="text-ink-2 text-sm">No live database is connected, so you are looking at fictional sample data. Pick a person to see their workspace. Permissions, approvals and separation of duties are enforced by the real database rules.</p></div>
        <div className="grid gap-2">
          {people.map((r: any) => (
            <form key={r.user_id} action={previewSignIn}>
              <input type="hidden" name="user_id" value={r.user_id} /><input type="hidden" name="next" value={next} />
              <button className="w-full text-left rounded-2xl border border-white bg-white/60 hover:bg-white hover:border-brand transition-colors p-3.5 flex items-center justify-between gap-3">
                <span className="grid min-w-0"><b className="truncate">{r.full_name}</b><span className="text-xs text-muted truncate">{r.email}</span></span>
                <span className="chip chip-ok shrink-0">{label(r)}</span>
              </button>
            </form>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="grid gap-6">
      <div className="grid gap-2"><span className="eyebrow">Welcome back</span><h1 className="display-md text-4xl">Sign in</h1><p className="text-ink-2 text-sm">New here? Your account comes from your <Link href="/join" className="underline text-brand">application</Link> or an invitation. Look for the activation link in your email.</p></div>
      {hasSupabaseAuth ? (
        <>
          <ActionForm action={passwordSignIn} className="grid gap-4">
            <input type="hidden" name="next" value={next} />
            <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" className="input" required autoComplete="email" /></div>
            <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" className="input" required autoComplete="current-password" /></div>
            <SubmitButton className="btn btn-primary btn-lg" pendingText="Signing in…">Sign in</SubmitButton>
          </ActionForm>
          {env.googleSignIn && <form action={googleSignIn}><input type="hidden" name="next" value={next} /><button className="btn btn-secondary w-full">Continue with Google</button></form>}
          <p className="text-sm"><Link href="/reset" className="underline text-brand">Forgot your password?</Link></p>
        </>
      ) : <p className="panel">Sign-in is not configured. Set the Supabase environment variables.</p>}
    </div>
  );
}
