'use server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { withClaims, asSystem, type Tx } from '@/server/db';
import { getSession, type Session } from '@/server/session';
import { friendlyError } from '@/server/errors';
import { kickJobs, runJobs } from '@/server/worker';
import { randomToken, sha256 } from '@/server/crypto';
import { activationMail, sendMail } from '@/server/email';
import { env, isPreview } from '@/server/env';
import type { ActionResult } from '@/components/ui/forms';

const s = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const n = (fd: FormData, k: string) => (s(fd, k) === '' ? null : Number(s(fd, k)));
const b = (fd: FormData, k: string) => fd.get(k) === 'on' || fd.get(k) === 'true';
/** datetime-local inputs carry no zone: interpret them as Asia/Dhaka (UTC+6). */
const dhaka = (v: string) => (v ? new Date(/[zZ]|[+-]\d\d:\d\d$/.test(v) ? v : `${v.length === 16 ? v + ':00' : v}+06:00`).toISOString() : null);

/** Runs a command as the signed-in user; maps DB errors to friendly messages; revalidates the portal. */
async function act(fn: (tx: Tx, session: Session) => Promise<string | void>, opts: { jobs?: boolean; path?: string; flash?: boolean } = {}): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, message: 'Please sign in again.' };
  try {
    const msg = await withClaims(session.claims, (tx) => fn(tx, session));
    if (opts.jobs !== false) kickJobs();
    // queue items disappear after a decision, taking their inline message with them: show a page-level toast instead
    if (opts.flash) (await cookies()).set('flash', encodeURIComponent(msg || 'Done.'), { path: '/', maxAge: 30, sameSite: 'lax' });
    revalidatePath(opts.path ?? '/app', 'layout');
    return { ok: true, message: msg || 'Saved.' };
  } catch (e) {
    return { ok: false, message: friendlyError(e) };
  }
}

// ── self-service ─────────────────────────────────────────────────────────────
export async function markAllRead() {
  await act((tx) => tx.query(`update app.notifications set read_at = now() where read_at is null and person_id = authz.current_person_id()`).then(() => undefined), { jobs: false });
}
export async function updateProfile(_: ActionResult, fd: FormData) {
  return act(async (tx) => {
    await tx.query(`select app.update_my_profile($1::jsonb)`, [JSON.stringify({
      display_name: s(fd, 'display_name'), bio: s(fd, 'bio'), facebook_url: s(fd, 'facebook_url'), linkedin_url: s(fd, 'linkedin_url'),
      interests: s(fd, 'interests').split(',').map((x) => x.trim()).filter(Boolean), skills: s(fd, 'skills').split(',').map((x) => x.trim()).filter(Boolean),
      public_profile: b(fd, 'public_profile'),
      public_fields: Object.fromEntries(['department', 'session', 'bio', 'socials', 'achievements', 'rank', 'skills'].map((k) => [k, b(fd, `show_${k}`)])),
      avatar: s(fd, 'avatar_hair') ? { hair: s(fd, 'avatar_hair'), skin: Number(s(fd, 'avatar_skin') || 0), top: Number(s(fd, 'avatar_top') || 0), glasses: b(fd, 'avatar_glasses') } : undefined,
    })]);
    const h = s(fd, 'handle').toLowerCase();
    if (h) await tx.query(`select app.set_my_handle($1) where $1 is distinct from (select handle from app.people where id = authz.current_person_id())`, [h]);
    return 'Profile updated.';
  });
}
export async function requestCorrection(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`select app.request_profile_change($1,$2,$3)`, [s(fd, 'field'), s(fd, 'new_value'), s(fd, 'reason')]); return 'Correction request sent to HR.'; });
}
export async function respondInfo(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`select app.respond_info_request($1,$2)`, [s(fd, 'request_id'), s(fd, 'response')]); return 'Thank you. Your response was added to your application.'; }, { flash: true });
}
export async function claimTask(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`select app.claim_task($1)`, [s(fd, 'task_id')]); return 'Task claimed. It is now in your list.'; }, { flash: true });
}
export async function submitTask(_: ActionResult, fd: FormData) {
  return act(async (tx) => {
    const r = (await tx.one(`select app.submit_task($1,$2,$3) r`, [s(fd, 'assignment_id'), s(fd, 'content'), s(fd, 'link') || null]))!.r;
    return `Submitted (attempt ${r.attempt}).${r.late ? ' It was after the deadline, so the reviewer will see a late flag.' : ''}${r.duplicate_flag ? ' Identical content exists from another member; the reviewer will check it.' : ''}`;
  }, { flash: true });
}
export async function claimPerk(_: ActionResult, fd: FormData) {
  return act(async (tx) => { const r = await tx.one(`select app.claim_perk($1) v`, [s(fd, 'perk_id')]); return `Your perk: ${r!.v}`; }, { jobs: false });
}
/** Same command, but hands the revealed value back to the card so it can animate in place. */
export async function claimPerkAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, message: 'Please sign in again.' };
  try {
    const r = await withClaims(session.claims, (tx) => tx.one<{ v: string }>(`select app.claim_perk($1) v`, [s(fd, 'perk_id')]));
    revalidatePath('/app/perks');
    return { ok: true, message: 'Claimed.', data: { value: r!.v } };
  } catch (e) { return { ok: false, message: friendlyError(e) }; }
}
export async function payDues(_: ActionResult, fd: FormData) {
  return act(async (tx) => {
    await tx.query(`select app.claim_payment($1,null,$2,$3,$4,$5,$6)`, [s(fd, 'invoice_id'), s(fd, 'trx'), s(fd, 'last4'), n(fd, 'amount'), dhaka(s(fd, 'paid_at')), `dues:${s(fd, 'invoice_id')}:${s(fd, 'trx').toUpperCase()}`]);
    return 'Submitted. The finance team will verify it.';
  });
}

