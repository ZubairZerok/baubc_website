-- Preview-mode sample data. Every person below is fictional and exists only in preview mode (no DATABASE_URL).
-- Lets each role's workspace be explored. NEVER load this into production.

insert into auth.users(id, email) values
  ('a0000000-0000-4000-8000-000000000001','preview.superadmin@baubc.test'),
  ('a0000000-0000-4000-8000-000000000002','preview.superadmin2@baubc.test'),
  ('a0000000-0000-4000-8000-000000000003','preview.approver@baubc.test'),
  ('a0000000-0000-4000-8000-000000000004','preview.approver2@baubc.test'),
  ('a0000000-0000-4000-8000-000000000005','preview.teacher@baubc.test'),
  ('a0000000-0000-4000-8000-000000000006','preview.hr@baubc.test'),
  ('a0000000-0000-4000-8000-000000000007','preview.lead@baubc.test'),
  ('a0000000-0000-4000-8000-000000000008','preview.finance@baubc.test'),
  ('a0000000-0000-4000-8000-000000000009','preview.events@baubc.test'),
  ('a0000000-0000-4000-8000-00000000000a','preview.editor@baubc.test'),
  ('a0000000-0000-4000-8000-00000000000b','preview.member@baubc.test'),
  ('a0000000-0000-4000-8000-00000000000c','preview.member2@baubc.test'),
  ('a0000000-0000-4000-8000-00000000000d','preview.member3@baubc.test'),
  ('a0000000-0000-4000-8000-00000000000e','preview.applicant@baubc.test'),
  ('a0000000-0000-4000-8000-00000000000f','preview.applicant2@baubc.test');

insert into app.people(id, user_id, kind, full_name, full_name_bn, email, student_id, academic_department, academic_session, batch_level, bio, interests, skills, public_profile, display_name) values
  ('b0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','staff','Tahsin Ahmed',null,'preview.superadmin@baubc.test',null,'Agricultural Economics','2021-22',null,'Preview Super Admin.','{strategy}','{operations}',false,null),
  ('b0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000002','staff','Farhana Akter',null,'preview.superadmin2@baubc.test',null,'Agribusiness and Marketing','2021-22',null,'Second preview Super Admin.','{}','{}',false,null),
  ('b0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000003','teacher','Dr. Kamrul Hasan',null,'preview.approver@baubc.test',null,'Agricultural Economics',null,null,'Advisor and Teacher Approver (preview).','{}','{}',true,'Club Advisor'),
  ('b0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000004','teacher','Dr. Sharmin Sultana',null,'preview.approver2@baubc.test',null,'Agribusiness and Marketing',null,null,'Second Teacher Approver (preview).','{}','{}',true,'Co-Advisor'),
  ('b0000000-0000-4000-8000-000000000005','a0000000-0000-4000-8000-000000000005','teacher','Dr. Mahbubur Rahman',null,'preview.teacher@baubc.test',null,'Rural Sociology',null,null,'Teacher (read-only portal, preview).','{}','{}',false,null),
  ('b0000000-0000-4000-8000-000000000006','a0000000-0000-4000-8000-000000000006','student','Nusrat Jahan','নুসরাত জাহান','preview.hr@baubc.test','2020-11-0412','Agribusiness and Marketing','2020-21','Level 4','HR lead (preview).','{people,operations}','{facilitation,hiring}',true,null),
  ('b0000000-0000-4000-8000-000000000007','a0000000-0000-4000-8000-000000000007','student','Rafiul Islam','রাফিউল ইসলাম','preview.lead@baubc.test','2021-11-0219','Agricultural Economics','2021-22','Level 3','Media wing lead (preview).','{video,design}','{premiere pro,storytelling}',true,null),
  ('b0000000-0000-4000-8000-000000000008','a0000000-0000-4000-8000-000000000008','student','Sadia Afrin','সাদিয়া আফরিন','preview.finance@baubc.test','2021-11-0377','Agribusiness and Marketing','2021-22','Level 3','Finance officer (preview).','{finance}','{excel,accounting}',true,null),
  ('b0000000-0000-4000-8000-000000000009','a0000000-0000-4000-8000-000000000009','student','Arif Hossain','আরিফ হোসেন','preview.events@baubc.test','2021-11-0145','Agricultural Engineering','2021-22','Level 3','Events lead (preview).','{events}','{logistics}',true,null),
  ('b0000000-0000-4000-8000-00000000000a','a0000000-0000-4000-8000-00000000000a','student','Mehedi Hasan','মেহেদী হাসান','preview.editor@baubc.test','2022-11-0508','Agricultural Economics','2022-23','Level 2','Content editor (preview).','{writing}','{editing}',true,null),
  ('b0000000-0000-4000-8000-00000000000b','a0000000-0000-4000-8000-00000000000b','student','Lamia Chowdhury','লামিয়া চৌধুরী','preview.member@baubc.test','2022-11-0631','Agribusiness and Marketing','2022-23','Level 2','Member of the media wing (preview).','{marketing,startups}','{canva,copywriting}',true,null),
  ('b0000000-0000-4000-8000-00000000000c','a0000000-0000-4000-8000-00000000000c','student','Sabbir Hossain','সাব্বির হোসেন','preview.member2@baubc.test','2023-11-0102','Agricultural Engineering','2023-24','Level 1','Research wing member (preview).','{agritech}','{python}',true,null),
  ('b0000000-0000-4000-8000-00000000000d','a0000000-0000-4000-8000-00000000000d','student','Tanjila Rahman','তানজিলা রহমান','preview.member3@baubc.test','2023-11-0288','Food Technology','2023-24','Level 1','Events wing member (preview).','{events,food}','{public speaking}',false,null),
  ('b0000000-0000-4000-8000-00000000000e','a0000000-0000-4000-8000-00000000000e','student','Imran Kabir',null,'preview.applicant@baubc.test','2024-11-0711','Agricultural Economics','2024-25','Level 1',null,'{finance}','{}',false,null),
  ('b0000000-0000-4000-8000-00000000000f','a0000000-0000-4000-8000-00000000000f','student','Jannatul Ferdous',null,'preview.applicant2@baubc.test','2024-11-0820','Agribusiness and Marketing','2024-25','Level 1',null,'{marketing}','{}',false,null);

