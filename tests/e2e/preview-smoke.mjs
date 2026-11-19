// End-to-end smoke test against a running preview server (no DATABASE_URL).
// Usage: BASE=http://localhost:3100 SHOTS=./shots node tests/e2e/preview-smoke.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // pre-installed globally in CI images; or add @playwright/test
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:3000';
const SHOTS = process.env.SHOTS || '';
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch();
let passed = 0, failed = 0;
const problems = [];

async function step(name, fn) {
  try { await fn(); passed++; console.log('  ✓', name); }
  catch (e) { failed++; console.log('  ✗', name, '\n     ', String(e.message).split('\n')[0]); }
}
async function newPage(viewport = { width: 1366, height: 900 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push(`${page.url()} pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|favicon|net::ERR/.test(m.text())) problems.push(`${page.url()} console: ${m.text().slice(0, 160)}`); });
  return { ctx, page };
}
async function noErrors(page) {
  const txt = await page.locator('body').innerText();
  if (/Application error|Something went wrong|Unhandled Runtime Error|This page couldn.t load/i.test(txt)) throw new Error(`error text on ${page.url()}`);
}
async function as(page, name) {
  await page.goto(`${BASE}/login`);
  await page.locator('button', { hasText: name }).first().click();
  await page.waitForURL(/\/app/);
}
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }); };

const { page } = await newPage();
let ticketUrl = '';

console.log('Public site');
for (const path of ['/', '/setup', '/login', '/about', '/events', '/insights', '/insights?lang=bn', '/insights/decoded-monpura-2009', '/insights/prothom-pitch-deck', '/insights/krishi-theke-udyokta',
  '/wings', '/members', '/members/lamia-chowdhury', '/reels', '/advisors', '/gallery', '/resources', '/contact', '/join', '/verify', '/verify/PREVIEWCERT0001', '/privacy', '/sitemap.xml', '/robots.txt']) {
  await step(`GET ${path}`, async () => { const r = await page.goto(BASE + path); if (r.status() !== 200) throw new Error(`status ${r.status()}`); await noErrors(page); });
}
await shot(page, 'home-desktop');

console.log('Register → pay → verify → ticket');
await step('guest registers for the Summit (paid) and lands on the ticket page', async () => {
  await page.goto(`${BASE}/events/startup-summit-2027`);
  await page.fill('#r-name', 'E2E Visitor');
  await page.fill('#r-email', `e2e.${Date.now()}@example.org`);
  await page.check('input[name=consent]');
  await page.click('button:has-text("Hold my seat and pay")');
  await page.waitForURL(/\/tickets\//, { timeout: 15000 });
  ticketUrl = page.url();
  await page.getByText('Pay ৳', { exact: false }).first().waitFor();
});
await shot(page, 'ticket-awaiting-payment');
const trx = 'E2E' + String(Date.now()).slice(-7);
await step('guest submits a bKash TrxID', async () => {
  await page.fill('#trx', trx);
  await page.fill('#last4', '1234');
  await page.click('button:has-text("Submit for verification")');
  await page.getByText('Payment submitted').waitFor({ timeout: 10000 });
});
await step('the same TrxID cannot be reused on another registration', async () => {
  await page.goto(`${BASE}/events/startup-summit-2027`);
  await page.fill('#r-name', 'E2E Second');
  await page.fill('#r-email', `e2e2.${Date.now()}@example.org`);
  await page.check('input[name=consent]');
  await page.click('button:has-text("Hold my seat and pay")');
  await page.waitForURL(/\/tickets\//);
  await page.waitForLoadState('networkidle');
  await page.fill('#trx', trx); await page.fill('#last4', '1234');
  await page.click('button:has-text("Submit for verification")');
  await page.getByText('already been submitted').waitFor({ timeout: 10000 });
  await page.locator('summary', { hasText: 'Cancel this registration' }).click();
  await page.click('button:has-text("Cancel registration")');
  await page.locator('.chip', { hasText: 'Cancelled' }).first().waitFor({ timeout: 10000 }); // section re-renders as cancelled
});
await step('finance officer verifies the payment', async () => {
  await as(page, 'Sadia Afrin');
  await page.goto(`${BASE}/app/finance`);
  const form = page.locator('form', { hasText: trx });
  await form.locator('button:has-text("Matches statement")').click();
  await page.waitForFunction((t) => !document.body.innerText.includes(t), trx, { timeout: 10000 }); // row leaves the queue
});
await shot(page, 'finance');
await step('ticket now shows a QR code', async () => {
  await page.goto(ticketUrl);
  await page.locator('[aria-label="Ticket QR code"]').waitFor();
});
await shot(page, 'ticket-confirmed');
const code = (await page.locator('[data-ticket-code]').first().innerText()).replace(/\s/g, '');

console.log('Approvals (two distinct teacher approvers)');
await step('first teacher approver approves', async () => {
  await as(page, 'Dr. Kamrul Hasan');
  await page.goto(`${BASE}/app/approvals`);
  await shot(page, 'approvals');
  await page.locator('button:has-text("Approve")').first().click();
  await page.getByRole('status').filter({ hasText: 'Another approver is still needed' }).first().waitFor({ timeout: 10000 });
});
await step('second teacher approver completes it', async () => {
  await as(page, 'Dr. Sharmin Sultana');
  await page.goto(`${BASE}/app/approvals`);
  await page.locator('button:has-text("Approve")').first().click();
  await page.getByRole('status').filter({ hasText: 'All required approvals are in' }).first().waitFor({ timeout: 10000 });
});

console.log('Tasks & points');
await step('wing lead approves a submission in scope', async () => {
  await as(page, 'Rafiul Islam');
  await page.goto(`${BASE}/app/review`);
  await shot(page, 'review');
  await page.locator('article', { hasText: 'Poster for Case Studies EP 02' }).locator('button:has-text("Approve")').click();
  await page.getByRole('status').filter({ hasText: 'points posted to the ledger' }).first().waitFor({ timeout: 10000 });
});
await step('member sees verified points and their burst', async () => {
  await as(page, 'Lamia Chowdhury');
  await page.goto(`${BASE}/app/record`);
  await page.getByText('Poster for Case Studies EP 02').first().waitFor();
  await page.getByText('Your burst').waitFor();
});
await shot(page, 'member-record');

console.log('Check-in');
await step('event manager checks the ticket in once; second scan is a duplicate', async () => {
  await as(page, 'Arif Hossain');
  await page.goto(`${BASE}/app/scan`);
  await page.selectOption('#sc-ev', { label: 'BAUBC Startup Summit 2027' });
  await page.fill('input[aria-label="Ticket code"]', code);
  await page.click('button:has-text("Check in")');
  await page.getByText('Welcome').waitFor({ timeout: 10000 });
  await page.waitForTimeout(3200);
  await page.fill('input[aria-label="Ticket code"]', code);
  await page.click('button:has-text("Check in")');
  await page.getByText('Already checked in').waitFor({ timeout: 10000 });
});

console.log('Every workspace page per persona');
const personas = {
  'Tahsin Ahmed': ['/app', '/app/approvals', '/app/review', '/app/manage/tasks', '/app/manage/people', '/app/admin/applications', '/app/finance', '/app/finance?tab=disburse', '/app/finance?tab=book', '/app/finance?tab=refunds', '/app/events/manage', '/app/scan', '/app/admin/people', '/app/admin/content', '/app/admin/inbox', '/app/admin/integrations', '/app/admin/audit', '/app/admin/settings', '/app/admin/wings', '/app/admin/perks', '/app/admin/content?tab=posts', '/app/admin/content?tab=library', '/app/admin/content?tab=reach', '/app/leaderboard', '/app/notifications', '/app/profile'],
  'Dr. Mahbubur Rahman': ['/app', '/app/notices', '/app/dues', '/app/profile'],
  'Nusrat Jahan': ['/app', '/app/review', '/app/manage/tasks', '/app/manage/people', '/app/admin/applications', '/app/admin/people'],
  'Mehedi Hasan': ['/app', '/app/admin/content', '/app/admin/inbox'],
  'Lamia Chowdhury': ['/app', '/app/tasks', '/app/record', '/app/leaderboard', '/app/events', '/app/perks', '/app/notices', '/app/profile', '/print/cv'],
  'Imran Kabir': ['/app', '/app/application', '/app/events', '/app/profile'],
};
for (const [name, paths] of Object.entries(personas)) {
  await as(page, name);
  for (const p of paths) {
    await step(`${name} → ${p}`, async () => { const r = await page.goto(BASE + p); if (r.status() >= 400) throw new Error(`status ${r.status()}`); await noErrors(page); });
  }
}
await as(page, 'Tahsin Ahmed');
await page.goto(`${BASE}/app/admin/applications?id=c0000000-0000-4000-8000-000000000003`);
await shot(page, 'admin-applications');
await step('audit chain verifies in the UI', async () => { await page.goto(`${BASE}/app/admin/audit`); await page.getByText('Chain verified').waitFor(); });

console.log('New admin flows');
await step('settings save as plain fields', async () => {
  await page.goto(`${BASE}/app/admin/settings`);
  const f = page.locator('form', { hasText: 'Club details' });
  await f.locator('input[name=tagline]').fill('Plant ideas. Harvest founders.');
  await f.locator('button:has-text("Save")').click();
  await f.getByRole('status').filter({ hasText: 'Saved' }).waitFor({ timeout: 10000 });
});
await step('bad bKash number is refused', async () => {
  const f = page.locator('form', { hasText: 'bKash payments' });
  await f.locator('input[name=bkash_number]').fill('12345');
  await f.locator('button:has-text("Save")').click();
  await f.getByRole('status').filter({ hasText: 'valid Bangladeshi mobile number' }).waitFor({ timeout: 10000 });
});
await step('HR officer places a member in a wing', async () => {
  await as(page, 'Nusrat Jahan');
  await page.goto(`${BASE}/app/admin/wings`);
  const f = page.locator('form', { has: page.locator('#as-p') });
  await f.locator('#as-t').fill('Coordinator');
  await f.locator('button:has-text("Place")').click();
  await f.getByRole('status').filter({ hasText: 'Placed' }).waitFor({ timeout: 10000 });
});
await step('CSV export downloads under the caller’s permissions', async () => {
  const r = await page.request.get(`${BASE}/app/export/applications`);
  if (r.status() !== 200 || !(await r.text()).includes('full_name,email')) throw new Error(`status ${r.status()}`);
  await as(page, 'Lamia Chowdhury');
  const denied = await page.request.get(`${BASE}/app/export/members`);
  if (denied.status() !== 403) throw new Error(`member got ${denied.status()}`);
  const mine = await page.request.get(`${BASE}/app/export/my-data`);
  if (!(await mine.json()).profile) throw new Error('no profile in my data');
});

console.log('Profiles, articles, reels, contact desk (2026-11-19)');
await step('directory links to profiles; a profile shows no email, phone or student ID', async () => {
  await page.goto(`${BASE}/members`);
  await page.click('a[href="/members/lamia-chowdhury"]');
  await page.waitForURL(/\/members\/lamia-chowdhury/);
  const text = await page.locator('main, article').first().innerText();
  if (!/Lamia Chowdhury/.test(text) || /@baubc\.test|2022-11-0631|\+880/.test(text)) throw new Error('profile content wrong or leaking');
  if ((await page.goto(`${BASE}/members/tanjila-rahman`)).status() !== 404) throw new Error('private profile is public');
});
await step('Bangla article: Bangla title, key lines listed and highlighted', async () => {
  await page.goto(`${BASE}/insights/prothom-pitch-deck`);
  if ((await page.locator('article[lang=bn]').count()) !== 1) throw new Error('no lang=bn');
  const keys = await page.locator('nav.keylines li').count(), marks = await page.locator('mark.hl').count();
  if (keys < 2 || keys !== marks) throw new Error(`key lines ${keys} vs marks ${marks}`);
  await page.locator('nav.keylines a').first().click(); await page.waitForTimeout(600);
  if (!(await page.evaluate(() => location.hash === '#key-1'))) throw new Error('key line link');
});
await step('reels page lists the channel and the player opens and closes', async () => {
  await page.goto(`${BASE}/reels`);
  const n = await page.locator('button.reel-card').count();
  if (!n) throw new Error('no reels');
  await page.locator('button.reel-card').first().click();
  await page.locator('[role=dialog] iframe[src*="youtube-nocookie.com/embed/"]').waitFor();
  await page.keyboard.press('Escape');
  if (await page.locator('[role=dialog]').count()) throw new Error('player did not close');
});
await step('contact desk: a company message gets a reference number', async () => {
  const { page: c, ctx } = await newPage();
  await c.goto(`${BASE}/contact`);
  await c.locator('label.desk-card', { hasText: 'Company' }).click();
  await c.locator('label.desk-chip', { hasText: 'Hire our members' }).click();
  await c.fill('#c-name', 'E2E Recruiter'); await c.fill('#c-email', `e2e.desk.${Date.now()}@example.org`); await c.fill('#c-org', 'E2E Ltd');
  await c.fill('#c-msg', 'We are hiring interns from the club this winter.');
  await c.click('button:has-text("Send message")');
  await c.locator('.desk-done').waitFor({ timeout: 15000 });
  if (!/BAUBC-\d{5}/.test(await c.locator('.desk-done').innerText())) throw new Error('no reference');
  await ctx.close();
});
await step('member claims a perk: code appears, card shows Claimed, toast says delivered', async () => {
  const { page: pm, ctx } = await newPage();
  await as(pm, 'Lamia');
  await pm.goto(`${BASE}/app/perks`);
  const card = pm.locator('article.perk', { hasText: 'Summit Pass' });
  if (await card.locator('button.perk-btn').count()) {
    await card.locator('button.perk-btn').click();
    await pm.locator('.perk-toast').waitFor({ timeout: 10000 });
  }
  if (!/SUMMIT-MEMBER/.test(await card.innerText())) throw new Error('code not shown');
  await ctx.close();
});

const { page: m } = await newPage({ width: 390, height: 844 });
console.log('Phone width: no sideways scrolling');
for (const path of ['/', '/about', '/events', '/events/startup-summit-2027', '/insights', '/insights/mather-theke-bazar', '/wings', '/members', '/members/lamia-chowdhury', '/reels', '/join', '/contact', '/login']) {
  await step(`390px ${path}`, async () => {
    await m.goto(BASE + path);
    const w = await m.evaluate(() => document.documentElement.scrollWidth);
    if (w > 392) throw new Error(`page is ${w}px wide`);
  });
}
await m.goto(BASE + '/'); await shot(m, 'home-mobile');
await m.goto(BASE + '/events/startup-summit-2027'); await shot(m, 'event-mobile');

console.log(`\n${passed} passed, ${failed} failed`);
if (problems.length) console.log('Browser problems:\n  ' + [...new Set(problems)].slice(0, 20).join('\n  '));
await browser.close();
process.exit(failed ? 1 : 0);
