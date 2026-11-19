"""Builds trailer3.html from trailer2.html + scenes3.js.
Reused v2 scenes run on a remapped clock; new scenes (events flow, teachers, bKash, Member of the Month
on Facebook/Messenger, mobile route grid) are added; every text node goes through the typewriter."""
import re
src = open('trailer2.html').read()
scenes3 = open('scenes3.js').read()

def rep(a, b, s, cnt=1):
    assert a in s, a[:90]
    return s.replace(a, b, cnt)

s = src
s = rep("<title>BAUBC Trailer v2</title>", "<title>BAUBC Trailer v3</title>", s)
s = rep("const DUR=72;", "const DUR=92.5;", s)
s = rep("const SCN={intro:[0,2],hero:[2,4],routes:[4,8],events:[8,12],bangla:[12,16],reels:[16,19],profile:[19,22],dash:[22,25],perks:[25,28],contact:[28,31],mobile:[31,34],outro:[34,38]};",
        "const SCN={intro:[0,2],hero:[2,4],routes:[4,8],events:[8,14],bangla:[14,18],reels:[18,21],profile:[21,24],teacher:[24,27],dash:[27,30],bkash:[30,33],mom:[33,36],perks:[36,38],contact:[38,41],mobile:[41,45],outro:[45,49]};", s)

# new DOM + typewriter before the static prep (old REG/ORB replaced)
prep_at = s.index("// ═════════════════════════════ static prep")
s = s[:prep_at] + scenes3 + "\n" + s[prep_at:]
reg_start = s.index("const REG=[...'DCBA']")
reg_end = s.index("const CF=[];")
s = s[:reg_start] + r"""const REG=[{l:'A',hit:bt(11,2.6),via:'Website'},{l:'B',hit:bt(13,1.95),via:'Google Form'},{l:'C',hit:bt(13,2.8),via:'Google Form'},{l:'D',hit:bt(13,3.6),via:'Google Form'}].concat([...'EFG'].map(l=>({l,hit:-1,via:'Website'})));
$('elist').innerHTML=REG.map(r=>`<div id="er${r.l}" class="abs" style="left:0;right:0;height:56px;display:flex;align-items:center;gap:12px;padding:0 10px;border-radius:14px"><span>${av(r.l,38)}</span><span style="font:600 17px Int">New registration</span><span style="font:500 13px Int;color:${r.via==='Website'?'var(--brand)':'#673AB7'}">via ${r.via}</span><span style="margin-left:auto;font:500 13px Int;color:var(--muted)">${r.hit<0?(['','','','','','12m','25m','41m'][' ABCDEFG'.indexOf(r.l)]+' ago'):'just now'}</span></div>`).join('');
const ORB=REG.filter(r=>r.hit>0&&r.via!=='Website').map((r,i)=>{const d=document.createElement('div');d.className='abs';d.style.cssText='left:0;top:0;width:24px;height:24px;margin:-12px 0 0 -12px;border-radius:50%;background:radial-gradient(circle,#fff 0%,#E0FF73 35%,#8FD313 70%,transparent 72%);box-shadow:0 0 34px 12px rgb(201 245 59/.7)';$('orbs').appendChild(d);
  const tr=[];for(let k=0;k<10;k++){const e=document.createElement('div');e.className='abs';e.style.cssText=`left:0;top:0;width:${16-k}px;height:${16-k}px;margin:-${(16-k)/2}px 0 0 -${(16-k)/2}px;border-radius:50%;background:#E0FF73;filter:blur(${1+k*.5}px)`;$('orbs').appendChild(e);tr.push(e)}
  return{el:d,tr,t0:r.hit-B*1.6,t1:r.hit,from:i===0?'gfs':'gfr'}});
const _evp=$('evp').getBoundingClientRect(),_eb2=$('ecb2').getBoundingClientRect();const EV2=[_eb2.left-_evp.left,_eb2.top-_evp.top,_eb2.width,_eb2.height];
const MO0=bt(9,0);
const MF=[];{const r=rng(15);const c=$('m3conf');const cols=['#C9F53B','#E0FF73','#1FA85B','#F5B63A','#fff','#7BE08B'];
 for(let i=0;i<120;i++){const d=document.createElement('div');d.className='abs';const w=8+r()*12;d.style.cssText=`left:0;top:0;width:${w}px;height:${w*(r()<.5?1:.45)}px;background:${cols[i%cols.length]};border-radius:${r()<.3?'50%':'2px'}`;c.appendChild(d);
  const a=r()*Math.PI*2,sp=600+r()*1200;MF.push({el:d,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-500,rot:r()*720-360,t0:bt(33,.6)+r()*.12});}}
""" + s[reg_end:]

