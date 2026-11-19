// ═══════════════════════════════════════════════════════════════════════════
// Trailer v3 additions: new scenes, typewriter for all text, remapped timeline.
// Loaded after the v2 page has built its DOM (see build3.py).
// ═══════════════════════════════════════════════════════════════════════════

// ── extra DOM ───────────────────────────────────────────────────────────────
const W3=$('world');
const fbIcon=(s=36)=>`<span style="display:inline-grid;place-items:center;width:${s}px;height:${s}px;border-radius:99px;background:#1877F2"><span style="width:${s*.55}px;height:${s*.55}px;display:block">${ICON.fb.replace('<svg ','<svg width="100%" height="100%" ')}</span></span>`;
const ogCard=(w=600)=>`<div style="position:relative;width:${w}px;height:${w*.525}px;border-radius:14px;overflow:hidden;background:linear-gradient(135deg,#F8FFDD,#EEFFB3 45%,#C9F53B);display:flex;align-items:center;gap:${w*.05}px;padding:0 ${w*.06}px">
  <div style="position:absolute;right:-${w*.12}px;bottom:-${w*.18}px;opacity:.13">${markSVG('#016737',w*.6)}</div>
  <div style="position:relative;flex:none;width:${w*.25}px;height:${w*.25}px;border-radius:99px;background:#C9F53B;padding:${w*.012}px"><div style="width:100%;height:100%;border-radius:99px;background:#fff;padding:${w*.008}px">${av('A',w*.22,'width:100%;height:100%;font-size:'+(w*.11)+'px;background:linear-gradient(135deg,#1FA85B,#014D2A)')}</div><span style="position:absolute;right:0;bottom:0;width:${w*.065}px;height:${w*.065}px;border-radius:99px;background:#F5B63A;border:3px solid #fff;display:grid;place-items:center;font-size:${w*.03}px">★</span></div>
  <div style="position:relative"><div style="display:inline-block;padding:${w*.008}px ${w*.02}px;border-radius:99px;background:#0A2015;color:#E0FF73;font:600 ${w*.019}px Int;letter-spacing:.06em">★ MEMBER OF THE MONTH · OCTOBER 2026</div><div class="disp" style="font-size:${w*.085}px;margin-top:${w*.015}px">Member A</div><div style="font:600 ${w*.028}px Int;color:#016737;margin-top:${w*.01}px">Head of Wing 2</div><div style="display:flex;align-items:center;gap:8px;margin-top:${w*.03}px">${markSVG('#016737',w*.045)}<b class="disp" style="font-size:${w*.03}px">BAUBC</b></div></div></div>`;

