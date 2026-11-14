import 'server-only';
import { cache } from 'react';
import { withClaims } from '../db';
import type { Session } from '../session';

/** Badge counts for the workspace navigation, computed under the user's RLS. */
export const getCounts = cache(async (s: Session) =>
  withClaims(s.claims, async (tx) => {
    const r = await tx.one(`select
      (select count(*)::int from app.task_assignments where assignee_person_id = authz.current_person_id() and status in ('assigned','in_progress','revision_requested')) my_tasks,
      (select count(*)::int from app.invoices where payer_person_id = authz.current_person_id() and status = 'open' and purpose = 'dues') my_dues,
      (select count(*)::int from app.approval_requests r where r.status = 'pending' and authz.can_decide(r.id)
         and not exists (select 1 from app.approval_actions a where a.request_id = r.id and a.actor_person_id = authz.current_person_id() and a.voided_at is null)) approvals,
      (select count(*)::int from app.task_submissions where status = 'validation_pending') reviews,
      (select count(*)::int from app.applications where status_key in ('pending_review','under_review','submitted')) applications,
      (select count(*)::int from app.payments where status in ('pending_verification','pending_second_verification')) verifications,
      (select count(*)::int from app.pending_privileged_changes where confirmed_at is null and rejected_at is null and expires_at > now() and requested_by <> authz.current_person_id()) privileged,
      (select count(*)::int from app.contact_inquiries where status = 'new') + (select count(*)::int from app.inbound_messages where status = 'new') inbox,
      (select count(*)::int from app.notifications where person_id = authz.current_person_id() and read_at is null) unread`);
    return r as Record<string, number>;
  }));