-- extra applicants without accounts yet (arrived from the Google Form)
insert into app.people(id, kind, full_name, email, student_id, academic_department, academic_session) values
  ('b0000000-0000-4000-8000-000000000010','student','Rakib Hasan','preview.rakib@baubc.test','2024-11-0912','Agricultural Engineering','2024-25'),
  ('b0000000-0000-4000-8000-000000000011','student','Mim Akter','preview.mim@baubc.test','2024-11-0954','Fisheries','2024-25'),
  ('b0000000-0000-4000-8000-000000000012','student','Ayon Saha','preview.ayon@baubc.test','2024-11-1003','Veterinary Science','2024-25');

insert into app.person_contacts(person_id, phone) values
  ('b0000000-0000-4000-8000-00000000000b','+8801700000011'),('b0000000-0000-4000-8000-00000000000e','+8801700000014');

insert into app.role_assignments(person_id, role_key, granted_by, confirmed_by) values
  ('b0000000-0000-4000-8000-000000000001','super_admin',null,null),
  ('b0000000-0000-4000-8000-000000000002','super_admin',null,null),
  ('b0000000-0000-4000-8000-000000000003','teacher','b0000000-0000-4000-8000-000000000001',null),
  ('b0000000-0000-4000-8000-000000000003','teacher_approver','b0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000002'),
  ('b0000000-0000-4000-8000-000000000004','teacher','b0000000-0000-4000-8000-000000000001',null),
  ('b0000000-0000-4000-8000-000000000004','teacher_approver','b0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000002'),
  ('b0000000-0000-4000-8000-000000000005','teacher','b0000000-0000-4000-8000-000000000001',null),
  ('b0000000-0000-4000-8000-000000000006','hr','b0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000002'),
  ('b0000000-0000-4000-8000-000000000008','finance_officer','b0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000002'),
  ('b0000000-0000-4000-8000-000000000009','event_manager','b0000000-0000-4000-8000-000000000001',null),
  ('b0000000-0000-4000-8000-00000000000a','content_editor','b0000000-0000-4000-8000-000000000001',null);