// replace the v2 events + mobile scenes, add teacher, bKash, Member-of-the-Month scenes
$('sc-events').outerHTML=`<div id="sc-events" class="scene">
  <div id="eb" class="bframe" style="left:160px;top:70px;width:1600px;height:900px;transform-origin:800px 450px">
    <div class="bchrome"><span><i style="background:#FF5F57"></i><i style="background:#FEBC2E"></i><i style="background:#28C840"></i></span><div class="url" id="eurl" data-notw>🔒 baubc &nbsp;/ events</div><span style="width:40px"></span></div>
    <div id="evp" class="layer" style="top:42px;overflow:hidden">
      <div id="egrid" class="layer" style="padding:64px 70px 0;background:linear-gradient(180deg,#F5F8EC,#EAF1D9)">
        <div class="lbl" style="color:var(--leaf)">◆ Events</div><div class="disp" style="font-size:72px;margin-top:10px">What's <span class="serif" style="color:var(--brand)">on next</span></div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:30px;margin-top:40px">${[1,2,3].map(n=>`<div id="ec${n}" class="card" style="overflow:hidden"><div id="ecb${n}" style="position:relative;height:300px;overflow:hidden"><div class="layer">${banner(n)}</div></div><div id="ecy${n}" style="padding:22px 24px"><div class="disp" style="font-size:30px">Event ${n}</div><div style="font:500 15px Int;color:var(--muted);margin-top:6px">Dec ${['','04','12','20'][n]} · ${['','Hall 1','Main Hall','Room 3'][n]} · ${['','Free','৳ 300','৳ 150'][n]}</div><div style="display:flex;justify-content:space-between;margin-top:14px"><span class="tag" style="background:var(--lime1);color:var(--brand);font-size:11px">${['','Open','Filling fast','Open'][n]}</span><b style="font:600 15px Int;color:var(--brand)">Details →</b></div></div></div>`).join('')}</div>
      </div>
      <div id="edet" class="layer" style="background:var(--paper)">
        <div style="height:360px"></div>
        <div style="display:grid;grid-template-columns:1fr 520px;gap:44px;padding:30px 60px">
          <div id="edl"><div style="display:flex;gap:10px"><span class="tag" style="background:var(--lime1);color:var(--brand)"><span class="dia"></span>Filling fast</span><span class="tag" style="background:#fff;border:1px solid var(--line)">Dec 12 · 10:00 AM</span><span class="tag" style="background:#fff;border:1px solid var(--line)">Main Hall</span></div>
            <div class="disp" style="font-size:66px;margin-top:18px">Event 2: <span class="serif" style="color:var(--brand)">Innovation</span> Summit</div>
            <p style="font-size:19px;line-height:1.6;color:var(--ink-2);margin-top:12px;max-width:640px">Talks, pitches and hands-on sessions. Open to everyone. Members check in with their digital ticket.</p>
            <div style="display:flex;gap:14px;align-items:center;margin-top:22px"><span id="eReg" class="btn bl" style="height:60px;padding:0 32px;font-size:18px;box-shadow:0 14px 30px -12px rgb(143 211 19/.9)">Register now →</span><b style="font:600 17px Int">৳ 300 <span style="color:var(--muted);font-weight:500">· pay by bKash</span></b></div></div>
          <div class="card" style="padding:22px 24px;height:430px;overflow:hidden;position:relative">
            <div style="display:flex;justify-content:space-between;align-items:center"><div class="lbl">Live registrations</div><span class="tag" style="background:#FBE1DC;color:#C2371F;font-size:11px;padding:5px 10px"><i id="edot" style="width:8px;height:8px;border-radius:9px;background:#C2371F"></i>Live</span></div>
            <div style="display:flex;align-items:baseline;gap:10px;margin-top:6px"><span id="ecount" data-notw class="disp tnum" style="font-size:80px;transform-origin:left center">124</span><span style="color:var(--muted);font-size:16px">/ 300 seats</span></div>
            <div style="height:8px;border-radius:9px;background:rgb(10 32 21/.08);margin-top:6px"><div id="ebar" style="width:41%;height:100%;border-radius:9px;background:linear-gradient(90deg,#016737,#1FA85B)"></div></div>
            <div id="elist" style="position:relative;margin-top:16px;height:250px"></div>
          </div>
        </div>
      </div>
      <div id="emorph" class="abs" style="overflow:hidden;z-index:6"><div id="emA" class="layer">${banner(2)}</div><div id="emB" class="layer">${banner(2,true)}</div></div>
      <div id="eshade" class="layer" style="background:rgb(10 32 21/.38);z-index:7"></div>
      <div id="ereg" class="abs" style="right:0;top:0;bottom:0;width:660px;background:#fff;box-shadow:-50px 0 90px -40px rgb(1 50 25/.45);z-index:8;padding:40px 46px">
        <div style="display:flex;justify-content:space-between;align-items:center"><div class="lbl" style="color:var(--leaf)">◆ Register · Event 2</div><span style="font-size:22px;color:var(--muted)">✕</span></div>
        <div class="disp" style="font-size:44px;margin-top:10px">Hold your <span class="serif" style="color:var(--brand)">seat</span></div>
        <div style="display:flex;gap:10px;margin-top:18px"><span class="dcard on" style="position:relative;padding:14px 18px;flex:1"><b style="font:700 16px Bric">Summit pass</b><br><span style="font-size:14px;color:var(--muted)">৳ 300 · person</span></span><span class="dcard" style="position:relative;padding:14px 18px;flex:1"><b style="font:700 16px Bric">Pitch track team</b><br><span style="font-size:14px;color:var(--muted)">৳ 1,200 · team</span></span></div>
        ${[['Full name','rg0'],['Email','rg1'],['Phone','rg2'],['Institution / department','rg3']].map(([l,id])=>`<div class="lbl2" style="margin-top:16px">${l}</div><div class="field2" id="${id}" data-notw></div>`).join('')}
        <div style="display:flex;align-items:center;gap:10px;margin-top:18px;font-size:15px"><span id="regConsent" style="width:24px;height:24px;border-radius:7px;border:2px solid rgb(10 32 21/.3);display:grid;place-items:center;color:#fff;font-weight:700"></span>I agree to the privacy notice</div>
        <div id="regSubmit" class="btn bp" style="margin-top:20px;height:58px;width:100%;justify-content:center;font-size:17px">Hold my seat and pay →</div>
        <div style="margin-top:12px;font-size:13px;color:var(--muted);text-align:center">Pay by bKash after your seat is held · we never ask for your PIN</div>
        <div id="eregok" class="layer" style="background:#fff;display:grid;place-items:center;text-align:center;padding:40px"><div><div style="margin:0 auto;width:96px;height:96px;border-radius:99px;background:#C9F53B;display:grid;place-items:center;font-size:42px">✓</div><div class="disp" style="font-size:48px;margin-top:20px">Seat held.</div><div style="font-size:18px;color:var(--ink-2);margin-top:8px">Ticket BAUBC-T-0125 · pay ৳ 300 by bKash</div><div class="tag" style="margin-top:18px;background:#0A2015;color:#E0FF73">Added to the live list</div></div></div>
      </div>
    </div>
  </div>
  <div id="efb" class="abs" style="left:610px;top:96px;width:700px;border-radius:18px;background:#fff;box-shadow:0 60px 120px -30px rgb(0 0 0/.45);overflow:hidden;z-index:9">
    <div style="height:56px;background:#fff;border-bottom:1px solid #e4e6eb;display:flex;align-items:center;gap:12px;padding:0 18px">${fbIcon(34)}<div style="flex:1;height:36px;border-radius:99px;background:#F0F2F5;display:flex;align-items:center;padding:0 16px;color:#65676B;font:500 15px Int">Search Facebook</div></div>
    <div style="padding:16px 18px 0;display:flex;gap:12px;align-items:center"><div style="width:46px;height:46px;border-radius:99px;background:#016737;display:grid;place-items:center">${markSVG('#E0FF73',28)}</div><div><b style="font:700 16px Int;color:#050505">BAUBC</b><div style="font:500 13px Int;color:#65676B">2h · 🌐</div></div><span style="margin-left:auto;color:#65676B;font-size:22px">···</span></div>
    <div style="padding:12px 18px;font:400 17px Int;line-height:1.5;color:#050505">Event 2: Innovation Summit is filling fast 🚀 Register in 30 seconds 👉 <span id="efbl" style="color:#1877F2;font-weight:600">forms.gle/baubc-event-2</span></div>
    <div style="position:relative;height:330px">${banner(2,true)}</div>
    <div style="padding:10px 18px;display:flex;justify-content:space-between;font:500 14px Int;color:#65676B;border-bottom:1px solid #e4e6eb"><span>👍❤️ <span id="efbr" data-notw>1.2K</span></span><span>86 comments · 54 shares</span></div>
    <div style="display:flex;justify-content:space-around;padding:10px 0;font:600 15px Int;color:#65676B"><span>👍 Like</span><span>💬 Comment</span><span>↗ Share</span></div>
  </div>
  <div id="gf" class="abs" style="left:1200px;top:110px;width:580px;height:840px;border-radius:22px;overflow:hidden;background:#F0EBF8;box-shadow:0 60px 120px -40px rgb(40 20 90/.55);padding:22px;z-index:9">
    <div style="display:flex;align-items:center;gap:10px;font:600 15px Int;color:#4A2C8A;margin:2px 4px 14px"><svg width="22" height="28" viewBox="0 0 22 28"><path d="M0 3a3 3 0 0 1 3-3h11l8 8v17a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3z" fill="#7248B9"/><path d="M14 0v8h8z" fill="#A98ADB"/><circle cx="6" cy="13" r="1.5" fill="#fff"/><rect x="9" y="12" width="8" height="2" rx="1" fill="#fff"/><circle cx="6" cy="18" r="1.5" fill="#fff"/><rect x="9" y="17" width="8" height="2" rx="1" fill="#fff"/></svg>Google Forms<span style="margin-left:auto;font:600 12px Int;color:#fff;background:#673AB7;border-radius:99px;padding:5px 11px">Responses <span id="gfr" data-notw class="tnum">124</span></span></div>
    <div style="background:#fff;border-radius:14px;border-top:12px solid #673AB7;padding:22px 26px"><div class="disp" style="font-size:30px">Event 2 · Registration</div><div style="font-size:15px;color:#555;margin-top:8px">Linked from the BAUBC Facebook page · syncs to the website instantly</div></div>
    ${[['Full name','gfn'],['Email','gfe'],['Department','gfd']].map(([l,id])=>`<div style="background:#fff;border-radius:14px;padding:18px 26px;margin-top:12px"><div style="font:500 16px Int">${l} <span style="color:#D93025">*</span></div><div style="margin-top:12px;border-bottom:1.5px solid #673AB7;height:32px;font:400 17px Int" id="${id}" data-notw></div></div>`).join('')}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:18px"><span id="gfs" class="btn" style="background:#673AB7;color:#fff;height:46px;border-radius:8px">Submit</span><span id="gfok" style="font:600 15px Int;color:#1E8E3E">✓ Response recorded</span></div>
  </div>
  <div id="orbs" class="layer" style="pointer-events:none;z-index:10"></div>
</div>`;

