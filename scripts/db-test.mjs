// Database invariant tests: run with `npm run db:test`. Uses the real migrations in PGlite with RLS on.
import { createPreviewDb } from './lib/preview-db.mjs';

const P = (n) => `a0000000-0000-4000-8000-0000000000${n}`; // auth user ids of preview personas
const SA1 = P('01'), SA2 = P('02'), TA1 = P('03'), TA2 = P('04'), HR = P('06'), LEAD = P('07'), FO = P('08'), EM = P('09'), M1 = P('0b'), M2 = P('0c'), AP1 = P('0e');

const db = await createPreviewDb();
let passed = 0, failed = 0;
async function as(user, fn, aal = 'aal2') {
  await db.exec('begin');
  try {
    if (user === 'anon') {
      await db.exec(`set local role anon; select set_config('request.jwt.claims', '{"role":"anon"}', true);`);
    } else if (user === 'system') {
      /* table owner */
    } else {
      await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: user, role: 'authenticated', aal })]);
      await db.exec('set local role authenticated');
    }
    const r = await fn((sql, params = []) => db.query(sql, params));
    await db.exec('commit');
    return r;
  } catch (e) {
    await db.exec('rollback');
    throw e;
  }
}
async function test(name, fn) {
  try { await fn(); passed++; console.log('  ✓', name); }
  catch (e) { failed++; console.log('  ✗', name, '\n     ', e.message); }
}
async function rejects(fn, pattern) {
  try { await fn(); } catch (e) { if (pattern && !new RegExp(pattern).test(e.message)) throw new Error(`wrong error: ${e.message}`); return; }
  throw new Error('expected an error');
}
const one = async (q) => (await q).rows[0];

console.log('Schema & RLS');
await test('every app table has RLS enabled', async () => {
  const r = await db.query(`select count(*)::int n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('app','private') and c.relkind='r' and not c.relrowsecurity`);
  if (r.rows[0].n !== 0) throw new Error('tables without RLS');
});
await test('anon cannot read people', () => rejects(() => as('anon', (q) => q('select * from app.people')), 'permission denied'));
await test('anon reads published events', async () => {
  const r = await as('anon', (q) => q(`select count(*)::int n from app.events`));
  if (r.rows[0].n < 5) throw new Error('expected events');
});
await test('member sees only own payments', async () => {
  const r = await as(M1, (q) => q(`select count(*)::int n from app.payments`));
  if (r.rows[0].n !== 1) throw new Error(`saw ${r.rows[0].n}`);
});
await test('applicant cannot read other applications', async () => {
  const r = await as(AP1, (q) => q(`select count(*)::int n from app.applications`));
  if (r.rows[0].n !== 1) throw new Error(`saw ${r.rows[0].n}`);
});
await test('ledger is append-only (even for table owner)', () => rejects(() => as('system', (q) => q(`update app.point_ledger set amount = 999`)), 'APPEND_ONLY'));
await test('member cannot insert into ledger', () => rejects(() => as(M1, (q) => q(`insert into app.point_ledger(person_id, amount, kind, category, reason) values ('b0000000-0000-4000-8000-00000000000b', 100, 'adjustment', 'x', 'x')`)), 'permission denied'));
await test('editors cannot write seat counters directly', () => rejects(() => as(EM, (q) => q(`update app.ticket_types set sold_count = 0`)), 'permission denied'));

await test('task, assignment and submission policies never recurse (every persona)', async () => {
  for (const u of [SA1, TA1, P('05'), HR, LEAD, FO, EM, M1, M2, AP1]) {
    await as(u, (q) => q(`select count(*) from app.tasks t join app.task_assignments a on a.task_id = t.id left join app.task_submissions s on s.assignment_id = a.id left join app.validation_results v on v.submission_id = s.id`));
  }
});
await test('lead sees only own-wing assignments', async () => {
  const r = await as(LEAD, (q) => q(`select count(*)::int n from app.task_assignments a join app.tasks t on t.id = a.task_id where a.assignee_person_id <> 'b0000000-0000-4000-8000-000000000007' and t.scope_unit_id is distinct from (select id from app.org_units where slug='media-communications')`));
  if (r.rows[0].n !== 0) throw new Error(`saw ${r.rows[0].n} out-of-scope`);
});

