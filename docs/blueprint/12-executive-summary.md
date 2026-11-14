# Document 12: Executive Summary

**BAUBC Club Operating System: implementation blueprint · 14 November 2026 · Status: for review. Nothing is built yet.**

## 1. What we are building

One connected platform for Bangladesh Agricultural University Business Club. It has two sides:

- A **premium bilingual public website** (events, DECODED and Case Studies, wings, advisors, recruitment, certificate verification).
- A **club operating system**: provisioned accounts (no self-sign-up), a configurable membership lifecycle, teacher portals with mandate-based approvals, HR tasks with an append-only points ledger, events with real-time seat inventory and QR check-in, maker-checker finance, labelled Gmail ingestion, Facebook Page analytics, verifiable certificates and CVs, and member perks.

All of it sits on **one Postgres database with permissions enforced in the database**.

## 2. Recommended architecture and stack

| Layer | Choice (versions checked 14 Nov 2026) | Why |
|---|---|---|
| App | **Next.js 16.4** (React 19.3, TypeScript 7), one modular monolith: public site + portal + API routes | One deployable that student maintainers can run. Cache Components for a fast public site |
| Data / auth / storage / realtime | **Supabase Pro** (Postgres 17) in **Singapore**, behind a **club-owned API domain** | RLS, Auth with MFA and hooks, Storage, Realtime Broadcast, cron and queues in one managed service. The custom domain protects against ISP-level blocks like India's Feb 2026 block of `*.supabase.co` |
| Hosting | **Vercel Pro** (Singapore functions). Exit path: Cloudflare Workers via OpenNext | Best Next.js fidelity. Hobby is limited to non-commercial personal use |
| Business rules | **Postgres command functions** (seats, points, approvals, payments, transitions) + append-only ledgers + hash-chained audit | Invariants hold even if UI or server code has bugs |
| Jobs | Transactional outbox → Supabase Queues + pg_cron → worker route | No extra vendor, with idempotent retries and a dead-letter queue |
| Email | Resend (Pro during peak months) | The free tier's 100/day cap is too low for recruitment and Summit peaks |
| PDFs | HTML/CSS templates rendered by headless Chromium | Correct Bangla conjunct shaping (to be verified by spike DOC-S1) |
| UI | Tailwind 4 + Base UI + Motion 14 + GSAP 3.15. "Field & Signal" design system | Distinctive, accessible, fast on low-end Android |

**Running cost:** about **USD 56/month** normally and about **USD 76/month** in peak months, roughly **USD 760/year** (≈ BDT 93,000). A lean variant costs about USD 31–36/month (Doc 11).

## 3. Critical design decisions already embedded

1. **No self-sign-up, and no passwords from Google Forms.** The form submission provisions the account. The applicant receives a one-time activation link and sets their own password (or uses Google sign-in with the same verified email). This meets the brief's goal ("they can only log in") without storing passwords in a spreadsheet. Google Forms itself warns users never to submit passwords through it.
2. **A teacher profile grants nothing.** Decision power comes only from an explicit **mandate** (categories + amount ceiling + validity), and MFA is enforced in the database.
3. **"Approved" never means "paid".** Money moves outside the system (bKash app or bank). The platform records it, requires distinct makers, approvers, executors and reconcilers, and refuses to mark anything successful without a verified reference.
4. **Points and achievements are ledgers, not fields.** Corrections are reversal entries. Automation can only gate objective checks. Every quality judgement is human.
5. **Seats are a database inventory.** A single conditional update prevents overselling. Holds expire. Waitlists promote automatically. Viewers see counts within about 3 seconds through Realtime Broadcast.
6. **Integrations are minimal by design.** Gmail syncs only the labels the club chooses. Facebook data is aggregate unless a member links their identity by explicit opt-in.

## 4. Feasibility limitations (stated plainly)

| Requested | Reality | What we do instead |
|---|---|---|
| Password taken from a Google Form | Insecure, and Google's own Forms warning rules it out | Activation link or Google sign-in |
| Automated outgoing bKash payments | No public payout API. The B2C Payout page on bKash's developer portal is empty | Manual payout + recording + reconciliation |
| bKash checkout API for incoming payments | Documented and feasible, **but it needs a merchant account** (trade licence, TIN, bank account and so on, per secondary sources). A student club usually is not a legal entity | Stage 1: manual Send Money with TrxID verification. Stage 2: a merchant account through BAU or an aggregator |
| Verifying which member liked, commented on or shared a Facebook post | Comments: possible with conditions. Reactions: possibly. **Shares: not reliably available.** Profile URLs cannot be mapped to API IDs. Meta updates most Page Insights **once every 24 hours** | Opt-in comment-code linking, a feasibility spike (FB-1), and evidence + human review |
| Real-time Facebook metrics | Not offered by Meta | A daily sync labelled "updated daily" |
| Gmail data "appearing in the database" | Feasible. The best option (Gmail API push) needs an **Internal OAuth app in a GCP project owned by bau.edu.bd**. External apps need restricted-scope verification + an annual CASA assessment | Phase 1: Apps Script label sync every 5–10 min. Target: BAU-owned Internal app |
| Two Super Admin emails | The brief names two different institutional addresses (`businessclub@` and `businesslab@`) | The allowlist stays unseeded until one is confirmed |

