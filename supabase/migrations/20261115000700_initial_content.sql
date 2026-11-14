-- BAUBC OS · Initial public content (editable by admins in the CMS)
-- Facts come from the club's own Meta Business Suite export (Aug–Nov 2026). Event dates are deliberately "to be announced".

insert into app.org_units(kind, slug, name, name_bn, summary, responsibilities, sort) values
  ('wing','research-strategy','Research & Strategy','গবেষণা ও কৌশল','Case analysis, market research and the thinking behind DECODED and BAUBC Case Studies.',
     array['Case study research','Market and industry briefs','Competition preparation'], 10),
  ('wing','media-communications','Media & Communications','মিডিয়া ও যোগাযোগ','Video, design and storytelling for the club''s channels.',
     array['DECODED and Case Studies production','Design and brand','Social media'], 20),
  ('wing','events-operations','Events & Operations','ইভেন্ট ও অপারেশনস','Plans and runs the Startup Summit, competitions and workshops.',
     array['Event planning and logistics','Venue and volunteers','Registration and check-in'], 30),
  ('wing','partnerships','Partnerships & Sponsorship','অংশীদারিত্ব ও স্পন্সরশিপ','Builds relationships with companies, founders and institutions.',
     array['Sponsor outreach','Speaker invitations','Partner benefits for members'], 40),
  ('wing','hr-development','HR & Member Development','মানবসম্পদ ও সদস্য উন্নয়ন','Recruitment, onboarding, tasks and recognition for members.',
     array['Annual recruitment','Task assignment and review','Member of the Month'], 50),
  ('wing','technology-innovation','Technology & Innovation','প্রযুক্তি ও উদ্ভাবন','AgriTech, data and digital tools, including this platform.',
     array['Hackathons','Digital tools','AgriTech exploration'], 60)
on conflict (slug) do nothing;

insert into app.membership_cycles(label, status, notes)
values ('2026–27', 'planned', 'Annual member recruitment. Dates are announced on the Join page.')
on conflict (label) do nothing;

-- Planned flagship events (status published so visitors can follow them; registration opens when admins set dates)
insert into app.events(slug, title, title_bn, subtitle, summary, body, category, status, venue, date_label, featured, eligibility, cover_tone, contact_email) values
  ('startup-summit-2027', 'BAUBC Startup Summit 2027', 'বিএইউবিসি স্টার্টআপ সামিট ২০২৭', 'Where agriculture, technology and business meet',
   'The club''s flagship summit: founders, investors and students on one stage, with talks, workshops and a startup pitch track.',
   E'The Startup Summit brings founders, industry leaders and students together at Bangladesh Agricultural University.\n\nExpect keynote conversations, hands-on workshops, and a pitch track where student teams present ideas to a panel.\n\nThe programme, speakers and registration dates will be announced here first. Follow BAUBC on Facebook for updates.',
   'summit', 'published', 'Bangladesh Agricultural University, Mymensingh', 'January 2027 · date to be announced', true,
   'Open to students of all universities. Some sessions may be reserved for BAUBC members.', 'canopy', 'businessclub@bau.edu.bd'),
  ('case-competition-2027', 'BAUBC Case Competition 2027', 'বিএইউবিসি কেস কম্পিটিশন ২০২৭', 'Solve a real business problem in teams',
   'Teams analyse a real business case and present recommendations to judges.',
   E'Teams of three to four receive a business case, research it under time pressure and present their solution to a panel of judges.\n\nRounds, prizes and the case theme will be announced here.',
   'case_competition', 'published', 'Bangladesh Agricultural University, Mymensingh', '2027 · to be announced', false,
   'Undergraduate teams of 3–4.', 'harvest', 'businessclub@bau.edu.bd'),
  ('pitch-arena', 'The Pitch Arena', 'দ্য পিচ অ্যারেনা', 'Pitch your venture to a panel of investors and founders',
   'A Dragon''s-Den-style evening: student founders pitch, the panel asks hard questions, the best ideas get backing and mentorship.',
   E'Founders get a few minutes to pitch and then face questions from a panel.\n\nFormat, panel and application process will be announced here.',
   'pitch', 'published', 'Bangladesh Agricultural University, Mymensingh', '2027 · to be announced', false,
   'Student founders and early-stage teams.', 'river', 'businessclub@bau.edu.bd'),
  ('business-olympiad', 'BAUBC Business Olympiad', 'বিএইউবিসি বিজনেস অলিম্পিয়াড', 'Test your business sense',
   'A competitive test of business knowledge, numeracy and reasoning, with rounds for different levels.',
   E'Details, levels and registration will be published here.', 'olympiad', 'published', 'To be announced', '2027 · to be announced', false,
   'Students; levels to be announced.', 'paper', 'businessclub@bau.edu.bd'),
  ('agritech-hackathon', 'BAUBC AgriTech Hackathon', 'বিএইউবিসি এগ্রিটেক হ্যাকাথন', 'Build tools for farms and food systems',
   'Teams design and prototype technology for agriculture and food, judged on impact and feasibility.',
   E'Problem statements, mentors and the schedule will be announced here.', 'hackathon', 'published', 'To be announced', '2027 · to be announced', false,
   'Mixed teams of students: business, agriculture and technology backgrounds.', 'canopy', 'businessclub@bau.edu.bd')