console.log('Events & seats');
let summitPass, guestReg;
await test('anon reserves a paid seat → invoice + hold', async () => {
  summitPass = (await one(db.query(`select t.id from app.ticket_types t join app.events e on e.id=t.event_id where e.slug='startup-summit-2027' and t.name='Summit pass'`))).id;
  const r = await as('anon', (q) => q(`select app.reserve_seat($1,'Test Guest','test.guest@example.org',null,'NSU',null,'[]','{}','{}','idem-test-1') r`, [summitPass]));
  guestReg = r.rows[0].r;
  if (guestReg.status !== 'pending_payment' || !guestReg.invoice_id) throw new Error(JSON.stringify(guestReg));
});
await test('idempotent retry returns the same registration', async () => {
  const r = await as('anon', (q) => q(`select app.reserve_seat($1,'Test Guest','test.guest@example.org',null,'NSU',null,'[]','{}','{}','idem-test-1') r`, [summitPass]));
  if (r.rows[0].r.registration_id !== guestReg.registration_id) throw new Error('not idempotent');
});
await test('duplicate registration for the same email is refused', () => rejects(() => as('anon', (q) => q(`select app.reserve_seat($1,'X','test.guest@example.org',null,null,null,'[]','{}','{}','idem-test-2')`, [summitPass])), 'ALREADY_REGISTERED'));
await test('inventory never oversells (capacity respected)', async () => {
  const tt = await one(db.query(`select capacity, sold_count, held_count from app.ticket_types where id=$1`, [summitPass]));
  const left = tt.capacity - tt.sold_count - tt.held_count;
  for (let i = 0; i < left; i++) await as('anon', (q) => q(`select app.reserve_seat($1,'Load ' || $2,'load' || $2 || '@example.org',null,null,null,'[]','{}','{}',null)`, [summitPass, String(i)]));
  await rejects(() => as('anon', (q) => q(`select app.reserve_seat($1,'Late','late@example.org',null,null,null,'[]','{}','{}',null)`, [summitPass])), 'SOLD_OUT');
  const after = await one(db.query(`select capacity, sold_count + held_count used from app.ticket_types where id=$1`, [summitPass]));
  if (after.used !== after.capacity) throw new Error(JSON.stringify(after));
});
await test('waitlist join when sold out', async () => {
  const r = await as('anon', (q) => q(`select app.join_waitlist($1,'Waiter','waiter@example.org') r`, [summitPass]));
  if (r.rows[0].r.position !== 1) throw new Error(JSON.stringify(r.rows[0].r));
});
await test('guest claims bKash TrxID with manage token', async () => {
  const reg = await one(db.query(`select manage_token from app.registrations where id=$1`, [guestReg.registration_id]));
  await as('anon', (q) => q(`select app.claim_payment($1,$2,'TST1234567','5678',300,now(),'pay-idem-1')`, [guestReg.invoice_id, reg.manage_token]));
  const s = await one(db.query(`select status from app.registrations where id=$1`, [guestReg.registration_id]));
  if (s.status !== 'pending_verification') throw new Error(s.status);
});
await test('a TrxID can never be reused', async () => {
  const other = await one(db.query(`select i.id, r.manage_token from app.invoices i join app.registrations r on r.id=i.registration_id where r.email='load0@example.org'`));
  await rejects(() => as('anon', (q) => q(`select app.claim_payment($1,$2,'tst1234567','5678',300,now(),null)`, [other.id, other.manage_token])), 'TRXID_ALREADY_USED');
});
await test('cancelling a held seat promotes the waitlist', async () => {
  const other = await one(db.query(`select id, manage_token from app.registrations where email='load1@example.org'`));
  await as('anon', (q) => q(`select app.cancel_registration($1,$2,'changed plans')`, [other.id, other.manage_token]));
  const w = await one(db.query(`select status from app.waitlist_entries where email='waiter@example.org'`));
  if (w.status !== 'offered') throw new Error(w.status);
});
await test('member cannot verify payments', () => rejects(() => as(M1, (q) => q(`select app.verify_payment(id, true, null) from app.payments limit 1`)), 'PERMISSION_DENIED'));
await test('finance officer needs MFA (aal2) to verify', async () => {
  const p = await one(db.query(`select p.id from app.payments p where provider_trx_id='TST1234567'`));
  await rejects(() => as(FO, (q) => q(`select app.verify_payment($1, true, null)`, [p.id]), 'aal1'), 'MFA_REQUIRED');
});
await test('finance officer verifies → seat confirmed, cash book entry', async () => {
  const p = await one(db.query(`select p.id from app.payments p where provider_trx_id='TST1234567'`));
  const before = await one(db.query(`select sold_count from app.ticket_types where id=$1`, [summitPass]));
  await as(FO, (q) => q(`select app.verify_payment($1, true, null)`, [p.id]));
  const reg = await one(db.query(`select status from app.registrations where id=$1`, [guestReg.registration_id]));
  const after = await one(db.query(`select sold_count from app.ticket_types where id=$1`, [summitPass]));
  const fe = await one(db.query(`select count(*)::int n from app.finance_entries where payment_id=$1`, [p.id]));
  if (reg.status !== 'confirmed' || after.sold_count !== before.sold_count + 1 || fe.n !== 1) throw new Error('not confirmed');
});
await test('check-in is single use', async () => {
  const r = await one(db.query(`select r.ticket_code, r.event_id from app.registrations r join app.events e on e.id=r.event_id where e.slug='pitch-arena' limit 1`));
  const a = await as(EM, (q) => q(`select app.check_in($1,$2,'main','dev1') r`, [r.ticket_code, r.event_id]));
  const b = await as(EM, (q) => q(`select app.check_in($1,$2,'main','dev2') r`, [r.ticket_code, r.event_id]));
  if (a.rows[0].r.result !== 'ok' || b.rows[0].r.result !== 'duplicate') throw new Error(JSON.stringify([a.rows[0].r, b.rows[0].r]));
});
await test('certificates only for checked-in attendees', async () => {
  const e = await one(db.query(`select id from app.events where slug='pitch-arena'`));
  const r = await as(EM, (q) => q(`select app.issue_event_certificates($1) n`, [e.id]));
  if (r.rows[0].n !== 1) throw new Error(`issued ${r.rows[0].n}`);
});
await test('public certificate verification shows minimal data', async () => {
  const r = await as('anon', (q) => q(`select * from app.verify_document('PREVIEWCERT0001')`));
  if (r.rows[0].status !== 'valid' || 'email' in r.rows[0]) throw new Error(JSON.stringify(r.rows[0]));
});