// ── approvals ────────────────────────────────────────────────────────────────
export async function decideApproval(_: ActionResult, fd: FormData) {
  return act(async (tx) => {
    const r = (await tx.one(`select app.decide_approval($1,$2,$3) r`, [s(fd, 'request_id'), s(fd, 'decision'), s(fd, 'note') || null]))!.r;
    return r.status === 'approved' ? 'Approved. All required approvals are in.' : r.status === 'pending' ? 'Your approval is recorded. Another approver is still needed.' : `Recorded: ${r.status}.`;
  }, { flash: true });
}
export async function respondApproval(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`select app.respond_approval($1,$2)`, [s(fd, 'request_id'), s(fd, 'note')]); return 'Response sent; the request is back with the approvers.'; }, { flash: true });
}

// ── tasks, reviews, points, recognition ──────────────────────────────────────
export async function createTask(_: ActionResult, fd: FormData) {
  return act(async (tx) => {
    const id = (await tx.one(`select app.create_task($1::jsonb) id`, [JSON.stringify({
      type_key: s(fd, 'type_key'), title: s(fd, 'title'), description: s(fd, 'description'), instructions: s(fd, 'instructions'), expected_output: s(fd, 'expected_output'),
      priority: s(fd, 'priority') || 'normal', due_at: dhaka(s(fd, 'due_at')) ?? '', points: s(fd, 'points'),
      assignment_mode: s(fd, 'assignment_mode') || 'individual', max_claims: s(fd, 'max_claims'), scope_unit_id: s(fd, 'scope_unit_id'),
      links: s(fd, 'links').split(/\s+/).filter((x) => x.startsWith('https://')),
    })]))!.id;
    const people = fd.getAll('assignees').map(String).filter(Boolean);
    if (people.length) await tx.query(`select app.assign_task($1,$2::uuid[])`, [id, people]);
    return `Task created${people.length ? ` and assigned to ${people.length} ${people.length === 1 ? 'person' : 'people'}` : ''}.`;
  });
}
export async function assignTask(_: ActionResult, fd: FormData) {
  return act(async (tx) => { const r = await tx.one(`select app.assign_task($1,$2::uuid[]) n`, [s(fd, 'task_id'), fd.getAll('assignees').map(String)]); return `Assigned to ${r!.n}.`; });
}
export async function reviewSubmission(_: ActionResult, fd: FormData) {
  return act(async (tx) => {
    const r = (await tx.one(`select app.review_submission($1,$2,$3,$4) r`, [s(fd, 'submission_id'), s(fd, 'decision'), s(fd, 'comment') || null, n(fd, 'points')]))!.r;
    return r.approval_request ? 'Approved. Points above the threshold need a second approver, so an approval request was opened.' : r.decision === 'approve' ? 'Approved and points posted to the ledger.' : `Marked: ${r.decision}.`;
  }, { flash: true });
}
export async function adjustPoints(_: ActionResult, fd: FormData) {
  return act(async (tx) => { const r = (await tx.one(`select app.adjust_points($1,$2,$3,$4) r`, [s(fd, 'person_id'), n(fd, 'amount'), s(fd, 'category') || 'operations', s(fd, 'reason')]))!.r; return r.pending_approval ? 'Above the threshold: sent for approval.' : 'Ledger entry posted.'; });
}
export async function reversePoints(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`select app.reverse_points($1::bigint,$2)`, [s(fd, 'entry_id'), s(fd, 'reason')]); return 'Reversal entry posted. The original entry is kept.'; });
}
export async function issueAchievement(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`select app.issue_achievement($1,$2,$3,$4,$5,null)`, [s(fd, 'person_id'), s(fd, 'kind'), s(fd, 'title'), s(fd, 'description') || null, s(fd, 'occurred_on') || null]); return 'Achievement recorded. A different staff member must verify it.'; });
}
export async function verifyAchievement(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`select app.verify_achievement($1,$2,$3)`, [s(fd, 'id'), s(fd, 'decision') === 'verify', s(fd, 'reason') || null]); return s(fd, 'decision') === 'verify' ? 'Verified and locked.' : 'Revoked.'; }, { flash: true });
}
export async function decideBestMember(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`select app.decide_best_member($1::date,$2,$3)`, [s(fd, 'period'), s(fd, 'person_id'), s(fd, 'citation')]); return 'Member of the Month recorded and announced to the member.'; });
}
export async function decideCorrection(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`select app.decide_profile_change($1,$2,$3)`, [s(fd, 'id'), s(fd, 'decision') === 'approve', s(fd, 'note') || null]); return 'Decision recorded.'; }, { flash: true });
}

