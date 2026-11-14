# Document 1: Product Requirements Document (PRD)

**Product:** BAUBC Club Operating System (working name "BAUBC OS"), with a public website and an internal operations platform
**Organisation:** Bangladesh Agricultural University Business Club (BAUBC), Mymensingh 2202, Bangladesh
**Status:** Draft for review. **Nothing here is built yet.** Every feature below is *planned*.
**Date of research:** 14 November 2026

> Conventions. Requirement IDs (`MEM-07`) are stable and are used in the roadmap, tests and risk register. Priority: **P0** is the first usable release, needed for the January Startup Summit or for the platform to be safe to run. **P1** is the next release, **P2** is later, and **P3** is the future backlog. "WF-x" points to a workflow in [Document 5](05-workflows.md), and table names point to [Document 4](04-database-design.md).

---

## 1. Purpose and product vision

BAUBC needs one connected system that does two jobs:

1. **Public face.** A premium, bilingual (English and বাংলা) website that shows who the club is (an innovation ecosystem at the intersection of agriculture, technology and business strategy), what it does (DECODED, BAUBC Case Studies, the Startup Summit, case competitions, Dragon's-Den-style pitch events, olympiads and hackathons), and how to take part.
2. **Operating system.** A secure internal platform that runs the club's people, recruitment, roles, tasks, verified contributions, events, money, approvals, integrations and official documents. The records live in one Postgres database and are guarded by one permission model.

The guiding principle is **verified records in, trustworthy outputs out.** Points, achievements, certificates, CVs and finance reports are only as credible as the records behind them. So every official record has an owner, a verifier, an audit trail and a correction path.

## 2. Context the requirements are based on

| Fact | Source | Design implication |
|---|---|---|
| Facebook Page: 992 followers, 74% aged 18–24, 73% in Mymensingh, gender balanced (51.4% M / 48.6% F) | Club's Meta Business Suite export (Oct–Nov 2026) | Mobile-first and Bangla-first readability. The audience is mostly campus-local, on mobile data. |
| Views fell 63% over 28 days. The DECODED series (Monpura: 6,138 viewers) and Case Studies Ep 01 perform best | Same | Treat DECODED and Case Studies as first-class content types on the site (series, episodes, a "case library"). |
| Official email was announced as **businessclub@bau.edu.bd** on 7 Nov 2026 | Club's Facebook post | This conflicts with "businesslab@bau.edu.bd" in parts of the brief. See R-3. |
| `bau.edu.bd` mail is hosted on **Google Workspace** (MX `aspmx.l.google.com`, SPF `_spf.google.com`) | DNS lookup, 14 Nov 2026 | Gmail API and Apps Script are viable. Institutional (Workspace admin) cooperation changes which option is best (Doc 7). |
| Startup Summit planned for around **January 2027**, plus annual recruitment, case competitions, a pitch event, olympiads and hackathons | Brief | Event registration with live seats must be ready about 3–4 weeks before the Summit. The roadmap has a dedicated "Summit track". |
| Instagram account exists but is not linked to the Page | Meta export | Recommend linking it. Instagram insights are a later integration. |
| No paid ads in the last 90 days | Meta export | All reach is organic. The site should deep-link from posts (UTM-tagged) to measure conversion. |

## 3. Reconciling contradictions in the brief (must be confirmed)

The brief contains statements that cannot all be true at once. None has been silently dropped. Each is resolved as follows, pending approval.

| # | Conflict | Resolution in this blueprint | Needs confirmation from |
|---|---|---|---|
| R-1 | "NONE can create an account, they can only login" vs Phase 3 "everyone in the eligible applicant pool should be able to create an account and apply" | **No public self-sign-up.** The person applies through an intake form (Google Form first, a native form later). The system then **provisions** an account and emails a one-time **activation link**. "Creating an account" now means activating a provisioned account, which also proves the person owns the email address. | Club executive |
| R-2 | "the login password info will be fetched from a google form they submit" | **Will not be implemented as written.** Passwords would sit in plain text in Google Sheets, visible to every form editor, and every Google Form carries Google's own warning *"Never submit passwords through Google Forms."* Instead, applicants set their own password through the activation link, or sign in with Google when the form collected a *verified* Google email. They can change it at any time. The outcome (form → login) is kept. Only the insecure mechanism is replaced. | Club executive |
| R-3 | Super Admin 2 is `businesslab@bau.edu.bd` (Phases 2 and 7) vs `businessclub@bau.edu.bd` (Phase 0 and the 7 Nov 2026 official announcement) | Assumed to be **businessclub@bau.edu.bd**. The allowlist is **not seeded** until one address is confirmed in writing. An unconfirmed address is never allowlisted. | Club executive and BAU IT |
| R-4 | Teacher Approvers: "two designated teacher accounts" vs "a few individually authorized teacher accounts" | Any number of Teacher Approvers, each with an explicit, scoped **approval mandate** (categories and amount ceilings). The policy default requires **two independent teacher approvals** for sensitive disbursements. | Advisors and executive |
| R-5 | "HR or can assign tasks" (incomplete sentence) | HR and authorised Team/Wing Leads can assign tasks within their scope, and Super Admins can assign anywhere. | Executive |
| R-6 | Teachers "will also be prompted to pay their monthly fee of 500 BDT" | Built as a general **dues** module (who pays, how much, how often). Teachers default to **BDT 500 per month, configurable**. Prompts are polite banners and email reminders, with no penalties built in. | Advisors (this is a sensitive policy) |
| R-7 | "Use Send Money to [the club's designated personal bKash number]" vs "research official bKash merchant integration" | **Stage 1:** manual Send Money with a TrxID claim and maker-checker verification. **Stage 2:** a bKash Tokenized Checkout merchant account in the club's or university's name. See Doc 7 §4. | Treasurer, advisors and BAU finance |
| R-8 | "real-time" everywhere | Each feature is classed as **real-time** (seconds: seat counts), **near-real-time** (minutes: Gmail via Apps Script) or **scheduled** (hours: Facebook insights, which Meta updates about once per 24 h). | — |
| R-9 | Members submit Facebook profile URLs, and the club wants to verify their engagement | A profile URL **cannot** be mapped to Graph API identities. Engagement is attributed only after an explicit, verifiable **account-linking step** (a one-time comment code) or through evidence and human review. See WF-12. | — |

## 4. Personas and user types

| Code | User type | Typical person | Primary device | Main goals |
|---|---|---|---|---|
| U-SA | Super Admin | Club's two institutional admins | Laptop and phone | Oversee everything, approve sensitive actions, keep the system safe |
| U-TA | Teacher Approver | 2+ designated faculty advisors | Phone (often) | Clear, context-rich decisions with little effort |
| U-T | Teacher | Faculty advisors and mentors | Phone | Notices, events, documents, dues |
| U-HR | HR Officer | HR wing executives | Laptop | Assign tasks, validate work, recommend points |
| U-TL | Team/Wing Lead | Wing heads | Phone and laptop | Run the team, review the team's submissions, report |
| U-FO | Finance Officer *(optional delegated role)* | Treasurer | Laptop | Verify incoming payments, prepare disbursements (maker) |
| U-ED | Content Editor *(optional delegated role)* | PR/Media wing | Laptop | Blog, gallery, pages, DECODED episodes |
| U-EM | Event Manager *(optional delegated role)* | Event lead | Laptop and phone | Configure events, scan tickets, manage registrations |
| U-M | Finalised/Active Member | General member | Phone | Tasks, points, events, certificates, CV |
| U-AP | Applicant / Provisional | Recruitment candidate | Phone | Application status, required actions |
| U-PV | Public Visitor | Students, sponsors, other universities | Phone | Discover, register for events, verify certificates |
| U-EP | External Event Participant | Non-BAU participant | Phone | Register, pay, receive ticket and certificate (no full account needed) |

The delegated roles (FO, ED, EM) are **roles, not accounts**. No additional administrator accounts are created. Super Admins assign these roles to existing members when needed.

## 5. Product principles (apply to every requirement)

1. **Server-side truth.** Permissions are enforced in Postgres (row-level security plus permission-checked functions) and in server code. Hiding a UI element never counts as access control.
2. **Append-only official records.** Points, status changes, approvals, payments and audit entries are never overwritten. Corrections are new, linked entries.
3. **Human approval for anything subjective or financial.** Automation can validate format, uniqueness, deadlines and attendance. It can never award points for quality on its own judgement, never mark money as received without verification, and never publish extracted email data without review.
4. **Least data.** No national ID numbers, no passwords from forms, no full mailbox sync, and no private social data. Phone numbers and personal emails are never public.
5. **Configurable over hard-coded.** Statuses, transitions, point values, approval thresholds, fees, optional pages and leaderboard visibility all live in settings tables that Super Admins control.
6. **Bilingual, mobile-first, low-bandwidth.** Bangla is a first-class language, not a translation afterthought.

---

## 6. Requirement inventory

Column key. **Data** lists the main tables. **Perm** is the permission key from [Document 2](02-roles-permissions.md). **Deps/Int** lists dependencies and external integrations. **Security / failure** gives the security implication and the failure condition with its handling. **Acceptance** gives testable criteria.

### A. Public website (PUB)

| ID | Requirement and objective | Users | Data | Perm | Deps / Int | Security / failure | Acceptance | P |
|---|---|---|---|---|---|---|---|---|
| PUB-01 | **Home page** that conveys identity, purpose, impact and activity, with live stats (members, events, next event and seats) from verified data | PV, all | `site_pages`, `site_settings`, `events`, `public_stats` view | `public` | CMS (ADM-10) | Stats come from aggregate views only, with no PII. If the DB is unreachable, a statically cached page is served (ISR) | LCP ≤ 2.5 s at p75 on a mid-range Android over 4G. Stats match DB aggregates within 60 s | P0 |
| PUB-02 | **About Us**: history, mission, vision, values, structure, leadership, achievements | PV | `site_pages` (blocks), `org_units`, `unit_memberships` | `public` | CMS | Leadership shows only fields marked public | Editors can change any text without a deploy | P0 |
| PUB-03 | **Events hub**: upcoming, ongoing and past events; results; galleries; filters by category (Summit, Case Competition, Pitch, Olympiad, Hackathon, Workshop, Talk) | PV | `events`, `event_people`, `galleries` | `public` | EVT-01 | Only `published` events are visible. Drafts are blocked by RLS | Past events show results and gallery. Filters work without JS (progressive enhancement) | P0 |
| PUB-04 | **Event detail** with live seat availability, waitlist status, registration status, fee, eligibility, speakers, partners, venue map and FAQ | PV, M | `events`, `ticket_types`, realtime channel `event:{id}` | `public` | EVT-05, EVT-06 | Live counts carry aggregates only. If the websocket drops, the page falls back to 30 s polling | Seat count updates within 3 s of a committed registration (p95) | P0 |
| PUB-05 | **Members directory**: only finalised or active members who opted in to public listing | PV | `people`, `memberships`, `public_member_directory` view | `public` | MEM-12 | Never shows phone, personal email, student ID or DOB. Applicants never appear | An applicant or provisional record never appears (automated test) | P1 |
| PUB-06 | **Teachers / Advisors** page | PV | `people` (role teacher), `public_profiles` | `public` | FAC-01 | Teachers control which fields are public | — | P1 |
| PUB-07 | **Teams / Wings** page: responsibilities, leads, members | PV | `org_units`, `unit_memberships` | `public` | MEM | Members are shown per their visibility settings | — | P1 |
| PUB-08 | **Blog / Insights** with series support (DECODED, BAUBC Case Studies), bilingual posts, authors, tags, RSS | PV | `posts`, `series`, `taxonomy_terms` | `public` | ADM-11 | Sanitised rich text (no raw HTML from editors) | An episode page links to its series, the previous and next episodes, and the original Facebook post | P1 |
| PUB-09 | **Gallery**: photos and videos by event and year, with alt text, captions and credits | PV | `galleries`, `gallery_items`, `media_assets` | `public` | ADM-12 | Only `public` assets get public URLs. Private uploads are never in public buckets | Every public image has alt text (publishing is blocked without it) | P1 |
| PUB-10 | **Resources**: downloadable reports, decks and learning material | PV, M | `documents` (audience) | `public` / `member` | ADM | Member-only resources use signed URLs that expire | A non-member gets a 403 on member-only files | P2 |
| PUB-11 | **Contact**: official details plus an inquiry form routed by category (sponsor, partnership, speaker, general) | PV | `contact_inquiries` | `public` | Turnstile CAPTCHA, email | Rate limited and CAPTCHA-protected. Spam is not stored long term | The inquiry reaches the right queue and the sender gets an acknowledgement | P0 |
| PUB-12 | **Login** page (no sign-up), with "Apply to join" linking to the open recruitment form | All | — | — | AUTH | No account enumeration. Errors are generic | — | P0 |
| PUB-13 | **Certificate verification** page `/verify/{code}` showing minimal info | PV | `issued_documents` (public view) | `public` | DOC-05 | Rate limited, minimal fields, unguessable codes | A revoked certificate shows "Revoked on date" | P1 |
| PUB-14 | **Optional pages toggle** (enable or disable Members, Gallery, Resources, Blog, Leaderboard) | SA | `site_settings.features` | `cms.settings.manage` | — | Disabled pages return 404, not an empty page | A toggle takes effect within 60 s with no deploy | P1 |
| PUB-15 | **Bilingual UI and content** (English and Bangla), switchable per visitor, with Bangla numerals optional | All | `*_i18n` jsonb fields | — | next-intl | — | Every public page works fully in both languages. A missing translation falls back with a visible marker for editors only | P1 |
| PUB-16 | **SEO**: metadata per page, OpenGraph images (auto-generated per event and episode), sitemap, structured data (Event, Organization, Article) | PV | `seo` jsonb on content | — | — | — | Google Rich Results test passes for Event pages | P1 |
| PUB-17 | **Recruitment landing page** (annual): timeline, wings, FAQs, "Apply" CTA linking to the active intake form | PV | `membership_cycles` | `public` | MEM-01 | When the cycle is closed, the CTA is disabled | — | P0 |
| PUB-18 | **Partner / sponsor showcase** and a sponsorship inquiry CTA | PV | `organizations`, `event_partners` | `public` | — | Logos are used with permission (rights flag) | — | P2 |

### B. Authentication and account management (AUTH)

| ID | Requirement and objective | Users | Data | Perm | Deps / Int | Security / failure | Acceptance | P |
|---|---|---|---|---|---|---|---|---|
| AUTH-01 | **No self-sign-up.** Public sign-up is disabled at the auth provider, and any account-creation attempt for an email without a pending provision is rejected server-side | All | `auth.users`, `account_provisions` | — | Supabase Auth "Allow new users to sign up" off, plus the *Before User Created* hook | If the hook fails, creation fails closed | A direct sign-up API call with the publishable key returns an error (automated test) | P0 |
| AUTH-02 | **Provisioning from an intake source** (Google Form or admin invite). It creates `people` and `account_provisions`, then sends an activation link that expires after 72 h | AP, T | `people`, `account_provisions`, `webhook_inbox` | `system` / `identity.invite` | INT-01 (Apps Script webhook) | The link token is stored hashed and is single-use. Expired links can be re-requested | Activation sets the password. A second use of the same link fails | P0 |
| AUTH-03 | **Email + password login** with breached-password and length policy (≥ 10 chars), plus "show password" | All | `auth.users` | — | Supabase Auth | Rate limited (per IP and per account), with a generic error | 10 failed attempts lock the account for 15 min and notify the user | P0 |
| AUTH-04 | **Sign in with Google**, only for already-provisioned identities (useful for `@bau.edu.bd` teachers and Gmail users whose form email was verified) | All | `auth.identities` | — | Google OAuth | The hook rejects unknown emails. Only verified Google emails are accepted | An unprovisioned Google account cannot create a user | P1 |
| AUTH-05 | **Password reset and change** (self-service) | All | — | — | Email (Resend) | Same response whether or not the account exists. Resetting revokes other sessions | — | P0 |
| AUTH-06 | **MFA (TOTP)** required for Super Admin, Teacher Approver, Finance Officer, and anyone holding a privileged permission. Optional for others | SA, TA, FO | `auth.mfa_factors` | — | Supabase Auth MFA | Privileged functions check that the session is at `aal2` server-side | A privileged RPC from an `aal1` session is denied | P0 |
| AUTH-07 | **Session management**: list devices, revoke sessions, automatic expiry (privileged sessions: 12 h absolute, 30 min idle for finance screens) | All | `auth.sessions` | self | — | Revoking a role forces a re-check on the next request (permissions are read from the DB, not trusted from the JWT) | Removing a role takes effect within one request | P1 |
| AUTH-08 | **Role-aware dashboard routing** after login (applicant, member, teacher, staff) | All | `role_assignments` | — | — | Computed on the server | — | P0 |
| AUTH-09 | **Admin account recovery policy**: two Super Admins, each with backup codes stored offline, and a documented break-glass procedure | SA | `privileged_identities` | — | — | The last active Super Admin cannot be removed or demoted (DB constraint and function check) | A test confirms that demoting the last Super Admin fails | P0 |
| AUTH-10 | **Account status**: active, suspended, deactivated, alumni-readonly | SA | `account_status_events` | `identity.suspend` | — | A suspended user's sessions are revoked immediately | — | P1 |
| AUTH-11 | **Login abuse protection**: CAPTCHA after N failures, IP throttling, anomaly email ("new device sign-in") | All | `auth_audit` | — | Cloudflare Turnstile | — | — | P1 |

### C. Membership management (MEM)

| ID | Requirement and objective | Users | Data | Perm | Deps / Int | Security / failure | Acceptance | P |
|---|---|---|---|---|---|---|---|---|
| MEM-01 | **Recruitment cycles** (annual): open and close dates, form link, wings offered, review rubric | SA | `membership_cycles` | `membership.cycle.manage` | PUB-17 | — | Only one active cycle per type | P0 |
| MEM-02 | **Application intake** from Google Form via an Apps Script signed webhook, with a Sheets-API reconciliation sweep for anything missed | AP | `webhook_inbox`, `applications` | `system` | INT-01 | HMAC signature plus timestamp and replay window. Deduplicated on form response ID | 100% of form responses appear within 10 min (reconciliation proves it) | P0 |
| MEM-03 | **Application form fields** (recommended set): full name (English and Bangla), student ID, academic department, faculty, session, batch/level, email (verified), phone, photo **or avatar** (character illustration if the person prefers not to show their face), Facebook URL, LinkedIn URL, short bio, interests, skills, prior experience, preferred wing (ranked 1–3), consent checkboxes | AP | `applications.answers` (versioned schema), `people` | — | — | No NID. Phone is restricted. Photo/avatar goes to a private bucket until finalised | Form schema versions are stored with each response | P0 |
| MEM-04 | **Duplicate detection**: same student ID, same email, same phone or name+session similarity. Flags a candidate instead of auto-merging | SA | `applications.duplicate_of`, `duplicate_candidates` | `membership.review` | — | Merges are manual and audited | A known duplicate fixture is flagged | P0 |
| MEM-05 | **Configurable membership state machine** (Draft → Submitted → Email Verified → Pending Review → Under Review → Info Requested → Provisionally Approved / Waitlisted / Rejected → Finalized → Active → Suspended / Withdrawn / Alumni) with a configurable transition table | SA | `membership_states`, `membership_transitions` | `membership.config` | WF-2 | Transitions only through `fn_transition_membership()`. Illegal transitions are rejected | An illegal transition returns an error and leaves state unchanged | P0 |
| MEM-06 | **Every status change is recorded** with decision maker, timestamp, previous status, new status, reason, notes and evidence | — | `membership_status_events` (append-only) | — | — | No UPDATE or DELETE grants. A trigger blocks mutation | Updating a history row fails | P0 |
| MEM-07 | **Membership review dashboard**: counts (registered, pending, under review, provisional, rejected, finalised, suspended), breakdown by academic department and session, duplicates, recently updated | SA, (TA if granted) | views over `applications`, `memberships` | `membership.review` | — | — | Counts reconcile with the raw table | P0 |
| MEM-08 | **Actions**: approve (provisional), reject, request info, waitlist, finalise, suspend, reinstate. Each requires a reason (mandatory for reject and suspend) | SA, TA* | — | `membership.decide`, `membership.finalize` | Notifications | Finalise and suspend require MFA. *Teacher Approvers only if explicitly granted* | Each action writes an event and notifies the applicant | P0 |
| MEM-09 | **Bulk actions** with a preview, explicit confirmation (type the count) and one audit entry per affected record plus a batch ID | SA | `bulk_operations` | `membership.bulk` | — | Maximum batch size 200. Any error rolls back the whole batch | — | P1 |
| MEM-10 | **Information requests**: the admin asks the applicant for more information. The applicant responds in their dashboard with a due date and reminder | SA, AP | `info_requests` | `membership.review` / self | Notifications | — | The response returns the application to Under Review | P0 |
| MEM-11 | **Member number issuance** on finalisation (e.g. `BAUBC-2026-0142`), unique and never reused | SA | `memberships.member_no` (sequence per year) | — | — | Unique constraint | — | P0 |
| MEM-12 | **Profile visibility control**: the member chooses public / members-only / hidden per field group. The admin can enforce a global policy | M, SA | `profile_visibility` | self / `people.manage` | — | Defaults to private | A new member is not public until they opt in | P1 |
| MEM-13 | **Profile correction requests**: the member requests a change to a verified field (name spelling, department, session). An admin reviews it and applies it with the old and new values logged | M, SA | `profile_change_requests` | self / `people.verify` | WF-15 | The member cannot write verified fields directly (column-level guard) | An approved change updates the field and writes an audit row | P1 |
| MEM-14 | **Unit (wing/team) placement** with positions and terms (start/end), verified by an admin | SA, TL | `org_units`, `unit_memberships` | `org.assign` | — | — | History of positions is preserved | P1 |
| MEM-15 | **Alumni transition** at the end of a term or graduation (bulk by session), keeping verified history | SA | `memberships` | `membership.decide` | — | — | Alumni keep certificate and CV access | P2 |
| MEM-16 | **Export** of permitted fields (CSV/XLSX) with watermark and audit | SA | — | `membership.export` | — | Restricted columns are excluded unless the user has `pii.export` | Exports are logged with row count | P1 |
| MEM-17 | **Interview / assessment scheduling** for recruitment (slots, panel, rubric scores) | SA, HR | `application_reviews`, `interview_slots` | `membership.review` | Calendar (optional) | Reviewer conflict-of-interest flag | — | P2 |

### D. Faculty and Teacher portal (FAC)

| ID | Requirement and objective | Users | Data | Perm | Deps / Int | Security / failure | Acceptance | P |
|---|---|---|---|---|---|---|---|---|
| FAC-01 | **Teacher onboarding by invitation**: a Super Admin invites a teacher's email, which creates a provisioned identity with role `teacher` | SA, T | `account_provisions`, `role_assignments` | `identity.invite` | AUTH-02 | A teacher profile alone grants **no** approval power | — | P0 |
| FAC-02 | **Teacher dashboard** (distinct layout): notices, announcements, events, assigned documents, approved reports, calendar, notifications, contacts, profile | T | `announcements`, `documents`, `events` | `teacher.portal` | — | Read-only by default | A normal teacher has no write buttons and no write RPC grants | P0 |
| FAC-03 | **Teacher Approver mandate**: the Super Admin grants an approval mandate (categories: membership, event, achievement/points, finance-incoming, finance-disbursement, admin request; amount ceiling; validity dates) | SA | `approval_mandates` | `approver.manage` | — | Requires MFA. Every grant or revoke is audited | A mandate cannot exceed the granter's own authority | P0 |
| FAC-04 | **Approval inbox**: pending items with full context (requester, purpose, amount, evidence, budget line, history, policy rule that applies), sorted by due date | TA | `approval_requests`, `approval_steps` | mandate-scoped | WF-3 | Context is limited to what the item needs (no full member PII) | Each item shows the policy and step it belongs to | P0 |
| FAC-05 | **Decision actions**: approve, reject, request clarification, return for revision, each with a note (required for reject and return) | TA | `approval_actions` | mandate-scoped | — | MFA required for finance. The maker cannot approve their own request (DB check) | A self-approval attempt fails | P0 |
| FAC-06 | **Approval history**: decided, rejected, completed, with a downloadable decision log | TA | `approval_actions` | self | — | — | — | P1 |
| FAC-07 | **Monthly dues prompt for teachers** (default BDT 500/month, configurable): outstanding-dues banner, pay via bKash (manual claim now, PGW later), receipt download | T | `dues_plans`, `invoices`, `payments` | self | FIN-02 | Polite reminders, max 1 per week | The paid invoice disappears from the banner after verification | P1 |
| FAC-08 | **Delegation / out-of-office**: an approver can delegate to another eligible approver for a date range (never to the request's maker) | TA | `approval_delegations` | mandate-scoped | — | Delegation cannot raise an amount ceiling | — | P2 |
| FAC-09 | **Notices to teachers** (targeted announcements), with read receipts | SA | `announcements`, `announcement_reads` | `announcement.publish` | Email | — | — | P1 |

### E. HR and internal operations: tasks (HR)

| ID | Requirement and objective | Users | Data | Perm | Deps / Int | Security / failure | Acceptance | P |
|---|---|---|---|---|---|---|---|---|
| HR-01 | **Task types** with default validation mode (auto / human / hybrid), evidence schema, default points, fraud rules and an appeal window | SA | `task_types` | `task.type.manage` | — | — | — | P1 |
| HR-02 | **Task creation** with title, description, instructions, assignee (person, team, or open-claim), category, priority, start, deadline, expected output, required evidence, validation method, completion conditions, points, approval requirement, links and attachments | SA, HR, TL (scoped) | `tasks`, `task_attachments` | `task.create` (scope) | — | Leads can only target their own units. Points above the type ceiling need approval | Creating a task outside your scope is denied by RLS | P1 |
| HR-03 | **Configurable task lifecycle** per type (Draft → Published → Assigned → Accepted → In Progress → Submitted → Validation Pending → Revision Requested → Approved/Rejected → Completed; Expired; Cancelled) | — | `task_states`, `task_transitions` | — | WF-4 | Only through `fn_transition_task()` | — | P1 |
| HR-04 | **Submission**: text, files, links, form answers, attendance link, social evidence, survey proof, data entry, creative deliverables. Time-stamped, with a content hash | M | `task_submissions`, `submission_evidence` | self | Storage (private) | Approved submissions are immutable (trigger) | Editing an approved submission fails | P1 |
| HR-05 | **Automated validation rules** (objective only): required fields present, file type and size, link format and reachability, deadline met, unique registration, QR attendance recorded, record count ≥ N, duplicate file hash, perceptual image hash near-duplicate | — | `validation_results` | `system` | Job worker | Automation can only *pass a gate* or *flag*. It never judges quality | Each rule produces a stored result with inputs | P1 |
| HR-06 | **Human review queue** with rubric, side-by-side evidence, previous attempts and "four-eyes" for high-value awards | HR, TL | `validation_results` | `task.review` (scope) | — | Reviewer ≠ submitter, and reviewer ≠ assigner for high-value tasks (configurable) | A self-review attempt fails | P1 |
| HR-07 | **Revision and resubmission** rules (max attempts, deadline extension needs approval) | M, HR | `task_submissions.attempt_no` | — | — | — | — | P1 |
| HR-08 | **Appeals**: the member appeals a rejection within N days. A different reviewer decides, and the outcome is final | M, HR | `appeals` | `task.appeal.decide` | — | The original reviewer is excluded | — | P2 |
| HR-09 | **Team tasks**: points split policy (equal, lead-defined weights with approval, or fixed) | TL, HR | `task_assignments`, `point_allocations` | — | — | The split must sum to the award. Leads cannot allocate to themselves above an equal share without HR approval | — | P2 |
| HR-10 | **Deadline reminders and expiry** (scheduled job) | — | `tasks` | `system` | Notifications | Deduplicated | — | P1 |
| HR-11 | **HR reports**: completion rates, overdue tasks, validation turnaround, by unit | HR, SA | views | `report.hr` | — | Aggregates only for TL | — | P2 |

### F. Event management (EVT)

| ID | Requirement and objective | Users | Data | Perm | Deps / Int | Security / failure | Acceptance | P |
|---|---|---|---|---|---|---|---|---|
| EVT-01 | **Event CMS**: title, subtitle, description (bilingual rich blocks), category, banner, gallery, venue (with map), start/end, registration open/close, capacity, eligibility, fee, payment requirement, speakers/judges/mentors, partners, contacts, status, SEO | SA, EM | `events`, `event_sessions`, `event_people`, `event_partners` | `event.manage` | Media library | Publishing requires `event.publish` (optionally a teacher approval per policy) | — | P0 |
| EVT-02 | **Ticket / registration types** per event (public, member-only, team, individual, early-bird), each with its own capacity and price | EM | `ticket_types` | `event.manage` | — | DB check `sold + held ≤ capacity` | — | P0 |
| EVT-03 | **Registration**: individual and team (team name, captain, members with emails, min/max size), custom questions per event, consent | PV, M, EP | `registrations`, `registration_teams`, `registration_answers` | `public` (rate limited) | Turnstile | One active registration per person per event (unique key on normalised email or phone) | — | P0 |
| EVT-04 | **Guest registrants** (no account): a magic-link "manage my registration" page for external participants | EP | `registrations.guest_*` | token | Email | The token is hashed and scoped to one registration | — | P0 |
| EVT-05 | **Atomic seat inventory**: holds, expiry, waitlist promotion, cancellations, capacity changes, no overselling under concurrency | — | `ticket_types`, `seat_holds`, `waitlist_entries` | `system` | WF-9 | Single-statement conditional update in Postgres. The client never computes availability | A load test (500 concurrent attempts for 100 seats) yields exactly 100 confirmed registrations and 0 oversells | P0 |
| EVT-06 | **Live availability broadcast** (seats left, waitlist count, status: open / almost full / sold out / closed) | PV | realtime `event:{id}` | `public` | Supabase Realtime Broadcast | Aggregate payload only. Polling fallback | p95 ≤ 3 s | P0 |
| EVT-07 | **Paid registrations**: manual bKash claim (Stage 1), PGW (Stage 2), or free. The hold is extended while a manual claim awaits verification (configurable, default 24 h) | PV, M, FO | `invoices`, `payments` | — | FIN | Seats are never confirmed on an unverified client TrxID | — | P0 |
| EVT-08 | **Admin-assisted / offline registration** (walk-in, cash), counted against the same inventory | EM | `registrations.source` | `event.registration.manage` | — | Cash receipts follow finance rules (FIN-04) | — | P0 |
| EVT-09 | **Tickets with QR**: an opaque random code (≥ 128-bit) shown with the name and photo/avatar, delivered by email and in the dashboard | PV, M | `registrations.ticket_code_hash` | — | Email | The code is stored hashed. QR images are rendered on demand | — | P0 |
| EVT-10 | **Check-in scanner** (PWA): camera scan, manual search, atomic single-use check-in per session, duplicate warnings, offline queue with conflict resolution | EM, volunteers | `checkins` | `event.checkin` (event-scoped, time-boxed) | — | Scanner role is valid only during the event window | A reused QR shows "Already checked in at 10:42 by X" | P0 |
| EVT-11 | **Attendance → tasks/points/certificates** linkage (attendance can satisfy a task and make the person eligible for a participation certificate) | — | `checkins`, `task_submissions` | `system` | HR, DOC | Attendance only from a check-in record, never self-reported | — | P1 |
| EVT-12 | **Cancellations and refunds** per event policy (deadline, % refundable). A cancelled seat is released to the waitlist | PV, M, FO | `registrations`, `refunds` | — | FIN-06 | Refund executes only after approval | — | P1 |
| EVT-13 | **Event analytics**: registrations over time, conversion from page views, attendance rate, revenue, demographics (department or university only) | EM, SA | views | `report.event` | — | Aggregates only | — | P1 |
| EVT-14 | **Competition module** (case competition, Dragon's Den / pitch, olympiad, hackathon): rounds, team submissions, judge assignments, rubric scoring, conflict-of-interest declarations, result publication | EM, judges | `competition_rounds`, `judge_assignments`, `scores`, `results` | `competition.*` | Storage | Judges see only assigned teams. Scores are locked after submission. Results publish only after approval | — | P1 |
| EVT-15 | **Nearly-full / sold-out alerts** to organisers and an optional "notify me" list for the public | EM, PV | `event_alerts` | — | Notifications | — | — | P2 |
| EVT-16 | **Calendar export** (ICS) and add-to-calendar | PV | — | public | — | — | — | P2 |

### G. Financial management (FIN)

| ID | Requirement and objective | Users | Data | Perm | Deps / Int | Security / failure | Acceptance | P |
|---|---|---|---|---|---|---|---|---|
| FIN-01 | **Invoices** for any receivable (event fee, dues, membership fee, workshop fee) | — | `invoices` | `system` / `finance.invoice` | — | Amount is server-calculated, never from the client | — | P0 |
| FIN-02 | **Manual bKash Send Money claim** (Stage 1): the payer sends to the club's designated number and submits TrxID, sender wallet (last 4 digits shown back), amount and time. The system checks the format and global uniqueness of the TrxID. A Finance Officer verifies it against the wallet statement. Above a threshold, a second verifier confirms | PV, M, T, FO | `payments`, `payment_claims` | `finance.payment.verify` | — | TrxID unique across all claims (a reuse is rejected and flagged). Never auto-verified. The verifier cannot be the payer | A duplicate TrxID is rejected. Unverified claims never confirm seats | P0 |
| FIN-03 | **bKash Tokenized Checkout** (Stage 2, needs a merchant account): create, execute, query, search and refund. IPN listener with signature verification. Idempotent | PV, M | `payments`, `provider_events` | `system` | bKash PGW | Credentials are server-only. Execute timeout leads to Query. Duplicate IPNs are ignored | Sandbox test suite passes. Execute-timeout scenario recovers correctly | P2 |
| FIN-04 | **Cash and bank receipts** recorded with a receipt number and a counter-signature (two people) | FO | `payments.method='cash'` | `finance.payment.record` | — | Two-person rule | — | P1 |
| FIN-05 | **Disbursement requests** (vendor payment, event expense, reimbursement, prize, other): purpose, amount, payee, payee account (masked), budget line, evidence (quotes, invoices, receipts) | FO, EM, SA | `disbursement_requests`, `evidence` | `finance.disbursement.request` | WF-11 | Maker identity recorded | — | P1 |
| FIN-06 | **Maker-checker approval policy**: thresholds decide the number of approvals and approver types (e.g. ≤ 2,000 BDT: 1 Teacher Approver; > 2,000 BDT: 2 independent Teacher Approvers or 1 TA + 1 SA; prizes: always 2). The maker can never approve. Approvers must be distinct people | TA, SA | `approval_policies`, `approval_steps` | mandate | — | Enforced in a DB function. Policy edits need 2 Super Admin confirmations | A test confirms the maker cannot approve and the same person cannot approve twice | P1 |
| FIN-07 | **Execution recording**: an approved request is paid **outside** the system (bKash app or bank) by an authorised executor who records the TrxID and proof. A second person reconciles it. "Approved" ≠ "Paid" | FO | `disbursement_executions` | `finance.disbursement.execute` | — | The executor must hold an execute mandate. Proof is required | A status never reaches "Successful" without a reconciled reference | P1 |
| FIN-08 | **Refunds** with approval. Executed manually (Stage 1) or via the PGW refund API (Stage 2: partial refunds allowed, up to 10 per transaction, within 60 days per bKash docs) | FO, TA | `refunds` | `finance.refund.*` | bKash | Refund ≤ amount received minus prior refunds | — | P1 |
| FIN-09 | **Finance accounts and cash book**: wallets (bKash personal/merchant), cash box, bank. Append-only entries | FO, SA | `finance_accounts`, `finance_entries` | `finance.read` | — | Append-only | Balances recompute from entries | P1 |
| FIN-10 | **Reconciliation**: periodic statement import or manual entry, matching to payments and executions, with unmatched items flagged "Reconciliation Required" | FO | `reconciliation_runs`, `reconciliation_items` | `finance.reconcile` | — | Reconciler ≠ executor | — | P1 |
| FIN-11 | **Budgets** per fiscal year and category, with utilisation | SA, FO | `budgets`, `budget_lines` | `finance.budget` | — | — | — | P2 |
| FIN-12 | **Finance dashboard**: incoming, outgoing, pending approvals, successful, failed, refunds, event revenue, expense categories, budget utilisation, transaction history | SA, FO, TA | views | `finance.read` | — | Restricted. Exports watermarked | — | P1 |
| FIN-13 | **Receipts** (PDF) for verified payments, with a verification code | Payer | `issued_documents` | self | DOC | — | — | P1 |
| FIN-14 | **Dues plans** (teacher monthly fee and any member fees), monthly invoice generation, reminders, arrears view | SA, FO | `dues_plans`, `invoices` | `finance.dues.manage` | Scheduled job | — | — | P1 |

### H. External integrations (INT)

| ID | Requirement and objective | Users | Data | Perm | Deps / Int | Security / failure | Acceptance | P |
|---|---|---|---|---|---|---|---|---|
| INT-01 | **Google Form intake connector** (Apps Script `onFormSubmit` → signed webhook) plus a nightly reconciliation pull | system | `webhook_inbox`, `integration_connections` | `integration.manage` | Google Apps Script, Sheets API | HMAC-SHA256 and timestamp. The secret is in Script Properties. The form never collects passwords | — | P0 |
| INT-02 | **Gmail ingestion (MVP)**: an Apps Script in the club mailbox polls **only** threads under label `BAUBC/Sync` every 5–10 min and posts minimal fields | system | `inbound_messages` | `integration.manage` | Apps Script, GmailApp | Labels limit the scope. Minimal fields. Attachments only when needed, malware-scanned | Unlabelled mail is never transmitted | P1 |
| INT-03 | **Gmail ingestion (target)**: Gmail API `users.watch` + Pub/Sub push + `history.list`, in an *Internal* OAuth app owned by the bau.edu.bd Workspace org. Watch renewed daily | system | `integration_cursors` | `integration.manage` | Gmail API, Pub/Sub | Needs the Workspace admin to own and allow the app. Restricted scopes otherwise need CASA | — | P3 |
| INT-04 | **Email rule engine**: conditions (sender, domain, subject regex, label) → category (event application, sponsor, partnership, speaker, university, payment, registration) → extraction proposal → human approval | SA | `email_rules`, `extraction_proposals` | `integration.review` | — | Nothing becomes an official record without review | — | P2 |
| INT-05 | **Facebook Page metrics sync** (daily): posts, post-level views, reactions, comments counts, shares, page views and follows, using current metric names | SA, ED | `social_posts`, `social_metric_snapshots` | `integration.manage` | Graph API v27.0 | Page token (system-user token preferred), stored encrypted. Metrics are labelled "updated daily" | The dashboard shows the last-sync timestamp | P2 |
| INT-06 | **Facebook identity linking** (opt-in): the member comments a one-time code on a designated post. The system matches the commenter's page-scoped ID and the member confirms | M | `social_identity_links` | self | Graph API (comments) | Feasibility spike FB-1 must pass first | — | P3 |
| INT-07 | **Transactional email** (activation, receipts, notifications) from a club domain with SPF, DKIM and DMARC | system | `notification_deliveries` | — | Resend | Bounce and complaint handling | — | P0 |
| INT-08 | **Integration health monitor**: last success, token expiry, error rate. Alerts Super Admins | SA | `integration_connections`, `integration_runs` | `integration.read` | — | — | An expired token produces an alert within 1 h | P1 |
| INT-09 | **Google Calendar publish** (optional): published events are pushed to a public club calendar | — | — | — | Calendar API | — | — | P3 |
| INT-10 | **Instagram** (after the account is linked to the Page): media and insights | — | — | — | Instagram Graph API | — | — | P3 |

### I. Member performance system (PERF)

| ID | Requirement and objective | Users | Data | Perm | Deps / Int | Security / failure | Acceptance | P |
|---|---|---|---|---|---|---|---|---|
| PERF-01 | **Append-only points ledger** (member, source, amount, reason, validation reference, awarder, approver, timestamp, status, reversal reference) | — | `point_ledger` | `points.award` (via function only) | HR | No UPDATE or DELETE. Corrections are reversal plus new entry | A direct insert is denied. An award without a validation reference fails | P1 |
| PERF-02 | **Point policies**: per-type caps (per month), diminishing returns for repeated low-effort tasks, the second-approver threshold | SA | `point_policies` | `points.policy` | — | — | — | P1 |
| PERF-03 | **Manual adjustments** (bonus or penalty) only by authorised staff with reason, plus second approval above a threshold | SA, HR | `point_ledger.kind='adjustment'` | `points.adjust` | WF-6 | Four-eyes | — | P1 |
| PERF-04 | **Performance dashboard** (member): total, monthly and annual points, completed and pending tasks, participation, achievements, unit contribution, rank (if enabled), timeline | M | `point_balances`, views | self | — | — | Matches ledger sums | P1 |
| PERF-05 | **Leaderboards** with a visibility setting: public / members-only / disabled. Per unit and global. Monthly and annual | M, PV | `leaderboard_*` views | setting | — | Opt-out per member (excluded from public boards) | — | P2 |
| PERF-06 | **Achievements and positions**: locked records issued by authorised staff (positions, awards, leadership roles, official contributions). Members can only request corrections | SA, HR | `achievement_records` | `achievement.issue` | — | Immutable after verification. Revocations are logged | A member write is denied | P1 |
| PERF-07 | **Monthly Best Member**: system shortlist (top N by verified points plus criteria), nominations by leads, panel decision through the approval workflow, then publication, certificate and achievement record | SA, HR, TA | `recognition_cycles`, `recognition_nominations`, `recognition_awards` | `recognition.decide` | WF-13 | A nominee cannot vote on their own case | — | P1 |
| PERF-08 | **Anti-gaming**: duplicate evidence hash, near-duplicate images, submission velocity limits, reviewer-pair collusion analytics (the same reviewer approving the same member unusually often), random audit sampling (5%) | HR, SA | `integrity_flags` | `integrity.review` | — | — | A seeded collusion pattern is flagged | P2 |

### J. Document generation (DOC)

| ID | Requirement and objective | Users | Data | Perm | Deps / Int | Security / failure | Acceptance | P |
|---|---|---|---|---|---|---|---|---|
| DOC-01 | **Template management**: certificate, CV, membership letter and receipt templates (HTML/CSS with bilingual fonts), versioned, approved before use | SA, ED | `document_templates` | `document.template` | — | Template change = new version. Issued documents keep their version | — | P1 |
| DOC-02 | **Certificate issuance** (participation, workshop, membership, leadership, volunteer, appreciation, annual contribution): unique ID, recipient, issuing authority, issue date, template version, verification URL, QR, revocation status | SA, EM | `issued_documents` | `document.issue` | PDF renderer | Only from verified records (attendance, award, position). Batch issue needs approval | An issue attempt without a qualifying record fails | P1 |
| DOC-03 | **Annual CV generation** from verified records only, with member-approved personal fields and skills (skills marked "self-declared" unless verified) | M | `cv_snapshots`, `issued_documents` | self | — | Snapshot per year. Regeneration creates a new version | — | P2 |
| DOC-04 | **Membership letters** and **receipts** | SA, FO | `issued_documents` | `document.issue` | — | — | — | P2 |
| DOC-05 | **Public verification**: `/verify/{code}` shows name, document type, event or title, issue date and status only | PV | view | public | — | 10 lookups/min per IP | — | P1 |
| DOC-06 | **Revocation** with reason, reflected immediately on the verification page | SA | `issued_documents.revoked_*` | `document.revoke` | — | MFA | — | P1 |
| DOC-07 | **Bangla-correct rendering** of PDFs (conjuncts, vowel signs) | — | — | — | Headless Chromium (HarfBuzz shaping) | Visual regression tests against reference PDFs | Golden-image test passes for a Bangla name sample set | P1 |

### K. Administration and analytics (ADM)

| ID | Requirement and objective | Users | Data | Perm | Deps / Int | Security / failure | Acceptance | P |
|---|---|---|---|---|---|---|---|---|
| ADM-01 | **Super Admin bootstrap**: the two confirmed identities are seeded into `privileged_identities` via a one-time migration from private secrets. They are not in source code | — | `privileged_identities` | — | — | No UI path creates a Super Admin. Promotion requires the existing SA + MFA + confirmation by the other SA | Seeding is idempotent | P0 |
| ADM-02 | **Role and permission management**: assign roles with scope and validity. Super Admin changes need a second SA's confirmation | SA | `role_assignments` | `rbac.manage` | — | No self-elevation (DB check) | A self-grant attempt fails | P0 |
| ADM-03 | **Audit log**: every sensitive action (who, what, when, before/after, request ID), hash-chained, searchable, exportable by SA only | SA | `audit_log` | `audit.read` | — | Append-only. Daily hash anchor exported off-site | A tampered row breaks chain verification | P0 |
| ADM-04 | **Admin overview dashboard**: KPIs, pending actions across modules, integration health, recent activity | SA | views | `admin.portal` | — | — | — | P0 |
| ADM-05 | **System settings** (club name and branding, contact, fees, thresholds, feature flags, leaderboard visibility, retention periods) | SA | `site_settings`, `system_settings` | `settings.manage` | — | Sensitive settings (finance thresholds) need two SAs | — | P0 |
| ADM-06 | **Reports**: membership, events, finance, HR, engagement. Scheduled monthly PDF summary to advisors | SA, TA | views | `report.*` | — | — | — | P2 |
| ADM-07 | **Backups and restore drills** (operational) | SA | — | — | Supabase backups + off-site `pg_dump` | — | A quarterly restore drill is documented | P0 |
| ADM-08 | **Notification centre and templates** (bilingual) | SA | `notification_templates` | `settings.manage` | — | — | — | P1 |
| ADM-09 | **Data retention jobs** per policy | — | `retention_policies` | `system` | — | — | — | P2 |
| ADM-10 | **Page builder CMS**: block-based pages (hero, rich text, stats, timeline, people grid, CTA, gallery, FAQ, embed), draft/preview/publish, version history, scheduled publish | ED, SA | `site_pages`, `page_versions` | `cms.page.*` | — | Sanitised blocks. Preview via signed draft token | Rollback to any version | P0 |
| ADM-11 | **Blog editor** with series, bilingual fields, cover, SEO, scheduled publish | ED | `posts` | `cms.post.*` | — | — | — | P1 |
| ADM-12 | **Media library**: upload, alt text (English and Bangla), caption, credit, category, event link, visibility, original preserved, responsive variants | ED | `media_assets` | `media.*` | Storage, image optimisation | EXIF/GPS stripped on public variants. Private bucket by default | — | P0 |
| ADM-13 | **Navigation editor** and announcement bar | ED | `navigation_items` | `cms.nav` | — | — | — | P1 |

### L. Future access and collaboration: member perks (PERK)

| ID | Requirement and objective | Users | Data | Perm | Deps / Int | Security / failure | Acceptance | P |
|---|---|---|---|---|---|---|---|---|
| PERK-01 | **Perks catalogue**: partner benefits, coupon codes, offer links, software or AI-tool offers, workshop discounts. Each has terms, partner, validity and eligibility (active members, min points, wing, role) | SA | `perks` | `perk.manage` | — | Each perk records **proof that BAUBC is permitted to distribute it** (partner agreement or public offer). Personal, non-transferable offers (e.g. Google's student AI plans, verified individually) are shared only as the official link, never as resold or forwarded personal codes | — | P2 |
| PERK-02 | **Distribution modes**: shared link, shared code, unique code pool (one per member), request-and-approve | M | `perk_codes`, `perk_claims` | self | — | Codes encrypted at rest. Revealed on claim. One claim per member per perk (unique constraint) | — | P2 |
| PERK-03 | **Claim tracking and inventory** (remaining, claimed, expired). Partner report (aggregate) | SA | views | `perk.manage` | — | — | — | P3 |
| PERK-04 | **Abuse controls**: claims only for Active members, rate limits, revocation of leaked codes | SA | — | — | — | — | — | P3 |

### M. Privacy and governance (PRIV), cross-cutting

| ID | Requirement and objective | Users | Data | Perm | Deps / Int | Security / failure | Acceptance | P |
|---|---|---|---|---|---|---|---|---|
| PRIV-01 | **Privacy notice** (bilingual) shown at intake. Records purpose, retention, sharing, rights and contact. Versioned | All | `privacy_notices` | `settings.manage` | — | Must be reviewed against the Personal Data Protection Act, 2026 (Act No. 63 of 2026) | — | P0 |
| PRIV-02 | **Consent records** per purpose (membership processing, public profile, photos in gallery, marketing email, social linking), each withdrawable | All | `consent_records` | self | — | — | — | P0 |
| PRIV-03 | **Data subject requests**: access (download my data), correction, erasure/withdrawal (with legal-hold exceptions for finance and audit) | All | `privacy_requests` | `privacy.handle` | — | Identity verified. Deadlines tracked | — | P1 |
| PRIV-04 | **Breach response runbook** and incident log | SA | `incidents` | `incident.manage` | — | — | Runbook rehearsed | P1 |
| PRIV-05 | **Data classification** (public / internal / confidential / restricted) on every column group, driving RLS, export and logging | — | schema comments | — | — | — | — | P0 |
| PRIV-06 | **Minors**: if anyone under 18 (e.g. olympiad participants from schools) registers, collect guardian consent fields | EP | `registrations.guardian_consent` | — | — | — | — | P2 |

---

## 7. Non-functional requirements (NFR)

| ID | Requirement | Target |
|---|---|---|
| NFR-01 Performance | Public pages: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 at p75 on mobile. JS on public routes ≤ 170 KB gzipped | Lighthouse CI budget gate |
| NFR-02 Availability | 99.5% monthly for public pages (static fallback). 99% for the dashboard | Uptime monitor |
| NFR-03 Data durability | RPO ≤ 24 h (daily backups) on the starter configuration. ≤ 5 min with PITR on the scaled configuration. RTO ≤ 4 h | Restore drill |
| NFR-04 Security | OWASP ASVS 5.0 Level 2 for authentication, session and access control. MFA for privileged roles | Pen-test checklist (Doc 10) |
| NFR-05 Accessibility | WCAG 2.2 AA (keyboard, focus visible, contrast, reduced motion, form errors) | axe CI + manual audit |
| NFR-06 i18n | English and Bangla, with `lang` attributes. Bangla line-height and fonts tuned | Visual review |
| NFR-07 Scale | 5,000 people records, 200 concurrent event registrants, 1,000 concurrent viewers on event pages | Load test |
| NFR-08 Low bandwidth | Images AVIF/WebP responsive. No autoplay video on `Save-Data`. Motion reduced on low-end devices | Manual |
| NFR-09 Observability | Error tracking, structured logs with request IDs, job and integration dashboards | — |
| NFR-10 Maintainability | Typed end-to-end (TypeScript 7 + generated DB types), migrations in version control, ≥ 80% coverage on domain functions | CI |

## 8. Explicitly out of scope (for now) and why

- **Scraping Facebook profiles or using members' Facebook logins.** This is prohibited by Meta's terms and unsafe. Not built.
- **Storing bKash PINs or any wallet credentials.** Never.
- **Automatic outgoing payments.** There is no publicly documented bKash payout API (Doc 7 §5). Disbursements are executed manually, then recorded and reconciled.
- **Full Gmail inbox mirroring.** Only labelled mail is synced.
- **AI-only grading of subjective work.** AI may *suggest* (e.g. a plagiarism or duplicate hint) but never decides points.
- **Native mobile apps.** A responsive PWA covers the need. Native apps can be reconsidered after a year of use.