on conflict (slug) do nothing;

insert into app.ticket_types(event_id, name, description, audience, unit, seats_per_unit, team_min, team_max, price, capacity, sort)
select e.id, t.name, t.description, t.audience, t.unit, t.seats, t.tmin, t.tmax, t.price, t.capacity, t.sort
from app.events e
join (values
  ('startup-summit-2027','Summit pass','Full-day access to talks and workshops.','public','person',1,null::int,null::int,0::numeric,400,10),
  ('startup-summit-2027','Pitch track team','A team slot in the startup pitch track (3–5 members).','public','team',1,3,5,0::numeric,30,20),
  ('case-competition-2027','Team entry','One team of 3–4 students.','public','team',1,3,4,0::numeric,48,10),
  ('pitch-arena','Founder slot','One pitch slot for a founding team.','public','team',1,1,4,0::numeric,16,10),
  ('pitch-arena','Audience seat','Watch the pitches live.','public','person',1,null,null,0::numeric,200,20),
  ('business-olympiad','Participant','Individual participation.','public','person',1,null,null,0::numeric,300,10),
  ('agritech-hackathon','Team entry','A team of 3–5.','public','team',1,3,5,0::numeric,25,10)
) t(slug, name, description, audience, unit, seats, tmin, tmax, price, capacity, sort) on t.slug = e.slug
where not exists (select 1 from app.ticket_types tt where tt.event_id = e.id);