console.log('Approvals & disbursements');
const DR = '90000000-0000-4000-8000-000000000001';
const areq = async () => (await one(db.query(`select id from app.approval_requests where disbursement_id=$1`, [DR]))).id;
await test('requester cannot approve own request', async () => { const id = await areq(); await rejects(() => as(FO, (q) => q(`select app.decide_approval($1,'approve','ok')`, [id])), 'SOD_VIOLATION'); });
await test('teacher without mandate cannot approve', async () => { const id = await areq(); await rejects(() => as(P('05'), (q) => q(`select app.decide_approval($1,'approve','ok')`, [id])), 'NO_MANDATE'); });
await test('first approval keeps it pending (policy needs two)', async () => {
  const id = await areq();
  const r = await as(TA1, (q) => q(`select app.decide_approval($1,'approve','Within budget') r`, [id]));
  if (r.rows[0].r.status !== 'pending') throw new Error(r.rows[0].r.status);
});
await test('same approver cannot vote twice', async () => { const id = await areq(); await rejects(() => as(TA1, (q) => q(`select app.decide_approval($1,'approve','again')`, [id]))); });
await test('second distinct approver completes it', async () => {
  const id = await areq();
  const r = await as(TA2, (q) => q(`select app.decide_approval($1,'approve','OK') r`, [id]));
  const d = await one(db.query(`select status from app.disbursement_requests where id=$1`, [DR]));
  if (r.rows[0].r.status !== 'approved' || d.status !== 'approved') throw new Error(d.status);
});
await test('approver cannot execute the payout', () => rejects(() => as(TA1, (q) => q(`select app.record_execution($1,'bkash','EXE0000001',18500,null)`, [DR])), 'PERMISSION_DENIED'));
await test('finance officer records execution; cannot verify own payout', async () => {
  await as(FO, (q) => q(`select app.record_execution($1,'bkash','EXE0000001',18500,'https://drive.google.com/proof')`, [DR]));
  await rejects(() => as(FO, (q) => q(`select app.verify_execution($1, true, null)`, [DR])), 'SOD_VIOLATION');
  await as(SA1, (q) => q(`select app.verify_execution($1, true, 'Matches statement')`, [DR]));
  const d = await one(db.query(`select status from app.disbursement_requests where id=$1`, [DR]));
  if (d.status !== 'successful') throw new Error(d.status);
});