# captions + cues for the new timeline
cap_start = s.index("const CAPS=[")
cap_end = s.index("// ═════════════════════════════ scene transitions")
s = s[:cap_start] + r"""const ROUTE_T=ROUTES.map((_,i)=>i<10?bt(4)+i*B:bt(6,2)+(i-10)*B/2), MOSAIC=bt(7,2);
const CAPS=[
  [bt(4,0),bt(7,2)-.1,'Every route','Every page. Open to all.'],
  [bt(8,1),bt(10,1.4),'Events','Tap an event. It opens into its page.'],
  [bt(10,2.4),bt(11,3),'Registration','Our own registration form, built in'],
  [bt(12,0),bt(13,3.6),'Facebook → Google Form','Sign-ups from Facebook land live on the site'],
  [bt(14,1),bt(17,3),'বাংলা লেখা','Bangla articles. Key lines, highlighted.'],
  [bt(18,1),bt(20,3),'YouTube','Our reels, playing right on the site'],
  [bt(21,2),bt(23,3),'Public profiles','Every member, one page. Only what they choose.'],
  [bt(24,1),bt(26,3),'Advisors','Teachers sign off every big decision'],
  [bt(27,1),bt(29,3),'Members','Invite-only. Tasks, points, a live leaderboard.'],
  [bt(30,1),bt(32,3),'Monthly fees','Paid by bKash, checked by finance. No PIN, ever.'],
  [bt(33,1),bt(35,3),'Recognition','Member of the Month, on Facebook and Messenger'],
  [bt(36,1),bt(37,3),'Perks','Real perks, straight to your account'],
  [bt(38,1),bt(40,3),'Contact desk','BAU students & companies: talk to a real person'],
  [bt(41,2),bt(44,2),'Every screen','All 18 pages, re-made for mobile'],
];
const D=(d,bar,beat=0)=>bt(bar+d,beat);
cue(0,'song');
[0,1,2,3].forEach(i=>cue(bt(0,i),'impact',.55+i*.12));[0,1,2,3,4].forEach(i=>cue(bt(1,0)+i*B/2,'tick',.7));
cue(bt(1,3),'whoosh',.9);cue(bt(2),'boom');cue(bt(3,2),'whoosh',.5);cue(bt(4)-.12,'whoosh',.8);
ROUTE_T.forEach((x,i)=>cue(x,'blip',.55+i*.02));cue(MOSAIC,'impact',.75);cue(bt(8)-.1,'whoosh',.8);
// events flow
[0,1,2].forEach(i=>cue(bt(8)+i*B/2,'pop',.5));cue(bt(9,0)-.05,'click');cue(bt(9,0),'morph',.8);cue(bt(10,2),'click');cue(bt(10,2.1),'swoosh',.8);
for(let i=0;i<36;i++)cue(bt(10,3)+i*B/8,'key',.3);cue(bt(11,1.6),'click',.7);cue(bt(11,2.45),'click');cue(bt(11,2.6),'success');
cue(bt(11,3.3),'swoosh');cue(bt(12,1.45),'click');cue(bt(12,1.6),'whoosh',.7);for(let i=0;i<24;i++)cue(bt(12,2.6)+i*B/8,'key',.3);cue(bt(13,1),'click');
ORB.forEach(o=>{cue(o.t0,'zap',.55);cue(o.t1,'ding')});
// reused scenes (v2 cues moved to their new place)
cue(D(2,12,3.4),'whoosh',.6);[0,1,2].forEach(i=>cue(bt(14,1)+i*B,'pop',.6));[0,1,2,3,4,5,6].forEach(i=>cue(D(2,13,0)+i*B/2,'tick',.45));
[0,1,2].forEach(i=>cue(D(2,14,0)+i*B*2.5,'marker'));cue(D(2,15,1),'impact',.6);
cue(bt(18)-.1,'whoosh',.8);[0,1,2,3,4,5].forEach(i=>cue(D(2,16,2)+i*B,'pop',.45));cue(D(2,18)-.05,'swoosh');
cue(bt(21)-.1,'whoosh',.8);[0,1,2,3,4,5].forEach(i=>cue(D(2,19,0)+i*B/2,'pop',.45));cue(D(2,20,0),'click');cue(D(2,20,0)+.08,'swoosh');cue(D(2,21,2),'impact',.6);
// teacher
cue(bt(24)-.1,'whoosh',.8);[0,1,2].forEach(i=>cue(bt(24,3)+i*B/2,'pop',.5));cue(bt(25,.6),'click');[0,1,2,3,4,5].forEach(i=>cue(bt(25,1)+i*B/4,'tick',.8));
cue(bt(25,2.8),'success',.8);cue(bt(25,3.3),'pop',.7);cue(bt(26,0),'success',.7);cue(bt(26,.2),'impact',.9);[0,1,2].forEach(i=>cue(bt(26,1)+i*B/2,'pop',.4));
// dashboard (v2 +5 bars)
cue(bt(27)-.1,'whoosh',.8);[0,1,2,3,4,5].forEach(i=>cue(D(5,22,1)+i*B/2,'tick',.8));cue(D(5,22,3)+.2,'success');cue(D(5,23)-.1,'whoosh',.8);
[0,1,2,3].forEach(i=>{cue(D(5,23,1)+i*B,'pop',.7);cue(D(5,23,1)+i*B+.04,'coin',.6)});cue(D(5,24,2),'rise');
// bKash
cue(bt(30)-.1,'whoosh',.8);cue(bt(30,2),'swoosh');for(let i=0;i<5;i++)cue(bt(30,3)+i*B/5,'key',.4);for(let i=0;i<8;i++)cue(bt(31,0)+i*B/10,'key',.3);
[0,1,2,3,4].forEach(i=>cue(bt(31,1.4)+i*B/4,'tick',.6));cue(bt(31,2.6),'success');for(let i=0;i<14;i++)cue(bt(31,3.2)+i*B/9,'key',.3);
cue(bt(32,1.05),'click');cue(bt(32,2),'pop',.8);cue(bt(32,2.4),'coin',.9);
// Member of the Month + Facebook + Messenger
cue(bt(33)-.1,'whoosh',.8);cue(bt(33,.6),'impact');cue(bt(33,.6),'sparkle');cue(bt(34,0),'swoosh');cue(bt(34,2),'pop',.7);cue(bt(34,2.5),'pop',.5);cue(bt(34,3.2),'pop',.5);
cue(bt(35,0),'swoosh');[0,1,2,3,4].forEach(i=>cue(bt(35,.5)+i*B*.6,'ding',.35));cue(bt(35,2.4),'pop',.6);
// perks (v2 +9.25 bars), contact (+10), outro (+11)
cue(bt(36)-.1,'whoosh',.8);[0,1,2,3].forEach(i=>cue(bt(36)+i*B/2,'pop',.6));cue(bt(36,2)-.05,'click');cue(bt(36,2),'sparkle',.8);cue(bt(36,2.2),'ding',.6);cue(bt(37,0)-.05,'click');cue(bt(37,0),'sparkle',.6);
cue(bt(38)-.1,'whoosh',.8);[0,1,2].forEach(i=>cue(D(10,28,1)+i*B,'click',.6));[0,1,2].forEach(i=>cue(D(10,28,3)+i*B/2,'pop',.4));
for(let i=0;i<30;i++)cue(D(10,29,1)+i*B/6,'key',.3);cue(D(10,30,0),'click');cue(D(10,30,0)+.1,'success');
cue(bt(41)-.1,'whoosh',.8);for(let i=0;i<18;i++)cue(bt(41,2)+i*B/8,'blip',.5+i*.02);cue(bt(42),'impact',.6);
cue(bt(44,0),'riser',BAR);cue(bt(44,3)+.2,'whoosh');cue(bt(45),'boom');cue(bt(45),'impact');cue(bt(45,2),'shimmer');[0,1,2,3,4,5].forEach(i=>cue(bt(45,2)+i*B/2,'tick',.5));
cue(bt(46,3),'sweep');[0,1,2,3,4].forEach(i=>cue(bt(47)+i*B/2,'pop',.6));cue(bt(48,2),'tail');
""" + s[cap_end:]