// ── finance ──────────────────────────────────────────────────────────────────
export async function verifyPayment(_: ActionResult, fd: FormData) {
  return act(async (tx) => {
    const r = (await tx.one(`select app.verify_payment($1,$2,$3) r`, [s(fd, 'payment_id'), s(fd, 'decision') === 'verify', s(fd, 'reason') || null]))!.r;
    return r.status === 'verified' ? 'Verified. Seat confirmed and ticket emailed.' : r.status === 'pending_second_verification' ? 'First verification recorded. A second, different verifier is needed for this amount.' : `Recorded: ${r.status.replace(/_/g, ' ')}.`;
  }, { flash: true });
}
export async function submitDisbursement(_: ActionResult, fd: FormData) {
  return act(async (tx) => {
    const r = (await tx.one(`select app.submit_disbursement($1::jsonb) r`, [JSON.stringify({
      kind: s(fd, 'kind'), purpose: s(fd, 'purpose'), amount: s(fd, 'amount'), payee_name: s(fd, 'payee_name'), payee_account_last4: s(fd, 'payee_last4'),
      method_planned: s(fd, 'method') || 'bkash', budget_line: s(fd, 'budget_line'), event_id: s(fd, 'event_id'),
      evidence_urls: s(fd, 'evidence').split(/\s+/).filter((x) => x.startsWith('https://')), confirm_duplicate: b(fd, 'confirm_duplicate'),
    })]))!.r;
    return `${r.request_no} submitted for approval.`;
  });
}
export async function recordExecution(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`select app.record_execution($1,$2,$3,$4,$5)`, [s(fd, 'request_id'), s(fd, 'method'), s(fd, 'trx'), n(fd, 'amount'), s(fd, 'proof') || null]); return 'Payout recorded. A different person must verify it against the statement.'; }, { flash: true });
}
export async function verifyExecution(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`select app.verify_execution($1,$2,$3)`, [s(fd, 'request_id'), s(fd, 'decision') === 'ok', s(fd, 'note') || null]); return s(fd, 'decision') === 'ok' ? 'Verified: payment completed and entered in the cash book.' : 'Flagged for reconciliation.'; }, { flash: true });
}
export async function generateDues(_: ActionResult, fd: FormData) {
  return act(async (tx) => { const r = await tx.one(`select app.generate_dues($1::date) n`, [s(fd, 'period') || new Date().toISOString().slice(0, 10)]); return `${r!.n} dues invoices created.`; });
}

// ── membership & people ──────────────────────────────────────────────────────
export async function transitionApplication(_: ActionResult, fd: FormData) {
  return act(async (tx) => {
    const to = s(fd, 'to');
    if (to === 'info_requested') {
      await tx.query(`select app.request_info($1,$2,$3)`, [s(fd, 'application_id'), s(fd, 'reason'), dhaka(s(fd, 'due_at')) ?? new Date(Date.now() + 5 * 864e5).toISOString()]);
      return 'Information requested; the applicant was emailed.';
    }
    const r = (await tx.one(`select app.transition_application($1,$2,$3,$4,null) r`, [s(fd, 'application_id'), to, s(fd, 'reason') || null, s(fd, 'notes') || null]))!.r;
    return r.member_no ? `Finalised. Member number ${r.member_no}.` : 'Status updated and the applicant notified.';
  }, { flash: true });
}
export async function transitionMembership(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`select app.transition_membership($1,$2,$3)`, [s(fd, 'membership_id'), s(fd, 'to'), s(fd, 'reason') || null]); return 'Membership updated.'; }, { flash: true });
}
export async function invitePerson(_: ActionResult, fd: FormData) {
  const token = randomToken();
  return act(async (tx) => {
    const r = (await tx.one(`select app.invite_person($1,$2,$3,$4,$5) r`, [s(fd, 'email'), s(fd, 'full_name'), s(fd, 'kind') || 'student', s(fd, 'role') || null, sha256(token)]))!.r;
    const needs = await tx.one(`select user_id is null v from app.people where id = $1`, [r.person_id]);
    if (needs?.v) await asSystem((stx) => sendMail(stx, activationMail(r.email, s(fd, 'full_name'), `${env.siteUrl}/activate/${token}`, 'invite')));
    return needs?.v ? `Invitation emailed to ${r.email}.${isPreview ? ' (Preview: open Admin → Email log to use the link.)' : ''}` : 'This person already has an account; role request recorded.';
  });
}
export async function grantRole(_: ActionResult, fd: FormData) {
  return act(async (tx) => {
    const r = (await tx.one(`select app.grant_role($1,$2,$3,$4,$5) r`, [s(fd, 'person_id'), s(fd, 'role'), s(fd, 'scope_id') ? 'unit' : 'global', s(fd, 'scope_id') || null, s(fd, 'valid_until') || null]))!.r;
    return r.pending_confirmation ? 'Privileged role requested. Another Super Admin must confirm it within 72 hours.' : 'Role granted.';
  });
}
export async function revokeRole(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`select app.revoke_role($1,$2)`, [s(fd, 'assignment_id'), s(fd, 'reason')]); return 'Role revoked.'; }, { flash: true });
}
export async function grantMandate(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`select app.grant_mandate($1,$2::text[],$3,$4)`, [s(fd, 'person_id'), fd.getAll('categories').map(String), n(fd, 'max_amount') ?? 0, s(fd, 'valid_until') || null]); return 'Mandate requested. Another Super Admin must confirm it.'; });
}
export async function confirmChange(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`select app.confirm_privileged_change($1,$2)`, [s(fd, 'id'), s(fd, 'decision') === 'confirm']); return s(fd, 'decision') === 'confirm' ? 'Confirmed and applied.' : 'Rejected.'; }, { flash: true });
}

