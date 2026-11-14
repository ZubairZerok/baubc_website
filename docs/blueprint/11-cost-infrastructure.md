# Document 11: Cost and Infrastructure Estimate

> Prices were read from **official pricing pages on 14 Nov 2026** unless marked *(secondary)*. All prices are in USD and exclude VAT/taxes and card fees. BDT figures assume **≈ BDT 122 per USD**, which is an assumption: recalculate with the paying card's actual rate plus the bank's foreign-transaction fee. Free tiers are **not** treated as production-suitable unless stated.

## 1. Workload assumptions (year 1)

| Driver | Estimate | Notes |
|---|---|---|
| People records | ≤ 5,000 (members, applicants, guests, teachers) | MAU ≪ 100,000 included on Supabase Pro |
| Peak event | Startup Summit: ~400–800 registrations, ~1,000 concurrent page viewers at registration open | Realtime peak connections may briefly exceed 500 |
| Database size | < 1 GB in year 1 | Ledgers, registrations, audit |
| File storage | ~20–30 GB/year (pre-optimised images, evidence, PDFs) | Video is linked from Facebook/YouTube, not stored |
| Emails | ~1,500/month normally. **3,000–6,000/month and > 100/day** in recruitment and Summit months | Drives the Resend plan choice |
| PDF renders | ~1,500 certificates/year + CVs + receipts | Serverless Chromium |
| Background jobs | < 50,000 executions/month | Fits the pg_cron + worker design at no extra vendor cost |

## 2. Unit prices used

| Service | Plan | Price | Key inclusions / limits | Source |
|---|---|---|---|---|
| **Supabase** | Free | $0 | 500 MB DB, 1 GB storage, 5 GB egress, 50k MAU. **Pauses after 1 week of inactivity, max 2 active projects, no backups** | supabase.com/pricing |
| | **Pro** | **$25/mo** | $10 compute credit (covers a Micro instance), 8 GB disk, 100 GB storage, 250 GB egress, 100k MAU, **daily backups kept 7 days**, 500 Realtime peak connections, 5M Realtime messages, 2M Edge Function invocations | supabase.com/pricing |
| | Compute add-ons | Micro $10, Small $15, Medium $60 /mo | Per project. Credit offsets $10 | supabase.com/pricing |
| | Custom domain | **$10/mo** per domain per project | Paid plans only | supabase.com/pricing + custom-domains docs |
| | PITR | $100/mo per 7 days of retention | Optional | supabase.com/pricing |
| | Overages | Storage $0.0213/GB, egress $0.09/GB, Realtime $10 per 1,000 extra peak connections | | supabase.com/pricing |
| **Vercel** | Hobby | $0 | **Personal, non-commercial use only** (fair-use guidelines) | vercel.com/pricing + docs (via search) |
| | **Pro** | **$20/mo per deploying seat**, includes $20 usage credit | 1 TB fast data transfer, then $0.15/GB. Image transformations from $0.05 per 1,000 | vercel.com/pricing |
| **Cloudflare** | Workers Paid | $5/mo | 10M requests + 30M CPU-ms included | developers.cloudflare.com |
| | R2 | $0.015/GB-month, free egress | 10 GB-month free | developers.cloudflare.com/r2/pricing |
| | Registrar | At cost (no markup) | Price varies by TLD | cloudflare.com/products/registrar |
| **Resend** | Free | $0 | **3,000/mo, 100/day**, 3 domains | resend.com/pricing |
| | Pro | $20/mo | 50,000/mo, no daily cap | resend.com/pricing |
| **Sentry** | Developer | $0 | 5k errors/mo, 1 user, 1 cron monitor | sentry.io/pricing |
| | Team | $29/mo ($26 annual) | More users and monitors | sentry.io/pricing |
| **Inngest** (optional) | Hobby | $0 | 50k executions/mo | inngest.com/pricing |
| | Pro | from $99/mo | 1M executions | inngest.com/pricing |
| Amazon SES (fallback) | Pay-as-you-go | $0.10 per 1,000 emails | | *(secondary)* |
| Google Apps Script / Gmail API / Pub/Sub | — | $0 at this volume | Apps Script quotas per account. Pub/Sub free tier *(inferred)* | developers.google.com |
| Meta Graph API | — | $0 | Rate limits only | developers.facebook.com |
| bKash Send Money (Stage 1) | — | Charges borne by payer per bKash tariff | Sources conflict on current bKash-to-bKash fees *(secondary)* | bkash.com limits/charges |
| bKash PGW (Stage 2) | MDR | ≈ 1.5–2% per transaction *(secondary; get a written rate card)* | Merchant onboarding required | — |