insert into app.role_assignments(person_id, role_key, scope_type, scope_id, granted_by)
select 'b0000000-0000-4000-8000-000000000007','team_lead','unit', id, 'b0000000-0000-4000-8000-000000000006' from app.org_units where slug = 'media-communications';

insert into app.approval_mandates(person_id, categories, max_amount, granted_by) values
  ('b0000000-0000-4000-8000-000000000003', array['finance_disbursement','finance_refund','points_award'], 50000, 'b0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000004', array['finance_disbursement','finance_refund'], 20000, 'b0000000-0000-4000-8000-000000000001');

update app.membership_cycles set status = 'open', opens_at = now() - interval '5 days', closes_at = now() + interval '25 days' where label = '2026–27';

-- members
insert into app.memberships(person_id, member_no, status_key, finalized_at)
select id, 'BAUBC-2026-' || lpad(row_number() over (order by full_name)::text, 4, '0'), 'active', now() - interval '60 days'
from app.people where id in ('b0000000-0000-4000-8000-000000000006','b0000000-0000-4000-8000-000000000007','b0000000-0000-4000-8000-000000000008',
  'b0000000-0000-4000-8000-000000000009','b0000000-0000-4000-8000-00000000000a','b0000000-0000-4000-8000-00000000000b',
  'b0000000-0000-4000-8000-00000000000c','b0000000-0000-4000-8000-00000000000d');
insert into app.counters(key, value) values ('member_no_2026', 8) on conflict (key) do update set value = 8;
update app.people set verified_locked_at = now() - interval '60 days' where id in (select person_id from app.memberships);

insert into app.unit_memberships(person_id, unit_id, position_title, is_lead, term_label)
select p.pid::uuid, u.id, p.title, p.lead, '2026–27' from (values
  ('b0000000-0000-4000-8000-000000000006','hr-development','Head of HR',true),
  ('b0000000-0000-4000-8000-000000000007','media-communications','Head of Media',true),
  ('b0000000-0000-4000-8000-000000000008','partnerships','Treasurer',false),
  ('b0000000-0000-4000-8000-000000000009','events-operations','Head of Events',true),
  ('b0000000-0000-4000-8000-00000000000a','research-strategy','Editor',false),
  ('b0000000-0000-4000-8000-00000000000b','media-communications','Designer',false),
  ('b0000000-0000-4000-8000-00000000000c','research-strategy','Analyst',false),
  ('b0000000-0000-4000-8000-00000000000d','events-operations','Volunteer coordinator',false)
) p(pid, slug, title, lead) join app.org_units u on u.slug = p.slug;

-- applications in different states
insert into app.applications(id, cycle_id, person_id, source, source_response_id, answers, preferred_units, status_key, submitted_at, email_verified_at)
select a.id::uuid, c.id, a.pid::uuid, 'google_form', a.resp, a.answers::jsonb, a.units, a.status, now() - a.age::interval, now() - a.age::interval
from app.membership_cycles c, (values
  ('c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-00000000000e','resp-001','{"motivation":"I want to learn how agribusiness startups raise money.","experience":"Debate club","skills":["Excel"]}', array['research-strategy','partnerships'],'under_review','4 days'),
  ('c0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-00000000000f','resp-002','{"motivation":"I love storytelling and want to help with DECODED.","experience":"School magazine","skills":["Canva"]}', array['media-communications'],'info_requested','3 days'),
  ('c0000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000010','resp-003','{"motivation":"Interested in AgriTech hackathons.","experience":"Robotics club"}', array['technology-innovation'],'pending_review','2 days'),
  ('c0000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000011','resp-004','{"motivation":"Want to organise events.","experience":"Volunteered at a book fair"}', array['events-operations'],'pending_review','1 day'),
  ('c0000000-0000-4000-8000-000000000005','b0000000-0000-4000-8000-000000000012','resp-005','{"motivation":"Want to learn finance.","experience":"None yet"}', array['partnerships'],'provisionally_approved','6 days')
) a(id, pid, resp, answers, units, status, age)
where c.label = '2026–27';
insert into app.membership_status_events(application_id, from_state, to_state, actor_person_id, reason)
select id, null, 'submitted', null, 'Received from google_form' from app.applications;
insert into app.info_requests(application_id, requested_by, message, due_at)
values ('c0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000006','Please share a link to one piece of design or writing you are proud of.', now() + interval '3 days');