insert into app.posts(slug, kind, series, episode_no, title, dek, body, topics, cover_tone, cover_label, facebook_url, stats, status, published_at, author_name) values
  ('decoded-teaser', 'news', 'decoded', null, 'Something is about to be DECODED.',
   'The teaser that launched the series.',
   E'Before the first episode, BAUBC posted a single line: something is about to be DECODED.\n\nDECODED: The Game Behind the Game looks at famous stories and films through a business lens: the money, the risk and the decisions behind them.',
   array['decoded'], 'canopy', 'TEASER', 'https://www.facebook.com/profile.php?id=61586526844003',
   '{"viewers":423,"views":1406,"likes":64,"comments":32,"shares":2}', 'published', '2026-09-20T12:00:00+06', 'BAUBC Media'),
  ('decoded-spider-man-2002', 'episode', 'decoded', 1, 'Spider-Man (2002): the business decisions behind the web',
   'How Sony took a big risk on a character and turned it into a multi-hundred-million-dollar business.',
   E'In this episode of DECODED we look at Spider-Man (2002) as a business decision rather than a superhero film.\n\nThe story covers the risk Sony took on the character, the rights deal that made the film possible, and how the bet grew into a multi-hundred-million-dollar business.\n\nThe question for founders: when is a big bet on an unproven asset worth it, and how do you structure the deal so the upside is yours?',
   array['film','strategy','licensing'], 'river', 'EP 01 · SPIDER-MAN · 2002', 'https://www.facebook.com/profile.php?id=61586526844003',
   '{"viewers":1875,"views":4420,"likes":98,"comments":80,"shares":32}', 'published', '2026-09-24T19:00:00+06', 'BAUBC Media'),
  ('decoded-titanic-1997', 'episode', 'decoded', 2, 'Titanic (1997): production budget and risk',
   'A massive budget, studio financial risk, a director''s vision and delays.',
   E'Titanic is remembered as a box-office record. In 1997 it looked like one of the riskiest productions in Hollywood.\n\nThis episode follows the money: a massive production budget, the financial risk carried by the studios, James Cameron''s vision and the delays that made it worse.\n\nThe lesson: how teams manage a project when costs run ahead of certainty.',
   array['film','risk','project management'], 'paper', 'EP 02 · TITANIC · 1997', 'https://www.facebook.com/profile.php?id=61586526844003',
   '{"viewers":3540,"views":7051,"likes":136,"comments":54,"shares":27}', 'published', '2026-10-01T19:00:00+06', 'BAUBC Media'),
  ('decoded-barbie-2023', 'episode', 'decoded', 3, 'Barbie (2023): marketing a film into a brand ecosystem',
   'A huge marketing budget, digital hype, and a film turned into a global brand ecosystem.',
   E'Barbie (2023) was a film and a marketing campaign at the same time.\n\nWe break down the scale of the marketing budget, how digital hype was built, and how one release became a global brand ecosystem.\n\nFor marketers: what it takes to make a campaign feel like a cultural moment.',
   array['film','marketing','branding'], 'harvest', 'EP 03 · BARBIE · 2023', 'https://www.facebook.com/profile.php?id=61586526844003',
   '{"viewers":2006,"views":5108,"likes":109,"comments":80,"shares":23}', 'published', '2026-10-08T19:00:00+06', 'BAUBC Media'),
  ('decoded-monpura-2009', 'episode', 'decoded', 4, 'Monpura (2009): winning in a market downturn',
   'How a small-budget film succeeded during a market downturn with cost optimisation and pre-launch marketing.',
   E'Monpura (2009) is a Bangladeshi success story from a difficult moment for the industry.\n\nThis episode looks at how a small-budget film succeeded during a market downturn: tight cost optimisation and pre-launch marketing that built demand before release.\n\nIt became DECODED''s most-watched episode, with 6,138 viewers on Facebook.',
   array['film','bangladesh','cost strategy'], 'canopy', 'EP 04 · MONPURA · 2009', 'https://www.facebook.com/profile.php?id=61586526844003',
   '{"viewers":6138,"views":8930,"likes":159,"comments":80,"shares":24}', 'published', '2026-10-15T19:00:00+06', 'BAUBC Media'),
  ('case-studies-ep-01-cart-abandonment', 'episode', 'case-studies', 1, 'Why about 70% of online carts are abandoned',
   'And why price is not the main reason.',
   E'The first episode of BAUBC Case Studies asks a simple question: why do roughly seven in ten online shoppers leave without paying?\n\nThe episode argues that price is not the main reason, and walks through what actually stops people at checkout.\n\nIt drew 54 comments, the strongest discussion relative to views of any recent post.',
   array['e-commerce','consumer behaviour'], 'harvest', 'CASE STUDIES · EP 01', 'https://www.facebook.com/profile.php?id=61586526844003',
   '{"viewers":387,"views":791,"likes":52,"comments":54,"shares":12}', 'published', '2026-11-12T19:00:00+06', 'BAUBC Research'),
  ('nvidia-cuda-gaming-to-ai', 'article', 'insights', null, 'Nvidia and CUDA: from gaming chips to AI dominance',
   'How a platform bet made Nvidia central to AI.',
   E'Nvidia started as a graphics company for gamers. CUDA, its platform for general-purpose computing on GPUs, is a big part of why it now sits at the centre of AI.\n\nThis deep-dive looks at the platform decision and why ecosystems can matter more than chips.',
   array['technology','platform strategy'], 'river', 'INSIGHT · NVIDIA', 'https://www.facebook.com/profile.php?id=61586526844003',
   '{"viewers":628,"views":1822,"likes":36,"comments":46,"shares":1}', 'published', '2026-11-09T18:00:00+06', 'BAUBC Research'),
  ('world-tourism-day-economic-impact', 'article', 'insights', null, 'World Tourism Day: tourism as an economic system',
   'Looking at tourism as an economy, not just travel.',
   E'For World Tourism Day (27 September) BAUBC looked at tourism as an economic system: the businesses, jobs and flows of money it connects.',
   array['economics','tourism'], 'paper', 'INSIGHT · 27 SEP', 'https://www.facebook.com/profile.php?id=61586526844003',
   '{"viewers":506,"views":1636,"likes":54,"comments":23,"shares":1}', 'published', '2026-09-27T12:00:00+06', 'BAUBC Research'),
  ('official-email-update', 'news', 'news', null, 'BAUBC has an official email address',
   'Reach the club at businessclub@bau.edu.bd.',
   E'BAUBC''s official email address is businessclub@bau.edu.bd. Please use it for partnerships, speaker invitations, sponsorship and general questions.',
   array['announcement'], 'paper', 'NOTICE', 'https://www.facebook.com/profile.php?id=61586526844003',
   '{"viewers":1006,"views":2647,"likes":54,"comments":23,"shares":7}', 'published', '2026-11-07T12:00:00+06', 'BAUBC')