s = rep("""const TR={ // enter style, exit style
  intro:['none','dive'], hero:['zoomFromDeep','zoomIn'], routes:['zoomOut','whipL'], events:['whipL','zoomIn'], bangla:['zoomOut','whipU'],
  reels:['whipU','whipL'], profile:['whipL','zoomIn'], dash:['zoomOut','zoomIn'], perks:['zoomOut','whipL'], contact:['whipL','morph'], mobile:['none','collapse'], outro:['none','none']};""",
"""const TR={ // enter style, exit style
  intro:['none','dive'], hero:['zoomFromDeep','zoomIn'], routes:['zoomOut','whipL'], events:['whipL','zoomIn'], bangla:['zoomOut','whipU'],
  reels:['whipU','whipL'], profile:['whipL','zoomIn'], teacher:['zoomOut','whipL'], dash:['whipL','zoomIn'], bkash:['zoomOut','whipU'], mom:['whipU','whipL'],
  perks:['whipL','whipL'], contact:['whipL','zoomIn'], mobile:['zoomOut','collapse'], outro:['none','none']};""", s)

# ── render: split into blocks ───────────────────────────────────────────────
r0 = s.index("function render(t){")
r1 = s.index("function c(id,fx=.5,fy=.5)")
body = s[r0:r1]
parts = re.split(r"\n(?=  // ── )", body)
head, blocks = parts[0], {}
for p in parts[1:]:
    name = p.split('\n', 1)[0].replace('  // ── ', '').strip()
    blocks[name] = p
tail_at = blocks['OUTRO'].index("\n  // cursor")
blocks['OUTRO'], tail = blocks['OUTRO'][:tail_at], blocks['OUTRO'][tail_at:]

def remap(block, name, delta_bars):
    a = f"  if(applyScene('{name}',t)){{"
    assert a in block, (name, block[:80])
    block = block.replace(a, f"  if(applyScene('{name}',t))((t)=>{{", 1)
    k = block.rstrip().rfind('}')
    return block[:k] + f"}})(t-{delta_bars}*BAR);\n"

bangla = blocks['BANGLA'].replace("const z=K(t,[[bt(13,3.6),1],[H[0]-.05,1.22,E.o4],[H[0]+B*1.6,1.22],[H[1]-.3,1,E.io],[H[1]-.05,1.22,E.o4],[H[1]+B*1.6,1.22],[bt(15,1)-.3,1,E.io],[bt(15,1.5),1.04,E.o4],[H[2]-.1,1.24,E.io],[bt(16),1.26]]);",
                                  "const z=K(t,[[bt(13,3.2),1],[bt(16),1.1,E.lin]]); // one slow, steady push: no pulsing")
