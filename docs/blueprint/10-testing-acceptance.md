# Document 10: Testing and Acceptance Plan

> Goal: **prove the invariants**, not just exercise screens. The highest-value tests target things that would silently destroy trust: permissions, money, seats, points and documents. Tests run against a **real Postgres with RLS enabled** (local Supabase in CI), never a mocked database.

## 1. Test strategy and tooling

| Layer | Tool | Runs on | Gate |
|---|---|---|---|
| Static | TypeScript 7 (`tsc --noEmit`), ESLint (+ module boundaries), Prettier, `gitleaks` | Every push | Block merge |
| Unit | Vitest | Every push | Block merge, ≥ 80% coverage on `packages/domain` and `modules/*/commands` |
| Database | **pgTAP** via `supabase test db` on an ephemeral local stack | Every PR | Block merge |
| Permission matrix | pgTAP generated from a machine-readable `permission-matrix.yaml` (created from Doc 2 in Phase 1) | Every PR | Block merge |
| Integration | Vitest + MSW (HTTP mocks) + recorded contract fixtures (bKash sandbox, Meta, Apps Script payloads) | Every PR | Block merge |
| End-to-end | Playwright (`--trace off` by default; traces on failure re-run) | Every PR (smoke) + nightly (full) | Smoke blocks merge |
| Accessibility | axe-core in Playwright + manual audits | PR (axe) + per phase (manual) | Serious/critical violations block |
| Performance | Lighthouse CI (budgets), k6 load tests | PR (Lighthouse on public routes), pre-release (k6) | Budget regressions block |
| Visual | Playwright screenshots + PDF golden images (Bangla) | PR (changed components) | Diff review |
| Security | Dependabot, `npm audit`, OWASP ZAP baseline on preview, secret scanning, CSP report review | Weekly + pre-release | High findings block release |

**Test data:** synthetic fixtures only (Faker with Bangla name sets). There is **no production PII** in non-production environments, and production data is never copied to staging. Seeds create one fixture person per role and scope (SA, TA with and without finance mandate, T, HR global, TL of wing A, FO, EM of event X, CE, M, AP, alumni, suspended member, guest).

## 2. Unit tests (examples)

- Zod schemas: application intake (rejects password-like keys), registration, payment claim (TrxID format), disbursement.
- State machine definitions (shared in `packages/domain`): every legal transition is allowed, every other pair is rejected, and the reason requirements match the config.
- Money helpers: rounding, BDT formatting (English and Bangla numerals), refundable-amount calculation.
- Point policies: caps, diminishing returns, team split validation (sum equals award, > 25% deviation flag).
- HMAC verification: valid, invalid, stale timestamp (> 5 min), replayed nonce.
- bKash client: token cache honours "max two grant/refresh per hour" and refreshes between minutes 50 and 55. Execute timeout → query path.

## 3. Permission tests (the matrix as code)

For **every row of Doc 2's matrix × every role fixture**, a pgTAP test asserts the outcome:

```sql
-- Example generated test
select tests.authenticate_as('member_a');
select throws_ok($$ insert into public.point_ledger(person_id, amount, kind, reason)
                    values (tests.id('member_a'), 100, 'adjustment', 'x') $$,
                 '42501', null, 'member cannot write ledger directly');
select is_empty($$ select * from public.applications where person_id <> tests.id('member_a') $$,
                'member cannot read other applications');
select tests.authenticate_as('ta_no_finance');
select throws_ok($$ select api.decide_approval(tests.id('disb_req_1'), 'approve', 'ok') $$,
                 'P0001', 'NO_MANDATE', 'teacher approver without finance mandate cannot approve');
```

Mandatory negative suites:
- **Role escalation:** a user tries to insert or update `role_assignments`, `approval_mandates` or `privileged_identities`, or to call `fn_grant_role` for themselves → denied.
- **SoD-1…SoD-10:** each rule has at least one positive and two negative tests.
- **aal1 vs aal2:** every privileged RPC is denied with an aal1 JWT.
- **Applicant isolation:** an applicant cannot read members, other applications, the ledger, events' restricted data or finance.
- **Anonymous:** can read only published content and public views. Cannot list storage objects. Cannot reach `private`/`audit` schemas.
- **Revocation latency:** after `revoked_at` is set, the next query with the same JWT is denied (proves live permission resolution).
- **Last Super Admin:** demoting or suspending the final active SA fails.

## 4. Workflow tests

