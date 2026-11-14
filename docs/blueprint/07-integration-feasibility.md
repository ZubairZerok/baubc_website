# Document 7: Integration Feasibility Report

> Research date: **14 November 2026**. Facts are tagged **[Official]** (read on the vendor's own documentation), **[Secondary]** (third-party source, to be confirmed) or **[Inferred]** (our reasoning, not stated by the vendor). Sources are listed in [Document 13](13-sources.md).

## 0. Verdict summary

| Integration | Technical feasibility | Operational feasibility | Recommended path | Phase |
|---|---|---|---|---|
| Google Form → account provisioning | ✅ High | ✅ High (club controls the form) | Apps Script `onFormSubmit` → HMAC webhook, plus nightly reconciliation | P0 |
| Gmail (club mailbox) ingestion | ✅ High | ⚠️ Depends on BAU Workspace admin for the best option | **Phase 1:** Apps Script label-sync (5–10 min). **Target:** Gmail API push via an Internal OAuth app owned by bau.edu.bd | P1 / P3 |
| Google Calendar / Drive | ✅ High | ✅ (club-owned resources) | Optional: publish events to a club calendar. Drive is not needed (Storage covers files) | P3 |
| Facebook Page metrics | ✅ High (aggregate) | ⚠️ Needs a Meta app + a Page admin token. A system-user token needs a Business portfolio | Daily Graph API pull of post- and page-level metrics (current metric names) | P2 |
| Facebook member-level engagement | ⚠️ Partial / uncertain | ⚠️ May need App Review + Business Verification | Comment-code identity linking + comment matching (after **Spike FB-1**). Shares → evidence + human review | P3 |
| bKash incoming (manual Send Money) | ✅ (no API needed) | ⚠️ Personal-wallet governance risk | TrxID claim + maker-checker verification + reconciliation | P0 |
| bKash incoming (Tokenized Checkout) | ✅ High (documented API) | ❌ until a merchant account exists in an eligible name | Pursue merchant onboarding via BAU/club institutional channel. Integrate when credentials exist | P2 |
| bKash outgoing (B2C payout API) | ❌ Not publicly documented | ❌ Requires bKash business relationship | Manual payout outside the system, recorded + reconciled. Revisit if bKash offers payout access | — |
| Storage | ✅ | ✅ | Supabase Storage (private by default), optional R2 for off-site backups | P0 |
| Notifications (email/in-app) | ✅ | ✅ | Resend + in-app. WhatsApp/SMS later only via official providers | P0 / P2 |
| Background jobs | ✅ | ✅ | Postgres outbox + pgmq + pg_cron → worker route | P0 |

---

## 1. Gmail API and the club mailbox

**Facts established**
- `bau.edu.bd` mail is hosted on **Google Workspace** (MX `aspmx.l.google.com`, SPF includes `_spf.google.com`) **[Official DNS, 14 Nov 2026]**. A side observation: several of the domain's secondary MX records appear to be misconfigured (`alt1.aspmx.l.google.com.bau.edu.bd.`, missing trailing dot). Delivery still works via the primary MX, but BAU IT may want to fix it.
- `users.watch` must be renewed **at least every 7 days**. Google recommends **daily** renewal. Notifications carry only `emailAddress` and `historyId`, can be **delayed or dropped**, and are limited to one notification per second per user **[Official]**.
- Pub/Sub topic must grant publish rights to `gmail-api-push@system.gserviceaccount.com`. Domain-restricted sharing org policies can block this **[Official]**.
- `history.list` records are "typically available for at least one week". An out-of-range `startHistoryId` returns **HTTP 404** and requires a full sync **[Official]**.
- Scope classes: `gmail.labels` non-sensitive · `gmail.send` sensitive · **`gmail.readonly`, `gmail.metadata`, `gmail.modify` restricted** **[Official]**.
- Restricted scopes for **external** apps require verification plus an annual **CASA security assessment** and recertification **[Official]**. Apps used only within the organisation (project owned by the org, **Internal** user type) are exempt from OAuth verification **[Official]**. Whether they also skip CASA is **[Inferred]** (CASA is part of restricted-scope verification).
- **External apps in "Testing" status get refresh tokens that expire after 7 days** **[Official]**, which is unusable for a production sync.
- Refresh tokens also die when unused for 6 months, when the user changes their password (for Gmail scopes), when an admin restricts the service, or when there are more than 100 tokens per client **[Official]**.
- Workspace admins control third-party access (Security → Access and data control → **API controls**). They can block unconfigured apps and restrict Gmail high-risk scopes **[Official]**.
- Apps Script (Workspace account): trigger total runtime **6 h/day**, UrlFetch **100,000/day**, Gmail read **50,000/day**, 6 min per execution **[Official]**.

**Options compared**

| Option | Credentials | Approvals | Cost | Latency | Limitations | Verdict |
|---|---|---|---|---|---|---|
| **A. Apps Script label-sync inside the club mailbox** | Script runs as the mailbox owner. HMAC secret in Script Properties | Mailbox owner authorises the script once. Workspace admin must not block Apps Script / unverified internal scripts | $0 | 5–10 min | Polling. Script owned by a person account (use the club mailbox itself as owner). 6 h/day trigger budget (ample) | **Phase 1 (recommended now)** |
| **B. Gmail API + Pub/Sub push, Internal OAuth app in a bau.edu.bd-owned GCP project** | OAuth client + refresh token (or domain-wide delegation by admin), Pub/Sub topic + push subscription with OIDC auth | **BAU Workspace admin** must create or own the GCP project, set Internal, and allow the app | Pub/Sub free tier is ample at this volume **[Inferred]** | Seconds | Requires institutional IT cooperation. Watch renewal + history sync engineering | **Target (P3)** |
| C. External OAuth app with `gmail.readonly` | OAuth verification + CASA | Google Trust & Safety review, annual reassessment | Assessment cost (not published) | Seconds | Heavy compliance for one mailbox. Testing mode expires tokens in 7 days | ❌ Not recommended |
| D. Gmail filter auto-forward to an inbound-parse address | Forwarding address verification | Admin may disable external forwarding | $0–low | Seconds | Full message content leaves Google. Harder to minimise | Fallback only |

**Design (Option A):** club admins maintain Gmail **filters** that apply `BAUBC/Sync/<category>` labels (sponsor, partnership, speaker, university, event-application, payment). The script sends only labelled, not-yet-synced threads and only minimal fields (Doc 5 WF-13). Bodies and attachments are fetched on demand. The script adds `BAUBC/Synced`. **Nothing unlabelled is ever transmitted.**

**Failure modes and fallbacks**

| Failure | Detection | Response |
|---|---|---|
| Script disabled / authorisation revoked / password changed | `integration_connections.last_success_at` > 30 min | Alert both SAs. Runbook: re-authorise in the club mailbox. No data loss (labels persist, so the backlog syncs on recovery) |
| Webhook endpoint down | Script receives non-2xx | Script leaves the label unsynced, retries next run, logs to the script's sheet |
| Duplicate delivery | `UNIQUE(gmail_message_id)` | No-op |
| Wrong category | Human review of every proposal | Reviewer recategorises. Rule tuning |
| Malicious attachment | Type allowlist + size cap + malware scan | Quarantine, never auto-open, alert |
| Option B: missed Pub/Sub push / expired historyId | Periodic `history.list` sweep, 404 handling | Full sync of the label scope only |
| Option B: watch expiry | Daily renewal job + `expiration` monitor | Alert at T−24 h |

## 2. Google Workspace: Forms, Sheets, Calendar, Drive

- **Forms intake:** a form-bound Apps Script with an **installable** `onFormSubmit` trigger (UrlFetch needs authorisation, so a simple trigger cannot call it) posts an HMAC-signed payload (`Utilities.computeHmacSha256Signature`). Apps Script does **not** retry failed fetches automatically, which is why the nightly reconciliation (read the linked Sheet, re-post missing response IDs) is mandatory.
- **"Collect email addresses: Verified"** requires respondents to sign in with Google, giving a proven email. A respondent without a Google account uses the native form (email OTP) instead.
- **Passwords:** Google Forms itself warns users never to submit passwords through Forms. The intake never asks for one (PRD R-2).
- **Calendar (optional, P3):** push published events to a public club calendar. This needs a calendar owned by the club account and the Calendar API with a club-owned credential.
- **Drive:** not required. Using Drive for evidence would split the permission model, so files stay in platform Storage with RLS.
- **Workspace admin dependency:** if BAU's admin console blocks Apps Script for the club account, use the native intake form (P1) and Option D/B for Gmail.

## 3. Facebook Graph API (Meta)

**Facts established**
- Latest Graph API version is **v27.0, released 4 Nov 2026** **[Official changelog]**.
- **Page Insights:** requires `read_insights` + `pages_read_engagement` and a Page token from someone with the ANALYZE task. Insights are available only for Pages with **100+ likes** (BAUBC has 992 followers). **Most metrics update once every 24 hours**. Two years of history, with a 90-day max window per query **[Official]**.
- **Deprecated on 15 Nov 2025:** `page_impressions*` (use `page_media_view`), `post_impressions*` (use `post_media_view`), `page_fans`, `page_fan_adds`, `page_fan_removes` **[Official deprecated-metrics page]**. Additional deprecations around **June 2026** are reported for unique/reach metrics, but the official pages conflict on the date **[Official + Secondary]**. **Design consequence:** metric names live in configuration, and every snapshot stores the `api_version`. A metric that returns an error is marked unavailable, not zero.
- **Currently listed metrics include** `page_media_view`, `page_total_media_view_unique`, `page_post_engagements`, `page_follows`, `page_daily_follows_unique`, `post_media_view`, `post_reactions_*_total` **[Official reference; verify against the live API in Spike FB-2]**.
- **Comments:** `GET /{page-post-id}/comments?fields=from,message` returns `from {id, name}`, where the ID is **page-scoped (unique per user-Page pair)**. The guide lists `pages_manage_engagement`, `pages_read_engagement`, `pages_read_user_engagement` and the MODERATE / CREATE_CONTENT tasks. The permissions reference lists `pages_read_user_content` for reading user comments **[Official, with internal inconsistency]**.
- **Reactions edge** returns a list of profile nodes with a reaction `type`, plus summary counts **[Official]**. The permissions needed are not stated on the page **[Unconfirmed]**.
- **Sharedposts edge** returns post nodes. The documentation does not establish that individual sharers are identifiable **[Official: silent]**. Treat per-member share verification as **not reliably available**.
- **Webhooks (`feed` field):** require `pages_manage_metadata` + `pages_show_list`. "All Page-related permissions and features require approval through App Review" before go-live **[Official]**.
- **Access levels:** Business apps get **Standard Access** automatically, which works **only for users who have a role on the app**. **Advanced Access** requires App Review per permission + **Business Verification** (and annual Data Use Checkup) **[Official]**. Development-mode apps can request any permission from app-role users **[Official]**.
- **Tokens:** Page tokens derive from user tokens and expire. **System user tokens** (Business portfolio) are the documented route to non-expiring tokens **[Official]**.
- **Rate limits:** Business Use Case limit for Pages calls = 4,800 × engaged users per 24 h. Throttle error 80001 **[Official]**. At BAUBC's scale this is far beyond needs.

**Capability matrix for the club's goals**

| Goal | Availability | Requirement | Plan |
|---|---|---|---|
| Page-level totals (views, follows, engagements) | ✅ Technically available | Page admin token (Standard Access OK for the club's own admins) | Daily sync, labelled "updated daily" |
| Post-level metrics (views, reactions by type, comments count, shares count) | ✅ Technically available | Same | Daily sync per post for 90 days after publish |
| Real-time metrics | ❌ Not available (24 h refresh) | — | Never promise real time |
| Which member commented on a post | ⚠️ Available with conditions | `from` on comments + page-scoped ID ↔ member link. Permissions for non-role users may need Advanced Access | **Spike FB-1**. If it fails → evidence + human review |
| Which member reacted | ⚠️ Possibly available | Reactions edge lists profiles. Same permission question | Spike FB-1 |
| Which member shared | ❌ Not reliably available | — | Evidence (link to the share + screenshot) + human review |
| Member's profile URL → API identity | ❌ Not available | — | Comment-code linking (Doc 5 WF-14) |
| Private profile data, scraping, member logins | ❌ Prohibited / unsafe | — | Never |

**Credentials and approvals needed:** a Meta developer app (Business type) owned by the club's Business portfolio, a Page admin who is also an app admin, permissions `pages_show_list`, `pages_read_engagement`, `read_insights` (+ `pages_read_user_content` / `pages_manage_metadata` if FB-1 proves they are needed), Business Verification (if Advanced Access is needed, which requires a legal entity document; **the club may need BAU's documents**, see Doc 12), and App Review with a screencast.

**Failure modes and fallbacks:** token expiry → alert at T−7 days, re-auth runbook. Permission revoked or API change → the integration goes to `degraded`, the dashboard shows stale data with a timestamp, and social tasks fall back to evidence review. Metric deprecation → the configurable metric registry marks it unavailable. Rate limit → back off using the `X-Business-Use-Case-Usage` header.

**Spikes:**
- **FB-1 (2 days):** in Development mode with the club Page, (a) read comments with `from` from a non-app-role test account, (b) read reactions with profile IDs, (c) verify which permissions and access level are required. Output: go/no-go for API-matched social tasks.
- **FB-2 (0.5 day):** call each configured insight metric on v27.0 and record which return data.

## 4. bKash: incoming payments

### 4a. Stage 1: manual "Send Money" to the club's designated number

- **Feasible without any API.** The payer sends money in their own bKash app, and the platform records a **claim** (TrxID, sender last 4, amount, time) that a Finance Officer verifies against the receiving wallet's statement or SMS (Doc 5 WF-10a).
- **Limits:** the official bKash limits page lists Send Money caps that secondary sources read as **৳50,000 per transaction/day and ৳300,000 per month** **[Secondary; confirm in the bKash app]**. During the Summit, a single personal wallet could approach its **receiving** limits. Confirm the receiving limits for the club's account type.
- **Governance risks (important):**
  1. Club money sits in an **individual's personal wallet**. That is a key-person risk (the custodian graduates, loses the phone, or a dispute arises) and commingles personal and club funds.
  2. Receiving recurring payments from hundreds of payers into a personal account may conflict with the wallet provider's terms for personal accounts **[Inferred; confirm with bKash]**.
  3. **Recommendation:** for Stage 1, use a **dedicated SIM and wallet used only for club funds**, with a named custodian and a deputy. Do weekly statement reconciliation by someone other than the custodian. Pursue Stage 2 before the next recruitment cycle.
- **What the platform guarantees:** no TrxID can be used twice, no seat or dues are confirmed without human verification, every verification is attributable, and the verifier is never the payer.

### 4b. Stage 2: bKash Tokenized Checkout (merchant)

- **Documented APIs [Official, developer.bka.sh]:** Grant Token / Refresh Token (token lifetime **3,600 s**, refresh between minutes 50–55, **no more than two grant/refresh calls per hour** or refresh is blocked for an hour), Create Payment, Execute Payment, Query Payment, Search Transaction, Refund (+ Refund Status), agreement-based (tokenised wallet) flows, and Auth & Capture. **30 s timeout** on all APIs. `paymentID` is valid 24 h and can be executed once. Duplicate execute → `2062`. If execute times out → **Query Payment**. Refunds: **partial allowed (up to 10 per transaction), within 60 days, no duplicate refund within 10 minutes**. IPN: SNS-style signed notifications for **successful** transactions, with the listener URL provisioned by bKash. Sandbox host `tokenized.sandbox.bka.sh`.
- **Merchant eligibility:** the official business pages could not be read (HTTP 403). Secondary sources say onboarding asks for a **trade licence, TIN, bank account, NID of the signatory and a business URL**, and that direct merchant accounts may need Bangladesh Bank approval. Aggregators (SSLCommerz, shurjoPay, aamarPay) ask for similar documents, and SSLCommerz lists separate categories for **education** and **non-profit (NGO Bureau documents)** **[Secondary]**.
- **Operational reality:** a student club is usually **not a legal entity** and has no trade licence. Realistic routes are (1) through **BAU's finance office / an institutional merchant account** that the club can use under a sub-account or invoice reference, (2) through an aggregator under the university's documents, or (3) registering a legal entity (not recommended for a student club). **This requires institutional approval** (Doc 12).
- **Fees:** MDR not published on the developer docs. Secondary sources cite roughly 1.5–2% for bKash and 1.85–2.1% for aggregator MFS **[Secondary; get a written rate card]**.
- **Integration effort once credentials exist:** about 5–7 developer-days including sandbox tests, IPN verification, timeout/query recovery, refunds and reconciliation.

## 5. bKash: outgoing payments (disbursements)

- bKash markets **"B2C payout"** to businesses **[Secondary: bkash.com business page via search]**. The developer portal has a **"B2C Payout" page whose body is empty** (updated 2026-09-20) **[Official]**. **No public endpoint specification, preconditions or limits exist.** Third-party packages and aggregators (PayStation, dLocal) indicate payouts exist for business clients under separate agreements **[Secondary]**.
- **Conclusion:** automated outgoing transfers are **not feasible now**. They would require a merchant account plus a separate disbursement agreement, a pre-funded disbursement wallet and bKash approval, none of which a student club has.
- **Fallback (designed in):** the platform does approvals, maker-checker, execution *recording* and reconciliation. The **payout itself is performed manually** by an authorised executor in the bKash app or bank, who uploads proof and the TrxID. A different person verifies it against the statement (Doc 5 WF-11). This is safe and auditable without an API.

## 6. Storage

| Item | Detail |
|---|---|
| Provider | Supabase Storage (S3-compatible API). Pro includes **100 GB**, then $0.0213/GB **[Official pricing]** |
| Credentials | Server uses the secret key for privileged operations. Clients get **signed URLs** (≤ 10 min) after an RLS check |
| Buckets | `public-media`, `private-media`, `evidence`, `documents`, `templates`, `exports` (Doc 3 ADR-08) |
| Image optimisation | Pre-generate variants at upload (worker, sharp). Avoids per-transformation billing (Vercel Pro from $0.05 per 1,000. Supabase Pro 100 origin images then $5 per 1,000) **[Official pricing]** |
| Off-site copies | Cloudflare R2: $0.015/GB-month, free egress, 10 GB-month free **[Official pricing]** |
| Failure modes | Storage outage → uploads queue client-side with retry. Public media served from CDN cache. Accidental public upload → `media_assets` CHECK requires alt text and explicit publish. Bucket policy denies public listing |
| Limitations | Large video: link to Facebook/YouTube embeds instead of storing it (bandwidth) |

## 7. Notifications

| Channel | Provider | Credentials | Cost | Limits / notes |
|---|---|---|---|---|
| Email (transactional) | **Resend** | API key (server-only), verified sending domain (SPF/DKIM/DMARC) | Free: **3,000/mo, 100/day**. Pro **$20/mo for 50,000** **[Official]** | Free tier's 100/day cap is too low for recruitment and Summit peaks. Upgrade seasonally |
| Email (fallback) | Amazon SES | IAM key | **$0.10 per 1,000** **[Secondary]** | Needs AWS account + sandbox exit request |
| In-app | Supabase Realtime private channels + `notifications` table | — | Included | Dedupe via `UNIQUE(person_id, dedupe_key)` |
| Web push (optional, P2) | Standard Web Push (VAPID) | VAPID keys | $0 | iOS needs an installed PWA |
| SMS / WhatsApp (P3) | Only official BSPs (e.g. WhatsApp Business Platform via Meta, licensed BD SMS aggregators) | Business verification | Per message | Template approval required. No unofficial gateways |

**Anti-spam:** one digest per day for non-urgent items, deduplication keys, quiet hours (23:00–07:00 BST) except security alerts, and user preferences per notification type.

## 8. Background jobs

| Item | Detail |
|---|---|
| Mechanism | Postgres outbox → Supabase Queues (`pgmq`) → `pg_cron` (every minute) → `pg_net` HMAC POST → `/api/jobs/run` |
| Credentials | Shared HMAC secret in Supabase Vault + Vercel env |
| Cost | Included in Supabase Pro + Vercel function usage |
| Limitations | `pg_cron` minimum interval is 1 minute (seconds-level schedules exist in newer versions but are not needed). Vercel function duration limits apply, so batch large jobs |
| Failure modes | Worker down → queue grows → System Health alert at depth > 200 or age > 10 min. Poison message → DLQ after 8 attempts. Cron not firing → Sentry cron monitor alert |
| Upgrade path | Inngest (free 50,000 executions/mo, Pro from $99/mo **[Official]**) for complex multi-step workflows |

## 9. Feasibility spikes to run before full build (week 1–2)

| Spike | Question | Exit criterion |
|---|---|---|
| **AUTH-S1** | Can Supabase Auth with sign-ups disabled + the Before User Created hook + admin `generateLink` deliver club-domain activation links? | An end-to-end activation works on the custom auth domain. A direct sign-up is blocked |
| **FORM-S1** | Does BAU Workspace allow an installable Apps Script trigger with UrlFetch on the club account? | A signed webhook is received from a test form |
| **GMAIL-S1** | Same for a Gmail label-sync script, and does the admin console block it? | Labelled test mail arrives within 10 min |
| **FB-1 / FB-2** | Comment/reaction attribution and permissions. Live metric names | Go/no-go recorded |
| **DOC-S1** | Chromium PDF rendering of 50 Bangla names + certificate template on Vercel within memory/time limits | Pixel-perfect conjuncts. ≤ 4 s per PDF warm |
| **RT-S1** | 1,000 simulated viewers + 500 concurrent seat attempts on staging | Zero oversell. Broadcast p95 ≤ 3 s |
| **NET-S1** | Latency from Mymensingh mobile networks to Singapore vs Mumbai Supabase regions | Region decision recorded |