$('sc-mobile').outerHTML=`<div id="sc-mobile" class="scene"><div id="mgrid" class="layer" style="transform-origin:0 0">${ROUTES.map((r,i)=>{const col=i%9,row=Math.floor(i/9);const x=168+col*198,y=row?590:150;
  return `<div id="mg${i}" class="abs" style="left:${x-76}px;top:${y}px;width:152px;height:376px"><div class="phone" style="left:0;top:0;transform:scale(.38);transform-origin:0 0"><div class="notch"></div><div id="mgc${i}" class="abs" style="left:0;top:0;width:400px">${mobileMini(r,i)}</div></div><div id="mgl${i}" class="mono" style="position:absolute;left:-20px;right:-20px;top:342px;text-align:center;font-size:14px;font-weight:600;color:#016737">${r[0]}</div></div>`}).join('')}
  <div id="mgring" class="abs" style="width:170px;height:350px;border-radius:30px;border:3px solid #C9F53B;box-shadow:0 0 0 8px rgb(201 245 59/.25)"></div></div></div>`;

W3.insertAdjacentHTML('beforeend',`
<div id="sc-teacher" class="scene">
  <div id="tp" class="abs card" style="left:120px;top:120px;width:640px;height:820px;padding:40px;overflow:hidden">
    <div class="layer" style="background:radial-gradient(70% 50% at 20% 0%,#EEFFB3,transparent 70%)"></div>
    <div style="position:relative"><div class="lbl" style="color:var(--leaf)">◆ Advisors · public profile</div>
      <div style="display:flex;gap:26px;align-items:center;margin-top:24px"><div style="position:relative;width:150px;height:150px;flex:none">${av('T',150,'border-radius:30%;font-size:70px;background:linear-gradient(135deg,#1D5FD1,#0E2E6E)')}</div>
        <div><div class="tag" style="background:#DCE8FB;color:#1D5FD1">Club Advisor</div><div class="disp" style="font-size:64px;margin-top:10px">Teacher T</div><div style="font:500 18px Int;color:var(--ink-2)">Professor · Department X</div></div></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:30px">${[['tq0','Decisions co-signed'],['tq1','Payments released'],['tq2','Memberships finalised']].map(([id,l])=>`<div class="mom" style="border-radius:20px;padding:16px"><div id="${id}" data-notw class="disp tnum" style="font-size:44px">0</div><div style="font-size:13px;color:var(--ink-2)">${l}</div></div>`).join('')}</div>
      <div class="lbl" style="margin-top:30px">Recent decisions</div>
      ${[['Membership finalised · Member G','approve'],['Refund ৳ 300 · Event 1','approve'],['Event 3 budget · ৳ 18,000','return']].map(([x,k],i)=>`<div id="td${i}" style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:14px;background:#fff;border:1px solid var(--line);margin-top:10px"><span style="width:28px;height:28px;border-radius:99px;display:grid;place-items:center;font-weight:700;color:#fff;background:${k==='approve'?'#016737':'#F5B63A'}">${k==='approve'?'✓':'↺'}</span><b style="font:600 16px Int">${x}</b><span style="margin-left:auto;font:500 13px Int;color:var(--muted)">${k==='approve'?'Approved':'Sent back with a note'}</span></div>`).join('')}
    </div>
  </div>
  <div id="tq" class="abs card" style="left:820px;top:120px;width:980px;height:820px;padding:40px;overflow:hidden">
    <div style="display:flex;justify-content:space-between;align-items:center"><div><div class="lbl">Approvals · waiting for you</div><div class="disp" style="font-size:44px;margin-top:6px">Event 2 · venue & sound</div></div><span class="disp tnum" style="font-size:52px">৳ 45,000</span></div>
    <div style="font:500 17px Int;color:var(--ink-2);margin-top:8px">Requested by Member A · Finance checked the quotes ✓ · Policy: two teacher approvals</div>
    <div style="display:flex;gap:0;margin-top:34px;align-items:center">${['Requested','Finance check','Teacher T','Teacher U'].map((s,i)=>`<div style="display:flex;align-items:center;${i<3?'flex:1':''}"><div style="display:grid;justify-items:center;gap:8px;width:130px"><span id="ts${i}" style="width:54px;height:54px;border-radius:99px;display:grid;place-items:center;font:700 22px Int;border:3px solid rgb(10 32 21/.15);background:#fff">${i+1}</span><b style="font:600 15px Int">${s}</b></div>${i<3?`<div style="flex:1;height:4px;border-radius:4px;background:rgb(10 32 21/.1);margin:0 -10px 26px;position:relative;overflow:hidden"><i id="tl${i}" style="position:absolute;inset:0;background:#016737;transform-origin:0 50%;transform:scaleX(0)"></i></div>`:''}</div>`).join('')}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:34px">${[['Quote 1','Sound & stage · ৳ 28,000'],['Quote 2','Venue booking · ৳ 17,000']].map(([a,b])=>`<div style="padding:16px 18px;border-radius:16px;background:var(--paper);border:1px solid var(--line)"><div class="lbl">${a}</div><b style="font:600 17px Int">${b}</b></div>`).join('')}</div>
    <div id="tbtns" style="display:flex;gap:12px;margin-top:30px"><span id="tApprove" class="btn bp" style="height:58px;padding:0 34px;font-size:18px">Approve</span><span class="btn bs" style="height:58px">Send back with a note</span></div>
    <div id="tmfa" class="abs" style="left:40px;top:470px;padding:22px 26px;border-radius:22px;background:#0A2015;color:#fff;box-shadow:var(--shadow)"><div style="font:600 15px Int;color:#E0FF73">Two-step check</div><div style="display:flex;gap:10px;margin-top:12px">${[0,1,2,3,4,5].map(i=>`<span id="tm${i}" data-notw class="disp" style="width:52px;height:62px;border-radius:14px;background:rgb(255 255 255/.1);border:1.5px solid rgb(255 255 255/.25);display:grid;place-items:center;font-size:30px"></span>`).join('')}</div></div>
    <div id="tu" class="abs" style="right:40px;top:470px;display:flex;align-items:center;gap:14px;padding:16px 20px;border-radius:20px;background:#fff;border:1px solid var(--line);box-shadow:var(--shadow-sm)">${av('U',54,'border-radius:16px;background:linear-gradient(135deg,#8A5A00,#F5B63A)')}<div><b style="font:700 18px Int">Teacher U approved</b><div style="font-size:14px;color:var(--muted)">2 of 2 · with two-step check</div></div></div>
    <div id="tstamp" class="abs" style="left:340px;top:610px;padding:14px 34px;border:6px solid #016737;border-radius:18px;color:#016737;font:800 54px Bric;letter-spacing:.06em;transform:rotate(-8deg);background:rgb(201 245 59/.35)">APPROVED</div>
    <div id="tdone" class="abs" style="left:40px;right:40px;bottom:40px;padding:16px 20px;border-radius:16px;background:#DDF6E3;color:#016737;font:600 17px Int">✓ Approved by both teachers · Finance can now release ৳ 45,000 · logged in the audit trail</div>
  </div>
</div>

<div id="sc-bkash" class="scene">
  <div id="bd" class="abs card" style="left:120px;top:120px;width:860px;height:820px;padding:40px">
    <div class="lbl">Member A · Dues</div><div class="disp" style="font-size:56px;margin-top:6px">Monthly fee · <span class="serif" style="color:var(--brand)">November</span></div>
    <div style="display:flex;align-items:center;gap:16px;margin-top:20px"><span class="disp tnum" style="font-size:80px">৳ 100</span><span id="bstat" data-notw class="tag" style="font-size:14px;background:#FBE1DC;color:#C2371F">Unpaid · due Nov 30</span></div>
    <div style="margin-top:20px;padding:18px 20px;border-radius:18px;background:var(--paper);border:1px solid var(--line);font:500 17px Int;line-height:1.6">Send Money <b>৳ 100</b> to <b class="mono">01XXX-XXXXXX</b> (BAUBC, Personal) with reference <b class="mono">DUES-NOV</b>, then enter the Transaction ID below.</div>
    <div id="bform" style="margin-top:22px"><div style="display:grid;grid-template-columns:1.4fr 1fr;gap:14px"><div><div class="lbl2">bKash Transaction ID</div><div class="field2 mono" id="btx" data-notw></div></div><div><div class="lbl2">Sending number (last 4)</div><div class="field2 mono" id="bl4" data-notw></div></div></div>
      <div style="display:flex;gap:12px;align-items:center;margin-top:18px"><span id="bsub" class="btn" style="height:56px;padding:0 28px;font-size:17px;background:#E2136E;color:#fff">Submit payment</span><span class="tag" style="background:#DDF6E3;color:#016737">🔒 We never ask for your PIN</span></div></div>
    <div id="bver" class="abs" style="left:40px;right:40px;bottom:40px;padding:18px 22px;border-radius:18px;background:#0A2015;color:#fff;display:flex;align-items:center;gap:14px"><span style="width:40px;height:40px;border-radius:99px;background:#C9F53B;color:#0A2015;display:grid;place-items:center;font-weight:800">✓</span><div><b style="font:700 18px Int">Verified by the finance officer</b><div style="font-size:14px;opacity:.75">Receipt BAUBC-INV-2026-00412 · matched TrxID and amount</div></div></div>
  </div>
  <div id="bp" class="phone" style="left:1180px;top:107px"><div class="notch"></div>
    <div class="abs" style="left:0;right:0;top:0;height:200px;background:linear-gradient(160deg,#E2136E,#B10B55);color:#fff;padding:66px 26px 0"><div style="font:800 34px Bric;letter-spacing:-.02em">bKash</div><div id="bph" style="font:600 18px Int;margin-top:6px;opacity:.9">Send Money</div></div>
    <div id="bp1" class="abs" style="left:0;right:0;top:200px;bottom:0;padding:26px">
      <div class="lbl2">To</div><div style="display:flex;align-items:center;gap:12px;padding:12px;border-radius:14px;background:#FCE7F0">${markSVG('#016737',34)}<div><b style="font:700 17px Int">BAUBC</b><div class="mono" style="font-size:14px">01XXX-XXXXXX</div></div></div>
      <div class="lbl2" style="margin-top:20px">Amount</div><div id="bamt" data-notw class="disp tnum" style="font-size:62px;color:#E2136E">৳</div>
      <div class="lbl2" style="margin-top:14px">Reference</div><div id="bref" data-notw class="field2 mono" style="height:46px"></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:22px">${'123456789·0⌫'.split('').map(k=>`<div style="height:54px;border-radius:12px;background:#F6F6F6;display:grid;place-items:center;font:600 22px Int">${k}</div>`).join('')}</div>
    </div>
    <div id="bp2" class="abs" style="left:0;right:0;top:200px;bottom:0;padding:40px 26px;background:#fff;text-align:center"><div style="font:600 20px Int">Enter your bKash PIN</div><div style="font-size:14px;color:var(--muted);margin-top:6px">Only inside the bKash app</div><div style="display:flex;justify-content:center;gap:14px;margin-top:30px">${[0,1,2,3,4].map(i=>`<span id="bpin${i}" style="width:20px;height:20px;border-radius:99px;border:2px solid #E2136E"></span>`).join('')}</div></div>
    <div id="bp3" class="abs" style="left:0;right:0;top:200px;bottom:0;padding:40px 26px;background:#fff;text-align:center"><div style="margin:0 auto;width:96px;height:96px;border-radius:99px;background:#E2136E;color:#fff;display:grid;place-items:center;font-size:48px">✓</div><div style="font:700 24px Int;margin-top:18px">Send Money successful</div><div style="font-size:15px;color:var(--muted);margin-top:8px">৳ 100 to BAUBC · DUES-NOV</div><div style="margin-top:24px;padding:16px;border-radius:14px;background:#FCE7F0"><div class="lbl2">Transaction ID</div><div class="mono" style="font-size:26px;font-weight:700;letter-spacing:.06em">9KX7Q2M4AB</div></div></div>
  </div>
</div>

<div id="sc-mom" class="scene">
  <div id="m3rays" class="abs" style="left:-40px;top:-460px;width:2000px;height:2000px;border-radius:50%;background:repeating-conic-gradient(from 0deg,rgb(224 255 115/.12) 0deg 7deg,transparent 7deg 18deg);-webkit-mask:radial-gradient(circle,#000 0%,transparent 60%)"></div>
  <div id="m3conf" class="layer"></div>
  <div id="m3card" class="abs" style="left:660px;top:120px;width:600px;height:780px;border-radius:34px;overflow:hidden;background:linear-gradient(160deg,#FFFFFF 0%,#F8FFDD 55%,#EEFFB3 100%);box-shadow:0 80px 160px -40px rgb(0 0 0/.6);padding:46px;text-align:center;transform-origin:300px 390px">
    <div class="layer" style="background-image:var(--pat);opacity:.6"></div>
    <div style="position:relative"><span class="tag" style="background:#0A2015;color:#E0FF73;font-size:14px;padding:10px 18px">★ Member of the Month</span></div>
    <div style="position:relative;margin:38px auto 0;width:210px;height:210px"><div id="m3ring" class="abs" style="inset:-14px;border-radius:50%;background:conic-gradient(#C9F53B,#1FA85B,#F5B63A,#C9F53B)"></div><div class="abs" style="inset:-6px;border-radius:50%;background:#fff"></div>${av('A',210,'position:absolute;left:0;top:0;font-size:100px;background:radial-gradient(circle at 30% 25%,#1FA85B,#016737 60%,#014D2A)')}<div class="abs" style="right:-6px;bottom:6px;width:60px;height:60px;border-radius:50%;background:#F5B63A;display:grid;place-items:center;border:5px solid #fff;font-size:26px">★</div></div>
    <div class="disp" style="position:relative;font-size:80px;margin-top:30px">Member A</div>
    <div class="serif" style="position:relative;font-size:38px;color:var(--brand)">October 2026</div>
    <div style="position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:28px">${[['1,240','points'],['4 / 4','tasks'],['9','events']].map(([a,b])=>`<div style="background:#fff;border-radius:18px;padding:14px 8px;border:1px solid var(--line)"><div class="disp" style="font-size:32px">${a}</div><div class="lbl" style="margin-top:4px">${b}</div></div>`).join('')}</div>
  </div>
  <div id="m3fb" class="abs" style="left:560px;top:70px;width:680px;border-radius:18px;background:#fff;box-shadow:0 60px 120px -30px rgb(0 0 0/.5);overflow:hidden">
    <div style="padding:16px 18px 0;display:flex;gap:12px;align-items:center"><div style="width:46px;height:46px;border-radius:99px;background:#016737;display:grid;place-items:center">${markSVG('#E0FF73',28)}</div><div><b style="font:700 16px Int;color:#050505">BAUBC</b><div style="font:500 13px Int;color:#65676B">Just now · 🌐</div></div><span style="margin-left:auto">${fbIcon(30)}</span></div>
    <div style="padding:12px 18px;font:400 17px Int;line-height:1.5;color:#050505">🏆 Member of the Month · October 2026<br>Congratulations, Member A! Led Event 2 and closed all four tasks on time. Thank you for raising the bar for all of us. 🌱 #BAUBC</div>
    <div style="padding:0 18px">${ogCard(644)}</div>
    <div style="padding:12px 18px;display:flex;justify-content:space-between;font:500 14px Int;color:#65676B;border-bottom:1px solid #e4e6eb"><span>👍❤️🎉 <b id="m3r" data-notw style="font-weight:600">0</b></span><span><span id="m3c" data-notw>0</span> comments · 31 shares</span></div>
    <div style="display:flex;justify-content:space-around;padding:10px 0;font:600 15px Int;color:#65676B;border-bottom:1px solid #e4e6eb"><span id="m3like">👍 Like</span><span>💬 Comment</span><span>↗ Share</span></div>
    <div style="padding:10px 18px 16px;display:grid;gap:10px">${[['B','Member B','Congratulations! Well deserved 🎉'],['T','Teacher T','Proud of you. Keep leading.']].map(([l,n,m],i)=>`<div id="m3k${i}" style="display:flex;gap:10px;align-items:flex-start">${av(l,36,l==='T'?'background:#1D5FD1':'')}<div style="padding:10px 14px;border-radius:18px;background:#F0F2F5"><b style="font:700 14px Int">${n}</b><div style="font:400 15px Int">${m}</div></div></div>`).join('')}</div>
  </div>
  <div id="m3ms" class="abs" style="left:1290px;top:70px;width:540px;height:920px;border-radius:30px;background:#fff;box-shadow:0 60px 120px -30px rgb(0 0 0/.5);overflow:hidden">
    <div style="height:78px;display:flex;align-items:center;gap:12px;padding:0 20px;border-bottom:1px solid #eee"><div style="width:46px;height:46px;border-radius:99px;background:#016737;display:grid;place-items:center">${markSVG('#E0FF73',28)}</div><div><b style="font:700 17px Int">BAUBC Members</b><div style="font-size:13px;color:#65676B">64 members · Messenger</div></div><span style="margin-left:auto;width:34px;height:34px;border-radius:99px;background:linear-gradient(135deg,#00B2FF,#A033FF,#FF5C87);display:grid;place-items:center;color:#fff;font-size:18px">⚡</span></div>
    <div style="padding:18px 18px;display:grid;gap:12px">
      <div id="m3m0" style="display:flex;gap:10px;align-items:flex-end">${av('H',32)}<div style="max-width:380px"><div style="font-size:12px;color:#65676B;margin:0 0 4px 6px">Member H · admin</div><div style="padding:12px 16px;border-radius:20px;background:#F0F0F0;font:400 16px Int">📣 Member of the Month is out!</div></div></div>
      <div id="m3m1" style="display:flex;gap:10px;align-items:flex-end">${av('H',32)}<div style="width:390px;border-radius:20px;overflow:hidden;background:#F0F0F0">${ogCard(390)}<div style="padding:10px 14px"><b style="font:700 14px Int">Member A · BAUBC</b><div style="font-size:13px;color:#65676B">baubc / members / member-a</div></div></div></div>
      <div id="m3m2" style="display:flex;gap:10px;align-items:flex-end">${av('H',32)}<div style="position:relative;padding:12px 16px;border-radius:20px;background:#F0F0F0;font:400 16px Int;max-width:380px">🎉 <b style="color:#0866FF">@Member A</b>, you are BAUBC's Member of the Month for October!<span id="m3heart" class="abs" style="right:-6px;bottom:-14px;padding:2px 8px;border-radius:99px;background:#fff;box-shadow:0 2px 8px rgb(0 0 0/.15);font-size:13px">❤️ <b id="m3hc" data-notw>1</b></span></div></div>
      <div id="m3m3" style="display:flex;justify-content:flex-end"><div style="padding:12px 16px;border-radius:20px;background:#0866FF;color:#fff;font:400 16px Int;max-width:340px">Thank you all! 🙏 Let's make Event 2 the best one yet.</div></div>
      <div id="m3m4" style="display:flex;gap:10px;align-items:flex-end">${av('C',32)}<div style="padding:12px 16px;border-radius:20px;background:#F0F0F0;font:400 16px Int">Congrats!! 🔥</div></div>
      <div id="m3typ" style="display:flex;gap:10px;align-items:center">${av('D',32)}<div style="padding:14px 18px;border-radius:20px;background:#F0F0F0;display:flex;gap:6px">${[0,1,2].map(i=>`<i id="m3d${i}" style="width:9px;height:9px;border-radius:99px;background:#8A8D91;display:block"></i>`).join('')}</div></div>
    </div>
  </div>
</div>`);
function mobileMini([path,title,kind],i){
  const top=`<div style="height:54px"></div><div style="height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 22px;border-bottom:1px solid var(--line)"><div style="display:flex;gap:8px;align-items:center">${markSVG('#016737',28)}<span class="disp" style="font-size:20px">BAUBC</span></div><div style="display:grid;gap:5px"><i style="width:22px;height:2.5px;background:var(--ink);display:block"></i><i style="width:22px;height:2.5px;background:var(--ink);display:block"></i><i style="width:14px;height:2.5px;background:var(--ink);display:block"></i></div></div>`;
  const sk=(w,h=12,m=10)=>`<div class="sk" style="width:${w}%;height:${h}px;margin-top:${m}px"></div>`;
  const card=(inner,h)=>`<div class="card" style="margin-top:14px;overflow:hidden;${h?`height:${h}px;`:''}">${inner}</div>`;
  let b='';
  if(kind==='hero') b=`<div style="position:relative;height:250px;margin-top:12px"><div style="position:absolute;left:70px;top:20px;width:220px;height:220px;transform:rotate(45deg);border-radius:40px;background:var(--grad-lime)"></div><div style="position:absolute;left:110px;top:60px">${markSVG('#016737',140)}</div></div><div style="display:flex;gap:10px;margin-top:10px"><span class="btn bp" style="height:44px;font-size:14px">Join the club →</span></div>`;
  else if(kind==='grid'||kind==='gallery') b=[1,2,3].map(n=>card(`<div style="position:relative;height:150px">${kind==='grid'?banner(n):cover(n)}</div>${kind==='grid'?`<div style="padding:12px 14px"><b class="disp" style="font-size:20px">Event ${n}</b>${sk(60,9,6)}</div>`:''}`)).join('');
  else if(kind==='people') b='ABCDE'.split('').map(l=>card(`<div style="display:flex;gap:12px;align-items:center;padding:12px">${av(l,44,'border-radius:30%')}<div style="flex:1"><b class="disp" style="font-size:18px">Member ${l}</b>${sk(70,8,6)}</div></div>`)).join('');
  else if(kind==='profile') b=`<div style="text-align:center;margin-top:16px">${av('A',130,'border-radius:30%;font-size:60px;margin:0 auto')}<div class="tag" style="margin-top:14px;background:#0A2015;color:#E0FF73;font-size:10px">★ Member of the Month</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px">${['1,240','#1','9'].map(v=>`<div class="card" style="padding:10px"><b class="disp" style="font-size:22px">${v}</b></div>`).join('')}</div></div>`;
  else if(kind==='board') b='ACBDEF'.split('').map((l,j)=>`<div style="display:flex;align-items:center;gap:12px;padding:12px;margin-top:8px;border-radius:14px;background:${j?'#fff':'#EEFFB3'}"><b class="disp" style="width:20px">${j+1}</b>${av(l,34)}<b style="font:600 15px Int">Member ${l}</b><b style="margin-left:auto;font:700 14px Int">${1240-j*90}</b></div>`).join('');
  else if(kind==='event') b=card(`<div style="position:relative;height:170px">${banner(2)}</div><div style="padding:14px"><b class="disp" style="font-size:24px">Event 2</b>${sk(70,9,8)}</div>`)+`<div class="btn bl" style="width:100%;justify-content:center;margin-top:14px">Register now →</div>`+card(`<div style="padding:14px"><div class="lbl">Live registrations</div><b class="disp" style="font-size:40px">128</b></div>`);
  else if(kind==='reels') b=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px">${[0,1,2,3].map(n=>`<div style="position:relative;height:250px;border-radius:18px;overflow:hidden">${reelArt(n)}</div>`).join('')}</div>`;
  else if(kind==='wings') b=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px">${[1,2,3,4,5,6].map(n=>`<div class="card" style="padding:14px"><div style="width:34px;height:34px;border-radius:10px;background:${['#EEFFB3','#DCE8FB','#FFF1CC','#DDF6E3','#FBE1DC','#E8ECDD'][n-1]}"></div><b class="disp" style="font-size:16px;display:block;margin-top:8px">Wing ${n}</b></div>`).join('')}</div>`;
  else if(kind==='form'||kind==='verify') b=[0,1,2,3].map(()=>`<div style="margin-top:14px">${sk(40,9,0)}<div style="height:44px;border-radius:12px;background:#fff;border:1.5px solid rgb(10 32 21/.14);margin-top:8px"></div></div>`).join('')+`<div class="btn bp" style="width:100%;justify-content:center;margin-top:18px">${kind==='verify'?'Verify':'Send'} →</div>`;
  else if(kind==='bn') b=card(`<img src="assets/cover1.jpg" style="width:100%;height:170px;object-fit:cover;display:block">`)+`<div class="bn" style="font-size:16px;line-height:1.85;color:var(--ink-2);margin-top:12px">বাংলাদেশের কৃষক প্রতিদিন এমন অনেক সমস্যার মুখোমুখি হন। <span class="hlx" style="background-size:100% 75%">প্রতিটি অপূর্ণ চাহিদাই আসলে একটি ব্যবসার সম্ভাবনা।</span></div>`;
  else if(kind==='list') b=[0,1,2,3,4].map(()=>card(`<div style="padding:14px;display:flex;gap:12px"><div style="width:40px;height:40px;border-radius:12px;background:#EEFFB3"></div><div style="flex:1">${sk(80,10,2)}${sk(50,8,8)}</div></div>`)).join('');
  else b=`${sk(95)}${sk(88)}${sk(92)}${sk(70)}`+card('',140)+card('',120);
  return `${top}<div style="padding:18px 22px"><div class="lbl" style="color:var(--leaf);font-size:11px">◆ ${path==='/'?'Home':path.split('/')[1]}</div><div class="${kind==='bn'?'bnd':'disp'}" style="font-size:${kind==='hero'?42:kind==='bn'?28:34}px;margin-top:8px;line-height:1.05">${title}</div>${b}</div>`;
}