// ── events ───────────────────────────────────────────────────────────────────
export async function saveEvent(_: ActionResult, fd: FormData) {
  const id = s(fd, 'id');
  const vals = [s(fd, 'title'), s(fd, 'subtitle') || null, s(fd, 'summary') || null, s(fd, 'body') || null, s(fd, 'category'), s(fd, 'status'),
    s(fd, 'venue') || null, dhaka(s(fd, 'starts_at')), dhaka(s(fd, 'ends_at')),
    s(fd, 'date_label') || null, dhaka(s(fd, 'reg_opens_at')), dhaka(s(fd, 'reg_closes_at')),
    s(fd, 'eligibility') || null, s(fd, 'refund_policy') || null, s(fd, 'cover_tone') || 'canopy', b(fd, 'featured')];
  const res = await act(async (tx) => {
    if (id) {
      await tx.query(`update app.events set title=$2, subtitle=$3, summary=$4, body=$5, category=$6, status=$7, venue=$8, starts_at=$9, ends_at=$10, date_label=$11,
        reg_opens_at=$12, reg_closes_at=$13, eligibility=$14, refund_policy=$15, cover_tone=$16, featured=$17 where id=$1`, [id, ...vals]);
      await tx.query(`select app.log_action('event.updated','event',$1,null)`, [id]);
      return 'Event saved.';
    }
    const slug = s(fd, 'slug') || s(fd, 'title').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const r = await tx.one(`insert into app.events(slug, title, subtitle, summary, body, category, status, venue, starts_at, ends_at, date_label, reg_opens_at, reg_closes_at, eligibility, refund_policy, cover_tone, featured, created_by)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17, authz.current_person_id()) returning id::text`, [slug, ...vals]);
    return `created:${r!.id}`;
  }, { path: '/' });
  if (res?.ok && res.message.startsWith('created:')) redirect(`/app/events/manage/${res.message.slice(8)}`);
  return res;
}
export async function saveTicketType(_: ActionResult, fd: FormData) {
  return act(async (tx) => {
    const id = s(fd, 'id');
    const common = [s(fd, 'name'), s(fd, 'description') || null, s(fd, 'audience') || 'public', s(fd, 'unit') || 'person', n(fd, 'team_min'), n(fd, 'team_max'), n(fd, 'price') ?? 0, b(fd, 'waitlist_enabled')];
    if (id) {
      await tx.query(`update app.ticket_types set name=$2, description=$3, audience=$4, unit=$5, team_min=$6, team_max=$7, price=$8, waitlist_enabled=$9 where id=$1`, [id, ...common]);
      if (n(fd, 'capacity') != null) await tx.query(`select app.set_capacity($1,$2)`, [id, n(fd, 'capacity')]);
      return 'Ticket type saved.';
    }
    await tx.query(`insert into app.ticket_types(event_id, name, description, audience, unit, team_min, team_max, price, waitlist_enabled, capacity) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [s(fd, 'event_id'), ...common, n(fd, 'capacity') ?? 0]);
    return 'Ticket type added.';
  }, { path: '/' });
}
export async function addEventPerson(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`insert into app.event_people(event_id, name, role, title) values ($1,$2,$3,$4)`, [s(fd, 'event_id'), s(fd, 'name'), s(fd, 'role'), s(fd, 'title') || null]); return 'Added.'; }, { path: '/' });
}
export async function adminRegister(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`select app.admin_register($1,$2,$3,$4,$5,$6)`, [s(fd, 'ticket_type_id'), s(fd, 'name'), s(fd, 'email'), s(fd, 'phone') || null, s(fd, 'institution') || null, s(fd, 'source') || 'admin']); return 'Registered through the same seat inventory.'; }, { path: '/' });
}
export async function staffCancel(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`select app.cancel_registration($1,null,$2)`, [s(fd, 'registration_id'), s(fd, 'reason') || 'Cancelled by event staff']); return 'Registration cancelled.'; }, { path: '/', flash: true });
}
export async function issueCertificates(_: ActionResult, fd: FormData) {
  return act(async (tx) => { const r = await tx.one(`select app.issue_event_certificates($1) n`, [s(fd, 'event_id')]); return `${r!.n} certificates issued to checked-in attendees.`; });
}
export async function checkIn(code: string, eventId: string, device: string) {
  const session = await getSession();
  if (!session) return { result: 'error', message: 'Signed out' };
  try {
    return await withClaims(session.claims, async (tx) => (await tx.one(`select app.check_in($1,$2,'main',$3) r`, [code, eventId, device]))!.r);
  } catch (e) { return { result: 'error', message: friendlyError(e) }; }
}

// ── content & communications ─────────────────────────────────────────────────
export async function saveAnnouncement(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`insert into app.announcements(title, body, audience, pinned, author_id) values ($1,$2,$3,$4, authz.current_person_id())`, [s(fd, 'title'), s(fd, 'body'), s(fd, 'audience'), b(fd, 'pinned')]); return 'Announcement published.'; }, { path: '/' });
}
export async function deleteAnnouncement(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`delete from app.announcements where id = $1`, [s(fd, 'id')]); return 'Removed.'; }, { path: '/', flash: true });
}
export async function savePost(_: ActionResult, fd: FormData) {
  return act(async (tx) => {
    const id = s(fd, 'id');
    const vals = [s(fd, 'title'), s(fd, 'dek') || null, s(fd, 'body') || null, s(fd, 'series') || null, n(fd, 'episode_no'), s(fd, 'kind') || 'article',
      s(fd, 'cover_label') || null, s(fd, 'cover_tone') || 'canopy', s(fd, 'status') || 'draft', s(fd, 'facebook_url') || null, s(fd, 'youtube_url') || null, s(fd, 'cover_url') || null];
    if (vals[11] && !/^https:\/\/\S{4,800}$/i.test(String(vals[11]))) throw new Error('INVALID_VALUE: the cover photo must be an https:// link');
    if (id) {
      await tx.query(`update app.posts set title=$2, dek=$3, body=$4, series=$5, episode_no=$6, kind=$7, cover_label=$8, cover_tone=$9, status=$10, facebook_url=$11, youtube_url=$12, cover_url=$13,
        published_at = case when $10 = 'published' then coalesce(published_at, now()) else published_at end where id=$1`, [id, ...vals]);
      return 'Saved.';
    }
    const slug = s(fd, 'title').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
    await tx.query(`insert into app.posts(slug, title, dek, body, series, episode_no, kind, cover_label, cover_tone, status, facebook_url, youtube_url, cover_url, published_at, created_by)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, case when $10 = 'published' then now() end, authz.current_person_id())`, [slug, ...vals]);
    return 'Post created.';
  }, { path: '/' });
}
export async function updateInquiry(_: ActionResult, fd: FormData) {
  const status = ['new', 'in_progress', 'closed', 'spam'].includes(s(fd, 'status')) ? s(fd, 'status') : 'in_progress';
  return act(async (tx) => {
    await tx.query(`update app.contact_inquiries set status = $2, staff_note = coalesce(nullif($3, ''), staff_note), updated_at = now(), assigned_to = coalesce(assigned_to, authz.current_person_id()) where id = $1`, [s(fd, 'id'), status, s(fd, 'staff_note').slice(0, 2000)]);
    return status === 'closed' ? 'Marked as done.' : status === 'spam' ? 'Marked as spam.' : 'Saved.';
  }, { flash: true });
}
export async function reviewInbound(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`update app.inbound_messages set status=$2, review_note=$3, category=coalesce(nullif($4,''), category), reviewer_id=authz.current_person_id() where id=$1`, [s(fd, 'id'), s(fd, 'status'), s(fd, 'note') || null, s(fd, 'category')]); return 'Updated.'; }, { flash: true });
}
const SETTING_FIELDS: Record<string, { name: string; type: 'text' | 'url' | 'number' | 'bool' | 'choice' | 'videos'; choices?: string[] }[]> = {
  youtube: [{ name: 'handle', type: 'text' }, { name: 'channel_id', type: 'text' }, { name: 'featured', type: 'videos' }],
  club: [{ name: 'name', type: 'text' }, { name: 'short_name', type: 'text' }, { name: 'tagline', type: 'text' }, { name: 'bio', type: 'text' }, { name: 'email', type: 'text' }, { name: 'location', type: 'text' }],
  social: [{ name: 'facebook_url', type: 'url' }, { name: 'youtube_url', type: 'url' }, { name: 'linkedin_url', type: 'url' }, { name: 'facebook_followers', type: 'number' }, { name: 'stats_as_of', type: 'text' }],
  payments: [{ name: 'bkash_number', type: 'text' }, { name: 'bkash_account_type', type: 'choice', choices: ['Personal', 'Merchant', 'Agent'] }, { name: 'instructions', type: 'text' }],
  features: [{ name: 'members_directory', type: 'bool' }, { name: 'gallery', type: 'bool' }, { name: 'resources', type: 'bool' }, { name: 'perks', type: 'bool' }, { name: 'leaderboard', type: 'choice', choices: ['off', 'members', 'public'] }],
  security: [{ name: 'mfa_required', type: 'bool' }],
  finance: [{ name: 'second_verifier_threshold', type: 'number' }],
  points: [{ name: 'adjustment_approval_above', type: 'number' }],
};
/** Settings are edited as plain form fields; the three sensitive groups need a second Super Admin to confirm. */
export async function saveSetting(_: ActionResult, fd: FormData) {
  return act(async (tx) => {
    const key = s(fd, 'key');
    const fields = SETTING_FIELDS[key];
    if (!fields) throw new Error('NOT_FOUND');
    const current = (await tx.one(`select value from app.site_settings where key = $1`, [key]))?.value ?? {};
    const value: Record<string, unknown> = { ...current };
    for (const f of fields) {
      const raw = s(fd, f.name);
      if (f.type === 'bool') value[f.name] = b(fd, f.name);
      else if (f.type === 'number') { const v = Number(raw); if (raw === '' || !Number.isFinite(v) || v < 0) throw new Error(`INVALID_VALUE: ${f.name.replace(/_/g, ' ')} must be a number`); value[f.name] = v; }
      else if (f.type === 'url') { if (raw && !/^https:\/\//i.test(raw)) throw new Error(`INVALID_VALUE: ${f.name.replace(/_/g, ' ')} must start with https://`); value[f.name] = raw; }
      else if (f.type === 'choice') { if (!f.choices!.includes(raw)) throw new Error('INVALID_VALUE: pick one of the listed options'); value[f.name] = raw; }
      else if (f.type === 'videos') {
        const ids = lines(raw).map((l) => youtubeId(l));
        if (ids.some((x) => !x)) throw new Error('INVALID_VALUE: each line must be a YouTube link or an 11-character video ID');
        value[f.name] = Array.from(new Set(ids)).slice(0, 40);
      }
      else value[f.name] = raw;
    }
    if (key === 'youtube') {
      if (value.channel_id && !/^UC[\w-]{22}$/.test(String(value.channel_id))) throw new Error('INVALID_VALUE: a channel ID starts with UC and has 24 characters');
      if (value.handle && !/^@[\w.-]{3,40}$/.test(String(value.handle))) throw new Error('INVALID_VALUE: the handle looks like @businessclubofbau');
    }
    if (key === 'payments' && value.bkash_number && !/^(\+?880|0)1[3-9]\d{8}$/.test(String(value.bkash_number).replace(/[\s-]/g, ''))) throw new Error('INVALID_VALUE: enter a valid Bangladeshi mobile number, for example 01XXXXXXXXX');
    if (['security', 'finance', 'points'].includes(key)) {
      await tx.query(`select app.request_privileged_change('setting', $1::jsonb, $2)`, [JSON.stringify({ key, value, person_id: null }), `Change setting "${key}"`]);
      return 'This is a sensitive setting, so the other Super Admin has to confirm it before it takes effect.';
    }
    await tx.query(`update app.site_settings set value = $2::jsonb, updated_at = now(), updated_by = authz.current_person_id() where key = $1`, [key, JSON.stringify(value)]);
    await tx.query(`select app.log_action('setting.updated','site_setting',$1,$2::jsonb)`, [key, JSON.stringify(value)]);
    return 'Saved. The website now shows the new details.';
  }, { path: '/' });
}