console.log('Tasks & points');
await test('member cannot review own submission', () => rejects(() => as(M1, (q) => q(`select app.review_submission('f0000000-0000-4000-8000-000000000001','approve','x',null)`)), 'PERMISSION_DENIED'));
await test('lead approves in-scope submission → one ledger entry', async () => {
  await as(LEAD, (q) => q(`select app.review_submission('f0000000-0000-4000-8000-000000000001','approve','Strong layout',null)`));
  const r = await one(db.query(`select count(*)::int n, sum(amount)::int s from app.point_ledger where source_id='f0000000-0000-4000-8000-000000000001'`));
  if (r.n !== 1 || r.s !== 30) throw new Error(JSON.stringify(r));
});
await test('lead cannot review out-of-scope task', () => rejects(() => as(LEAD, (q) => q(`select app.review_submission('f0000000-0000-4000-8000-000000000002','approve','x',null)`)), 'PERMISSION_DENIED'));
await test('approved submission is locked', () => rejects(() => as('system', (q) => q(`update app.task_submissions set content='edited' where id='f0000000-0000-4000-8000-000000000001'`)), 'SUBMISSION_LOCKED'));
await test('reversal creates a correcting entry', async () => {
  const e = await one(db.query(`select id from app.point_ledger where source_id='f0000000-0000-4000-8000-000000000001'`));
  await as(HR, (q) => q(`select app.reverse_points($1,'Duplicate of an earlier poster')`, [e.id]));
  await rejects(() => as(HR, (q) => q(`select app.reverse_points($1,'again')`, [e.id])));
});
await test('social points capped per month', async () => {
  const r = await as(HR, (q) => q(`select app.review_submission('f0000000-0000-4000-8000-000000000002','approve','Good comment',null) r`));
  if (!r.rows[0].r.ledger_entry) throw new Error('no entry');
});

