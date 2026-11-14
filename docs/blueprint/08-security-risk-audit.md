# Document 8: Security, Privacy and Risk Audit

> Prepared as a pre-implementation audit, written from the perspective of a penetration tester and a systems auditor. **Nothing here is legal advice.** Items marked ⚖️ require review by a qualified Bangladeshi lawyer and/or BAU's administration before launch.

## 1. Assets, actors and trust boundaries

| Asset | Classification | Why it matters |
|---|---|---|
| Student and teacher personal data (names, student IDs, phones, photos, emails) | Confidential / Restricted | Privacy harm, PDPA obligations, trust |
| Membership decisions and history | Internal | Fairness, disputes |
| Points ledger, achievements, certificates | Internal → public on publish | Credibility of CVs and certificates |
| Money: payment claims, disbursements, wallet balance | Restricted | Direct financial loss, reputational damage to the club and advisors |
| Admin and Teacher Approver accounts | Restricted | Full compromise path |
| Integration credentials (Meta, Google, bKash, Resend, HMAC secrets) | Restricted | Lateral compromise |
| Audit log | Restricted | Accountability. It must survive insider tampering |

| Threat actor | Motivation | Typical vector |
|---|---|---|
| Curious or ambitious member | More points, better CV, a recognition award | Fake evidence, collusion, request tampering |
| Insider with a role (HR, lead, finance) | Favouritism, embezzlement | Abuse of approvals, self-dealing |
| External attacker | Data theft, defacement, fraud | Phishing, credential stuffing, XSS, leaked secrets |
| Opportunistic fraudster | Free event access, payment fraud | Reused TrxIDs, QR sharing |
| Automated bots | Spam, seat hoarding | Registration endpoints, contact form |

**STRIDE summary:** *Spoofing* is countered by provisioned accounts only, MFA and signed webhooks. *Tampering* by append-only tables, a hash-chained audit and command functions. *Repudiation* by attributable actions, request IDs and an immutable audit. *Information disclosure* by RLS default-deny, a private schema, signed URLs and minimal public projections. *Denial of service* by CDN caching, rate limits, short holds and Turnstile. *Elevation of privilege* by no client write grants, SoD rules, second-Super-Admin confirmation and DB-side permission checks.

## 2. Authentication security (Phase 15.1)

| Control | Implementation |
|---|---|
| Verified identity | No self-sign-up. Activation link proves inbox ownership. Google Form "Verified" emails. The Before User Created hook rejects unknown emails |
| Password handling | Supabase Auth (bcrypt). Minimum 10 characters, breached-password check (HIBP k-anonymity) on set/change. Paste allowed. Password managers supported |
| Password reset | Time-limited single-use link to the club domain. Generic response (no enumeration). Resetting revokes other sessions |
| Session expiry | Access token ~1 h (refresh rotation). Privileged sessions: 12 h absolute, 30 min idle on finance screens. "Sign out everywhere" |
| Session revocation | On password change, suspension or privileged-role revocation. Admins can revoke any session |
| MFA | TOTP mandatory for SA, TA, FO and any holder of privileged permissions. `aal2` is checked inside Postgres for privileged commands. Recovery codes are generated at enrolment |
| Admin recovery | Two SAs. Sealed offline recovery codes held by an advisor. Break-glass procedure (§6) |
| Rate limiting | Vercel Firewall rules on `/login`, `/activate`, `/reset`, registration and webhooks. Supabase Auth rate limits. Per-account lockout (10 failures → 15 min) with notification |
| Abuse prevention | Turnstile after 3 failures and on public forms. New-device sign-in emails. Disposable-email flags on guest registrations |

## 3. Authorisation security (Phase 15.2)