const youtubeId = (v: string) => {
  const m = v.trim().match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})(?![\w-])/) ?? v.trim().match(/^([\w-]{11})$/);
  return m ? m[1] : null;
};

// ── wings & teams ────────────────────────────────────────────────────────────
const slugify = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const lines = (v: string) => v.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
export async function saveUnit(_: ActionResult, fd: FormData) {
  return act(async (tx) => {
    const id = s(fd, 'id');
    const vals = [s(fd, 'name'), s(fd, 'summary') || null, lines(s(fd, 'responsibilities')), b(fd, 'is_public'), n(fd, 'sort') ?? 100, s(fd, 'kind') || 'wing'];
    if (!vals[0]) throw new Error('NAME_REQUIRED');
    if (id) { await tx.query(`update app.org_units set name=$2, summary=$3, responsibilities=$4::text[], is_public=$5, sort=$6, kind=$7 where id=$1`, [id, ...vals]); await tx.query(`select app.log_action('unit.updated','org_unit',$1,null)`, [id]); return 'Wing saved.'; }
    await tx.query(`insert into app.org_units(slug, name, summary, responsibilities, is_public, sort, kind) values ($1,$2,$3,$4::text[],$5,$6,$7)`, [slugify(s(fd, 'name')), ...vals]);
    return 'Wing created. It appears on the Wings page now.';
  }, { path: '/' });
}
export async function assignUnit(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`select app.assign_unit($1,$2,$3,$4)`, [s(fd, 'person_id'), s(fd, 'unit_id'), s(fd, 'title'), b(fd, 'is_lead')]); return b(fd, 'is_lead') ? 'Placed as lead. They can now assign and review work for this wing.' : 'Placed in the wing.'; }, { path: '/' });
}
export async function endUnitMembership(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`select app.end_unit_membership($1)`, [s(fd, 'id')]); return 'Removed from the wing. Their past record is kept.'; }, { path: '/', flash: true });
}

