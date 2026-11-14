import Link from 'next/link';
import { LogoMark } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/site/client';
import { NavLink } from './NavLink';
import { signOut } from '@/app/actions/auth';
import { can, canApprove, isStaff, isTeacher, type Session } from '@/server/session';
import { isPreview } from '@/server/env';

type Item = { href: string; label: string; badge?: number };

export function navFor(s: Session, counts: Record<string, number>): { title: string; items: Item[] }[] {
  const groups: { title: string; items: Item[] }[] = [];
  const me: Item[] = [{ href: '/app', label: 'Overview' }];
  if (s.hasApplication && !s.isMember) me.push({ href: '/app/application', label: 'My application' });
  if (s.isMember) me.push({ href: '/app/tasks', label: 'Tasks', badge: counts.my_tasks }, { href: '/app/record', label: 'My record' }, { href: '/app/perks', label: 'Perks' });
  me.push({ href: '/app/events', label: 'My events' });
  if (s.isMember || isTeacher(s) || isStaff(s)) me.push({ href: '/app/notices', label: 'Notices' });
  if (isTeacher(s)) me.push({ href: '/app/dues', label: 'Dues', badge: counts.my_dues });
  me.push({ href: '/app/profile', label: 'Profile' });
  groups.push({ title: 'Me', items: me });

  const work: Item[] = [];
  if (canApprove(s)) work.push({ href: '/app/approvals', label: 'Approvals', badge: counts.approvals });
  if (can(s, 'task.review')) work.push({ href: '/app/review', label: 'Review queue', badge: counts.reviews });
  if (can(s, 'task.manage')) work.push({ href: '/app/manage/tasks', label: 'Tasks' });
  if (can(s, 'points.adjust') || can(s, 'achievement.issue') || can(s, 'recognition.decide')) work.push({ href: '/app/manage/people', label: 'Points & recognition' });
  if (work.length) groups.push({ title: 'Work', items: work });

  const ops: Item[] = [];
  if (can(s, 'membership.review')) ops.push({ href: '/app/admin/applications', label: 'Applications', badge: counts.applications });
  if (can(s, 'finance.read')) ops.push({ href: '/app/finance', label: 'Finance', badge: counts.verifications });
  if (can(s, 'event.manage')) ops.push({ href: '/app/events/manage', label: 'Events' });
  if (can(s, 'event.checkin')) ops.push({ href: '/app/scan', label: 'Check-in scanner' });
  if (ops.length) groups.push({ title: 'Operations', items: ops });

  const admin: Item[] = [];
  if (can(s, 'rbac.manage') || can(s, 'identity.invite') || can(s, 'people.verify')) admin.push({ href: '/app/admin/people', label: 'People & roles', badge: counts.privileged });
  if (can(s, 'cms.edit') || can(s, 'announcement.publish')) admin.push({ href: '/app/admin/content', label: 'Website & notices' });
  if (can(s, 'inquiry.manage') || can(s, 'integration.manage')) admin.push({ href: '/app/admin/inbox', label: 'Inbox', badge: counts.inbox });
  if (can(s, 'integration.manage')) admin.push({ href: '/app/admin/integrations', label: 'Integrations & email' });
  if (can(s, 'audit.read')) admin.push({ href: '/app/admin/audit', label: 'Audit log' });
  if (can(s, 'settings.manage')) admin.push({ href: '/app/admin/settings', label: 'Settings' });
  if (admin.length) groups.push({ title: 'Admin', items: admin });
  return groups;
}