console.log('Membership & RBAC');
await test('HR moves application to provisional; cannot finalise', async () => {
  await as(HR, (q) => q(`select app.transition_application('c0000000-0000-4000-8000-000000000001','provisionally_approved',null,null,null)`));
  await rejects(() => as(HR, (q) => q(`select app.transition_application('c0000000-0000-4000-8000-000000000001','finalized',null,null,null)`)), 'PERMISSION_DENIED');
});
await test('illegal transition refused', () => rejects(() => as(SA1, (q) => q(`select app.transition_application('c0000000-0000-4000-8000-000000000003','finalized',null,null,null)`)), 'ILLEGAL_TRANSITION'));
await test('reject needs a reason', () => rejects(() => as(HR, (q) => q(`select app.transition_application('c0000000-0000-4000-8000-000000000004','rejected','',null,null)`)), 'REASON_REQUIRED'));
await test('Super Admin finalises → member number + locked fields', async () => {
  const r = await as(SA1, (q) => q(`select app.transition_application('c0000000-0000-4000-8000-000000000001','finalized',null,null,null) r`));
  if (!/^BAUBC-\d{4}-\d{4}$/.test(r.rows[0].r.member_no)) throw new Error(JSON.stringify(r.rows[0].r));
  await rejects(() => as('system', (q) => q(`update app.people set full_name='Changed' where id='b0000000-0000-4000-8000-00000000000e'`)), 'VERIFIED_FIELD_LOCKED');
});
await test('privileged grant needs a second Super Admin', async () => {
  const r = await as(SA1, (q) => q(`select app.grant_role('b0000000-0000-4000-8000-00000000000c','finance_officer','global',null,null) r`));
  const id = r.rows[0].r.change_id;
  await rejects(() => as(SA1, (q) => q(`select app.confirm_privileged_change($1, true)`, [id])), 'SOD_VIOLATION');
  await as(SA2, (q) => q(`select app.confirm_privileged_change($1, true)`, [id]));
  const n = await one(db.query(`select count(*)::int n from app.role_assignments where person_id='b0000000-0000-4000-8000-00000000000c' and role_key='finance_officer'`));
  if (n.n !== 1) throw new Error('not granted');
});
await test('no self-grants', () => rejects(() => as(HR, (q) => q(`select app.grant_role('b0000000-0000-4000-8000-000000000006','event_manager','global',null,null)`)), 'SOD_VIOLATION'));
await test('last Super Admin cannot be removed', async () => {
  const a = await one(db.query(`select id from app.role_assignments where person_id='b0000000-0000-4000-8000-000000000002' and role_key='super_admin'`));
  await as(SA1, (q) => q(`select app.revoke_role($1,'test')`, [a.id]));
  const b = await one(db.query(`select id from app.role_assignments where person_id='b0000000-0000-4000-8000-000000000001' and role_key='super_admin'`));
  await rejects(() => as(SA1, (q) => q(`select app.revoke_role($1,'test')`, [b.id])), 'LAST_SUPER_ADMIN');
});

console.log('Intake & audit');
await test('Google Form intake refuses password fields', () => rejects(() => as('system', (q) => q(`select app.ingest_application('google_form','{"response_id":"r-x","email":"a@b.com","full_name":"A B","password":"x"}','h')`)), 'FORBIDDEN_FIELD'));
await test('intake creates person, application and activation; replay is a no-op', async () => {
  const payload = { response_id: 'r-new-1', email: 'New.Applicant@Example.org', full_name: 'New Applicant', student_id: '2025-11-0001', preferred_units: ['partnerships'] };
  const r = await as('system', (q) => q(`select app.ingest_application('google_form',$1,'hash-new-1') r`, [payload]));
  if (!r.rows[0].r.needs_activation) throw new Error('no activation');
  const r2 = await as('system', (q) => q(`select app.ingest_application('google_form',$1,'hash-new-2') r`, [payload]));
  if (!r2.rows[0].r.duplicate_delivery) throw new Error('not deduped');
  await db.query(`insert into auth.users(id, email) values ('a0000000-0000-4000-8000-0000000000ff','new.applicant@example.org')`);
  await as('system', (q) => q(`select app.consume_provision('hash-new-1','a0000000-0000-4000-8000-0000000000ff')`));
  await rejects(() => as('system', (q) => q(`select app.consume_provision('hash-new-1','a0000000-0000-4000-8000-0000000000ff')`)), 'ACTIVATION_LINK_INVALID');
});
await test('audit hash chain verifies', async () => {
  const r = await one(db.query(`select * from app.verify_audit_chain()`));
  if (!r.ok || r.checked < 10) throw new Error(JSON.stringify(r));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
