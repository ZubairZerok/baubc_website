import Link from 'next/link';
import { LogoTile, Mark } from '@/components/brand/Mark';
import { Avatar } from '@/components/ui/Avatar';
import { NavLink } from './NavLink';
import { signOut } from '@/app/actions/auth';
import { can, canApprove, isStaff, isTeacher, type Session } from '@/server/session';
import { isPreview } from '@/server/env';

type Item = { href: string; label: string; badge?: number; exact?: boolean };

export function navFor(s: Session, counts: Record<string, number>): { title: string; items: Item[] }[] {
  const groups: { title: string; items: Item[] }[] = [];
  const me: Item[] = [{ href: '/app', label: 'Overview', exact: true }];
  if (s.hasApplication && !s.isMember) me.push({ href: '/app/application', label: 'My application' });
  if (s.isMember) me.push({ href: '/app/tasks', label: 'Tasks', badge: counts.my_tasks }, { href: '/app/record', label: 'My record' }, { href: '/app/leaderboard', label: 'Leaderboard' }, { href: '/app/perks', label: 'Perks' });
  me.push({ href: '/app/events', label: 'My events', exact: true });
  if (s.isMember || isTeacher(s) || isStaff(s)) me.push({ href: '/app/notices', label: 'Notices' });
  if (isTeacher(s)) me.push({ href: '/app/dues', label: 'Dues', badge: counts.my_dues });
  me.push({ href: '/app/profile', label: 'Profile' });
  groups.push({ title: 'Me', items: me });

  const work: Item[] = [];
  if (canApprove(s)) work.push({ href: '/app/approvals', label: 'Approvals', badge: counts.approvals });
  if (can(s, 'task.review')) work.push({ href: '/app/review', label: 'Review queue', badge: counts.reviews });
  if (can(s, 'task.manage')) work.push({ href: '/app/manage/tasks', label: 'Assign tasks' });
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
  if (can(s, 'org.manage')) admin.push({ href: '/app/admin/wings', label: 'Wings & teams' });
  if (can(s, 'cms.edit') || can(s, 'announcement.publish')) admin.push({ href: '/app/admin/content', label: 'Website & notices' });
  if (can(s, 'perk.manage')) admin.push({ href: '/app/admin/perks', label: 'Member perks' });
  if (can(s, 'inquiry.manage') || can(s, 'integration.manage')) admin.push({ href: '/app/admin/inbox', label: 'Inbox', badge: counts.inbox });
  if (can(s, 'integration.manage')) admin.push({ href: '/app/admin/integrations', label: 'Integrations & email' });
  if (can(s, 'audit.read')) admin.push({ href: '/app/admin/audit', label: 'Audit log' });
  if (can(s, 'settings.manage')) admin.push({ href: '/app/admin/settings', label: 'Settings' });
  if (admin.length) groups.push({ title: 'Admin', items: admin });
  return groups;
}

export function roleLabel(session: Session) {
  return session.isSuperAdmin ? 'Super Admin' : session.roles.includes('teacher_approver') ? 'Teacher Approver' : session.roles.includes('teacher') ? 'Teacher'
    : session.roles.includes('hr') ? 'HR' : session.roles.includes('finance_officer') ? 'Finance' : session.roles.includes('event_manager') ? 'Events' : session.roles.includes('content_editor') ? 'Content'
    : session.roles.includes('team_lead') ? 'Team Lead' : session.isMember ? 'Member' : session.hasApplication ? 'Applicant' : 'Signed in';
}

function Nav({ groups }: { groups: { title: string; items: Item[] }[] }) {
  return (<>
    {groups.map((g) => (
      <div key={g.title} className="grid gap-0.5">
        <p className="label text-muted px-3 pb-1.5">{g.title}</p>
        {g.items.map((it) => <NavLink key={it.href} href={it.href} label={it.label} badge={it.badge} exact={it.exact} />)}
      </div>
    ))}
  </>);
}