-- Summit registration open in preview, with a paid pass so the bKash claim flow can be tried
update app.events set starts_at = '2027-01-23T09:30:00+06', ends_at = '2027-01-23T18:00:00+06', date_label = '23 January 2027 (preview date)',
  reg_opens_at = now() - interval '2 days', reg_closes_at = now() + interval '45 days', venue = 'BAU Central Auditorium (preview)'
where slug = 'startup-summit-2027';
update app.ticket_types set price = 300, capacity = 120 where name = 'Summit pass' and event_id = (select id from app.events where slug = 'startup-summit-2027');
update app.ticket_types set capacity = 12 where name = 'Pitch track team' and event_id = (select id from app.events where slug = 'startup-summit-2027');
update app.events set starts_at = now() - interval '2 hours', ends_at = now() + interval '6 hours', date_label = 'Today (preview)',
  reg_opens_at = now() - interval '10 days', reg_closes_at = now() + interval '1 hour', venue = 'BAU Seminar Hall (preview)'
where slug = 'pitch-arena';
update app.site_settings set value = value || '{"bkash_number":"01XXXXXXXXX (preview)"}' where key = 'payments';

insert into app.event_people(event_id, name, role, title, sort)
select e.id, v.name, v.role, v.title, v.sort from app.events e, (values
  ('Speaker to be announced','speaker','Founder, AgriTech startup',1),
  ('Speaker to be announced','speaker','Investor',2),
  ('Judge to be announced','judge','Industry leader',3)) v(name, role, title, sort)
where e.slug = 'startup-summit-2027';

-- sample registrations via the real inventory function
select app._hold_registration(t.id, 'b0000000-0000-4000-8000-00000000000b', 'Lamia Chowdhury', 'preview.member@baubc.test', null, 'BAU', null, '[]', '{}', '{}', 'p:b0000000-0000-4000-8000-00000000000b', 'seed-1', 'online')
from app.ticket_types t join app.events e on e.id = t.event_id where e.slug = 'startup-summit-2027' and t.name = 'Summit pass';
select app._hold_registration(t.id, null, 'Guest ' || g, 'guest' || g || '@example.org', null, 'Dhaka University', null, '[]', '{}', '{}', 'e:guest' || g || '@example.org', 'seed-g' || g, 'online')
from app.ticket_types t join app.events e on e.id = t.event_id, generate_series(1, 6) g
where e.slug = 'startup-summit-2027' and t.name = 'Summit pass';
-- three of them claim a bKash payment (awaiting verification)
insert into app.payments(invoice_id, method, amount, status, provider, provider_trx_id, payer_wallet_last4, claimed_paid_at, claimer_email, receiving_account_id)
select i.id, 'bkash_send_money', i.amount, 'pending_verification', 'bkash', 'PRV' || lpad(row_number() over ()::text, 7, '0'), '01' || lpad((row_number() over ())::text, 2, '0'),
       now() - interval '3 hours', r.email, (select id from app.finance_accounts where is_default_incoming)
from app.invoices i join app.registrations r on r.id = i.registration_id
where r.email in ('guest1@example.org','guest2@example.org','preview.member@baubc.test');
update app.registrations set status = 'pending_verification' where email in ('guest1@example.org','guest2@example.org','preview.member@baubc.test');
update app.payments set claimed_by_person_id = 'b0000000-0000-4000-8000-00000000000b' where claimer_email = 'preview.member@baubc.test';

-- pitch arena (happening "today" in preview) with confirmed audience seats for check-in practice
select app._hold_registration(t.id, p.id, p.full_name, p.email, null, 'BAU', null, '[]', '{}', '{}', 'p:' || p.id, 'seed-pa-' || p.id, 'online')
from app.ticket_types t join app.events e on e.id = t.event_id, app.people p
where e.slug = 'pitch-arena' and t.name = 'Audience seat' and p.id in ('b0000000-0000-4000-8000-00000000000c','b0000000-0000-4000-8000-00000000000d','b0000000-0000-4000-8000-00000000000a');

