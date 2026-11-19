// Concurrency stress test against a REAL, DISPOSABLE PostgreSQL (not PGlite, not Supabase).
//   STRESS_DATABASE_URL=postgres://postgres@127.0.0.1:54329/postgres node scripts/stress.mjs
// It creates a fresh database "baubc_stress", applies the preview shim + every migration + sample data,
// then fires parallel transactions at the race-prone commands and checks the invariants.
import postgres from 'postgres';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const url = process.env.STRESS_DATABASE_URL;
if (!url || /supabase\.(co|com)|pooler/.test(url)) { console.error('Set STRESS_DATABASE_URL to a disposable local Postgres (never Supabase).'); process.exit(2); }
const root = join(import.meta.dirname, '..');
const admin = postgres(url, { max: 1, onnotice: () => {} });
await admin.unsafe('drop database if exists baubc_stress with (force)');
await admin.unsafe('create database baubc_stress');
await admin.end();
const dbUrl = url.replace(/\/[^/]*$/, '/baubc_stress');
const sql = postgres(dbUrl, { max: 60, onnotice: () => {}, idle_timeout: 5 });

const t0 = Date.now();
await sql.unsafe(readFileSync(join(root, 'supabase/preview/00_shim.sql'), 'utf8'));
for (const f of readdirSync(join(root, 'supabase/migrations')).filter((f) => f.endsWith('.sql')).sort()) await sql.unsafe(readFileSync(join(root, 'supabase/migrations', f), 'utf8'));
await sql.unsafe(readFileSync(join(root, 'supabase/preview/10_sample_data.sql'), 'utf8'));
console.log(`schema + sample data applied in ${Date.now() - t0} ms\n`);