// ── accounts, cycles, activation links ───────────────────────────────────────
export async function setAccountStatus(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`select app.set_account_status($1,$2,$3)`, [s(fd, 'person_id'), s(fd, 'status'), s(fd, 'reason')]); return s(fd, 'status') === 'active' ? 'Account reactivated.' : 'Account suspended. They can no longer use the workspace.'; }, { flash: true });
}
export async function revokeMandate(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`select app.revoke_mandate($1,$2)`, [s(fd, 'id'), s(fd, 'reason')]); return 'Approval mandate revoked.'; }, { flash: true });
}
export async function resendActivation(_: ActionResult, fd: FormData) {
  const token = randomToken();
  return act(async (tx) => {
    const r = (await tx.one(`select app.reissue_provision($1,$2) r`, [s(fd, 'person_id'), sha256(token)]))!.r;
    await asSystem((stx) => sendMail(stx, activationMail(r.email, r.full_name, `${env.siteUrl}/activate/${token}`, 'invite')));
    return `A fresh activation link was emailed to ${r.email}. It works for 72 hours.`;
  }, { flash: true });
}
export async function saveCycle(_: ActionResult, fd: FormData) {
  return act(async (tx) => {
    const id = s(fd, 'id'), status = s(fd, 'status') || 'planned', url = s(fd, 'intake_form_url');
    if (url && !/^https:\/\//i.test(url)) throw new Error('INVALID_VALUE: the form link must start with https://');
    if (status === 'open') await tx.query(`update app.membership_cycles set status = 'closed' where status = 'open' and id::text <> $1`, [id]);
    const vals = [s(fd, 'label'), status, dhaka(s(fd, 'opens_at')), dhaka(s(fd, 'closes_at')), url || null, s(fd, 'notes') || null];
    if (!vals[0]) throw new Error('NAME_REQUIRED');
    if (id) await tx.query(`update app.membership_cycles set label=$2, status=$3, opens_at=$4, closes_at=$5, intake_form_url=$6, notes=$7 where id=$1`, [id, ...vals]);
    else await tx.query(`insert into app.membership_cycles(label, status, opens_at, closes_at, intake_form_url, notes) values ($1,$2,$3,$4,$5,$6)`, vals);
    await tx.query(`select app.log_action('cycle.saved','membership_cycle',$1,$2::jsonb)`, [id || vals[0], JSON.stringify({ status })]);
    return status === 'open' ? 'Recruitment is open. The Join page is accepting applications.' : status === 'closed' ? 'Recruitment is closed. The Join page says so.' : 'Recruitment cycle saved.';
  }, { path: '/' });
}

// ── payments: cash, bank, refunds ────────────────────────────────────────────
export async function recordOfflinePayment(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`select app.record_offline_payment($1,$2,$3)`, [s(fd, 'invoice_id'), s(fd, 'method'), s(fd, 'reference') || null]); return 'Payment recorded. Someone in finance now verifies it, and the seat is confirmed after that.'; }, { flash: true });
}
export async function requestRefund(_: ActionResult, fd: FormData) {
  return act(async (tx) => {
    const id = (await tx.one(`select app.request_refund($1,$2) id`, [s(fd, 'payment_id'), s(fd, 'reason')]))!.id;
    await tx.query(`select app.submit_refund($1)`, [id]);
    return 'Refund sent for approval. After approval, a different person pays it out.';
  }, { flash: true });
}
export async function completeRefund(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`select app.complete_refund($1,$2)`, [s(fd, 'refund_id'), s(fd, 'trx')]); return 'Refund paid and entered in the cash book.'; }, { flash: true });
}

