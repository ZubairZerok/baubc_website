const TZ = 'Asia/Dhaka';

export function fmtDate(d: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }, lang: 'en' | 'bn' = 'en') {
  if (!d) return '';
  return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-GB', { timeZone: TZ, ...opts }).format(new Date(d));
}
export const fmtDateTime = (d: string | Date | null | undefined, lang: 'en' | 'bn' = 'en') =>
  fmtDate(d, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }, lang);
export const fmtTime = (d: string | Date | null | undefined) => fmtDate(d, { hour: '2-digit', minute: '2-digit' });

export function fmtMoney(v: number | string | null | undefined, lang: 'en' | 'bn' = 'en') {
  const n = Number(v ?? 0);
  return '৳ ' + new Intl.NumberFormat(lang === 'bn' ? 'bn-BD' : 'en-IN', { maximumFractionDigits: 2 }).format(n);
}
export function fmtNum(v: number | string | null | undefined, lang: 'en' | 'bn' = 'en') {
  return new Intl.NumberFormat(lang === 'bn' ? 'bn-BD' : 'en-IN').format(Number(v ?? 0));
}
export function relTime(d: string | Date) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  const a = Math.abs(s);
  const f = (n: number, u: string) => `${Math.round(n)} ${u}${Math.round(n) === 1 ? '' : 's'}`;
  const out = a < 60 ? 'just now' : a < 3600 ? f(a / 60, 'minute') : a < 86400 ? f(a / 3600, 'hour') : f(a / 86400, 'day');
  return a < 60 ? out : s >= 0 ? `${out} ago` : `in ${out}`;
}

export const CATEGORY_LABEL: Record<string, string> = {
  summit: 'Summit', case_competition: 'Case competition', pitch: 'Pitch event', olympiad: 'Olympiad', hackathon: 'Hackathon',
  workshop: 'Workshop', talk: 'Talk', recruitment: 'Recruitment', series: 'Series', social: 'Social',
};

type Tone = 'draft' | 'pend' | 'info' | 'ok' | 'bad' | 'lock' | 'live';
const STATUS: Record<string, [string, Tone]> = {
  draft: ['Draft', 'draft'], published: ['Published', 'live'], completed: ['Completed', 'lock'], cancelled: ['Cancelled', 'bad'], archived: ['Archived', 'draft'],
  pending_payment: ['Awaiting payment', 'pend'], pending_verification: ['Payment being verified', 'pend'], pending_second_verification: ['Second verification', 'pend'],
  confirmed: ['Confirmed', 'ok'], expired: ['Expired', 'draft'], refunded: ['Refunded', 'info'], waitlisted: ['Waitlisted', 'info'],
  verified: ['Verified', 'ok'], rejected: ['Rejected', 'bad'], reconciliation_required: ['Needs reconciliation', 'bad'],
  open: ['Open', 'pend'], paid: ['Paid', 'ok'], void: ['Void', 'draft'],
  pending: ['Pending', 'pend'], approved: ['Approved', 'ok'], returned: ['Returned', 'info'], clarification: ['Clarification asked', 'info'],
  pending_approval: ['Pending approval', 'pend'], processing: ['Paid out, verifying', 'info'], successful: ['Completed', 'ok'], failed: ['Failed', 'bad'],
  assigned: ['Assigned', 'info'], in_progress: ['In progress', 'info'], submitted: ['Submitted', 'pend'], revision_requested: ['Revision requested', 'pend'],
  validation_pending: ['Awaiting review', 'pend'],
  active: ['Active', 'ok'], suspended: ['Suspended', 'bad'], alumni: ['Alumni', 'lock'], withdrawn: ['Withdrawn', 'draft'],
  pending_review: ['Pending review', 'pend'], under_review: ['Under review', 'info'], info_requested: ['Information requested', 'pend'],
  provisionally_approved: ['Provisionally approved', 'ok'], finalized: ['Finalised', 'lock'], email_verified: ['Email verified', 'info'],
  pending_verification_ach: ['Pending verification', 'pend'], revoked: ['Revoked', 'bad'], valid: ['Valid', 'ok'],
  new: ['New', 'pend'], accepted: ['Accepted', 'ok'], ignored: ['Ignored', 'draft'], closed: ['Closed', 'draft'], spam: ['Spam', 'bad'],
  requested: ['Requested', 'pend'], not_connected: ['Not connected', 'draft'], degraded: ['Degraded', 'bad'],
};
export function statusInfo(s: string | null | undefined): { label: string; tone: Tone } {
  const v = STATUS[s ?? ''];
  return v ? { label: v[0], tone: v[1] } : { label: (s ?? '').replace(/_/g, ' '), tone: 'draft' };
}