export function Shell({ session, counts, unread, children }: { session: Session; counts: Record<string, number>; unread: number; children: React.ReactNode }) {
  const groups = navFor(session, counts);
  const roleLabel = session.isSuperAdmin ? 'Super Admin' : session.roles.includes('teacher_approver') ? 'Teacher Approver' : session.roles.includes('teacher') ? 'Teacher'
    : session.roles.includes('hr') ? 'HR' : session.roles.includes('finance_officer') ? 'Finance' : session.roles.includes('event_manager') ? 'Events' : session.roles.includes('content_editor') ? 'Content'
    : session.roles.includes('team_lead') ? 'Team Lead' : session.isMember ? 'Member' : session.hasApplication ? 'Applicant' : 'Signed in';
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden lg:flex flex-col border-r border-line bg-surface sticky top-0 h-dvh overflow-y-auto">
        <Link href="/" className="flex items-center gap-2.5 px-5 h-16 border-b border-line font-display font-bold"><LogoMark /> BAUBC</Link>
        <nav className="flex-1 p-3 grid gap-5 content-start" aria-label="Workspace">
          {groups.map((g) => (
            <div key={g.title} className="grid gap-0.5">
              <p className="label text-muted px-3 pb-1.5">{g.title}</p>
              {g.items.map((it) => <NavLink key={it.href} href={it.href} label={it.label} badge={it.badge} />)}
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-line grid gap-2 text-sm">
          <div className="grid"><b className="truncate">{session.name}</b><span className="text-muted text-xs truncate">{roleLabel}{session.memberNo ? ` · ${session.memberNo}` : ''}</span></div>
          <form action={signOut}><button className="btn btn-ghost btn-sm w-full border-line">Sign out</button></form>
        </div>
      </aside>
      <div className="min-w-0 flex flex-col">
        {isPreview && <div className="bg-harvest text-[#151913] text-center text-xs font-semibold py-1.5 px-4">Preview mode · fictional sample data · <Link className="underline" href="/login">switch persona</Link></div>}
        <header className="sticky top-0 z-20 h-16 border-b border-line bg-paper/90 backdrop-blur flex items-center justify-between gap-3 px-4 lg:px-8">
          <details className="lg:hidden relative">
            <summary className="btn btn-ghost btn-sm list-none cursor-pointer" aria-label="Open menu">
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg> Menu
            </summary>
            <nav className="absolute left-0 top-12 w-72 max-h-[75dvh] overflow-y-auto card p-3 grid gap-4 shadow-[var(--shadow)]" aria-label="Workspace">
              {groups.map((g) => (<div key={g.title} className="grid gap-0.5"><p className="label text-muted px-3 pb-1">{g.title}</p>{g.items.map((it) => <NavLink key={it.href} href={it.href} label={it.label} badge={it.badge} />)}</div>))}
              <form action={signOut}><button className="btn btn-ghost btn-sm w-full border-line">Sign out</button></form>
            </nav>
          </details>
          <span className="hidden lg:block text-sm text-muted">{roleLabel} workspace</span>
          <div className="flex items-center gap-1">
            <Link href="/app/notifications" className="btn btn-ghost btn-sm relative" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Zm4 4a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
              {unread > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-signal text-on-signal text-[11px] font-bold grid place-items-center tnum">{unread > 99 ? '99+' : unread}</span>}
            </Link>
            <ThemeToggle />
            <Link href="/" className="btn btn-ghost btn-sm hidden sm:inline-flex">Website</Link>
          </div>
        </header>
        <main id="main" className="flex-1 px-4 py-6 lg:px-8 lg:py-8 max-w-[1240px] w-full">{children}</main>
      </div>
    </div>
  );
}

export function PageTitle({ label, title, children, actions }: { label?: string; title: string; children?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
      <div className="grid gap-1.5 min-w-0">
        {label && <span className="label text-green">{label}</span>}
        <h1 className="display-md text-[clamp(1.8rem,1.4rem+1.6vw,2.6rem)]">{title}</h1>
        {children && <div className="text-ink-2 max-w-2xl text-[.95rem]">{children}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, href }: { label: string; value: React.ReactNode; hint?: string; href?: string }) {
  const body = (<><span className="label text-muted">{label}</span><span className="display-md text-4xl tnum">{value}</span>{hint && <span className="text-xs text-muted">{hint}</span>}</>);
  return href ? <Link href={href} className="panel grid gap-1.5 hover:border-line-strong transition-colors">{body}</Link> : <div className="panel grid gap-1.5">{body}</div>;
}