// ── tasks & events housekeeping ──────────────────────────────────────────────
export async function closeTask(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`select app.close_task($1,$2)`, [s(fd, 'task_id'), s(fd, 'status')]); return s(fd, 'status') === 'cancelled' ? 'Task cancelled. Open assignments were cancelled too.' : s(fd, 'status') === 'closed' ? 'Task closed.' : 'Task reopened.'; }, { flash: true });
}
export async function removeEventPerson(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`delete from app.event_people where id = $1`, [s(fd, 'id')]); return 'Removed.'; }, { path: '/', flash: true });
}

// ── website content: resources, gallery, reach ───────────────────────────────
const https = (v: string, what: string) => { if (!/^https:\/\//i.test(v)) throw new Error(`INVALID_VALUE: the ${what} must start with https://`); return v; };
export async function saveResource(_: ActionResult, fd: FormData) {
  return act(async (tx) => {
    await tx.query(`insert into app.resources(title, description, url, category, audience) values ($1,$2,$3,$4,$5)`, [s(fd, 'title'), s(fd, 'description') || null, https(s(fd, 'url'), 'link'), s(fd, 'category') || 'guide', s(fd, 'audience') || 'public']);
    return 'Resource added.';
  }, { path: '/' });
}
export async function deleteResource(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`delete from app.resources where id = $1`, [s(fd, 'id')]); return 'Resource removed.'; }, { path: '/', flash: true });
}
export async function saveAlbum(_: ActionResult, fd: FormData) {
  return act(async (tx) => {
    await tx.query(`insert into app.gallery_albums(title, description, external_url, photo_count, taken_on, event_id) values ($1,$2,$3,$4,$5,$6)`,
      [s(fd, 'title'), s(fd, 'description') || null, https(s(fd, 'external_url'), 'album link'), n(fd, 'photo_count'), s(fd, 'taken_on') || null, s(fd, 'event_id') || null]);
    return 'Album added to the gallery.';
  }, { path: '/' });
}
export async function deleteAlbum(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`delete from app.gallery_albums where id = $1`, [s(fd, 'id')]); return 'Album removed.'; }, { path: '/', flash: true });
}
export async function saveSocialPost(_: ActionResult, fd: FormData) {
  return act(async (tx) => {
    const link = s(fd, 'permalink');
    await tx.query(`insert into app.social_posts(platform, external_id, title, post_type, permalink, published_at, viewers, views, likes, comments, shares)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      on conflict (platform, external_id) do update set title = excluded.title, viewers = excluded.viewers, views = excluded.views, likes = excluded.likes, comments = excluded.comments, shares = excluded.shares, captured_at = now()`,
      [s(fd, 'platform') || 'facebook', link || slugify(s(fd, 'title')), s(fd, 'title'), s(fd, 'post_type') || null, link ? https(link, 'post link') : null, s(fd, 'published_on') || null,
        n(fd, 'viewers'), n(fd, 'views'), n(fd, 'likes'), n(fd, 'comments'), n(fd, 'shares')]);
    return 'Post numbers saved. The home page counts update from these.';
  }, { path: '/' });
}
export async function deleteSocialPost(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`delete from app.social_posts where id = $1`, [s(fd, 'id')]); return 'Removed.'; }, { path: '/', flash: true });
}