export function Shell({ session, counts, unread, avatar, children }: { session: Session; counts: Record<string, number>; unread: number; avatar?: { photo_url?: string | null; avatar?: any }; children: React.ReactNode }) {
  const groups = navFor(session, counts);
  const role = roleLabel(session);
  return (
    <div className="relative min-h-dvh isolate lg:grid lg:grid-cols-[272px_1fr]">
      <div className="portal-ambient fixed inset-0 -z-10" aria-hidden="true" />
      <aside className="hidden lg:block sticky top-0 h-dvh p-3">
        <div className="glass-strong rounded-[26px] h-full flex flex-col overflow-hidden">
          <Link href="/" className="flex items-center gap-2.5 px-5 pt-5 pb-4 font-display font-bold text-[1.1rem]"><LogoTile size={36} /> BAUBC<span className="label text-muted ml-auto">Workspace</span></Link>
          <nav className="flex-1 overflow-y-auto px-3 pb-3 grid gap-5 content-start" aria-label="Workspace"><Nav groups={groups} /></nav>
          <div className="m-3 rounded-2xl bg-brand text-white p-3.5 grid gap-3 relative overflow-hidden">
            <Mark size={150} className="absolute -right-10 -bottom-12 text-white/10" />
            <Link href="/app/profile" className="relative flex items-center gap-3 min-w-0">
              <Avatar name={session.name} photoUrl={avatar?.photo_url} avatar={avatar?.avatar} size={40} />
              <span className="grid min-w-0 leading-tight"><b className="truncate text-sm">{session.name}</b><span className="text-lime-200 text-xs truncate">{role}{session.memberNo ? ` · ${session.memberNo}` : ''}</span></span>
            </Link>
            <form action={signOut} className="relative"><button className="w-full rounded-full bg-white/12 hover:bg-white/22 transition-colors text-sm font-semibold py-1.5">Sign out</button></form>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 px-3 lg:px-6 pt-3">
          <div className="glass rounded-full h-14 flex items-center justify-between gap-3 pl-2 pr-2 lg:pl-5">
            <details className="lg:hidden relative">
              <summary className="btn btn-secondary btn-sm list-none cursor-pointer" aria-label="Open menu">
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg> Menu
              </summary>
              <nav className="absolute left-0 top-12 w-[min(20rem,86vw)] max-h-[76dvh] overflow-y-auto rounded-3xl bg-white border border-line p-3 grid gap-4 shadow-[var(--shadow)]" aria-label="Workspace">
                <Nav groups={groups} />
                <form action={signOut}><button className="btn btn-secondary btn-sm w-full">Sign out</button></form>
              </nav>
            </details>
            <span className="hidden lg:flex items-center gap-2 text-sm text-ink-2"><i className="size-2 diamond-clip bg-brand" />{role} workspace{isPreview && <Link href="/login" className="chip chip-pend ml-2">Preview · switch person</Link>}</span>
            <Link href="/" className="lg:hidden flex items-center gap-2 font-display font-bold"><LogoTile size={30} /></Link>
            <div className="flex items-center gap-1.5">
              {isPreview && <Link href="/login" className="chip chip-pend lg:hidden">Preview</Link>}
              <Link href="/" className="btn btn-ghost btn-sm hidden sm:inline-flex">View site</Link>
              <Link href="/app/notifications" className="relative grid place-items-center size-10 rounded-full bg-white/80 border border-white hover:bg-white transition-colors" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Zm4 4a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
                {unread > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-lime-300 text-ink border border-white text-[11px] font-bold grid place-items-center tnum">{unread > 99 ? '99+' : unread}</span>}
              </Link>
              <Link href="/app/profile" className="lg:hidden" aria-label="Profile"><Avatar name={session.name} photoUrl={avatar?.photo_url} avatar={avatar?.avatar} size={38} /></Link>
            </div>
          </div>
        </header>
        <main id="main" className="flex-1 px-4 py-7 lg:px-8 lg:py-9 max-w-[1260px] w-full page-enter">{children}</main>
      </div>
    </div>
  );
}

export function PageTitle({ label, title, children, actions }: { label?: string; title: string; children?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
      <div className="grid gap-2 min-w-0">
        {label && <span className="eyebrow">{label}</span>}
        <h1 className="display-md text-[clamp(1.9rem,1.4rem+1.8vw,2.9rem)]">{title}</h1>
        {children && <div className="text-ink-2 max-w-2xl text-[.95rem]">{children}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, href }: { label: string; value: React.ReactNode; hint?: string; href?: string }) {
  const body = (<><span className="label text-muted">{label}</span><span className="display-md text-4xl tnum">{value}</span>{hint && <span className="text-xs text-muted">{hint}</span>}</>);
  return href ? <Link href={href} className="panel lift grid gap-1.5">{body}</Link> : <div className="panel grid gap-1.5">{body}</div>;
}