assert bangla != blocks['BANGLA']
new_head = head.replace("""  const darkO=Math.max(darkWin(-1,bt(2)-.05,.01,.3),darkWin(bt(22),bt(22,3)+.3,.2,.35),darkWin(bt(25,1),bt(26,3),.3,.4),darkWin(bt(33,3)+.3,99,.3,.1));""",
"""  const darkO=Math.max(darkWin(-1,bt(2)-.05,.01,.3),darkWin(bt(27),bt(27,3)+.3,.2,.35),darkWin(bt(33),bt(36)-.35,.25,.35),darkWin(bt(44,3)+.3,99,.3,.1));""")
new_head = new_head.replace("""  if(t>=bt(2)&&t<bt(38)){const bi=Math.floor(t/B), dt=t-bi*B; const half=t>=bt(22)&&t<bt(23); if(!half||bi%2===0) kick=(bi%4===0?.022:.010)*Math.exp(-dt*11);}""",
"""  const calm=t>=bt(14)-.1&&t<bt(18)+.1; // no beat pulse while articles are read
  if(t>=bt(2)&&t<bt(49)&&!calm){const bi=Math.floor(t/B), dt=t-bi*B; const half=t>=bt(27)&&t<bt(28); if(!half||bi%2===0) kick=(bi%4===0?.022:.010)*Math.exp(-dt*11);}""")
assert new_head != head

