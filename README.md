# BAUBC · Club Operating System

The website and operations platform for **Bangladesh Agricultural University Business Club** (BAUBC): a bilingual (English/বাংলা) public site plus role-based workspaces for members, applicants, teachers, Teacher Approvers, HR, wing leads, finance, events, content and Super Admins.

- **Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Postgres (Supabase) · Supabase Auth · Resend
- **Design:** "Field & Signal" (see [`docs/blueprint/06-ux-design-brief.md`](docs/blueprint/06-ux-design-brief.md) and [`docs/blueprint/design-direction.html`](docs/blueprint/design-direction.html))
- **Blueprint:** all research, architecture, permissions, workflows and risks are in [`docs/blueprint/`](docs/blueprint/README.md)

## Run it in preview mode (no accounts needed)

```bash
npm install
npm run dev
```

Open http://localhost:3000. Without `DATABASE_URL` the app runs in **preview mode**: the real SQL migrations load into an in-process Postgres ([PGlite](https://pglite.dev)) with fictional sample data, and `/login` lets you explore as any role (Super Admin, Teacher Approver, Teacher, HR, Wing Lead, Finance Officer, Event Manager, Content Editor, Member, Applicant). Emails are written to **Admin → Integrations & email** instead of being sent. Data persists in `.data/` (delete it to reset).

## What works

| Area | Features |
|---|---|
| Public site | Home (Furrow Field hero, live signals ticker, DECODED rail), About, Events with **live seat plot**, registration (individual and team), waitlist, guest ticket page with QR, **bKash Send Money TrxID claim**, Insights (DECODED, Case Studies), Wings, Members directory (opt-in only), Advisors, Gallery, Resources, Contact, Join (native form or Google Form), certificate verification, privacy notice, EN/বাংলা toggle, light/dark |
| Accounts | No self-sign-up. Accounts are provisioned from applications (Google Form webhook or native form) or admin invitations; the person sets their own password from a one-time activation link. Supabase Auth with TOTP two-step verification for privileged roles |
| Membership | Configurable state machine, review dashboard, info requests, finalisation with member numbers, suspension/alumni, verified-field locks with correction requests, full decision history |
| Approvals | Mandate-based Teacher Approvers (categories + amount ceilings), maker-checker policies by amount (1 / 2 distinct approvers / + Super Admin), clarify and return loops |
| Tasks & points | Task types, assignment (wing-scoped for leads), open claims, submissions with automatic objective checks, human review, append-only points ledger with monthly caps, reversals, achievements with second-person verification, Member of the Month |
| Events | Event CMS, ticket types, atomic seat inventory (no overselling), holds that expire, waitlist promotion, walk-in registration, offline-capable QR check-in scanner (single-use), participation certificates |
| Finance | Invoices, manual bKash verification queue with second verifier above a threshold, append-only cash book, disbursement requests → approvals → recorded payout → independent verification, refunds on cancellation, teacher monthly dues (৳500 default) |
| Documents | Printable certificates with QR verification, annual CV generated only from verified records |
| Admin | People & roles (privileged grants need a second Super Admin), website content and announcements, inbox (contact form + labelled Gmail), integrations health and email log, hash-chained audit log, settings |

## Go live (production)

1. **Supabase:** create a Pro project in Singapore. In *Authentication → Providers → Email*, turn **off** "Allow new users to sign up". Optionally enable Google. In *Authentication → Hooks*, set **Before User Created** to the Postgres function `app.hook_before_user_created`.
2. **Database:** apply `supabase/migrations/*.sql` in order (Supabase CLI `supabase db push`, or the SQL editor). Do **not** run anything in `supabase/preview/`.
3. **Environment:** copy `.env.example` to your hosting environment and fill in `DATABASE_URL` (transaction pooler, port 6543), the Supabase URL and keys, `RESEND_API_KEY`/`EMAIL_FROM`, `CRON_SECRET`, and the two webhook secrets.
4. **First Super Admins:** invite the two confirmed administrator emails with `npm run db:bootstrap-admins -- first@example.com second@example.com` (uses `DATABASE_URL`; prints one-time activation links). Each admin activates, then enrols two-step verification at `/mfa`.
5. **Deploy** to Vercel (region `sin1`, see `vercel.json`, which also schedules the job worker every minute).
6. **Google Form:** add `integrations/apps-script/google-form-connector.gs` to the application form (instructions at the top of the file). **Gmail:** add `integrations/apps-script/gmail-label-sync.gs` to the club mailbox.
7. In **Admin → Settings → payments**, enter the club bKash number shown to payers.

## Tests

```bash
npm run db:test                                   # 47 database tests: RLS, seats, payments, approvals, points, intake, audit
npm run build && npm start &                      # then:
BASE=http://localhost:3000 node tests/e2e/preview-smoke.mjs   # 70-step browser test across every role
```

## Security model in one paragraph

All tables live in the `app` schema, which the Supabase Data API does not expose. The Next.js server opens a transaction per request, switches to the `anon` or `authenticated` role and sets the verified JWT claims, so **row-level security applies to every query**. Everything that must never be bypassed (seat inventory, payment verification, approvals, points, role grants, status transitions) runs inside `SECURITY DEFINER` Postgres functions that check permissions, two-step verification and separation of duties themselves, and write to a hash-chained audit log in the same transaction.