// outro title: BAUBC Ecosystem
$('owm').innerHTML='BAUBC'.split('').map(c=>`<span class="w owl">${c}</span>`).join('')+`<span class="w owl owe serif" style="color:#E0FF73;font-size:190px;letter-spacing:-.01em;margin-left:40px">Ecosystem</span>`;
$('owm').style.fontSize='170px';$('owm').style.top='480px';
$('otag').style.top='730px';
// article covers (photos) in the Bangla scene
[0,1,2].forEach(i=>{const c=$('bc'+i).firstElementChild;c.innerHTML=`<img src="assets/cover${i+1}.${i===2?'png':'jpg'}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"><span style="position:absolute;inset:0;background:linear-gradient(0deg,rgb(0 0 0/.35),transparent 50%)"></span>`+c.innerHTML.replace(/^[\s\S]*?(<span class="tag")/,'$1');});
{const hero=$('bntitle').parentElement;hero.style.width='980px';$('bntitle').style.fontSize='84px';
 hero.parentElement.insertAdjacentHTML('beforeend',`<div id="bnhero" class="abs" style="right:150px;top:140px;width:640px;height:440px;border-radius:30px;overflow:hidden;box-shadow:0 50px 90px -40px rgb(1 50 25/.55)"><img src="assets/cover1.jpg" style="width:100%;height:100%;object-fit:cover"><span class="tag" style="position:absolute;left:18px;top:18px;background:rgb(255 255 255/.8)"><span class="bn">উদ্যোগ</span></span></div>`);}

