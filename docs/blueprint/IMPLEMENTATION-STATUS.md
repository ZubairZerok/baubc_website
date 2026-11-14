# Implementation status (first build, 14 November 2026)

This records what the first build delivers against the blueprint, where it deliberately differs, and what is still to do. See the root [README](../../README.md) for setup.

## Verified

| Check | Result |
|---|---|
| Database tests (`npm run db:test`, real migrations in PGlite with RLS on) | **47 passed**: RLS isolation per role, no overselling, idempotent registration, TrxID single use, MFA on finance, maker-checker approvals, payout separation of duties, ledger immutability and caps, membership transitions, privileged grants needing a second Super Admin, last Super Admin protection, intake rejecting password fields, audit hash chain |
| Browser end-to-end (`tests/e2e/preview-smoke.mjs`) | **70 passed**: every public page, register → pay → finance verify → QR ticket, duplicate TrxID blocked, two-approver disbursement, wing-lead review → points, single-use check-in, every workspace page for six personas |
| Migrations on a real PostgreSQL 16 server | All migrations + sample data apply cleanly; public pages, registration, payment claim, contact form and email outbox work through the production driver (`postgres.js` with per-request role switching) |
| Mobile layout | No horizontal overflow at 375 px on public pages and workspaces |

## Deliberate differences from the blueprint

| Blueprint said | Built | Why |
|---|---|---|
| Tables in `public` with RLS, reads via supabase-js | Tables in schema **`app`** (not exposed by the Supabase Data API); the server connects directly and runs each request as `anon`/`authenticated` with the verified JWT claims | Same RLS guarantees, plus the publishable key can no longer reach any table through the REST API. One SQL path serves both preview mode and production |
| `pgmq` queues | A transactional outbox table polled by `/api/jobs/run` (Vercel Cron every minute) and nudged after each action | Fewer moving parts; behaves the same (idempotent, retries with backoff, dead-letters after 8 attempts) |
| Server-side PDF rendering with Chromium | Certificates and CVs are print-ready pages (browser "Save as PDF") with QR verification | Correct Bangla shaping out of the box; server-side PDFs can be added later without changing data |
| Ticket codes stored hashed | Stored as random 80-bit codes readable only by the registrant and event staff (RLS) | The registrant must be able to reopen their QR ticket |

## Not built yet (next phases)

| Item | Status |
|---|---|
| bKash Tokenized Checkout (Stage 2) | Needs a merchant account; the manual Send Money flow is complete |
| Facebook Graph API daily sync | Page stats are a seeded snapshot from the club's export; the integration card shows "not connected" |
| Gmail API push (target architecture) | The Apps Script label sync (phase 1) is built |
| File uploads (Supabase Storage) for photos and evidence | Evidence is submitted as links; avatars are style choices |
| Competition module (rounds, judges, scoring) | Not started |
| Reconciliation runs, statement import, budgets | Cash book and payout verification are built; statement import is not |
| Privacy request (DSAR) screens, retention purge jobs | Tables exist; no screens or jobs yet |
| Admin screens for perks, gallery albums and resources | Tables and public pages exist; manage via SQL for now |
| Public leaderboard | Points tables are in member and HR views only |
| Full Bangla translation | Navigation, home and key headings are bilingual; long-form pages are English with Bangla titles |

## Content to confirm before launch

- Wing names and descriptions (six placeholders in `initial_content.sql`)
- DECODED episode numbers and dates (order inferred from the Facebook export)
- Event names "The Pitch Arena", "BAUBC Business Olympiad", "BAUBC AgriTech Hackathon", their capacities and fees
- The bKash receiving number (Admin → Settings → payments)
- The two Super Admin emails (bootstrap script) and the Teacher Approvers' mandates
