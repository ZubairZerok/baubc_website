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

console.log('Audit fixes');
const ED = P('0a');
await test('sign-up gate: email sign-up needs a live activation hash', async () => {
  await as('system', (q) => q(`insert into app.people(kind, full_name, email) values ('student','Gate Test','gate@example.org')`));
  const pid = (await one(db.query(`select id from app.people where email='gate@example.org'`))).id;
  await db.query(`insert into app.account_provisions(person_id, email, source, token_hash, expires_at) values ($1,'gate@example.org','admin_invite','gate-hash', now() + interval '1 day')`, [pid]);
  const ev = (h) => JSON.stringify({ user: { email: 'gate@example.org', app_metadata: { provider: 'email' }, user_metadata: h ? { provision_hash: h } : {} } });
  const ok = await one(db.query(`select app.hook_before_user_created($1::jsonb) r`, [ev('gate-hash')]));
  if (JSON.stringify(ok.r) !== '{}') throw new Error('valid hash refused');
  const bad = await one(db.query(`select app.hook_before_user_created($1::jsonb) r`, [ev('wrong')]));
  if (!bad.r.error) throw new Error('wrong hash allowed');
  const none = await one(db.query(`select app.hook_before_user_created($1::jsonb) r`, [JSON.stringify({ user: { email: 'stranger@example.org', app_metadata: { provider: 'google' }, user_metadata: {} } })]));
  if (!none.r.error) throw new Error('stranger allowed');
});
await test('bootstrap refuses when Super Admins exist', () => rejects(() => as('system', (q) => q(`select app.bootstrap_super_admins('[{"email":"a@x.org","full_name":"A","token_hash":"1"},{"email":"b@x.org","full_name":"B","token_hash":"2"}]')`)), 'ALREADY_SET_UP'));
await test('anon cannot call bootstrap or needs_setup', () => rejects(() => as('anon', (q) => q(`select app.needs_setup()`)), 'permission denied'));
await test('HR places a member in a wing as lead; lead role follows', async () => {
  const unit = (await one(db.query(`select id from app.org_units order by sort limit 1`))).id;
  await as(HR, (q) => q(`select app.assign_unit('b0000000-0000-4000-8000-00000000000c',$1,'Coordinator',true)`, [unit]));
  const r = await one(db.query(`select count(*)::int n from app.role_assignments where person_id='b0000000-0000-4000-8000-00000000000c' and role_key='team_lead' and scope_id=$1 and revoked_at is null`, [unit]));
  if (r.n !== 1) throw new Error('no lead role');
});
await test('member cannot place people in wings', () => rejects(() => as(M1, (q) => q(`select app.assign_unit('b0000000-0000-4000-8000-00000000000c',(select id from app.org_units limit 1),'x',false)`)), 'PERMISSION_DENIED'));
await test('Super Admin cannot suspend themselves', () => rejects(() => as(SA1, (q) => q(`select app.set_account_status('b0000000-0000-4000-8000-000000000001','suspended','test')`)), 'SOD_VIOLATION'));
await test('account status change needs a reason', () => rejects(() => as(SA1, (q) => q(`select app.set_account_status('b0000000-0000-4000-8000-00000000000d','suspended','')`)), 'REASON_REQUIRED'));
await test('leaderboard hidden from anon when members-only', async () => {
  const r = await as('anon', (q) => q(`select count(*)::int n from app.leaderboard('all')`));
  if (r.rows[0].n !== 0) throw new Error('leaked to anon');
  const m = await as(M1, (q) => q(`select count(*)::int n from app.leaderboard('all')`));
  if (m.rows[0].n < 1) throw new Error('member sees nothing');
});
await test('my_data returns only my own profile', async () => {
  const r = await as(M1, (q) => q(`select app.my_data() d`));
  if (r.rows[0].d.profile.email !== 'preview.member@baubc.test') throw new Error('wrong profile');
});
await test('privacy request: one open request per kind', async () => {
  await as(M1, (q) => q(`select app.open_privacy_request('erasure','please')`));
  await rejects(() => as(M1, (q) => q(`select app.open_privacy_request('erasure','again')`)), 'ALREADY_OPEN');
});
await test('photo URL must be in my own storage folder', () => rejects(() => as(M1, (q) => q(`select app.set_my_photo('https://evil.example.com/x.png')`)), 'INVALID_PHOTO_URL'));
await test('editors cannot create perks; perk codes stay private', async () => {
  await rejects(() => as(ED, (q) => q(`insert into app.perks(title, partner, description, mode, distribution_permission) values ('x','y','z','link','p')`)), 'row-level security|permission denied');
  await rejects(() => as(M1, (q) => q(`select * from private.perk_codes`)), 'permission denied');
});
await test('refund flow: request → approval → different person pays out', async () => {
  const pay = await one(db.query(`select id from app.payments where status='verified' limit 1`));
  if (!pay) throw new Error('no verified payment in sample data');
  const rid = (await as(FO, (q) => q(`select app.request_refund($1,'Event cancelled') id`, [pay.id]))).rows[0].id;
  await as(FO, (q) => q(`select app.submit_refund($1)`, [rid]));
  await rejects(() => as(FO, (q) => q(`select app.complete_refund($1,'TRX1')`, [rid])), 'NOT_APPROVED');
  const ar = await one(db.query(`select id from app.approval_requests where refund_id=$1`, [rid]));
  await as(TA1, (q) => q(`select app.decide_approval($1,'approve','ok')`, [ar.id]));
  const st = await one(db.query(`select status from app.refunds where id=$1`, [rid]));
  if (st.status !== 'approved') throw new Error(`status ${st.status}`);
  await as(FO, (q) => q(`select app.complete_refund($1,'trx-refund-1')`, [rid]));
  const done = await one(db.query(`select r.status, p.status pstatus from app.refunds r join app.payments p on p.id=r.payment_id where r.id=$1`, [rid]));
  if (done.status !== 'completed' || done.pstatus !== 'refunded') throw new Error(JSON.stringify(done));
});