-- tasks, submissions and verified points
insert into app.tasks(id, type_key, title, description, instructions, priority, due_at, points, assignment_mode, scope_unit_id, created_by, links)
select v.id::uuid, v.type_key, v.title, v.descr, v.instr, v.prio, now() + v.due::interval, v.points, v.mode, u.id, v.creator::uuid, v.links
from (values
  ('d0000000-0000-4000-8000-000000000001','content_creation','Poster for Case Studies EP 02','Design the announcement poster for the next Case Studies episode.','Use the brand template. Export 1080×1350. Share a Drive or Canva link.','high','3 days',30,'individual','media-communications','b0000000-0000-4000-8000-000000000007', array['https://www.facebook.com/profile.php?id=61586526844003']),
  ('d0000000-0000-4000-8000-000000000002','research_brief','Research brief: AgriTech funding in Bangladesh','Summarise three recent funding stories for the Summit speaker brief.','Two pages max. Cite sources.','normal','6 days',40,'individual','research-strategy','b0000000-0000-4000-8000-000000000006', array[]::text[]),
  ('d0000000-0000-4000-8000-000000000003','event_volunteer','Summit volunteer: registration desk','Claim a slot to help at the Summit registration desk.','Attend the briefing; arrive 08:30.','normal','30 days',15,'open_claim',null,'b0000000-0000-4000-8000-000000000009', array[]::text[]),
  ('d0000000-0000-4000-8000-000000000004','social_engagement','Share DECODED EP 04 with a thoughtful comment','Comment on the official post with your takeaway.','Paste the link to your comment. Screenshots are reviewed.','low','2 days',5,'individual',null,'b0000000-0000-4000-8000-000000000006', array['https://www.facebook.com/profile.php?id=61586526844003'])
) v(id, type_key, title, descr, instr, prio, due, points, mode, unit_slug, creator, links)
left join app.org_units u on u.slug = v.unit_slug;
update app.tasks set max_claims = 10 where id = 'd0000000-0000-4000-8000-000000000003';

insert into app.task_assignments(id, task_id, assignee_person_id, assigned_by, status) values
  ('e0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-00000000000b','b0000000-0000-4000-8000-000000000007','submitted'),
  ('e0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-00000000000c','b0000000-0000-4000-8000-000000000006','assigned'),
  ('e0000000-0000-4000-8000-000000000003','d0000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-00000000000b','b0000000-0000-4000-8000-000000000006','assigned'),
  ('e0000000-0000-4000-8000-000000000004','d0000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-00000000000d','b0000000-0000-4000-8000-000000000006','submitted');
insert into app.task_submissions(id, assignment_id, attempt_no, content, link_url, content_hash, submitted_at) values
  ('f0000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000001',1,'Poster draft with the episode title and date.','https://www.canva.com/design/preview-poster', encode(sha256('poster'::bytea),'hex'), now() - interval '5 hours'),
  ('f0000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-000000000004',1,'My comment on the Monpura episode about pre-launch marketing.','https://www.facebook.com/profile.php?id=61586526844003', encode(sha256('comment'::bytea),'hex'), now() - interval '2 hours');
insert into app.validation_results(submission_id, validator_kind, rule_key, outcome) values
  ('f0000000-0000-4000-8000-000000000001','rule','deadline','pass'),('f0000000-0000-4000-8000-000000000001','rule','duplicate_content','pass'),
  ('f0000000-0000-4000-8000-000000000002','rule','deadline','pass'),('f0000000-0000-4000-8000-000000000002','rule','link_format','pass');

