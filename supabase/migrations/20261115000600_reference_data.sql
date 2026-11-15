-- BAUBC OS · Reference data: roles, permissions, states, transitions, task types, policies, settings

insert into app.permissions(key, description) values
  ('identity.invite','Invite people and provision accounts'),
  ('rbac.manage','Assign and revoke non-privileged roles'),
  ('people.read','Read member records'),
  ('people.read_restricted','Read phone numbers and restricted contact data'),
  ('people.verify','Approve profile corrections to verified fields'),
  ('membership.review','Review applications'),
  ('membership.decide','Approve, reject, waitlist or request information'),
  ('membership.finalize','Finalise, suspend and reinstate memberships'),
  ('membership.config','Configure cycles, states and transitions; reverse decisions'),
  ('org.manage','Manage wings and teams'),
  ('task.manage','Create and assign tasks'),
  ('task.review','Review task submissions'),
  ('points.award','Award points through reviews'),
  ('points.adjust','Adjust or reverse points'),
  ('achievement.issue','Issue and verify achievements'),
  ('recognition.decide','Decide Member of the Month'),
  ('event.manage','Manage events, tickets and registrations'),
  ('event.checkin','Check in attendees'),
  ('finance.read','View finance records'),
  ('finance.verify','Verify incoming payments and generate dues'),
  ('finance.disburse.request','Request disbursements'),
  ('finance.disburse.execute','Record approved payouts'),
  ('finance.reconcile','Verify payouts and reconcile accounts'),
  ('cms.edit','Edit website content'),
  ('announcement.publish','Publish announcements'),
  ('document.issue','Issue certificates'),
  ('integration.manage','Manage integrations and view email logs'),
  ('inquiry.manage','Handle contact inquiries and email proposals'),
  ('perk.manage','Manage member perks'),
  ('audit.read','Read the audit log'),
  ('settings.manage','Change site settings'),
  ('privacy.handle','Handle privacy requests'),
  ('staff.portal','Access the staff workspace'),
  ('teacher.portal','Access the teacher workspace')
on conflict (key) do update set description = excluded.description;

insert into app.roles(key, name, description, is_privileged, requires_mfa, sort) values
  ('super_admin','Super Admin','Full platform administration. Seeded from the confirmed allowlist only.', true, true, 1),
  ('teacher_approver','Teacher Approver','Decides requests within an explicit approval mandate.', true, true, 2),
  ('finance_officer','Finance Officer','Verifies payments, records payouts, reconciles.', true, true, 3),
  ('hr','HR Officer','Tasks, reviews, points recommendations, member records.', true, false, 4),
  ('event_manager','Event Manager','Events, tickets, registrations, check-in, certificates.', false, false, 5),
  ('content_editor','Content Editor','Website content, announcements, inquiries.', false, false, 6),
  ('team_lead','Team / Wing Lead','Runs one wing or team: tasks and reviews in scope.', false, false, 7),
  ('teacher','Teacher / Advisor','Read-only teacher workspace.', false, false, 8),
  ('checkin_staff','Check-in Volunteer','Scans tickets during an event.', false, false, 9),
  ('judge','Competition Judge','Scores assigned competition entries.', false, false, 10)
on conflict (key) do update set name = excluded.name, description = excluded.description, is_privileged = excluded.is_privileged, requires_mfa = excluded.requires_mfa;

