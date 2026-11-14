# Document 13: Sources and Verification Log

> Research performed on **14 November 2026**. **[O]** = official source read directly. **[S]** = secondary source (search result or third-party article), to be confirmed. **[M]** = measured or derived by us. Facts that drive decisions are marked with the document that uses them.

## Law and regulation (Bangladesh)

| Source | Status | Used for |
|---|---|---|
| [bdlaws.minlaw.gov.bd/act-1692.html](https://bdlaws.minlaw.gov.bd/act-1692.html) and the official gazette PDF (Act No. 63 of 2026, uploaded 30 Apr 2026) | [O] Header and English defined terms extracted. The Bangla body uses a legacy font encoding and could not be machine-read | Doc 8 §8: title, act number, gazette date 10 Apr 2026, defined terms |
| [Securiti: overview of Bangladesh PDPA 2026](https://securiti.ai/bangladesh-personal-data-protection-act-overview/) | [S] | Rights, consent, cross-border, CDO, penalties (to be confirmed by counsel) |
| [BD Law Post: PDPA 2026 (Oct 2026)](https://www.bdlawpost.com/2026/10/personal-data-protection-act-2026-new.html) | [S] | Effective dates (s.1(3)), classification, penalties |
| [TRW Law Firm guide](https://trw.org/bangladesh-online-privacy-regulations/) | [S] | Context only |

## bKash

| Source | Status | Used for |
|---|---|---|
| [developer.bka.sh/docs](https://developer.bka.sh/docs) and [llms.txt index](https://developer.bka.sh/llms.txt) | [O] | API list (tokenized checkout, agreement, auth and capture, search, refund) |
| developer.bka.sh token management v2, create payment, execute payment, query payment, refund pages | [O] | Token lifetime 3,600 s, refresh window, ≤ 2 grant/refresh per hour, 30 s timeouts, paymentID 24 h / single execute, error 2062, refund rules (10 partial, 60 days, 10-minute duplicate block) |
| developer.bka.sh Instant Payment Notification page | [O] | SNS-style signed IPN, successful transactions only |
| [developer.bka.sh/docs/b2c-payout](https://developer.bka.sh/docs/b2c-payout) | [O] Page body empty (updated 2026-09-20) | Doc 7 §5: payout not publicly documented |
| [bkash.com/en/business](https://www.bkash.com/en/business) | [S] HTTP 403 when fetched. Search snippet mentions B2C payout | Doc 7 §5 |
| [bkash.com limits page](https://www.bkash.com/en/help/limits) | [S] Snippet only | Send Money limits (to confirm) |
| [SSLCommerz onboarding requirements](https://sslcommerz.com/onboarding-requirements/) | [S] | Merchant document requirements, education and NGO categories |
| Payment gateway comparisons (Medium, Viserx, PhotonPay) | [S] | Indicative MDR ranges only |

## Meta / Facebook

| Source | Status | Used for |
|---|---|---|
| [Graph API changelog](https://developers.facebook.com/docs/graph-api/changelog) | [O] | v27.0 released 4 Nov 2026 |
| [Page Insights reference](https://developers.facebook.com/docs/graph-api/reference/insights/) | [O] (partly truncated) | Permissions, 100-like threshold, 24 h update cadence, 2-year history, 90-day window, current metrics |
| [Deprecated Page Insights metrics](https://developers.facebook.com/docs/platforminsights/page/deprecated-metrics) and [Page Insights API updates blog (15 Aug 2025)](https://developers.facebook.com/blog/post/2025/08/15/page-insights-api-updates/) | [O] | Nov 2025 deprecations (impressions → views, fans) |
| [Comments and @mentions guide](https://developers.facebook.com/docs/pages-api/comments-mentions) | [O] | `from` on comments, page-scoped IDs, required tasks |
| [Post reactions](https://developers.facebook.com/docs/graph-api/reference/post/reactions/) and [sharedposts](https://developers.facebook.com/docs/graph-api/reference/post/sharedposts/) references | [O] | Reaction lists. Share attribution not established |
| [Webhooks for Pages](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-for-pages) | [O] | Feed webhook permissions, App Review requirement |
| [Access levels](https://developers.facebook.com/docs/graph-api/overview/access-levels), [Permissions reference](https://developers.facebook.com/docs/permissions) | [O] | Standard vs Advanced access, Business Verification |
| [Page access tokens](https://developers.facebook.com/docs/pages/access-tokens), [Rate limiting](https://developers.facebook.com/docs/graph-api/overview/rate-limiting) | [O] | Token lifetimes, system-user tokens, BUC limits |
| Supermetrics, Blotato, PPC Land articles on 2026 metric changes | [S] | June 2026 deprecation timing (conflicting) |

## Google (Gmail, Workspace, Apps Script, Forms)

| Source | Status | Used for |
|---|---|---|
| [Gmail push notifications](https://developers.google.com/workspace/gmail/api/guides/push) | [O] | Watch renewal (≤ 7 days, daily recommended), payload, dropped notifications, 1/s rate |
| [Gmail sync guide](https://developers.google.com/workspace/gmail/api/guides/sync) | [O] | history.list, 404 → full sync |
| [Gmail API scopes](https://developers.google.com/workspace/gmail/api/auth/scopes) | [O] | Restricted vs sensitive scopes |
| [OAuth app verification (13464321, 13465431, 13464323)](https://support.google.com/cloud/answer/13464321) | [O] | Restricted-scope verification, CASA, internal-app exemption |
| [OAuth 2.0 refresh token expiration](https://developers.google.com/identity/protocols/oauth2#expiration) | [O] | 7-day expiry in Testing, other expiry causes |
| [Workspace: control which apps access data](https://knowledge.workspace.google.com/admin/apps/control-which-apps-access-google-workspace-data) | [O] | Admin API controls |
| [Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas) | [O] | Trigger runtime, UrlFetch and Gmail read quotas |
| DNS lookup of `bau.edu.bd` (MX, TXT) via dns.google | [M] | Workspace hosting confirmed. Secondary MX misconfiguration observed |
| Google Forms webhook guides (Svix, webhookrelay, labnol) | [S] | Installable trigger requirement, no automatic retries |
| [Google AI Pro student trial help](https://support.google.com/gemini/answer/16417758) and press coverage | [O]/[S] | Perk distribution caution (individually verified, non-transferable offers) |

## Platform pricing and capabilities

| Source | Status | Used for |
|---|---|---|
| [supabase.com/pricing](https://supabase.com/pricing), [custom domains](https://supabase.com/docs/guides/platform/custom-domains) | [O] | Doc 11 plan limits and prices |
| [Supabase Before User Created hook](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook), [Custom Access Token hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook), [RBAC custom claims](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) | [O]/[S] | Invite-only auth, claims as hints |
| [Supabase Realtime concepts](https://supabase.com/docs/guides/realtime/concepts), [Broadcast from database](https://supabase.com/blog/realtime-broadcast-from-database), [Realtime benchmarks](https://supabase.com/docs/guides/realtime/benchmarks) | [O]/[S] | Broadcast recommended over Postgres Changes at scale |
| Reports of the Feb 2026 Indian ISP block of `supabase.co` ([AIM](https://analyticsindiamag.com/ai-news/supabase-appeals-to-ashwini-vaishnaw-after-access-on-jio-airtel-act-gets-blocked), [DEV](https://dev.to/dishant0406/your-supabase-app-broke-in-india-it-wasnt-your-code-3lkn)) | [S] | Custom-domain resilience decision |
| [vercel.com/pricing](https://vercel.com/pricing), [Hobby plan docs](https://vercel.com/docs/plans/hobby) | [O]/[S] | Pro price and credit. Hobby non-commercial restriction |
| [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [Registrar](https://www.cloudflare.com/products/registrar/) | [O] | Lean hosting option, off-site backups |
| [resend.com/pricing](https://resend.com/pricing), [inngest.com/pricing](https://www.inngest.com/pricing), [sentry.io/pricing](https://sentry.io/pricing/) | [O] | Email, jobs and monitoring costs |
| Amazon SES pricing (third-party summaries) | [S] | Fallback email cost |
| npm registry (`registry.npmjs.org/<pkg>/latest`) | [M] | Library versions as of 14 Nov 2026 (Doc 3 header) |
| [Next.js 16 release](https://nextjs.org/blog/next-16) | [O] | `proxy.ts`, Cache Components, LTS status |

## Design

| Source | Status | Used for |
|---|---|---|
| Google Fonts CSS2 API (`fonts.googleapis.com/css2?family=…`) | [M] HTTP 200 for every family with the stated axes | Doc 6 §7.2 font availability and axes |
| [Anek on GitHub (Ek Type)](https://github.com/EkType/Anek), [Google Design case study](https://design.google/library/anek-multiscript) | [O] | Anek Bangla axes and licence |
| WCAG 2.x contrast formula | [M] Computed for every token pair | Doc 6 §7.1 contrast table |
| WCAG 2.2, OWASP ASVS 5.0 | Reference standards (not re-fetched in this session) | Doc 6 §10, Doc 10 |