-- historical, already-verified work (gives members a ledger to look at)
do $$
declare v_t uuid; v_a uuid; v_s uuid; v_v uuid; r record;
begin
  for r in select * from (values
    ('b0000000-0000-4000-8000-00000000000b','Poster: DECODED EP 04','content_creation',30,'content','45 days'),
    ('b0000000-0000-4000-8000-00000000000b','Caption writing: Case Studies EP 01','content_creation',15,'content','10 days'),
    ('b0000000-0000-4000-8000-00000000000c','Research: Monpura box office context','research_brief',35,'research','40 days'),
    ('b0000000-0000-4000-8000-00000000000d','Volunteer: DECODED shoot logistics','event_volunteer',15,'events','20 days'),
    ('b0000000-0000-4000-8000-000000000007','Edit: DECODED EP 03','content_creation',40,'content','35 days'),
    ('b0000000-0000-4000-8000-00000000000a','Article: Nvidia and CUDA','research_brief',30,'research','6 days')
  ) x(pid, title, type_key, pts, cat, ago) loop
    insert into app.tasks(type_key, title, points, created_by, status, starts_at) values (r.type_key, r.title, r.pts, 'b0000000-0000-4000-8000-000000000006', 'closed', now() - r.ago::interval) returning id into v_t;
    insert into app.task_assignments(task_id, assignee_person_id, assigned_by, status) values (v_t, r.pid::uuid, 'b0000000-0000-4000-8000-000000000006', 'approved') returning id into v_a;
    insert into app.task_submissions(assignment_id, attempt_no, content, content_hash, submitted_at, status) values (v_a, 1, 'Delivered.', encode(sha256(convert_to(r.title, 'UTF8')), 'hex'), now() - r.ago::interval, 'approved') returning id into v_s;
    update app.task_submissions set locked_at = now() - r.ago::interval where id = v_s;
    insert into app.validation_results(submission_id, validator_kind, reviewer_id, outcome, comment) values (v_s, 'human', 'b0000000-0000-4000-8000-000000000006', 'approve', 'Good work.') returning id into v_v;
    insert into app.point_ledger(person_id, amount, kind, category, source_type, source_id, validation_result_id, reason, awarded_by, period_month, created_at)
    values (r.pid::uuid, r.pts, 'task_award', r.cat, 'task_submission', v_s, v_v, 'Task: ' || r.title, 'b0000000-0000-4000-8000-000000000006',
            date_trunc('month', now() - r.ago::interval)::date, now() - r.ago::interval);
  end loop;
end $$;

insert into app.achievement_records(person_id, kind, title, description, occurred_on, issued_by, verified_by, verified_at, status) values
  ('b0000000-0000-4000-8000-000000000007','position','Head of Media, 2026–27','Leads the media wing and DECODED production.', current_date - 60, 'b0000000-0000-4000-8000-000000000006','b0000000-0000-4000-8000-000000000001', now() - interval '59 days','active'),
  ('b0000000-0000-4000-8000-00000000000b','contribution','Designed the DECODED visual identity','Poster series for DECODED EP 01–04.', current_date - 30, 'b0000000-0000-4000-8000-000000000007','b0000000-0000-4000-8000-000000000006', now() - interval '29 days','active'),
  ('b0000000-0000-4000-8000-00000000000c','contribution','Research lead for the Monpura episode',null, current_date - 40, 'b0000000-0000-4000-8000-000000000006',null,null,'pending_verification');

-- a disbursement waiting for teacher approval (2 approvers needed for this amount)
insert into app.disbursement_requests(id, request_no, kind, purpose, amount, payee_name, payee_account_last4, budget_line, evidence_urls, event_id, requested_by, status)
select '90000000-0000-4000-8000-000000000001','DR-2026-0001','vendor','Venue deposit for Startup Summit 2027',18500,'BAU Central Auditorium office','4471','Summit / Venue',
       array['https://drive.google.com/preview-quote'], id, 'b0000000-0000-4000-8000-000000000008','pending_approval'
from app.events where slug = 'startup-summit-2027';
insert into app.approval_requests(subject_type, category, title, amount, context, disbursement_id, requested_by, policy, due_at)
select 'disbursement','finance_disbursement','DR-2026-0001 · Venue deposit for Startup Summit 2027',18500,
  '{"payee":"BAU Central Auditorium office","payee_last4":"4471","budget_line":"Summit / Venue","kind":"vendor","evidence":["https://drive.google.com/preview-quote"],"possible_duplicate":false}',
  '90000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000008', to_jsonb(p), now() + interval '2 days'
from app.approval_policies p where p.subject_type = 'disbursement' and p.min_amount = 2000.01;
insert into app.counters(key, value) values ('dr_2026', 1) on conflict (key) do update set value = 1;