EVENTS = r"""  // ── EVENTS (card morphs into the page → own registration form → Facebook post → Google Form → live)
  if(applyScene('events',t)){
    const a=bt(8);
    const fade=P(t,MO0,MO0+.4,E.o6);
    [1,2,3].forEach(n=>{const k=P(t,a+(n-1)*B*.5,a+(n-1)*B*.5+.5,E.o6);S($('ec'+n),{o:k*(n===2?1:1-fade),y:(1-k)*90,s:n===2?1:L(1,.92,fade)})});
    const hov=P(t,bt(8,3.4),bt(8,3.8))*(1-P(t,MO0,MO0+.1));S($('ec2'),{y:-hov*10,s:1+hov*.02,o:1});
    const mk=P(t,MO0,MO0+.7,E.io5);
    S($('ecy2'),{o:1-P(t,MO0,MO0+.2)});
    $('egrid').style.opacity=t>=MO0+.7?0:1;
    S($('edet'),{o:P(t,MO0+.3,MO0+.6),y:(1-P(t,MO0+.3,MO0+.8,E.o6))*40});
    const em=$('emorph');
    if(t>=MO0){S(em,{o:1,tr:'none'});em.style.left=L(EV2[0],0,mk)+'px';em.style.top=L(EV2[1],0,mk)+'px';em.style.width=L(EV2[2],1600,mk)+'px';em.style.height=L(EV2[3],360,mk)+'px';em.style.borderRadius=L(18,0,mk)+'px';
      S($('emA'),{o:1-P(t,MO0+.15,MO0+.45)});S($('emB'),{o:P(t,MO0+.12,MO0+.45),s:L(1.1,1,mk)});} else S(em,{o:0});
    $('eurl').innerHTML=t<MO0+.3?'🔒 baubc &nbsp;/ events':'🔒 baubc &nbsp;/ events / event-2';
    // the site's own registration form
    const rk=P(t,bt(10,2.1),bt(10,2.9),E.o6), rc=P(t,bt(11,3.1),bt(11,3.6),E.io5);
    S($('ereg'),{x:(1-rk)*700+rc*700,o:rk>0&&rc<1?1:0});S($('eshade'),{o:rk*(1-rc)});
    const typ=(id,txt,t0,t1)=>{$(id).textContent=txt.slice(0,Math.floor(txt.length*clamp((t-t0)/(t1-t0))))};
    typ('rg0','Member A',bt(10,3),bt(10,3.6));typ('rg1','member.a@club.mock',bt(10,3.6),bt(11,.4));typ('rg2','01XXXXXXXXX',bt(11,.4),bt(11,.9));typ('rg3','BAU · Department X',bt(11,.9),bt(11,1.4));
    const cb=$('regConsent'),on=t>=bt(11,1.6);cb.style.background=on?'var(--brand)':'transparent';cb.style.borderColor=on?'var(--brand)':'rgb(10 32 21/.3)';cb.textContent=on?'✓':'';
    $('regSubmit').style.transform=`scale(${t>bt(11,2.35)&&t<bt(11,2.5)?.95:1})`;
    S($('eregok'),{o:P(t,bt(11,2.55),bt(11,2.8)),s:L(.96,1,P(t,bt(11,2.55),bt(11,2.9),E.back))});
    // Facebook post with the Google Form link
    const fk=P(t,bt(11,3.3),bt(12,.15),E.back), fo=P(t,bt(12,1.6),bt(12,2.3),E.io5);
    S($('efb'),{o:clamp(fk*2)*(1-fo),y:(1-fk)*520-fo*60,x:-fo*520,s:L(.86,1,fk)*L(1,.55,fo),r:(1-fk)*-3});
    $('efbl').style.background=t>bt(12,1.0)&&t<bt(12,1.7)?'#E7F3FF':'transparent';$('efbl').style.textDecoration=t>bt(12,1.0)&&t<bt(12,1.7)?'underline':'none';
    // browser makes room; the Google Form grows out of the link
    const mv=P(t,bt(12,1.6),bt(12,2.6),E.io5);
    S($('eb'),{p:2400,x:L(0,-380,mv),s:L(1,.7,mv),ry:L(0,7,mv)});
    const gk=P(t,bt(12,1.55),bt(12,2.5),E.io5),gf=$('gf');
    if(t>=bt(12,1.5)){const lr=t<bt(12,2.4)?R($('efbl')):{left:900,top:300,width:10,height:10};gf.style.transformOrigin='0 0';
      S(gf,{o:clamp(gk*5),tr:`translate(${(lr.left-1200)*(1-gk)}px,${(lr.top-110)*(1-gk)}px) scale(${L(.05,1,gk)}) rotateY(${(1-gk)*-20}deg)`});} else S(gf,{o:0});
    typ('gfn','Member B',bt(12,2.6),bt(12,3.1));typ('gfe','member.b@club.mock',bt(12,3.1),bt(13,.1));typ('gfd','Department Y',bt(13,.1),bt(13,.5));
    S($('gfok'),{o:P(t,bt(13,1.05),bt(13,1.25))});$('gfs').style.transform=`scale(${t>bt(13,.9)&&t<bt(13,1.05)?.92:1})`;
    // live counter + list on the event page
    const hits=REG.filter(r=>r.hit>0&&t>=r.hit).length;const cnt=124+hits;
    $('ecount').textContent=cnt;$('gfr').textContent=cnt;$('ebar').style.width=(cnt/300*100).toFixed(1)+'%';
    $('edot').style.opacity=.4+.6*Math.abs(Math.sin(t*5));
    const lastHit=REG.filter(r=>r.hit>0&&t>=r.hit).map(r=>r.hit).sort((x,y)=>y-x)[0];
    $('ecount').style.transform=`scale(${lastHit?1+.22*(1-P(t,lastHit,lastHit+.4,E.o)):1})`;
    REG.forEach(r=>{const el=$('er'+r.l);let idx=0;
      REG.forEach(q=>{if(q===r)return;if(q.hit>0&&(r.hit<0||q.hit>r.hit))idx+=P(t,q.hit,q.hit+.4,E.o6);else if(q.hit<0&&r.hit<0&&'EFG'.indexOf(q.l)<'EFG'.indexOf(r.l))idx+=1;});
      const k=r.hit>0?P(t,r.hit,r.hit+.45,E.o6):1;S(el,{y:idx*60,x:(1-k)*-50,o:k*(idx<3.6?1:clamp(4.6-idx)),s:L(.9,1,k)});
      el.style.background=`rgb(201 245 59/${((r.hit>0?P(t,r.hit,r.hit+.1)*(1-P(t,r.hit+.5,r.hit+1.4)):0)*.55).toFixed(3)})`;});
    ORB.forEach(o=>{const on=t>=o.t0&&t<o.t1+.03;if(!on){S(o.el,{o:0});o.tr.forEach(e=>S(e,{o:0}));return;}
      const k=clamp((t-o.t0)/(o.t1-o.t0));const a2=R($(o.from)),b2=R($('ecount'));const ax=a2.left+a2.width/2,ay=a2.top+a2.height/2,bx=b2.left+b2.width*.4,by=b2.top+b2.height/2;
      const pt=k2=>{const e=E.io(k2);const cx2=(ax+bx)/2,cy2=Math.min(ay,by)-280;const u=1-e;return[u*u*ax+2*u*e*cx2+e*e*bx,u*u*ay+2*u*e*cy2+e*e*by]};
      const[x,y]=pt(k);S(o.el,{o:1,x,y,s:1+Math.sin(k*Math.PI)*.7});o.tr.forEach((e,j)=>{const[x2,y2]=pt(clamp(k-(j+1)*.03));S(e,{o:(1-j/10)*.8,x:x2,y:y2})});});
  }
"""
TEACHER = r"""  // ── TEACHER (advisor profile + co-signing a decision)
  if(applyScene('teacher',t)){
    const a=bt(24);
    rise($('tp'),t,a,.6,60,8);rise($('tq'),t,a+.2,.6,60,8);
    const ck=P(t,a+.4,a+1.6,E.o);$('tq0').textContent=Math.round(42*ck);$('tq1').textContent=Math.round(24*ck);$('tq2').textContent=Math.round(18*ck);
    [0,1,2].forEach(i=>{const k=P(t,bt(24,3)+i*B/2,bt(24,3)+i*B/2+.4,E.o6);S($('td'+i),{o:k,x:(1-k)*-80})});
    const done=(i,tt)=>{const on=t>=tt,el=$('ts'+i);el.style.background=on?'#016737':'#fff';el.style.color=on?'#fff':'';el.style.borderColor=on?'#016737':'rgb(10 32 21/.15)';el.textContent=on?'✓':String(i+1);el.style.transform=`scale(${on?L(1.4,1,P(t,tt,tt+.3,E.o)):1})`;};
    done(0,a+.5);done(1,a+.8);done(2,bt(25,2.8));done(3,bt(26,0));
    [[0,a+.5],[1,a+.8],[2,bt(25,2.8)]].forEach(([i,tt])=>$('tl'+i).style.transform=`scaleX(${P(t,tt,tt+.5,E.io)})`);
    $('tApprove').style.transform=`scale(${t>bt(25,.5)&&t<bt(25,.65)?.94:1})`;
    S($('tbtns'),{o:1-P(t,bt(25,2.6),bt(25,2.9))});
    const mf=P(t,bt(25,.7),bt(25,1),E.back)*(1-P(t,bt(25,2.6),bt(25,2.9)));S($('tmfa'),{o:clamp(mf*2),s:L(.8,1,mf)});
    [0,1,2,3,4,5].forEach(i=>{const tt=bt(25,1)+i*B/4;$('tm'+i).textContent=t>=tt?'738264'[i]:'';$('tm'+i).style.borderColor=t>=bt(25,2.5)?'#C9F53B':'rgb(255 255 255/.25)'});
    const uk=P(t,bt(25,3.3),bt(25,3.8),E.back);S($('tu'),{o:clamp(uk*2),x:(1-uk)*200});
    const sk=P(t,bt(26,.2),bt(26,.5),E.i);S($('tstamp'),{o:sk>0?1:0,tr:`rotate(-8deg) scale(${L(2.6,1,sk)})`});
    rise($('tdone'),t,bt(26,1),.5,30,6);
  }
"""
BKASH = r"""  // ── BKASH (monthly fee)
  if(applyScene('bkash',t)){
    const a=bt(30);
    rise($('bd'),t,a,.6,60,8);
    const pk=P(t,bt(30,2),bt(30,2.8),E.o6);S($('bp'),{p:2000,o:clamp(pk*2),x:(1-pk)*700,ry:(1-pk)*-30+Math.sin(t*.8)*2,y:Math.sin(t*1.1)*6});
    $('bph').textContent=t<bt(31,1)?'Send Money':t<bt(31,2.6)?'Confirm with PIN':'Done';
    const typ=(id,txt,t0,t1)=>{$(id).textContent=txt.slice(0,Math.floor(txt.length*clamp((t-t0)/(t1-t0))))};
    $('bamt').textContent='৳ '+'100'.slice(0,Math.floor(3*clamp((t-bt(30,3))/(B*.9))));
    typ('bref','DUES-NOV',bt(31,0),bt(31,.8));
    S($('bp2'),{o:P(t,bt(31,1),bt(31,1.3))*(1-P(t,bt(31,2.6),bt(31,2.8))),x:(1-P(t,bt(31,1),bt(31,1.4),E.o6))*80});
    [0,1,2,3,4].forEach(i=>{const on=t>=bt(31,1.4)+i*B/4;$('bpin'+i).style.background=on?'#E2136E':'transparent'});
    const ok=P(t,bt(31,2.6),bt(31,2.9),E.back);S($('bp3'),{o:clamp(ok*2),s:L(.9,1,ok)});
    typ('btx','9KX7Q2M4AB',bt(31,3.2),bt(32,.4));typ('bl4','4321',bt(32,.4),bt(32,.8));
    $('bsub').style.transform=`scale(${t>bt(32,.95)&&t<bt(32,1.1)?.94:1})`;
    const st=$('bstat');
    if(t<bt(32,1.1)){st.textContent='Unpaid · due Nov 30';st.style.background='#FBE1DC';st.style.color='#C2371F';}
    else if(t<bt(32,2.4)){st.textContent='Pending verification';st.style.background='#FFF1CC';st.style.color='#8A5A00';}
    else{st.textContent='Paid ✓';st.style.background='#C9F53B';st.style.color='#0A2015';}
    const sp=t>=bt(32,1.1)?P(t,t<bt(32,2.4)?bt(32,1.1):bt(32,2.4),(t<bt(32,2.4)?bt(32,1.1):bt(32,2.4))+.35,E.back):1;st.style.transform=`scale(${L(.7,1,sp)})`;
    rise($('bver'),t,bt(32,2),.5,40,6);
  }
"""
MOM = r"""  // ── MEMBER OF THE MONTH → Facebook post → Messenger mention
  if(applyScene('mom',t)){
    const a=bt(33);
    const mk=P(t,a,a+.6,E.back),mv=P(t,bt(34,0),bt(34,1),E.io5),mv2=P(t,bt(35,0),bt(35,1),E.io5);
    S($('m3card'),{o:clamp(mk*2)*(1-mv2*.0),s:L(.5,1,mk)*L(1,.58,mv),x:L(0,-560,mv),y:Math.sin(t*1.2)*6,r:L(0,-4,mv)});
    $('m3ring').style.transform=`rotate(${t*90}deg)`;S($('m3rays'),{r:t*10,o:1-P(t,bt(34),bt(34,1))});
    MF.forEach(c=>{const dt=t-c.t0;if(dt<0||dt>3.5){S(c.el,{o:0});return}const drag=Math.exp(-dt*1.6),x=960+c.vx*(1-drag)/1.6,y=540+c.vy*(1-drag)/1.6+300*dt*dt;S(c.el,{x,y,r:c.rot*dt*2,o:1-P(dt,2.5,3.5)})});
    const fk=P(t,bt(34,0),bt(34,.8),E.o6);
    S($('m3fb'),{o:clamp(fk*2),y:(1-fk)*700,x:L(0,-330,mv2),s:L(1,.9,mv2)});
    $('m3r').textContent=fmt(1248*P(t,bt(34,1),bt(35,2),E.o));$('m3c').textContent=Math.round(86*P(t,bt(34,1),bt(35,2),E.o));
    $('m3like').style.color=t>=bt(34,2)?'#0866FF':'#65676B';$('m3like').style.transform=`scale(${t>=bt(34,2)?L(1.3,1,P(t,bt(34,2),bt(34,2.3))):1})`;
    [0,1].forEach(i=>{const k=P(t,bt(34,2.5)+i*B*.7,bt(34,2.5)+i*B*.7+.35,E.o6);S($('m3k'+i),{o:k,y:(1-k)*30})});
    const ms=P(t,bt(35,0),bt(35,.8),E.o6);S($('m3ms'),{o:clamp(ms*2),x:(1-ms)*700});
    [0,1,2,3,4].forEach(i=>{const tt=bt(35,.5)+i*B*.6,k=P(t,tt,tt+.3,E.back);S($('m3m'+i),{o:clamp(k*2),y:(1-k)*30,s:L(.85,1,k)})});
    const hk=P(t,bt(35,2.4),bt(35,2.7),E.back);S($('m3heart'),{o:clamp(hk*2),s:L(.3,1,hk)});$('m3hc').textContent=Math.max(1,Math.round(12*P(t,bt(35,2.4),bt(35,3.5))));
    S($('m3typ'),{o:P(t,bt(35,3.3),bt(35,3.5))});[0,1,2].forEach(i=>S($('m3d'+i),{y:-Math.max(0,Math.sin(t*9-i*.9))*6}));
  }
"""
MOBILE = r"""  // ── MOBILE: all 18 routes as phones in a 9 × 2 grid
  if(applyScene('mobile',t)){
    const a=bt(41);
    const k=P(t,a,bt(42),E.io5);const s0=L(2.4,1,k),fx=L(168,960,k),fy=L(320,540,k);
    const drift=1+P(t,bt(42),bt(45),E.lin)*.04;
    $('mgrid').style.transform=`translate(960px,540px) scale(${s0*drift}) translate(${-fx}px,${-fy}px)`;
    const conv=P(t,bt(45)-.5,bt(45),E.ie);
    ROUTES.forEach((_,i)=>{const col=i%9,row=Math.floor(i/9);const tt=a+.15+col*B/8+row*B/4,pk=i===0?1:P(t,tt,tt+.45,E.back);
      const cx=168+col*198,cy=(row?590:150)+188;
      S($('mg'+i),{o:clamp(pk*2)*(1-P(t,bt(45)-.15,bt(45))),x:(960-cx)*conv,y:(540-cy)*conv,s:L(.6,1,pk)*L(1,.3,conv),r:conv*45});
      S($('mgc'+i),{y:-K(t,[[bt(42,2)+col*.05,0],[bt(44,2),-(220+(i%3)*90),E.io]])});});
    const step=Math.max(0,Math.floor((t-bt(42,2))/(B/2)));const idx=step%18,prv=Math.max(0,step-1)%18;const f=P(t,bt(42,2)+step*B/2,bt(42,2)+step*B/2+.18,E.o);
    const pos=i=>[168+(i%9)*198-85,(Math.floor(i/9)?590:150)-8];const[p0,p1]=[pos(prv),pos(idx)];
    S($('mgring'),{o:t>bt(42,2)&&t<bt(44,3)?1:0,x:L(p0[0],p1[0],f),y:L(p0[1],p1[1],f)});
  }
"""
CURSOR = r"""
  // cursor (only where something is clicked)
  const CK=[[bt(8,1.5),[1300,980]],[bt(8,3.6),()=>c('ec2',.5,.45)],[bt(9,0)-.05,()=>c('ec2',.5,.45)],[bt(9,1.2),[1150,780]],[bt(10,1.6),()=>c('eReg',.5,.5)],[bt(10,2),()=>c('eReg',.5,.5)],
    [bt(11,1.2),()=>c('regConsent',.5,.5)],[bt(11,1.6),()=>c('regConsent',.5,.5)],[bt(11,2.3),()=>c('regSubmit',.5,.5)],[bt(11,2.45),()=>c('regSubmit',.5,.5)],
    [bt(12,.9),()=>c('efbl',.55,.55)],[bt(12,1.45),()=>c('efbl',.55,.55)],[bt(13,.6),()=>c('gfs',.5,.5)],[bt(13,1),()=>c('gfs',.5,.5)],[bt(13,1.6),[1820,1020]],
    [bt(21,3),[1300,900]],[bt(22,0)-.05,()=>c('pd0',.4,.5)],[bt(22,.3),()=>c('pd0',.4,.5)],
    [bt(24,3),[1400,960]],[bt(25,.4),()=>c('tApprove',.5,.5)],[bt(25,.6),()=>c('tApprove',.5,.5)],[bt(25,1.4),[1500,980]],
    [bt(31,3),[700,980]],[bt(32,.8),()=>c('bsub',.5,.5)],[bt(32,1.05),()=>c('bsub',.5,.5)],[bt(32,1.6),[760,1000]],
    [bt(36,1),[1500,1000]],[bt(36,2)-.05,()=>c('pk0',.5,.92)],[bt(36,3.6),()=>c('pk2',.5,.92)],[bt(37,0)-.05,()=>c('pk2',.5,.92)],[bt(37,.6),[1600,1000]],
    [bt(39,4)-.3,[1600,1000]],[bt(40,0)-.08,()=>c('csend',.5,.5)],[bt(40,.4),[1650,1000]]];
  const segs=[[bt(8,1.5),bt(13,1.6)],[bt(21,3),bt(22,.3)],[bt(24,3),bt(25,1.4)],[bt(31,3),bt(32,1.6)],[bt(36,1),bt(37,.6)],[bt(39,4)-.3,bt(40,.4)]];
  const seg=segs.find(([s0,e0])=>t>s0&&t<e0);
  if(seg){let i=1;while(i<CK.length-1&&CK[i][0]<t)i++;const A=CK[i-1],Bk=CK[i];const pa=typeof A[1]=='function'?A[1]():A[1],pb=typeof Bk[1]=='function'?Bk[1]():Bk[1];
    const k=E.io(clamp((t-A[0])/(Bk[0]-A[0])));const clicks=[bt(9,0)-.05,bt(10,2),bt(11,1.6),bt(11,2.45),bt(12,1.45),bt(13,1),bt(22,.2),bt(25,.6),bt(32,1.05),bt(36,2)-.05,bt(37,0)-.05,bt(40,0)-.05];const cl=clicks.find(x=>t>=x-.06&&t<x+.4);
    S($('cursor'),{o:Math.min(1,(t-seg[0])/.12,(seg[1]-t)/.12),x:L(pa[0],pb[0],k),y:L(pa[1],pb[1],k),s:cl!==undefined&&t<cl+.08?.82:1});
    const ck=cl!==undefined?P(t,cl,cl+.4,E.o):0;S($('cring'),{o:ck>0?1-ck:0,s:L(.3,1.7,ck)});
  } else S($('cursor'),{o:0});

  // captions: typed, ultra fast, with a lime caret
  const cap=CAPS.find(c=>t>=c[0]-.05&&t<c[1]+.35);
  if(cap){const ci=CAPS.indexOf(cap);if(lastCap!==ci){lastCap=ci;$('capK').innerHTML=`<span class="dia"></span>${cap[2]}`;$('capK').className='tag'+(cap[2].match(/[ঀ-৿]/)?' bn':'');}
    const g=graph(cap[3]);const n=Math.min(g.length,Math.floor(Math.max(0,t-cap[0]-.05)*95));
    $('capT').innerHTML=`<span>${g.slice(0,n).join('')}</span><span class="twc" style="opacity:${n<g.length||Math.floor(t*3)%2===0?1:0}"></span><span style="visibility:hidden">${g.slice(n).join('')}</span>`;
    const dark=darkO>.5;$('capT').style.color=dark?'#fff':'#0A2015';$('capT').style.textShadow=dark?'0 4px 30px rgb(0 0 0/.45)':'0 4px 30px rgb(255 255 255/.85)';
    const ok=P(t,cap[1],cap[1]+.3,E.i);S($('capK'),{o:P(t,cap[0],cap[0]+.2)*(1-ok),y:(1-P(t,cap[0],cap[0]+.4,E.o6))*16});S($('capT'),{o:1-ok,y:-ok*16});
    S($('cap'),{o:1});
  } else S($('cap'),{o:0});

  // flashes on scene cuts (none into the articles), big hits, fades, shake
  const cuts=Object.entries(SCN).filter(([k,[s0]])=>s0>0&&k!=='bangla').map(([,[s0]])=>bt(s0));
  const fl=(x,d=.22,m=.5)=>t>=x&&t<x+d?Math.pow(1-(t-x)/d,2)*m:0;
  S($('flash'),{o:Math.max(...cuts.map(x=>fl(x,.2,.4)),fl(bt(2),.5,.95),fl(bt(45),.6,1),fl(bt(33,.6),.3,.5),...[0,1,2,3].map(i=>fl(bt(0,i),.18,.35)))});
  S($('fade'),{o:Math.max(1-P(t,0,.25,E.lin),P(t,bt(48,3),DUR,E.io))});
  const sh=(x,d,m)=>t>=x&&t<x+d?Math.sin((t-x)*80)*m*(1-(t-x)/d):0;
  const shake=sh(bt(2),.45,12)+sh(bt(45),.6,14)+sh(bt(33,.6),.4,7)+sh(bt(26,.2),.3,6)+[0,1,2,3].reduce((s,i)=>s+sh(bt(0,i),.25,5),0);
  st.style.transform=shake?`translate(${shake}px,${shake*.6}px)`:'none';
  typewriter(t);
}
"""
new_render = (new_head + "\n" + blocks['INTRO'] + "\n" + blocks['HERO'] + "\n" + blocks['ROUTES'] + "\n" + EVENTS
              + remap(bangla, 'bangla', 2) + remap(blocks['REELS'], 'reels', 2) + remap(blocks['PROFILE'], 'profile', 2)
              + TEACHER + remap(blocks['LOGIN + DASHBOARD'], 'dash', 5) + BKASH + MOM
              + remap(blocks['MoM + PERKS'], 'perks', 9.25) + remap(blocks['CONTACT'], 'contact', 10) + MOBILE
              + remap(blocks['OUTRO'], 'outro', 11) + CURSOR)
s = s[:r0] + new_render + s[r1:]
s = rep("Promise.all(['700 100px Bric'", "initTW();\nPromise.all(['700 100px Bric'", s)
s = rep("window.READY=true;render(Number(location.hash.slice(1)||0))", "window.READY=true;seekTo(Number(location.hash.slice(1)||0))", s)
open('trailer3.html', 'w').write(s)
print('ok', len(s))