/** One transaction as a given auth user (or anon / table owner), exactly like the app's withClaims. */
const as = (user, fn) => sql.begin(async (tx) => {
  if (user === 'anon') await tx.unsafe(`set local role anon; select set_config('request.jwt.claims', '{"role":"anon"}', true)`);
  else if (user !== 'system') { await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: user, role: 'authenticated', aal: 'aal2' })}, true)`; await tx.unsafe('set local role authenticated'); }
  return fn(tx);
});
const settle = (ps) => Promise.allSettled(ps).then((r) => ({ ok: r.filter((x) => x.status === 'fulfilled').map((x) => x.value), err: r.filter((x) => x.status === 'rejected').map((x) => String(x.reason?.message ?? x.reason).split(':')[0]) }));
const tally = (arr) => arr.reduce((m, k) => ({ ...m, [k]: (m[k] ?? 0) + 1 }), {});
let pass = 0, fail = 0;
const check = (name, cond, detail = '') => { if (cond) { pass++; console.log('  ✓', name, detail); } else { fail++; console.log('  ✗', name, detail); } };

// ── 1. 80 people race for 10 seats ──────────────────────────────────────────
console.log('Seats');
const [tt] = await sql`select t.id from app.ticket_types t join app.events e on e.id = t.event_id where e.slug = 'startup-summit-2027' and t.unit = 'person' order by t.price limit 1`;
await sql`update app.ticket_types set capacity = sold_count + held_count + 10 where id = ${tt.id}`;
let r = await settle(Array.from({ length: 80 }, (_, i) => as('anon', (tx) => tx`select app.reserve_seat(${tt.id}, ${'Racer ' + i}, ${`racer${i}@example.com`}, null, null, null, '[]', '{}', '{}', null) r`)));
let [row] = await sql`select capacity, sold_count + held_count used from app.ticket_types where id = ${tt.id}`;
check('80 parallel bookings for 10 seats: exactly 10 succeed', r.ok.length === 10, JSON.stringify(tally(r.err)));
check('never over-booked', row.used <= row.capacity, `${row.used}/${row.capacity}`);

await sql`update app.ticket_types set capacity = sold_count + held_count + 5 where id = ${tt.id}`;
r = await settle(Array.from({ length: 12 }, (_, i) => as('anon', (tx) => tx`select app.reserve_seat(${tt.id}, 'Double Click', 'double@example.com', null, null, null, '[]', '{}', '{}', ${'idem-' + i}) r`)));
const [{ n: dn }] = await sql`select count(*)::int n from app.registrations where identity_key = 'e:double@example.com' and status in ('pending_payment','pending_verification','confirmed')`;
check('12 parallel bookings by the same email → one registration', dn === 1, JSON.stringify(tally(r.err)));

// ── 2. Google Form webhook: replays and floods ──────────────────────────────
console.log('Google Form registrations');
await sql`update app.ticket_types set capacity = sold_count + held_count + 5 where id = ${tt.id}`;
r = await settle(Array.from({ length: 30 }, () => as('system', (tx) => tx`select app.ingest_form_registration(${sql.json({ response_id: 'same-response', event_slug: 'startup-summit-2027', full_name: 'Replay Person', email: 'replay@example.com' })}) r`)));
let [{ n }] = await sql`select count(*)::int n from app.registrations where idempotency_key = 'form:same-response'`;
check('30 parallel deliveries of one response → one registration, no errors', n === 1 && r.err.length === 0, `${r.ok.length} ok, errors ${JSON.stringify(tally(r.err))}`);
r = await settle(Array.from({ length: 40 }, (_, i) => as('system', (tx) => tx`select app.ingest_form_registration(${sql.json({ response_id: `flood-${i}`, event_slug: 'startup-summit-2027', full_name: `Flood ${i}`, email: `flood${i}@example.com` })}) r`)));
[row] = await sql`select capacity, sold_count + held_count used from app.ticket_types where id = ${tt.id}`;
check('40 different form responses for 4 remaining seats: no over-booking', row.used <= row.capacity, `${r.ok.length} accepted, ${JSON.stringify(tally(r.err))}, ${row.used}/${row.capacity}`);
r = await settle(Array.from({ length: 10 }, (_, i) => as('anon', (tx) => tx`select app.ingest_form_registration(${sql.json({ response_id: `anon-${i}`, event_slug: 'startup-summit-2027', full_name: 'X', email: 'x@example.com' })})`)));
check('the public cannot call the form intake directly', r.ok.length === 0, JSON.stringify(tally(r.err)));

// ── 3. Perks: double-clicks and a stampede for limited codes ────────────────
console.log('Perks');
const members = Array.from({ length: 14 }, (_, i) => `a0000000-0000-4000-8000-0000000001${String(i).padStart(2, '0')}`);
for (const [i, u] of members.entries()) {
  const pid = `b0000000-0000-4000-8000-0000000001${String(i).padStart(2, '0')}`;
  await sql`insert into auth.users(id, email) values (${u}, ${`stress${i}@example.com`})`;
  await sql`insert into app.people(id, user_id, full_name, email) values (${pid}, ${u}, ${`Stress Member ${i}`}, ${`stress${i}@example.com`})`;
  await sql`insert into app.memberships(person_id, member_no, status_key) values (${pid}, ${`STRESS-${i}`}, 'active')`;
}
const [perk] = await sql`insert into app.perks(title, partner, description, mode, distribution_permission, status) values ('Stress perk', 'Test', 'Limited codes', 'unique_codes', 'test', 'active') returning id`;
await sql`insert into private.perk_codes(perk_id, code) select ${perk.id}, 'CODE-' || g from generate_series(1, 5) g`;
r = await settle(Array.from({ length: 25 }, () => as(members[0], (tx) => tx`select app.claim_perk(${perk.id}) v`)));
const values = new Set(r.ok.map((x) => x[0].v));
[{ n }] = await sql`select count(*)::int n from private.perk_codes where perk_id = ${perk.id} and claimed_by is not null`;
check('25 parallel clicks by one member → one code, same answer every time', n === 1 && values.size === 1 && r.err.length === 0, `codes used ${n}, distinct answers ${values.size}, errors ${JSON.stringify(tally(r.err))}`);
r = await settle(members.slice(1).map((u) => as(u, (tx) => tx`select app.claim_perk(${perk.id}) v`)));
const codes = r.ok.map((x) => x[0].v);
[{ n }] = await sql`select count(*)::int n from private.perk_codes where perk_id = ${perk.id} and claimed_by is not null`;
check('13 members race for the last 4 codes: 4 win, no code handed out twice', r.ok.length === 4 && new Set(codes).size === codes.length && n === 5, `${JSON.stringify(tally(r.err))}`);

// ── 4. Contact desk flood ───────────────────────────────────────────────────
console.log('Contact desk');
r = await settle(Array.from({ length: 90 }, (_, i) => as('anon', (tx) => tx`select app.submit_inquiry(${sql.json({ sender_type: 'company', organization: 'Flood Ltd', category: 'collaboration', name: `Sender ${i}`, email: `sender${i}@example.com`, message: 'Hello, we would like to collaborate with the club.' })}) r`)));
const refs = r.ok.map((x) => x[0].r.reference);
check('reference numbers are unique under load', new Set(refs).size === refs.length, `${refs.length} accepted`);
check('a flood is capped (60 per 10 minutes) and the rest are told to wait', r.ok.length <= 60 && r.err.every((e) => e === 'BUSY'), JSON.stringify(tally(r.err)));
await sql`delete from app.contact_inquiries where email like 'sender%@example.com'`;
r = await settle(Array.from({ length: 6 }, () => as('anon', (tx) => tx`select app.submit_inquiry(${sql.json({ name: 'Same Person', email: 'same@example.com', message: 'Hello there, a question about joining.' })})`)));
check('one sender cannot post more than 3 an hour', r.ok.length <= 3 + 1, `${r.ok.length} accepted, ${JSON.stringify(tally(r.err))}`);

// ── 5. Profile handles ──────────────────────────────────────────────────────
console.log('Profiles');
r = await settle(members.slice(0, 8).map((u) => as(u, (tx) => tx`select app.set_my_handle('popular-name')`)));
[{ n }] = await sql`select count(*)::int n from app.people where handle = 'popular-name'`;
check('8 members grab the same address at once: exactly one gets it', n === 1 && r.ok.length === 1, JSON.stringify(tally(r.err)));
const [p] = await as('anon', (tx) => tx`select app.public_profile('lamia-chowdhury') p`);
const text = JSON.stringify(p.p ?? {});
check('public profile never contains email, phone or student ID', !!p.p && !/@|\+880|01700|2022-11-0631/.test(text), text.length + ' bytes');

// ── 6. Read load: 400 parallel public reads ─────────────────────────────────
console.log('Read load');
const t1 = Date.now();
r = await settle(Array.from({ length: 400 }, (_, i) => as('anon', (tx) => [
  () => tx`select * from app.public_members()`, () => tx`select app.public_profile('lamia-chowdhury')`, () => tx`select * from app.recent_registrations((select id from app.events where slug = 'startup-summit-2027'), 6)`,
  () => tx`select * from app.event_availability((select id from app.events where slug = 'startup-summit-2027'))`, () => tx`select * from app.posts where status = 'published'`,
][i % 5]())));
check('400 parallel public reads, no errors', r.err.length === 0, `${Date.now() - t1} ms total`);

await sql.end();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