// ── member perks ─────────────────────────────────────────────────────────────
export async function savePerk(_: ActionResult, fd: FormData) {
  return act(async (tx) => {
    const id = s(fd, 'id'), mode = s(fd, 'mode') || 'shared_code', url = s(fd, 'url');
    const vals = [s(fd, 'title'), s(fd, 'partner'), s(fd, 'description'), s(fd, 'terms') || null, mode, url ? https(url, 'link') : null, s(fd, 'shared_code') || null, n(fd, 'min_points') ?? 0,
      s(fd, 'distribution_permission'), s(fd, 'ends_on') ? dhaka(`${s(fd, 'ends_on')}T23:59`) : null, s(fd, 'status') || 'active'];
    if (!vals[8]) throw new Error('INVALID_VALUE: say who at the partner allowed the club to share this offer');
    if (mode === 'link' && !url) throw new Error('INVALID_VALUE: a link perk needs a link');
    if (mode === 'shared_code' && !vals[6]) throw new Error('INVALID_VALUE: enter the code members will use');
    let perk = id;
    if (id) await tx.query(`update app.perks set title=$2, partner=$3, description=$4, terms=$5, mode=$6, url=$7, shared_code=$8, min_points=$9, distribution_permission=$10, ends_at=$11, status=$12 where id=$1`, [id, ...vals]);
    else perk = (await tx.one(`insert into app.perks(title, partner, description, terms, mode, url, shared_code, min_points, distribution_permission, ends_at, status) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id::text`, vals))!.id;
    const codes = lines(s(fd, 'codes'));
    const added = codes.length ? (await tx.one(`select app.add_perk_codes($1,$2::text[]) n`, [perk, codes]))!.n : 0;
    const icon = ['burst', 'book', 'ticket', 'chat', 'gift', 'laptop', 'cup', 'star'].includes(s(fd, 'icon')) ? s(fd, 'icon') : 'gift';
    const accent = ['lime', 'coral', 'river', 'harvest', 'leaf', 'ink'].includes(s(fd, 'accent')) ? s(fd, 'accent') : 'lime';
    await tx.query(`update app.perks set category = $2, icon = $3, accent = $4, sort = $5 where id = $1`, [perk, s(fd, 'category') || null, icon, accent, n(fd, 'sort') ?? 100]);
    await tx.query(`select app.log_action('perk.saved','perk',$1,null)`, [perk]);
    return `Perk saved${added ? ` with ${added} new one-time codes` : ''}.`;
  });
}

// ── profile photo & privacy ──────────────────────────────────────────────────
export async function setMyPhoto(url: string | null): Promise<ActionResult> {
  return act(async (tx) => { await tx.query(`select app.set_my_photo($1)`, [url]); return url ? 'Photo updated.' : 'Photo removed. Your character avatar is back.'; }, { path: '/', jobs: false });
}
export async function openPrivacyRequest(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`select app.open_privacy_request($1,$2)`, [s(fd, 'kind'), s(fd, 'details')]); return 'Request received. The club answers privacy requests within 30 days.'; });
}
export async function handlePrivacyRequest(_: ActionResult, fd: FormData) {
  return act(async (tx) => { await tx.query(`update app.privacy_requests set status = $2, handled_by = authz.current_person_id() where id = $1`, [s(fd, 'id'), s(fd, 'status')]); await tx.query(`select app.log_action('privacy.handled','privacy_request',$1,$2::jsonb)`, [s(fd, 'id'), JSON.stringify({ status: s(fd, 'status') })]); return 'Privacy request updated.'; }, { flash: true });
}

// ── integrations & operations ────────────────────────────────────────────────
export async function simulateFormSubmission(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.isSuperAdmin && !session?.perms.includes('integration.manage')) return { ok: false, message: 'Not allowed.' };
  const token = randomToken();
  const email = s(fd, 'email').toLowerCase();
  try {
    const r = await asSystem(async (tx) => {
      const res = (await tx.one(`select app.ingest_application('google_form', $1::jsonb, $2) r`, [JSON.stringify({
        response_id: `sim-${Date.now()}`, email, full_name: s(fd, 'full_name'), student_id: s(fd, 'student_id') || null, department: 'Agricultural Economics', session: '2025-26',
        preferred_units: ['research-strategy'], motivation: 'Submitted from the integration test button.',
      }), sha256(token)]))!.r;
      if (res.needs_activation) await sendMail(tx, activationMail(email, s(fd, 'full_name'), `${env.siteUrl}/activate/${token}`, 'application'));
      return res;
    });
    revalidatePath('/app', 'layout');
    return { ok: true, message: `Application created (${r.late ? 'no open cycle: marked late' : 'pending activation'}). The activation email is in the Email log.` };
  } catch (e) { return { ok: false, message: friendlyError(e) }; }
}
export async function simulateEventFormRegistration(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.isSuperAdmin && !session?.perms.includes('integration.manage')) return { ok: false, message: 'Not allowed.' };
  try {
    const r = await asSystem(async (tx) => (await tx.one(`select app.ingest_form_registration($1::jsonb) r`, [JSON.stringify({
      type: 'event_registration', response_id: `sim-${Date.now()}`, event_slug: s(fd, 'event_slug'), email: s(fd, 'email').toLowerCase(), full_name: s(fd, 'full_name'),
      answers: { Note: 'Sent from the integration test button' },
    })]))!.r);
    kickJobs();
    revalidatePath('/', 'layout');
    return { ok: true, message: r.duplicate ? 'That email is already registered for this event (no duplicate created).' : `Registered (${r.status.replace('_', ' ')}). Open the event page: it appears in the live list within 10 seconds.` };
  } catch (e) { return { ok: false, message: friendlyError(e) }; }
}
export async function runJobsNow(_: ActionResult): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.isSuperAdmin) return { ok: false, message: 'Super Admins only.' };
  const r = await runJobs(50);
  revalidatePath('/app', 'layout');
  return { ok: true, message: `Processed ${r.processed} jobs (${r.ok} ok, ${r.failed} failed).` };
}