| Workflow | Key test cases |
|---|---|
| WF-1 Intake | Valid signed webhook creates person + application + provision. Replay is a no-op. Bad HMAC → 401 + not stored. Late submission → `late_submission`. Activation token single-use and expiring. Reconciliation re-ingests a missed response |
| WF-2 Membership | Every configured transition. Reason required where configured. MFA required for finalize/suspend. Bulk transition rolls back fully on one failure. History rows written with the decision maker and previous/new status. Member number unique and sequential per year. Reverse transition preserves history |
| WF-3 Approvals | Policy snapshot unaffected by later edits. Distinct approvers. Maker cannot approve. Ceiling enforcement. Clarification loop. Return voids prior actions. Expiry escalation. Delegation cannot raise a ceiling |
| WF-4/5 Tasks | Open-claim slot limits. Late flag. Attempt limits. Locked after approval. Auto-rule pass only for objective types. Human review required otherwise. Appeal goes to a different reviewer |
| WF-6 Points | Exactly one award per submission. Threshold → second approval. Caps applied. Reversal once only. Balance recompute equals ledger sum |
| WF-7 Recognition | Nominee recused. One award per cycle. Achievement and certificate created |
| WF-8/9 Events | See §6 concurrency. Hold expiry releases seats. Waitlist offer expiry moves to the next person. Capacity decrease below sold refused. Cancellation releases a seat and triggers waitlist |
| WF-10 Payments | Duplicate TrxID rejected globally. Payer cannot verify own. Second verifier above threshold. Rejected claim releases the hold per policy. PGW: success, failure, cancel, execute timeout → query Completed, query Initiated → retry allowed, duplicate IPN no-op, IPN bad signature rejected, browser-closed → sweeper confirms |
| WF-11 Disbursements | Cannot be `successful` without an execution reference + verification. Executor ≠ approver. Duplicate payee/amount soft block. Revocation only before execution |
| WF-12 Refunds | Refund ≤ refundable. Partial refunds sum correctly. PGW refund timeout → status check before retry |
| WF-13 Gmail | Only labelled messages accepted. Dedupe. Proposal acceptance creates the record. Rejection creates nothing. Oversized or disallowed attachment quarantined |
| WF-14 Facebook | Link code single-use. Scoped ID uniqueness. No points without an API match or a reviewed evidence record. Metric deprecation marks unavailable (not zero) |
| WF-15 Documents | Issue refused without a qualifying record. Snapshot immutable. Revocation reflected on `/verify`. Verification shows minimal fields. Rate limit enforced |
| WF-16/19 | Correction applies old/new with an audit entry. Privacy export contains all personal data and nothing about others |

## 5. Financial test suite (release-blocking)

1. **Ledger integrity:** for any random sequence of operations (property-based tests with fast-check), the sum of `finance_entries` per account equals the computed balance, and every `verified` payment has exactly one `in` entry.
2. **Double-spend tests:** two concurrent verifications of two different TrxIDs for the same invoice → exactly one marks the invoice paid, and the other becomes `reconciliation_required`.
3. **Idempotency:** 10 identical `fn_claim_payment` calls with the same idempotency key → one payment.
4. **Authority tests:** every finance action from every role fixture (matrix). Aal2 enforced.
5. **Reconciliation:** a statement fixture with matched, unmatched-statement, unmatched-ledger and amount-mismatch lines → correct classification. Month close is blocked until resolved.
6. **Sandbox E2E (Stage 2):** the full bKash sandbox scenario set from Doc 7 §4b before go-live, including token refresh limits.

## 6. Realtime and concurrency tests

| Test | Method | Pass criterion |
|---|---|---|
| Seat race | k6: 500 virtual users call `reserve_seat` simultaneously on a 100-seat ticket type | Exactly 100 holds/confirmations, 400 `SOLD_OUT` responses, `sold+held ≤ capacity` at all times, no deadlocks |
| Hold churn | 1,000 holds with mixed expiry over 10 min + cron | Counters equal the recomputed truth at the end |
| Waitlist promotion | Cancel 10 confirmed → 10 offers in queue order | Order preserved, no double offers |
| Broadcast latency | 1,000 subscribed clients (k6 websockets) on staging | p95 update ≤ 3 s, no PII in payloads |
| Fallback | Block websockets | UI switches to polling within 5 s and stays correct |
| Points race | Two reviewers approve the same submission concurrently | One ledger entry |
| Check-in race | Two scanners scan the same ticket within 100 ms | One `ok`, one `duplicate` |
| Offline sync | Two offline devices scan the same ticket, then sync | First (device time) wins. Conflict reported |

## 7. Mobile and browser tests

| Device / browser | Why | Coverage |
|---|---|---|
| Low-end Android (2–3 GB RAM, Android 12–14), Chrome | Typical member device | Full smoke + scanner + registration |
| **Facebook in-app browser** (Android and iOS) | Most traffic arrives from Facebook posts | Registration, login, payment pages, activation link |
| Samsung Internet | Common in BD | Smoke |
| iOS Safari (iOS 17+) | Teachers and some members | Full smoke |
| Desktop Chrome / Edge / Firefox (latest) | Admin work | Admin flows |
| Slow network (Fast 3G emulation, 400 ms RTT) | Campus networks | Public pages meet budgets. Forms survive retries |

Also test: Bangla input (Avro and Gboard Bangla keyboards) in all forms, Bangla rendering of conjuncts at all heading weights, `Save-Data` behaviour, dark mode, and the reduced-motion preference.

## 8. Accessibility tests (WCAG 2.2 AA)