- RBAC with scopes and mandates, resolved **live in the database** (Doc 2).
- **RLS on every table in exposed schemas.** Restricted data lives in a non-exposed `private` schema.
- **No direct client writes** to ledgers, histories, approvals, finance or roles. Writes happen only through `SECURITY DEFINER` command functions with a fixed `search_path`, explicit permission, aal2 and SoD checks, and an audit row in the same transaction.
- **Protected server actions and route handlers:** each validates input (Zod), verifies the session server-side (`getUser()`/claims verification, never just a cookie's presence) and calls a command function. CSRF protection comes from Next.js Server Actions' origin checks, `SameSite=Lax` cookies and an origin check on custom route handlers.
- **Least privilege:** the service/secret key is used only in the job worker and admin provisioning code paths, wrapped in a module that logs every use.
- **Verification:** the permission matrix is executed as pgTAP tests (positive and negative per role) in CI, together with Supabase's database linter (security advisor) on every migration.

## 4. Sensitive credentials (Phase 15.3)

| Secret | Location | Rotation | Never |
|---|---|---|---|
| Supabase secret (service) key | Vercel env (prod only), GitHub Actions secret for backups | Yearly + on staff change | In client bundles (CI greps build output), in repo, in logs |
| Supabase publishable key | Client (by design) | — | Treated as sufficient for access. RLS is the guard |
| bKash app key/secret, username/password (Stage 2) | Vercel env (prod) | Per bKash policy + on staff change | In frontend, in DB tables readable via API |
| Meta system-user / Page token | Supabase Vault (referenced by ID) | 60 days or on expiry | In logs or exports |
| Google Apps Script HMAC secrets | Script Properties (club account) + Vercel env | Yearly | In the script source |
| Resend API key | Vercel env | Yearly | — |
| Encryption keys for restricted columns | Vercel env (KEK) + Vault (DEK, wrapped) | Yearly with re-wrap | In DB plaintext |
| Personal identifiers of Super Admins | Private env `SUPER_ADMIN_BOOTSTRAP` | — | **In this public repository** |

**This repository is public.** Secret scanning (GitHub native + `gitleaks` in CI + pre-commit) is mandatory from the first commit. Personal email addresses and phone numbers from the brief are deliberately **not** written in these documents.

## 5. Financial security (Phase 15.4)

| Requirement | Control |
|---|---|
| Maker-checker | Approval engine with policy snapshots. Maker ≠ approver. Distinct approvers per step. Executor ≠ approver. Reconciler ≠ executor |
| Idempotency | Idempotency keys on payment initiation, registration and disbursement execution. PGW `paymentID` executed once |
| Duplicate detection | Global unique TrxID (incoming and outgoing). Duplicate-payee/amount soft block on disbursements. Invoice-level lock |
| Transaction verification | Manual: verifier matches against the wallet statement. PGW: server-side Execute/Query (never trust the callback query string), SNS signature verification on IPN |
| Immutable records | `finance_entries`, `payments` history, `approval_actions` and audit are append-only |
| Financial audit history | Every state change is in `audit_log`. The monthly finance report is signed off by a Teacher Approver |
| Restricted export | `finance.export` needs FO or SA plus MFA. Exports are watermarked with the requester and time, and expire after 24 h |
| Reconciliation | Weekly for wallets, monthly for budgets. Unmatched items block month close |
| Approval revocation policy | An approval can be revoked only before execution starts. After that, it goes through cancellation or refund flows. Revocations are logged with a reason |
| No PINs or credentials | The platform never asks for or stores bKash PINs or OTPs. Payment happens in bKash's own app or page |

## 6. Administrative protection (Phase 15.6) and break-glass

1. **Explicit allowlist:** Super Admins come only from `private.privileged_identities`, seeded from a private secret. Seeding is then locked.
2. **Email ownership:** activation via a link to that inbox, then MFA enrolment, before the role becomes effective.
3. **MFA required** for all privileged actions (aal2 in the DB).
4. **Every sensitive action is logged** and pushed to both SAs' notification feeds (role grants, policy changes, disbursement approvals, bulk actions, exports).
5. **Protected role changes:** a second SA must confirm within 72 h (SoD-8). Self-grants are impossible.
6. **Destructive operations:** typed confirmation, batch caps and soft-delete for content. Ledgers have no delete path at all.
7. **Last Super Admin** cannot be removed (function check + deferred constraint).
8. **Break-glass procedure** (documented, rehearsed yearly). If both SAs are locked out: (a) the technical custodian and two advisors meet in person, (b) they open the sealed recovery codes, or (c) the custodian runs a reviewed SQL script (via the Supabase dashboard, with the project owned by a club organisation account whose credentials are split between two advisors) to re-enable an SA after identity verification, (d) everything is logged and reported to all advisors.
9. **Supabase/Vercel/GitHub organisation ownership:** owned by **club organisation accounts** (not a student's personal account), with at least two owners including one advisor. This is critical for continuity across committee changes.

## 7. Data privacy (Phase 15.5)

| Principle | Design |
|---|---|
| Privacy notice | Bilingual. Shown at intake and registration. Versioned. Covers purposes, data categories, retention, recipients (processors: Supabase, Vercel, Resend, Google, Meta), cross-border hosting, rights and contact |
| Explicit consent where required | Separate consents for public profile listing, gallery photos, marketing email and social-identity linking. Each can be withdrawn |
| Purpose limitation | Data collected for membership is not reused for unrelated purposes without new consent |
| Data minimisation | **No national ID, no date of birth unless needed (minors), no religion, no biometrics**. Phone is restricted and encrypted. Gmail: labelled subset and snippets. Facebook: page-scoped IDs only after opt-in |
| Access by the person | Self-service "Download my data" (JSON + PDF summary) |
| Correction | Profile correction workflow (WF-16) |
| Withdrawal / erasure | Privacy requests (WF-19), with legal holds for finance and audit |
| Retention | Policy table (Doc 4 §9) with automated purge/anonymise jobs |
| Secure deletion | Hard delete or anonymise in DB. Storage objects deleted. Backups age out on their retention cycle (documented) |
| Access logging | Reads of restricted fields go through functions that log the access (who viewed whose phone number, and why) |
| Breach handling | Runbook: contain → assess → notify the Authority and affected people where required ⚖️ → remediate → post-mortem |
| Third-party review | A processor register lists each vendor, data shared, region and DPA link, reviewed yearly |
| Public directories | Off by default. Only finalised members who opt in. Phone and personal email are never public |

## 8. Legal and regulatory position (Bangladesh) ⚖️

**What was verified on the official site:** the Act at `bdlaws.minlaw.gov.bd/act-1692.html` is published in the **Bangladesh Gazette (Extraordinary) of 10 April 2026** as **Act No. 63 of 2026**, with Presidential assent on 10 April 2026 (27 Chaitra 1432). The official text is in Bangla using a legacy font encoding that could not be machine-extracted. Its embedded English defined terms include *Personal Data, Sensitive Personal Data, Financial Data, Health Data, Biometric Data, Genetic Data, Data-fiduciary, Significant data-fiduciary, Chief Data Officer, Personal Data Breach, Encryption, Pseudonymized Data, retention, portability, Federated Interoperable Ecosystem* and *proportionality*.

**What secondary sources report (to be confirmed by counsel):**
- It replaced the Personal Data Protection Ordinance, 2025. Most provisions are deemed effective from **6 Nov 2025**. Sections 23 and 31–35 take effect on a gazette-notified date.
- Lawful bases include consent (clear, specific, freely given, revocable) and contract, legal obligation and vital interests. The controller bears the burden of proving consent. Children are under 18, with verifiable guardian consent required.
- Data subject rights: access, correction, erasure, consent withdrawal, objection and portability.
- Obligations: purpose limitation, necessity and proportionality, security safeguards (encryption, pseudonymisation), breach reporting to the Authority within a prescribed time, **record keeping for at least five years**, and a Chief Data Officer for significant data-fiduciaries.
- **Cross-border transfer:** the sources describe data classification (public / internal / confidential / restricted) and conditions or notification for some transfers, with **no clear general prohibition on foreign hosting**. They disagree on details.
- Penalties: reported up to Tk 25 lakh (Tk 50 lakh for significant fiduciaries), with director/employee liability.

**Design stance until legal review:** treat BAUBC (or BAU, depending on who the data fiduciary is) as a **data fiduciary**. Implement consent, notice, rights, minimisation, security, breach and record-keeping as if all provisions apply. Avoid categories likely to be "sensitive" or "restricted" (biometrics, national IDs). Document the Singapore hosting and its safeguards in the notice.

**Questions for counsel and BAU:**
1. Is the data fiduciary **BAUBC**, **BAU** or both? This affects who signs vendor agreements and who is accountable.
2. Is hosting student and teacher personal data in Singapore permitted, and under what conditions or notifications?
3. Required breach-notification timeline and authority contact.
4. Is a Chief Data Officer required (are we "significant")? Probably not, but it should be confirmed.
5. Retention minimums for financial records of a student organisation.
6. Requirements for processing minors' data at school-level olympiads.
7. Whether personal-wallet collection of club funds is compatible with university finance rules (also a bKash terms question).

**Platform policies that also bind us:** Google API Services User Data Policy (Gmail / Forms data use), Meta Platform Terms and Developer Policies (no scraping, data deletion callback, privacy policy URL), bKash merchant terms (Stage 2), and BAU's IT, acceptable use and student organisation rules ⚖️.

## 9. Ranked risk register (Phase 16)

**Scoring.** L = likelihood (1 rare … 5 almost certain). I = impact (1 negligible … 5 severe). Score = L × I, rated **Critical ≥ 15, High 10–14, Medium 5–9, Low ≤ 4**. Scores are **inherent** (before controls). They rank where controls and tests must be strongest. The *Prevention* column lists the designed controls. Owners: **SA** Super Admin, **TA** Teacher Approver/advisor, **FO** Finance Officer, **HR**, **EM** Event Manager, **CE** Content Editor, **Dev** technical lead/maintainers.

| Rank | ID | Area | Risk / failure | L | I | Score | Severity | Detection | Prevention | Recovery | Owner |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | EVT-01 | Events | Simultaneous registrations for last seats | 5 | 4 | 20 | Critical | Load tests; seat reconciliation job | Single-statement conditional UPDATE with row lock; CHECK sold+held≤capacity | Not expected; if counters drift → audited correction + waitlist handling | Dev |
| 2 | GEN-16 | Platform | Key-person dependency (student developers graduate) | 4 | 4 | 16 | Critical | Bus-factor review each term | Docs, runbooks, IaC, ≥2 maintainers, handover checklist, advisor holds org ownership | Onboard successor from docs | TA |
| 3 | PAY-01 | Payments | Fake or reused TrxID claims | 4 | 4 | 16 | Critical | Global TrxID uniqueness; verifier statement check | Never auto-verify; UNIQUE(provider,trx_id); second verifier above threshold | Reject claim; integrity flag; release hold | FO |
| 4 | ACC-04 | Account | Super Admin access lost (lost phone/MFA, graduated, forgot password) | 3 | 5 | 15 | Critical | Admin health check: both SAs logged in within 60 days; MFA backup codes registered | Two SAs; offline backup codes in sealed envelope with an advisor; documented break-glass | Break-glass: second SA resets; if both lost, DB-level recovery by technical custodian with two advisors present, fully logged | SA |
| 5 | ACC-12 | Account | Phishing of admin credentials | 3 | 5 | 15 | Critical | Login from new device/country alerts; MFA failures | TOTP MFA mandatory; security briefing; passkeys later | Revoke sessions; reset; audit actions since compromise | SA |
| 6 | GEN-07 | Platform | Incorrect RLS policy exposes data | 3 | 5 | 15 | Critical | Automated RLS matrix tests; Supabase security advisor; periodic review | Default-deny; policy review checklist; restricted data in private schema | Hotfix policy; assess logs; breach procedure if exposure | Dev |
| 7 | GEN-11 | Platform | Secret leaked in public GitHub repo | 3 | 5 | 15 | Critical | GitHub secret scanning + gitleaks in CI | No secrets in repo; env-only; pre-commit hooks | Rotate secret immediately; audit usage | Dev |
| 8 | PAY-13 | Payments | Personal-wallet custodian risk (club money in an individual's wallet) | 3 | 5 | 15 | Critical | Weekly balance attestation by second person | Dedicated club-only SIM/wallet; custodian + deputy; move to merchant/institutional account (Stage 2) | Custodian handover protocol; legal/institutional escalation | TA |
| 9 | EVT-02 | Events | Seat overselling via manual/offline additions | 3 | 4 | 12 | High | Offline/admin registrations use same function; nightly reconciliation | fn_reserve_seat for all sources; capacity guard | Upgrade venue / move to waitlist with apology & refund | EM |
| 10 | EVT-13 | Events | Registration-open traffic spike overwhelms system (Summit launch) | 3 | 4 | 12 | High | Load test; real-time monitoring | CDN-cached public pages; realtime visibility-based subscribe; DB function efficiency; pre-scale compute for launch day | Temporarily enable queue/waiting room page; extend hold durations | Dev |
| 11 | GEN-08 | Platform | Data leakage via exports / screenshots / logs | 3 | 4 | 12 | High | Export audit; log scrubbing tests | Field-level export permissions; watermarking; PII redaction in logs | Revoke access; breach assessment | SA |
| 12 | GEN-14 | Platform | XSS via CMS content or user bios | 3 | 4 | 12 | High | CSP violation reports; security tests | Structured blocks (no raw HTML); sanitisation; nonce CSP | Purge content; rotate sessions if needed | Dev |
| 13 | GEN-18 | Platform | Cross-border data hosting non-compliance (PDPA 2026) | 3 | 4 | 12 | High | Legal review checklist | Data minimisation; encryption; notice of transfer; legal review before launch | Adjust hosting/regions per advice | TA |
| 14 | PAY-04 | Payments | Payment succeeds but browser closes before callback | 3 | 4 | 12 | High | Pending-PGW sweeper (Query Payment every 5 min for 24 h) | IPN listener + sweeper; never rely on browser | Auto-confirm on Completed; notify payer | Dev |
| 15 | PAY-12 | Payments | Reconciliation mismatch (ledger vs wallet statement) | 3 | 4 | 12 | High | Weekly reconciliation; unmatched items queue | Reconciler ≠ executor; append-only entries | Investigate; correcting journal with approval | FO |
| 16 | PTS-06 | Points | HR / lead collusion (approving friends) | 3 | 4 | 12 | High | Reviewer-member affinity analytics; random audits by SA/TA | SoD (reviewer≠submitter, ≠assigner for high value); 4-eyes above threshold; rotation | Reverse; revoke review rights; recognition re-evaluation | SA |
| 17 | ACC-13 | Account | Account enumeration / credential stuffing on /login | 4 | 3 | 12 | High | Auth audit spikes; firewall metrics | Generic errors; rate limits per IP/account; Turnstile after failures; breached-password check | Temporary lock; force reset for affected | Dev |
| 18 | EVT-04 | Events | Abandoned checkout hoards seats | 4 | 3 | 12 | High | Active holds dashboard | Short holds (15 min online); max 3 holds/identity/hour; Turnstile | Expiry job releases; waitlist promotion | Dev |
| 19 | EVT-10 | Events | QR code reuse / screenshot sharing | 4 | 3 | 12 | High | Duplicate scan result logged with first scan details | Single-use per session (partial unique); name+photo/avatar shown; optional rotating QR | Deny entry; investigate registration | EM |
| 20 | GEN-03 | Platform | Email delivery failure (bounces, daily cap hit) | 4 | 3 | 12 | High | Delivery webhooks; cap monitoring | Resend Pro during peaks; SPF/DKIM/DMARC; in-app fallback | Resend; switch provider (SES) | Dev |
| 21 | PTS-02 | Points | Fake / reused evidence (screenshots, recycled posters) | 4 | 3 | 12 | High | SHA-256 + perceptual hash near-duplicate flags; 5% random audits | Human review for evidence tasks; integrity flags | Reverse points; integrity warning; repeat → suspension review | HR |
| 22 | ACC-09 | Account | Role escalation (user grants self admin / edits role in browser) | 2 | 5 | 10 | High | pgTAP RLS matrix in CI; privileged change feed to both SAs | No client write grants on role tables; fn_grant_role SoD-7; SA grants need second SA (SoD-8); permissions read from DB not JWT | Revoke; incident review; rotate sessions | Dev |
| 23 | ACC-14 | Account | Google Form used to collect passwords (if someone edits the form) | 2 | 5 | 10 | High | Intake processor rejects password-like keys and alerts | Policy + form ownership by club account; schema allowlist | Delete responses containing secrets; notify affected; reset | SA |
| 24 | GEN-01 | Platform | Database outage | 2 | 5 | 10 | High | Uptime + Supabase status | Managed Postgres; static public cache; read-only banner mode | Wait/failover; restore from backup if corruption (RPO 24h starter / 5 min with PITR) | Dev |
| 25 | GEN-06 | Platform | Broken migration in production | 2 | 5 | 10 | High | CI migration test on empty + prod-like snapshot | Expand/contract; backup before migrate; low-traffic windows | Roll forward fix; restore if data loss | Dev |
| 26 | PAY-06 | Payments | Disbursement to wrong recipient | 2 | 5 | 10 | High | Payee account confirmation (last 4 shown at approval & execution) | Payee master data verified; maker-checker; executor re-confirms | Contact bKash support immediately; recovery request; incident report | FO |
| 27 | PAY-10 | Payments | Unauthorised financial approval | 2 | 5 | 10 | High | Approval actions audit; both SAs notified of disbursement approvals | Mandates with ceilings; aal2; SoD-1..3; policy snapshot | Cancel before execution; if executed → recovery + incident | SA |
| 28 | PAY-14 | Payments | Insider tampering with finance records | 2 | 5 | 10 | High | Hash-chained audit; finance entries append-only | No direct writes; SoD; monthly advisor review | Restore from backup + audit chain | SA |
| 29 | ACC-05 | Account | Wrong membership decision (accidental reject/finalize) | 3 | 3 | 9 | Medium | Undo-window warnings; weekly decision report to TA | Reason required; MFA for finalize/suspend; confirmation dialogs; bulk preview | Explicit reverse transition with reason (history preserved); apology template | SA |
| 30 | EVT-03 | Events | Duplicate payments for one registration | 3 | 3 | 9 | Medium | Invoice lock; second verified payment → reconciliation_required | Idempotency keys; invoice FOR UPDATE; TrxID uniqueness | Refund duplicate via WF-12 | FO |
| 31 | EVT-09 | Events | Offline (walk-in/cash) registrations not synced | 3 | 3 | 9 | Medium | Cash receipt numbers vs registrations reconciliation | Admin-assisted flow online; offline sheet import with dedupe | Import + reconcile; FO counter-sign cash | EM |
| 32 | EVT-11 | Events | Check-in fraud by staff (scanning absent friends for attendance points) | 3 | 3 | 9 | Medium | Scanner activity analytics; scans without device proximity patterns | Time-boxed scanner roles; scan logs attributable; attendance points capped; random spot checks | Reverse attendance & points; revoke scanner role | EM |
| 33 | FB-01 | Facebook | API permission denied / App Review rejected | 3 | 3 | 9 | Medium | Spike FB-1; API errors | Request minimal permissions; clear screencast | Evidence-based social tasks only | SA |
| 34 | GEN-04 | Platform | Background job failure / queue backlog | 3 | 3 | 9 | Medium | Queue depth/age alerts; DLQ page | Idempotent handlers; retries; DLQ | Replay from DLQ after fix | Dev |
| 35 | GEN-05 | Platform | Bad deployment needs rollback | 3 | 3 | 9 | Medium | Error rate spike after deploy | Preview + e2e gates; feature flags | Vercel instant rollback; DB roll-forward fix | Dev |
| 36 | GEN-17 | Platform | Vendor price/plan change or free-tier unsuitability | 3 | 3 | 9 | Medium | Monthly cost review | Exit paths documented; budget buffer | Migrate tier or vendor | SA |
| 37 | GML-01 | Gmail | Expired / revoked authorisation (Apps Script or OAuth) | 3 | 3 | 9 | Medium | last_success_at stale >30 min alert | Club mailbox owns script; daily health digest; (target) Internal app | Re-authorise; backlog syncs via labels | SA |
| 38 | GML-07 | Gmail | Workspace admin blocks Apps Script / third-party access | 3 | 3 | 9 | Medium | Spike FORM-S1/GMAIL-S1; script errors | Early engagement with BAU IT | Native form + manual forwarding fallback | SA |
| 39 | PAY-05 | Payments | Payment API timeout (execute) | 3 | 3 | 9 | Medium | Timeout logs | Documented Query Payment recovery; 30 s timeouts | Query → confirm or allow recreate | Dev |
| 40 | PAY-07 | Payments | Incorrect amount (claim vs invoice) | 3 | 3 | 9 | Medium | Verifier compares; amount mismatch status | Server-side amounts; mismatch cannot be verified as paid | Request top-up or refund difference | FO |
| 41 | PAY-11 | Payments | bKash API downtime (Stage 2) | 3 | 3 | 9 | Medium | Health check; error rates | Fallback to manual claim flow automatically | Switch payment method banner | Dev |
| 42 | PTS-05 | Points | Point inflation by reviewers | 3 | 3 | 9 | Medium | Distribution dashboards by reviewer; outlier detection | Type max points; second approver above threshold | Reverse entries; reviewer retraining or removal | HR |
| 43 | ACC-02 | Account | Unverified email accounts gain access | 2 | 4 | 8 | Medium | Auth audit: users without consumed provision | Sign-ups disabled + Before-User-Created hook; activation proves inbox ownership; Google Form 'Verified' emails | Deactivate account; re-provision with verified email | Dev |
| 44 | ACC-08 | Account | Teacher account misuse (approving outside mandate, sharing login) | 2 | 4 | 8 | Medium | Decision analytics; new-device alerts; MFA logs | Mandates with categories/ceilings; MFA aal2; no shared accounts policy; session listing | Revoke mandate; revoke sessions; review decisions in window | SA |
| 45 | ACC-10 | Account | Applicant reads member-only records | 2 | 4 | 8 | Medium | RLS tests per role; anomaly logging of 403s | Computed roles from membership status; RLS default-deny | Patch policy; assess exposure; notify if personal data exposed | Dev |
| 46 | EVT-07 | Events | Expired reservations not released (cron failure) | 2 | 4 | 8 | Medium | Sentry cron monitor; seats-held age alert | pg_cron every minute; also lazy expiry on read paths | Manual run of expiry function; investigate | Dev |
| 47 | FB-06 | Facebook | Pressure to scrape profiles to verify engagement | 2 | 4 | 8 | Medium | Code review policy | Explicit prohibition; documented alternatives | Remove any scraping code; incident | SA |
| 48 | GEN-09 | Platform | Unauthorised document download (guessing URLs) | 2 | 4 | 8 | Medium | 403 rate monitoring | Private buckets; short signed URLs after RLS; unguessable codes | Rotate signed URL secret; review | Dev |
| 49 | GEN-12 | Platform | ISP/DNS-level block of *.supabase.co (as seen in India Feb 2026) | 2 | 4 | 8 | Medium | Synthetic checks from BD networks | Custom API domain on club domain | Switch DNS/proxy; Cloudflare Worker proxy fallback | Dev |
| 50 | GEN-13 | Platform | Nationwide internet disruption during an event | 2 | 4 | 8 | Medium | — | Offline-capable scanner; printed fallback roster (encrypted, destroyed after) | Manual check-in then sync | EM |
| 51 | GEN-15 | Platform | SSRF via link validation (auto-checking URLs) | 2 | 4 | 8 | Medium | Worker egress logs | Allowlist schemes/hosts; block private IP ranges; fetch via restricted worker with timeouts | Patch; review fetched targets | Dev |
| 52 | GEN-19 | Platform | Bulk action mistake affecting many records | 2 | 4 | 8 | Medium | Batch audit; preview counts | Typed confirmation; batch size cap; transactional | Reverse batch via batch_id | SA |
| 53 | GEN-21 | Platform | Minors' personal data collected for school olympiads without guardian consent | 2 | 4 | 8 | Medium | Age field checks | Guardian consent fields; minimal data | Delete; obtain consent | EM |
| 54 | GML-05 | Gmail | Malicious attachments | 2 | 4 | 8 | Medium | Malware scan results | Type allowlist, size cap, on-demand fetch, scanning, no inline rendering of HTML | Quarantine; incident | Dev |
| 55 | GML-06 | Gmail | Over-collection of personal email content | 2 | 4 | 8 | Medium | Data inventory review quarterly | Label-scoped sync; snippets ≤300 chars; 180-day retention | Purge; privacy review | SA |
| 56 | PTS-07 | Points | Unauthorised point adjustment | 2 | 4 | 8 | Medium | Every adjustment notifies member + HR lead; audit | No direct ledger writes; fn_award/adjust with permission + approval | Reversal entry; incident | Dev |
| 57 | ACC-01 | Account | Duplicate registrations / applications (same person, same cycle) | 4 | 2 | 8 | Medium | Duplicate-candidate job (student ID, email, phone blind index, name+session trigram) | Partial unique (cycle, person); UNIQUE(source,response_id); intake links to existing person | Manual merge function re-points FKs atomically; audit entry | SA |
| 58 | EVT-12 | Events | Bot/spam registrations on public events | 4 | 2 | 8 | Medium | Velocity & disposable-domain flags | Turnstile; rate limits; email confirmation for guests | Purge pending; release holds | Dev |
| 59 | FB-04 | Facebook | Missing member-level data | 4 | 2 | 8 | Medium | Match rate monitoring | Comment-code linking; evidence fallback | Human review | HR |
| 60 | FB-05 | Facebook | Meta API/metric changes or deprecations | 4 | 2 | 8 | Medium | Snapshot api_version; error-per-metric tracking | Configurable metric registry; pin version; quarterly review | Mark metric unavailable; update mapping | Dev |
| 61 | GEN-10 | Platform | Mobile browser incompatibility (old Android WebView, Facebook in-app browser) | 4 | 2 | 8 | Medium | Real-device test matrix; RUM errors | Progressive enhancement; no cutting-edge APIs without fallback; test FB in-app browser | Hotfix; fallback UI | Dev |
| 62 | GML-04 | Gmail | Incorrect categorisation | 4 | 2 | 8 | Medium | Reviewer corrections tracked per rule | Human approval of every extraction proposal | Recategorise; tune rules | SA |
| 63 | PAY-02 | Payments | Duplicate payment requests (double-click/retry) | 4 | 2 | 8 | Medium | Idempotency key collisions logged | Idempotency key per invoice attempt; disabled button while pending | Return existing payment | Dev |
| 64 | PAY-03 | Payments | Duplicate webhooks / IPNs | 4 | 2 | 8 | Medium | UNIQUE(dedupe_key) hits counted | Inbox dedupe; idempotent processors | No-op | Dev |
| 65 | PTS-01 | Points | Duplicate submissions for one task | 4 | 2 | 8 | Medium | UNIQUE(assignment, attempt); content hash | One award per (source, person) unique; attempts capped | Reject duplicate; no ledger effect | HR |
| 66 | PTS-03 | Points | Farming repeated low-effort tasks | 4 | 2 | 8 | Medium | Velocity analytics per category | Monthly category caps; diminishing returns; open-claim slot limits | Cap applies automatically; policy tuning | HR |
| 67 | ACC-06 | Account | Member removal/suspension misused or disputed | 2 | 3 | 6 | Medium | All suspensions notify both SAs + TA | Reason + MFA; appeal path; SoD (decider not subject) | Reinstate transition; audit trail for review | SA |
| 68 | ACC-07 | Account | Reinstatement restores stale privileges | 2 | 3 | 6 | Medium | Role diff report on reinstatement | Reinstate restores computed member role only; staff roles must be re-granted explicitly | Revoke unintended roles | SA |
| 69 | ACC-11 | Account | Profile modified after finalisation (identity fraud on certificates) | 2 | 3 | 6 | Medium | Trigger blocks; audit of corrections | Verified-field lock; correction workflow with evidence | Revert via correction; reissue documents | SA |
| 70 | EVT-06 | Events | Cancellation storms (event cancelled/postponed) | 2 | 3 | 6 | Medium | Event status change triggers bulk workflow | Bulk refund requests created for approval; templated comms | Track completion dashboard | EM |
| 71 | EVT-08 | Events | Capacity reduced below confirmed seats | 2 | 3 | 6 | Medium | fn_set_capacity refuses | Guard in function | Explain options: venue change or waitlist | EM |
| 72 | FB-08 | Facebook | Incorrect user attribution (wrong person linked) | 2 | 3 | 6 | Medium | Member must confirm link; duplicate scoped-id uniqueness | One-time code + confirmation; unique scoped ID | Unlink; reverse affected points | HR |
| 73 | PAY-09 | Payments | Refund failure | 2 | 3 | 6 | Medium | Refund status polling; failed state alerts | Refund Status check before retry (PGW); manual verification (Stage 1) | Retry via alternate method; communicate | FO |
| 74 | PTS-04 | Points | Deadline manipulation (late submission backdated, extensions abused) | 2 | 3 | 6 | Medium | Server timestamps only; extension log | Server-side submitted_at; extensions need permission + logged original deadline | Reverse; revoke extension rights | HR |
| 75 | PTS-09 | Points | AI/automation mis-validates subjective work | 2 | 3 | 6 | Medium | Automation can only gate/flag; sampling | No AI decisions; rules limited to objective checks | Human re-review; reverse if needed | HR |
| 76 | ACC-03 | Account | One person applies with multiple emails | 3 | 2 | 6 | Medium | Same student ID / phone bidx / photo hash across applications | Student ID uniqueness; phone blind-index uniqueness; reviewer duplicate panel | Mark duplicate_of; reject extras with reason | SA |
| 77 | EVT-05 | Events | Refund disputes / unclear policy | 3 | 2 | 6 | Medium | Refund requests outside policy flagged | Policy shown at purchase and in receipt; approval workflow | Escalate to TA | FO |
| 78 | FB-02 | Facebook | Token expiration | 3 | 2 | 6 | Medium | token_expires_at alert at T-7d | System-user token via Business portfolio | Re-auth runbook | SA |
| 79 | GEN-20 | Platform | Perk code leakage / misuse | 3 | 2 | 6 | Medium | Redemption reports from partner | One claim per member; reveal logging; distribute only permitted offers | Revoke codes; reissue | SA |
| 80 | GML-02 | Gmail | Missed push notification (target arch) | 3 | 2 | 6 | Medium | Periodic history.list sweep diff | Daily watch renewal; sweep every 15 min | Full sync on 404 | Dev |
| 81 | PTS-08 | Points | Approval reversed after points awarded | 3 | 2 | 6 | Medium | Ledger links validation_result | Reversal entries only (never delete) | fn_reverse_points; member notified with reason | HR |
| 82 | PTS-11 | Points | Unfair team point splits | 3 | 2 | 6 | Medium | Split deviates >25% from equal share → flag | Lead proposal + HR approval above deviation | Re-split via reversal + new entries | HR |
| 83 | GEN-02 | Platform | Storage failure / object loss | 1 | 4 | 4 | Low | Weekly bucket sync verification | Off-site weekly copy to R2; sha256 in DB | Restore objects from R2; regenerate PDFs from snapshots | Dev |
| 84 | PTS-12 | Points | Points without validation record | 1 | 4 | 4 | Low | CHECK constraint; nightly ledger integrity query | validation_result_id NOT NULL for task awards | Reverse orphan entries | Dev |
| 85 | PAY-08 | Payments | Partial transactions / partial payments | 2 | 2 | 4 | Low | Invoice balance computation | Policy: full payment only (configurable partial rule) | Collect remainder or refund | FO |
| 86 | PTS-10 | Points | Appeal handling after rejection is biased or endless | 2 | 2 | 4 | Low | Appeal SLA tracking | Different reviewer; one appeal; final decision | Escalate to SA/TA | HR |
| 87 | FB-07 | Facebook | Delayed metrics misread as real-time | 4 | 1 | 4 | Low | UI shows last-synced timestamp | Label 'updated daily' | — | CE |
| 88 | GML-03 | Gmail | Duplicate email processing | 3 | 1 | 3 | Low | UNIQUE(gmail_message_id) | Idempotent processors | No-op | Dev |
| 89 | FB-03 | Facebook | Rate limits | 1 | 2 | 2 | Low | Usage header monitoring | Daily batch; tiny volume | Back off | Dev |

## 10. Incident response runbook (summary)

| Phase | Actions | Owner |
|---|---|---|
| Detect | Alert from monitoring, a user report or an audit anomaly. Open an `incidents` record with severity | Anyone → SA |
| Contain | Revoke sessions/keys, disable the affected feature flag, enable read-only mode, block the IP or user | Dev + SA |
| Assess | Scope from the audit log and access logs. Personal data involved? Money involved? | SA + Dev |
| Notify ⚖️ | Advisors immediately. Authority and affected people per legal advice/timeline. bKash or vendor support for payment issues | SA / TA |
| Recover | Restore from backup, reverse entries (never delete), rotate secrets, patch | Dev |
| Learn | Post-mortem within 7 days, with new tests added to the regression suite | Dev + SA |

## 11. Security testing requirements (see Document 10)

- Automated RLS/permission matrix (every role × resource × action).
- SoD negative tests for every rule SoD-1 … SoD-10.
- Concurrency tests (seats, invoice payment, ledger awards).
- OWASP ASVS L2 checklist for authentication, sessions, access control, validation, files and API.
- Webhook forgery and replay tests (bad HMAC, stale timestamp, replayed delivery ID).
- Dependency scanning (`npm audit`, Dependabot), secret scanning and CSP verification.
- A pre-launch external review: an independent volunteer/professional pentest of the auth, payment and admin flows.