// ── dynamic text never goes through the typewriter ──────────────────────────
['iwm','owm','rlabel','rcount','cref','ps0','ps1','ps2','dpts','drank','dprog','cf0','cf1','cf2','cf3','gfr','toast'].forEach(id=>{const e=$(id);if(e)e.setAttribute('data-notw','')});
document.querySelectorAll('[id^="od"],[id^="dlr"],[id^="dlp"],[id^="dtp"],.otw').forEach(e=>e.setAttribute('data-notw',''));

// ═══════════════════════════ typewriter for all text ═══════════════════════════
const SEG=(typeof Intl!=='undefined'&&Intl.Segmenter)?new Intl.Segmenter('bn',{granularity:'grapheme'}):null;
const graph=s=>SEG?Array.from(SEG.segment(s),x=>x.segment):Array.from(s);
const TW=[];const CPS=260;
function initTW(){document.querySelectorAll('.scene').forEach(scene=>{
  const walker=document.createTreeWalker(scene,NodeFilter.SHOW_TEXT,{acceptNode:n=>{
    if(!n.nodeValue.trim())return NodeFilter.FILTER_REJECT;
    const p=n.parentElement;if(!p||p.closest('[data-notw],svg,style'))return NodeFilter.FILTER_REJECT;return NodeFilter.FILTER_ACCEPT;}});
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  nodes.forEach(n=>{const g=graph(n.nodeValue);const host=document.createElement('span');host.className='tw';
    const a=document.createElement('span'),c=document.createElement('span'),b=document.createElement('span');
    c.className='twc';b.style.visibility='hidden';a.textContent='';b.textContent=n.nodeValue;host.append(a,c,b);n.replaceWith(host);
    TW.push({host,a,c,b,g,start:null,shown:-1,scene});});
});}
const twStyle=document.createElement('style');twStyle.textContent='.twc{display:inline-block;width:.08em;height:.9em;margin:0 .02em;vertical-align:-.08em;background:#8FD313;opacity:0}';document.head.appendChild(twStyle);
function visibleChain(el){for(let e=el;e&&e.id!=='stage';e=e.parentElement){const s=e.style;if(s.visibility==='hidden'||s.display==='none'||(s.opacity!==''&&+s.opacity<.03))return false;}return true;}
function typewriter(t){
  const sceneVis=new Map();
  for(const w of TW){
    let sv=sceneVis.get(w.scene);if(sv===undefined){sv=visibleChain(w.scene);sceneVis.set(w.scene,sv);}
    if(w.start===null){if(sv&&visibleChain(w.host.parentElement))w.start=t;else{if(w.shown!==0){w.a.textContent='';w.b.textContent=w.g.join('');w.c.style.opacity=0;w.shown=0;}continue;}}
    const n=Math.min(w.g.length,Math.max(0,Math.floor((t-w.start)*CPS)));
    if(n!==w.shown){w.a.textContent=w.g.slice(0,n).join('');w.b.textContent=w.g.slice(n).join('');w.shown=n;}
    w.c.style.opacity=(n<w.g.length&&w.g.length>8)?1:0;
  }
}
// rendering a frame depends on what was visible before it: replay the previous seconds first
window.seekTo=function(t){TW.forEach(w=>{w.start=null;w.shown=-1});const from=Math.max(0,t-4);for(let x=from;x<t;x+=1/60)render(x);render(t);};