on conflict (slug) do nothing;

insert into app.social_posts(platform, external_id, title, post_type, permalink, published_at, viewers, views, likes, comments, shares, captured_at) values
  ('facebook','decoded-monpura','DECODED · Monpura: market downturn analysis','video','https://www.facebook.com/profile.php?id=61586526844003','2026-10-15T19:00:00+06',6138,8930,159,80,24,'2026-11-14T00:00:00+06'),
  ('facebook','decoded-titanic','DECODED · Titanic: production budget and risk','video','https://www.facebook.com/profile.php?id=61586526844003','2026-10-01T19:00:00+06',3540,7051,136,54,27,'2026-11-14T00:00:00+06'),
  ('facebook','decoded-spiderman','DECODED · Spider-Man (2002): business decisions','video','https://www.facebook.com/profile.php?id=61586526844003','2026-09-24T19:00:00+06',1875,4420,98,80,32,'2026-11-14T00:00:00+06'),
  ('facebook','decoded-barbie','DECODED · Barbie (2023): marketing strategy','video','https://www.facebook.com/profile.php?id=61586526844003','2026-10-08T19:00:00+06',2006,5108,109,80,23,'2026-11-14T00:00:00+06'),
  ('facebook','email-update','BAUBC has officially updated its email address','photo','https://www.facebook.com/profile.php?id=61586526844003','2026-11-07T12:00:00+06',1006,2647,54,23,7,'2026-11-14T00:00:00+06'),
  ('facebook','nvidia-cuda','Nvidia & CUDA: gaming to AI dominance','photo','https://www.facebook.com/profile.php?id=61586526844003','2026-11-09T18:00:00+06',628,1822,36,46,1,'2026-11-14T00:00:00+06'),
  ('facebook','tourism-day','World Tourism Day: economic impact','photo','https://www.facebook.com/profile.php?id=61586526844003','2026-09-27T12:00:00+06',506,1636,54,23,1,'2026-11-14T00:00:00+06'),
  ('facebook','case-studies-01','BAUBC Case Studies Ep 01: cart abandonment','video','https://www.facebook.com/profile.php?id=61586526844003','2026-11-12T19:00:00+06',387,791,52,54,12,'2026-11-14T00:00:00+06'),
  ('facebook','decoded-teaser','Something is about to be DECODED.','photo','https://www.facebook.com/profile.php?id=61586526844003','2026-09-20T12:00:00+06',423,1406,64,32,2,'2026-11-14T00:00:00+06'),
  ('facebook','bijoya-dashami','Bijoya Dashami greetings','photo','https://www.facebook.com/profile.php?id=61586526844003','2026-10-21T10:00:00+06',279,842,27,5,2,'2026-11-14T00:00:00+06')
on conflict (platform, external_id) do nothing;

insert into app.announcements(title, body, audience, pinned)
select 'Welcome to the new BAUBC platform', 'Events, applications, tasks and certificates now live in one place. Watch this space for Startup Summit 2027 updates.', 'public', true
where not exists (select 1 from app.announcements);