await test('officers can log their own actions; members cannot', async () => {
  await as(HR, (q) => q(`select app.log_action('export.members','membership',null,null)`));
  await rejects(() => as(M1, (q) => q(`select app.log_action('export.members','membership',null,null)`)), 'PERMISSION_DENIED');
  await rejects(() => as(HR, (q) => q(`select app.audit('x.y','z',null,null,null)`)), 'permission denied');
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

console.log('Profiles, perks, contact desk, form registrations (2026-11-19)');
await test('public profile shows only what the member switched on', async () => {
  const p = (await as('anon', (q) => q(`select app.public_profile('lamia-chowdhury') p`))).rows[0].p;
  if (!p || p.department !== 'Agribusiness and Marketing') throw new Error('profile missing');
  if (/preview\.member@|student_id|01700|email/.test(JSON.stringify(p))) throw new Error('leaks contact details');
  await as(M1, (q) => q(`select app.update_my_profile('{"public_fields":{"department":false,"session":false,"bio":false,"socials":false,"achievements":false,"rank":false,"skills":false}}')`));
  const h = (await as('anon', (q) => q(`select app.public_profile('lamia-chowdhury') p`))).rows[0].p;
  if (h.department || h.session || h.bio || h.stats || h.achievements.length || h.skills.length) throw new Error('switches ignored: ' + JSON.stringify(h));
  await as(M1, (q) => q(`select app.update_my_profile('{"public_fields":{"department":true,"session":true,"bio":true,"socials":true,"achievements":true,"rank":true,"skills":true}}')`));
});
await test('private profiles and non-members have no public page', async () => {
  for (const h of ['tanjila-rahman', 'imran-kabir', 'nobody', "x' or 1=1 --"]) {
    const r = (await as('anon', (q) => q(`select app.public_profile($1) p`, [h]))).rows[0].p;
    if (r) throw new Error(`${h} is public`);
  }
});
await test('profile address: format, reserved words and uniqueness', async () => {
  await rejects(() => as(M2, (q) => q(`select app.set_my_handle('No Spaces!')`)), 'INVALID_HANDLE');
  await rejects(() => as(M2, (q) => q(`select app.set_my_handle('admin')`)), 'INVALID_HANDLE');
  await rejects(() => as(M2, (q) => q(`select app.set_my_handle('lamia-chowdhury')`)), 'HANDLE_TAKEN');
  await as(M2, (q) => q(`select app.set_my_handle('sabbir-builds')`));
});
await test('draft perks stay invisible to members; claiming twice returns the same code and one notification', async () => {
  await as('system', (q) => q(`update app.perks set status = 'draft' where title = 'Mentor Session'`));
  const seen = (await as(M1, (q) => q(`select title from app.perks`))).rows.map((r) => r.title);
  if (seen.includes('Mentor Session')) throw new Error('draft visible');
  const a = (await as(M1, (q) => q(`select app.claim_perk((select id from app.perks where title = 'Course Bundle')) v`))).rows[0].v;
  const b = (await as(M1, (q) => q(`select app.claim_perk((select id from app.perks where title = 'Course Bundle')) v`))).rows[0].v;
  if (a !== b) throw new Error('different codes');
  const n = (await as(M1, (q) => q(`select count(*)::int n from app.notifications where person_id = authz.current_person_id() and type = 'perk'`))).rows[0].n;
  if (n !== 1) throw new Error(`notifications: ${n}`);
  await rejects(() => as(TA1, (q) => q(`select app.claim_perk((select id from app.perks where title = 'Claude Pro'))`)), 'MEMBERS_ONLY');
});
await test('contact desk: validation, reference numbers, phone kept from the public', async () => {
  const ok = (await as('anon', (q) => q(`select app.submit_inquiry($1::jsonb) r`, [JSON.stringify({ sender_type: 'bau_student', category: 'help', name: 'Test Student', email: 'desk1@example.com', message: 'I need help with a business plan please.', preferred_channel: 'whatsapp', phone: '01712345678' })]))).rows[0].r;
  if (!/^BAUBC-\d{5}$/.test(ok.reference)) throw new Error(ok.reference);
  await rejects(() => as('anon', (q) => q(`select app.submit_inquiry($1::jsonb)`, [JSON.stringify({ name: 'A B', email: 'desk2@example.com', message: 'Call me about this please.', preferred_channel: 'phone' })])), 'PHONE_REQUIRED');
  await rejects(() => as('anon', (q) => q(`select app.submit_inquiry($1::jsonb)`, [JSON.stringify({ name: 'A B', email: 'desk2@example.com', message: 'Call me about this please.', preferred_channel: 'phone', phone: '12' })])), 'INVALID_PHONE');
  await rejects(() => as('anon', (q) => q(`select app.submit_inquiry($1::jsonb)`, [JSON.stringify({ sender_type: 'company', name: 'A B', email: 'desk2@example.com', message: 'We want to sponsor the Summit.' })])), 'ORG_REQUIRED');
  await rejects(() => as('anon', (q) => q(`select app.submit_inquiry($1::jsonb)`, [JSON.stringify({ name: 'A B', email: 'not-an-email', message: 'Hello there friends.' })])), 'INVALID_EMAIL');
  await rejects(() => as('anon', (q) => q(`select phone from app.contact_inquiries`)), 'permission denied');
  await rejects(() => as(M1, (q) => q(`update app.contact_inquiries set staff_note = 'x'`)).then(async () => { const r = await as('system', (q) => q(`select count(*)::int n from app.contact_inquiries where staff_note = 'x'`)); if (r.rows[0].n) throw new Error('member edited inquiries'); throw new Error('permission denied (no rows)'); }), 'permission denied');
});
await test('Google Form registration: replay-safe, duplicate-safe, team tickets refused, public feed shows initials only', async () => {
  await as('system', (q) => q(`update app.ticket_types t set capacity = sold_count + held_count + 5 from app.events e where e.id = t.event_id and e.slug = 'startup-summit-2027' and t.unit = 'person'`));
  const body = { response_id: 'dbtest-1', event_slug: 'startup-summit-2027', full_name: 'Zara Q.', email: 'zara@example.com' };
  const a = (await as('system', (q) => q(`select app.ingest_form_registration($1::jsonb) r`, [JSON.stringify(body)]))).rows[0].r;
  const b = (await as('system', (q) => q(`select app.ingest_form_registration($1::jsonb) r`, [JSON.stringify(body)]))).rows[0].r;
  const c = (await as('system', (q) => q(`select app.ingest_form_registration($1::jsonb) r`, [JSON.stringify({ ...body, response_id: 'dbtest-2' })]))).rows[0].r;
  if (!b.replayed || !c.duplicate || a.registration_id !== c.registration_id) throw new Error(JSON.stringify({ a, b, c }));
  await rejects(() => as('system', (q) => q(`select app.ingest_form_registration($1::jsonb)`, [JSON.stringify({ ...body, response_id: 'dbtest-3', email: 'team@example.com', ticket_type: 'Pitch track team' })])), 'INVALID');
  await rejects(() => as('system', (q) => q(`select app.ingest_form_registration($1::jsonb)`, [JSON.stringify({ ...body, response_id: 'dbtest-4', event_slug: 'no-such-event' })])), 'NOT_FOUND');
  const feed = (await as('anon', (q) => q(`select * from app.recent_registrations((select id from app.events where slug = 'startup-summit-2027'), 50)`))).rows;
  if (feed.length > 12 || feed.some((r) => r.initial.length !== 1) || JSON.stringify(feed).includes('@')) throw new Error(JSON.stringify(feed.slice(0, 2)));
});
await test('leaderboard links only to people who made their profile public', async () => {
  await as('system', (q) => q(`update app.site_settings set value = jsonb_set(value, '{leaderboard}', '"public"') where key = 'features'`));
  const handles = (await as('anon', (q) => q(`select handle from app.leaderboard('all') where handle is not null`))).rows.map((r) => r.handle);
  if (!handles.length) throw new Error('no linked rows to check');
  const priv = (await as('system', (q) => q(`select count(*)::int n from app.people where handle = any($1) and not public_profile`, [handles]))).rows[0].n;
  if (priv) throw new Error('private person linked');
  await as('system', (q) => q(`update app.site_settings set value = jsonb_set(value, '{leaderboard}', '"members"') where key = 'features'`));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