insert into app.role_permissions(role_key, permission_key)
select r, p from (values
  ('teacher','teacher.portal'),
  ('teacher_approver','teacher.portal'),
  ('hr','staff.portal'),('hr','people.read'),('hr','people.verify'),('hr','membership.review'),('hr','membership.decide'),
  ('hr','identity.invite'),('hr','task.manage'),('hr','task.review'),('hr','points.award'),('hr','points.adjust'),
  ('hr','achievement.issue'),('hr','recognition.decide'),('hr','announcement.publish'),('hr','people.read_restricted'),
  ('team_lead','staff.portal'),('team_lead','task.manage'),('team_lead','task.review'),('team_lead','points.award'),
  ('finance_officer','staff.portal'),('finance_officer','finance.read'),('finance_officer','finance.verify'),
  ('finance_officer','finance.disburse.request'),('finance_officer','finance.disburse.execute'),('finance_officer','finance.reconcile'),
  ('event_manager','staff.portal'),('event_manager','event.manage'),('event_manager','event.checkin'),('event_manager','document.issue'),
  ('event_manager','announcement.publish'),('event_manager','finance.disburse.request'),
  ('checkin_staff','staff.portal'),('checkin_staff','event.checkin'),
  ('content_editor','staff.portal'),('content_editor','cms.edit'),('content_editor','announcement.publish'),('content_editor','inquiry.manage'),
  ('judge','staff.portal')
) v(r, p)
on conflict do nothing;

insert into app.membership_states(key, label, label_bn, category, is_terminal, counts_as_member, sort) values
  ('submitted','Submitted','জমা হয়েছে','applicant', false, false, 10),
  ('email_verified','Email verified','ইমেইল যাচাই হয়েছে','applicant', false, false, 20),
  ('pending_review','Pending review','পর্যালোচনার অপেক্ষায়','applicant', false, false, 30),
  ('under_review','Under review','পর্যালোচনা চলছে','applicant', false, false, 40),
  ('info_requested','Information requested','তথ্য চাওয়া হয়েছে','applicant', false, false, 50),
  ('provisionally_approved','Provisionally approved','সাময়িক অনুমোদিত','applicant', false, false, 60),
  ('waitlisted','Waitlisted','অপেক্ষমাণ তালিকায়','applicant', false, false, 70),
  ('rejected','Not selected','নির্বাচিত হয়নি','applicant', true, false, 80),
  ('finalized','Finalised','চূড়ান্ত','applicant', true, false, 90),
  ('active','Active member','সক্রিয় সদস্য','member', false, true, 100),
  ('suspended','Suspended','স্থগিত','member', false, false, 110),
  ('withdrawn','Withdrawn','প্রত্যাহার','former', true, false, 120),
  ('alumni','Alumni','প্রাক্তন সদস্য','former', true, false, 130)
on conflict (key) do update set label = excluded.label, label_bn = excluded.label_bn;

insert into app.membership_transitions(from_key, to_key, permission, requires_reason, requires_mfa) values
  ('submitted','under_review','membership.review', false, false),
  ('pending_review','under_review','membership.review', false, false),
  ('pending_review','rejected','membership.decide', true, false),
  ('under_review','info_requested','membership.decide', true, false),
  ('info_requested','under_review','membership.review', false, false),
  ('under_review','provisionally_approved','membership.decide', false, false),
  ('under_review','waitlisted','membership.decide', true, false),
  ('under_review','rejected','membership.decide', true, false),
  ('waitlisted','provisionally_approved','membership.decide', false, false),
  ('waitlisted','rejected','membership.decide', true, false),
  ('provisionally_approved','finalized','membership.finalize', false, true),
  ('provisionally_approved','rejected','membership.decide', true, false),
  ('rejected','under_review','membership.config', true, true),
  ('active','suspended','membership.finalize', true, true),
  ('suspended','active','membership.finalize', true, true),
  ('active','alumni','membership.finalize', false, false),
  ('active','withdrawn','membership.finalize', true, false),
  ('suspended','withdrawn','membership.finalize', true, false)
on conflict do nothing;