- Automated axe on every page template in both languages (no serious or critical violations).
- Manual: keyboard-only completion of registration, application, review, decision and verification flows. Visible focus. Skip links. Correct heading structure.
- Screen readers: NVDA + Firefox (Windows), TalkBack (Android), VoiceOver (iOS) on key journeys, including Bangla content announcement with correct `lang`.
- Contrast: tokens validated (Doc 6 §7.1). Visual regression catches token misuse (lime text on light).
- Timing: hold timers announced, with an extension available. Toasts are not the only channel for errors.
- WCAG 2.2-specific: focus not obscured (2.4.11), dragging alternatives (2.5.7), target size (2.5.8), consistent help (3.2.6), redundant entry (3.3.7), accessible authentication (3.3.8).

## 9. Security tests

| Area | Tests |
|---|---|
| ASVS L2 (auth, session, access control, validation, files, API, config) | Checklist executed per phase. Evidence stored |
| Webhooks | Forged signature, stale timestamp, replay, oversized body, wrong content type, unknown fields (password-like keys) |
| Injection / XSS | CMS blocks with script payloads, bios with HTML, Bangla Unicode edge cases, CSV injection in exports (`=`, `+`, `-`, `@` prefixes escaped) |
| SSRF | Link validator against `127.0.0.1`, `169.254.169.254`, private ranges, redirects to private ranges |
| File uploads | MIME sniffing vs extension, polyglot images, EXIF stripping on public variants, size limits, malware test file (EICAR) |
| Storage | Anonymous list/read on private buckets denied. Signed URL expiry honoured |
| Secrets | Build output scanned for key prefixes. No secrets in client bundles or source maps |
| Rate limits | Login, activation, registration, verification lookups, contact form |
| Headers | CSP (nonce), HSTS, frame-ancestors, referrer policy, permissions policy |
| Pre-launch | External review of auth, payment and admin flows (volunteer security professional or student security club under NDA) |

## 10. Performance acceptance

| Metric | Target | Tool |
|---|---|---|
| LCP (mobile p75, public) | ≤ 2.5 s | Lighthouse CI + Vercel Speed Insights (RUM) |
| INP | ≤ 200 ms | RUM |
| CLS | ≤ 0.1 | Lighthouse |
| Public JS (gz) | ≤ 170 KB per route, motion ≤ 45 KB | Bundle analyzer budget |
| Seat reservation RPC | p95 ≤ 300 ms at 200 RPS | k6 |
| Dashboard queries (RLS-heavy) | p95 ≤ 500 ms at 10× expected data | pgbench / k6 |
| PDF render | ≤ 4 s warm per certificate. Batch 400 ≤ 15 min | Worker metrics |

## 11. User acceptance testing (UAT)

Per phase, with real role-holders (synthetic data in staging):

| Role | UAT script (excerpt) | Sign-off by |
|---|---|---|
| Super Admin | Bootstrap + MFA, grant a role (second SA confirms), open a cycle, finalise a member, view the audit trail | Both SAs |
| Teacher Approver | Receive a disbursement request on a phone, inspect evidence, request clarification, approve with MFA | 1–2 advisors |
| HR / Team Lead | Create a task for a team, review 10 submissions with the rubric, reverse an erroneous award | HR lead |
| Finance Officer | Verify 20 claims including 2 bad TrxIDs, record an execution, reconcile a week | Treasurer |
| Event Manager + volunteers | Publish an event, watch live seats, scan 50 tickets offline, sync | Event lead |
| Member / applicant | Apply via form, activate, respond to an info request. As a member: submit a task, register for an event, download a certificate | 5 student testers (incl. 2 Bangla-first users) |
| Public visitor | Register as a guest team from the Facebook in-app browser and pay | 3 external testers |

**Acceptance rule:** a phase is accepted when (1) all release-blocking automated suites pass, (2) the UAT scripts pass with no Severity-1/2 defects open, (3) runbooks for the phase exist, and (4) the product owner and one advisor sign the decision log.

## 12. Definition of Done (per feature)

- [ ] Requirements (PRD ID) and acceptance criteria met
- [ ] Permission matrix rows added and tests generated
- [ ] Command functions have pgTAP tests for success and each failure path
- [ ] Audit entries written for sensitive actions
- [ ] Bilingual UI strings reviewed. Bangla rendering checked
- [ ] Empty, loading and error states implemented
- [ ] axe clean. Keyboard path verified
- [ ] Mobile checked (low-end Android + FB in-app browser for public flows)
- [ ] Observability: errors to Sentry, job metrics recorded
- [ ] Docs/runbook updated

## 13. Release checklist (production)

1. Fresh backup taken and verified (restore test within the last 90 days).
2. Migrations dry-run on a staging copy of the production schema.
3. Feature flags default to off for new modules.
4. Rollback steps written for the release (app rollback + roll-forward migration).
5. Peak-event check: no release within 48 h before a registration opening or an event day.
6. Post-release smoke: login, public pages, registration (test event), payment claim, scanner, worker heartbeat, realtime broadcast.