-- teacher dues for this month
select app.generate_dues(now()::date);

insert into app.announcements(title, body, audience, pinned, author_id) values
  ('Summit volunteer briefing','All volunteers: briefing on Saturday 4 pm at the club room. Claim your slot under Tasks.','members', true,'b0000000-0000-4000-8000-000000000009'),
  ('Advisor meeting','Quarterly advisor meeting to review the Summit budget. The agenda is under Documents.','teachers', false,'b0000000-0000-4000-8000-000000000001');

insert into app.resources(title, description, url, category, audience) values
  ('BAUBC on YouTube','Watch DECODED and Case Studies episodes.','https://www.youtube.com/@BusinessClubofBAU','reading','public'),
  ('Brand template (members)','Poster and caption templates for club content.','https://www.canva.com/','template','members');

insert into app.perks(title, partner, description, terms, mode, url, min_points, distribution_permission) values
  ('Partner workshop: 50% off (sample)','Sample partner','Half-price seats at a partner''s weekend workshop.','One per member. Sample perk shown in preview mode only.','shared_code',null,20,'Sample: partner letter on file'),
  ('Student AI tools offer (official link)','Official provider page','Link to the provider''s official student offer. Eligibility is verified by the provider, not BAUBC.','Personal and non-transferable. BAUBC only shares the official link.','link','https://one.google.com/',0,'Public official offer page');
update app.perks set shared_code = 'BAUBC50' where mode = 'shared_code';

insert into app.contact_inquiries(category, name, email, organization, message) values
  ('sponsorship','Partnerships Desk','partnerships@example.com','Sample AgroFoods Ltd.','We would like to sponsor the Startup Summit 2027. Who should we speak to?'),
  ('speaker','Sample Founder','founder@example.com','Sample AgriTech','Happy to speak about raising a seed round for an agritech startup.');

insert into app.inbound_messages(gmail_message_id, thread_id, from_email, from_name, subject, received_at, labels, snippet, category) values
  ('preview-msg-1','t1','events@sample-university.edu','Sample University Business Club','Joint session proposal for the Summit', now() - interval '6 hours', array['BAUBC/Sync/partnership'], 'We would love to co-host a session on campus entrepreneurship at your Summit...', 'partnership'),
  ('preview-msg-2','t2','registrar@bau.edu.bd','BAU Registrar Office','Venue booking confirmation', now() - interval '1 day', array['BAUBC/Sync/university'], 'This is to confirm the tentative booking of the Central Auditorium...', 'university');
update app.integration_connections set status = 'active', last_success_at = now() - interval '8 minutes' where provider in ('gmail_appsscript','google_form');

-- a certificate anyone can verify at /verify/PREVIEWCERT0001
insert into app.issued_documents(kind, serial_no, verification_code, recipient_person_id, recipient_name, title, subtitle, achievement_id, issued_by)
select 'achievement', 'BAUBC-CERT-2026-000001', 'PREVIEWCERT0001', 'b0000000-0000-4000-8000-00000000000b', 'Lamia Chowdhury',
       'Designed the DECODED visual identity', 'Certificate of Appreciation', id, 'b0000000-0000-4000-8000-000000000001'
from app.achievement_records where title = 'Designed the DECODED visual identity';
insert into app.counters(key, value) values ('cert_2026', 1) on conflict (key) do update set value = 1;

-- last month's Member of the Month (shown on the home page)
with a as (
  insert into app.achievement_records(person_id, kind, title, description, occurred_on, issued_by, verified_by, verified_at, status)
  values ('b0000000-0000-4000-8000-00000000000b', 'recognition', 'Member of the Month', 'Designed the full DECODED poster series and never missed a deadline.',
          (date_trunc('month', now()) - interval '1 month')::date, 'b0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000001', now(), 'active')
  returning id)
insert into app.recognition_awards(period, person_id, citation, decided_by, achievement_id)
select (date_trunc('month', now()) - interval '1 month')::date, 'b0000000-0000-4000-8000-00000000000b',
       'Designed the full DECODED poster series and never missed a deadline.', 'b0000000-0000-4000-8000-000000000006', id from a;