## 3. Configurations

### 3.1 Pre-production / prototype only: **$0/month**

Supabase Free + Vercel Hobby + Resend Free. **Not acceptable for production:** Supabase Free pauses after a week of inactivity and has **no backups**, and Vercel Hobby is **non-commercial personal use only**. A club collecting fees and storing student data must not run on it. Use it only for the design prototype and spikes.

### 3.2 Recommended starting production configuration

| Item | Monthly | Notes |
|---|---|---|
| Supabase Pro (1 project, Micro compute covered by credit) | $25 | Daily backups (7 days) |
| Supabase custom domain (`api.<club-domain>`) | $10 | Resilience against ISP/DNS blocks of `*.supabase.co`. Club-branded auth links |
| Vercel Pro (1 deploying seat) | $20 | $20 usage credit covers expected traffic |
| Resend Free → **Pro in peak months** | $0 / $20 | Budget 4 peak months/year |
| Sentry Developer | $0 | Upgrade if more than one person needs access |
| Uptime monitoring (free tier) | $0 | |
| Cloudflare R2 (off-site backups, ≤ 10 GB) | ~$0–1 | Encrypted nightly `pg_dump` + weekly storage sync |
| Domain (e.g. `.org` / `.com`) | ~$1 (≈ $10–15/yr) | Club-owned registrar account |
| **Total (normal month)** | **≈ $56** (≈ BDT 6,800) | |
| **Total (peak month)** | **≈ $76** (≈ BDT 9,300) | |
| **Year 1 estimate** | **≈ $750–770** (≈ BDT 92,000–94,000) | 8 normal + 4 peak months + domain |

**Lean variant (if budget is tight):** drop the Supabase custom domain at first (add it before the first large event, or immediately if a block occurs), and/or host Next.js on **Cloudflare Workers ($5)** via OpenNext instead of Vercel Pro. That brings it to **≈ $31–36/month**. Trade-offs: more engineering effort with Workers (adapter caveats; PDF rendering needs a separate service) and exposure to `*.supabase.co` blocks without the custom domain.

**Staging:** use a Supabase Free project for synthetic-data staging (acceptable because it holds no real data and pausing is tolerable), or a second Pro-org project (Micro compute ≈ +$10/month) once the team grows.

### 3.3 Scalable configuration (year 2+ or if usage grows)

| Item | Monthly |
|---|---|
| Supabase Pro + Small compute (net +$5 after credit) + custom domain | $40 |
| Staging project (Micro) | $10 |
| PITR, 7 days (optional; RPO minutes instead of 24 h) | $100 |
| Vercel Pro (2 deploying seats) | $40 |
| Resend Pro (year-round) | $20 |
| Sentry Team | $29 |
| PDF render container (Gotenberg/Playwright on a small VPS or Cloud Run) | ~$5–7 |
| R2 storage (~50 GB) | ~$1 |
| **Total without PITR** | **≈ $145/month** |
| **Total with PITR** | **≈ $245/month** |

## 4. Transaction costs (not infrastructure, but real)

| Scenario | Example | Cost |
|---|---|---|
| Stage 1 manual Send Money | Payers send to the club wallet | Payer pays bKash's Send Money charge (if any). Club cost $0, but **staff verification time** (~30 s per claim) |
| Stage 2 PGW | Summit: 400 × ৳300 = ৳120,000 | MDR ≈ ৳1,800–2,400 at 1.5–2% *(secondary)* |
| Outgoing payouts | Manual via bKash app/bank | Standard bKash/bank charges per transfer |

## 5. Hidden and operational costs

- **Paying USD subscriptions from Bangladesh** needs an international or dual-currency card with an online-payment allowance. Students often do not have one. Arrange for the subscriptions to be paid by **BAU, an advisor or the club treasury via an institutional card**, and record each payment in the finance module. ⚠️ Operational blocker if unresolved.
- **People time:** finance verification during peaks, content editing, moderation, and on-call for event days.
- **Security review:** an external review before launch (volunteer/pro bono, or a budget line).
- **Training:** a short session per role at each committee handover.
- **Contingency:** keep a 20% buffer for overages during Summit and recruitment spikes (Realtime connections, image transformations, email).

## 6. Cost controls

1. Spend caps and alerts on Vercel and Supabase (set monthly budget alerts at 80%).
2. Pre-generate image variants (avoids per-transformation billing).
3. Public pages cached at the CDN. Realtime subscriptions only while visible.
4. Retention purges keep storage flat.
5. A monthly cost review in the finance dashboard (infrastructure is a budget line).
6. Ask Supabase, Vercel and Sentry about education/non-profit programmes. **Do not assume** any are available.