## 5. Biggest risks (from the 89-item register in Doc 8)

1. **Seat race conditions at Summit registration opening.** Mitigated by atomic DB inventory and a 500-user load test before go-live.
2. **Club money in a personal wallet** (key-person and commingling risk). Use a dedicated club-only wallet with a custodian and deputy, independent weekly reconciliation, and pursue a merchant or institutional account.
3. **Fake or reused bKash TrxIDs.** TrxIDs are globally unique in the database, payments are never auto-verified, and a second verifier is required above a threshold.
4. **Losing admin access or an admin being phished.** Two Super Admins, mandatory TOTP, sealed recovery codes, a break-glass procedure, and organisation-owned accounts.
5. **An RLS mistake exposing personal data.** The permission matrix runs as automated tests on every pull request, and default-deny applies everywhere.
6. **Secrets leaking from a public repository.** This repo is public, so secret scanning from the first commit is required. No personal identifiers are committed (including in these docs).
7. **Key-person dependency on student developers.** Runbooks, organisation ownership with an advisor co-owner, and at least two maintainers.
8. **Cross-border hosting under the Personal Data Protection Act, 2026** (Act No. 63 of 2026, gazetted 10 Apr 2026). The design follows conservative privacy defaults. **Legal review is required before launch.**

## 6. Recommended MVP

**The MVP is the "Summit-ready foundation"** (Phases 0–2, ≈ 10 developer-weeks):
- Public site core: Home, About, Events, Event detail, Contact, Join, Login, plus a CMS for pages and media.
- Secure identity: provisioned accounts, two Super Admins with MFA, RBAC, audit.
- Events: ticket types, individual and team registration, guest registrants, live seat plot, holds, waitlist, QR tickets, offline-capable scanner.
- Payments: invoices, manual bKash claim, Finance Officer verification with separation of duties, receipts, cash book.

**Immediately after (MVP+):** membership operations for the recruitment cycle (Phase 3), then Summit certificates (Phase 7a).

## 7. Decisions needed before coding begins

| # | Decision | Owner |
|---|---|---|
| D-1 | **Which institutional address is Super Admin 2:** `businessclub@bau.edu.bd` (announced 7 Nov 2026) or `businesslab@bau.edu.bd`? | Executive + BAU IT |
| D-2 | **Exact Summit date**, registration opening date, fee, capacity and team rules | Event lead |
| D-3 | Approve "no self-sign-up: form → activation link" and "no passwords in forms" | Executive |
| D-4 | Name the **Teacher Approvers** and approve the default approval thresholds (≤ ৳2,000: one approver. ৳2,001–20,000: two distinct approvers. > ৳20,000 or prizes: two Teacher Approvers + SA acknowledgement) | Advisors |
| D-5 | Confirm the **teacher monthly dues** policy (৳500/month), including who pays and how reminders work | Advisors |
| D-6 | Approve Stage 1 payments through a **dedicated club-only bKash wallet** with a named custodian and deputy. Start Stage 2 merchant onboarding through BAU | Treasurer + advisors + BAU finance |
| D-7 | Domain name, and **who pays the USD subscriptions** (international card) | Executive + advisors |
| D-8 | **Data fiduciary** (BAUBC or BAU?), approval of Singapore hosting, and retention periods after legal review | Advisors + counsel |
| D-9 | Organisation-owned accounts (GitHub, Vercel, Supabase, Google Cloud, Meta Business) with an advisor as co-owner | Executive + advisors |
| D-10 | Public name, logo and brand assets. A native Bangla content editor | Executive |
| D-11 | Point policy v1, leaderboard visibility default, Best Member criteria | HR lead |
| D-12 | BAU IT: allow Apps Script on the club account now, and an Internal OAuth app later | BAU IT |
| D-13 | Approve the **"Field & Signal"** design direction ([`design-direction.html`](design-direction.html)) | Executive |

## 8. What requires institutional approval (BAU and advisors)

- A merchant or payment-gateway account, or use of a university account, for collecting fees online.
- Use of the `bau.edu.bd` Google Workspace for Apps Script now and an Internal OAuth app (Gmail API) later.
- Data-protection accountability (data fiduciary), cross-border hosting, the privacy notice and retention schedule.
- Teacher dues and any advisor financial-approval roles.
- Business Verification on Meta (if Advanced Access is needed), which may require university documents.
- Use of the university name and logo on certificates and the public site.

## 9. Postponed on purpose

bKash PGW until a merchant account exists. Automated payouts (no API). Gmail push (needs BAU IT). Facebook member-level matching (needs spike FB-1 and possibly App Review). WhatsApp/SMS. Native apps. AI review assistance (advisory only, later).

## 10. Next steps

1. The executive committee and advisors review this blueprint and the design specimen, and answer D-1 to D-13 (target: one week).
2. Create organisation-owned accounts and the domain. Run spikes AUTH-S1, FORM-S1, DOC-S1 and NET-S1.
3. Start Phase 1 (foundation) and Phase 2 (Summit track) in parallel, with a **go/no-go gate on 21 December 2026** and a documented fallback.