insert into app.task_types(key, name, validation_mode, evidence_kind, category, default_points, max_points, second_review_above, max_attempts, description) values
  ('content_creation','Content creation (poster, video, article)','human','link','content', 20, 60, 40, 3, 'Quality is judged by a reviewer against the brief and brand guide.'),
  ('research_brief','Research brief / case analysis','human','link','research', 25, 60, 40, 3, 'Accuracy, originality and clarity are reviewed by a person.'),
  ('event_volunteer','Event volunteering','human','text','events', 15, 40, 30, 2, 'Lead confirms the work done; attendance alone is recorded by check-in.'),
  ('operations','Operations work (logistics, outreach)','human','text','operations', 10, 40, 30, 3, 'Lead confirms the outcome.'),
  ('social_engagement','Social engagement with an official post','hybrid','link','social', 5, 10, 10, 1, 'Needs an official post link plus reviewed evidence. Never awarded on assumption.'),
  ('survey_form','Survey or form completion','hybrid','text','participation', 5, 10, 10, 1, 'Objective completion check; spot-checked by HR.'),
  ('leadership','Leadership contribution','human','text','leadership', 30, 100, 50, 1, 'Decided by a panel; above the threshold a second approval is required.')
on conflict (key) do nothing;

insert into app.point_policies(category, monthly_cap, description) values
  ('social', 30, 'Social engagement points per month'),
  ('participation', 30, 'Surveys and forms per month'),
  ('content', 200, 'Content creation per month'),
  ('research', 150, 'Research per month'),
  ('events', 150, 'Event volunteering per month'),
  ('operations', 150, 'Operations per month'),
  ('leadership', 200, 'Leadership per month')
on conflict (category) do nothing;

insert into app.approval_policies(subject_type, category, min_amount, max_amount, required_approvals, require_super_admin, due_hours) values
  ('disbursement','finance_disbursement', 0, 2000, 1, false, 72),
  ('disbursement','finance_disbursement', 2000.01, 20000, 2, false, 72),
  ('disbursement','finance_disbursement', 20000.01, null, 2, true, 96),
  ('points_award','points_award', 0, null, 1, false, 72),
  ('refund','finance_refund', 0, null, 1, false, 72);

insert into app.site_settings(key, value, is_public) values
  ('club', '{"name":"Bangladesh Agricultural University Business Club","short_name":"BAUBC","tagline":"Plant ideas. Harvest founders.","bio":"BAUBC is an innovation ecosystem dedicated to transforming students into future founders and industry leaders. We empower members to build global competence by mastering the intersection of agriculture, technology, and business strategy.","email":"businessclub@bau.edu.bd","location":"Bangladesh Agricultural University, Mymensingh 2202, Bangladesh"}', true),
  ('social', '{"facebook_url":"https://www.facebook.com/profile.php?id=61586526844003","youtube_url":"https://www.youtube.com/@BusinessClubofBAU","linkedin_url":"https://www.linkedin.com/company/baubc","facebook_followers":992,"stats_as_of":"2026-11-14"}', true),
  ('payments', '{"bkash_number":"","bkash_account_type":"Personal","instructions":"Open your bKash app, choose Send Money, send the exact amount to the club number shown, and put your invoice code in the Reference field. Then enter the Transaction ID (TrxID) here. A finance volunteer will verify it, usually within 24 hours."}', true),
  ('features', '{"members_directory":true,"gallery":true,"resources":true,"leaderboard":"members","perks":true}', true),
  ('security', '{"mfa_required":true}', false),
  ('finance', '{"second_verifier_threshold":5000}', false),
  ('points', '{"adjustment_approval_above":50}', false)
on conflict (key) do nothing;

insert into app.integration_connections(provider, label, status, config) values
  ('google_form','Google Form intake (Apps Script)','not_connected','{}'),
  ('gmail_appsscript','Club Gmail label sync (Apps Script)','not_connected','{}'),
  ('meta_page','Facebook Page insights (Graph API v27.0)','not_connected','{}'),
  ('bkash_pgw','bKash Tokenized Checkout (Stage 2)','not_connected','{"note":"Requires a merchant account"}'),
  ('resend','Transactional email (Resend)','not_connected','{}')
on conflict (provider) do nothing;

insert into app.finance_accounts(name, kind, is_default_incoming)
select 'Club bKash wallet (Stage 1)', 'bkash_personal', true
where not exists (select 1 from app.finance_accounts);

insert into app.dues_plans(name, audience_role, amount)
select 'Advisor monthly contribution', 'teacher', 500
where not exists (select 1 from app.dues_plans);
