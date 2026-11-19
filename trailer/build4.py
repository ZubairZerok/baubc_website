"""trailer4.html = trailer3.html + scenes4.js + new article/reels/mobile logic, kinetic captions, HUD, glass, vignette."""
import re
s = open('trailer3.html').read()
add = open('scenes4.js').read()

def rep(a, b, cnt=1):
    global s
    assert a in s, a[:100]
    s = s.replace(a, b, cnt)

def block(start_marker, end_marker, new):
    global s
    i = s.index(start_marker); j = s.index(end_marker, i)
    s = s[:i] + new + s[j:]

rep("<title>BAUBC Trailer v3</title>", "<title>BAUBC Trailer v4</title>")
rep("const DUR=92.5;", "const DUR=88.75;")
rep("mobile:[41,45],outro:[45,49]}", "mobile:[41,43],outro:[43,47]}")
rep("initTW();\nPromise.all(", add + "\ninitTW();\nPromise.all(")

# ── captions with keywords, cues moved for the shorter ending ─────────────────
for a, b in [
    ("'Every page. Open to all.'", "'Every page. *Open to all.*'"),
    ("'Tap an event. It opens into its page.'", "'Tap an event. It *opens* into its page.'"),
    ("'Our own registration form, built in'", "'Our own registration form, *built in.*'"),
    ("'Sign-ups from Facebook land live on the site'", "'Sign-ups from Facebook land *live* on the site'"),
    ("'Bangla articles. Key lines, highlighted.'", "'Bangla articles. Key lines, *highlighted.*'"),
    ("'Our reels, playing right on the site'", "'Our real reels, *playing* right on the site'"),
    ("'Every member, one page. Only what they choose.'", "'Every member, one page. *Only what they choose.*'"),
    ("'Teachers sign off every big decision'", "'Teachers *sign off* every big decision'"),
    ("'Invite-only. Tasks, points, a live leaderboard.'", "'Invite-only. Tasks, points, a *live* leaderboard.'"),
    ("'Paid by bKash, checked by finance. No PIN, ever.'", "'Paid by bKash, checked by finance. *No PIN, ever.*'"),
    ("'Member of the Month, on Facebook and Messenger'", "'Member of the Month, on *Facebook and Messenger*'"),
    ("'Real perks, straight to your account'", "'Real perks, *straight to your account*'"),
    ("'BAU students & companies: talk to a real person'", "'BAU students & companies: *talk to a real person*'"),
    ("[bt(41,2),bt(44,2),'Every screen','All 18 pages, re-made for mobile'],", "[bt(41,1),bt(42,3),'Every screen','All 18 pages, *re-made for mobile*'],"),
    ("[0,1,2].forEach(i=>cue(D(2,14,0)+i*B*2.5,'marker'));cue(D(2,15,1),'impact',.6);", "cue(bt(15,1.5),'whoosh',.6);[bt(16,1),bt(16,3.4),bt(17,2)].forEach(x=>cue(x,'marker'));cue(bt(17,.8),'impact',.6);"),
    ("cue(D(2,18)-.05,'swoosh');", "cue(bt(20,0)-.05,'click');cue(bt(20,0),'swoosh');cue(bt(20,.6),'pop',.6);"),
    ("for(let i=0;i<18;i++)cue(bt(41,2)+i*B/8,'blip',.5+i*.02);cue(bt(42),'impact',.6);", "for(let i=0;i<18;i++)cue(bt(41,.6)+i*B/14,'blip',.5+i*.02);cue(bt(41,2.4),'impact',.6);"),
    ("cue(bt(44,0),'riser',BAR);cue(bt(44,3)+.2,'whoosh');cue(bt(45),'boom');cue(bt(45),'impact');cue(bt(45,2),'shimmer');[0,1,2,3,4,5].forEach(i=>cue(bt(45,2)+i*B/2,'tick',.5));",
     "cue(bt(42,0),'riser',BAR);cue(bt(42,3)+.2,'whoosh');cue(bt(43),'boom');cue(bt(43),'impact');cue(bt(43,2),'shimmer');[0,1,2,3,4,5].forEach(i=>cue(bt(43,2)+i*B/2,'tick',.5));"),
    ("cue(bt(46,3),'sweep');[0,1,2,3,4].forEach(i=>cue(bt(47)+i*B/2,'pop',.6));cue(bt(48,2),'tail');", "cue(bt(44,3),'sweep');[0,1,2,3,4].forEach(i=>cue(bt(45)+i*B/2,'pop',.6));cue(bt(46,2),'tail');"),
    ("darkWin(bt(44,3)+.3,99,.3,.1)", "darkWin(bt(42,3)+.3,99,.3,.1)"),
    ("if(t>=bt(2)&&t<bt(49)&&!calm)", "if(t>=bt(2)&&t<bt(47)&&!calm)"),
    ("})(t-11*BAR);", "})(t-9*BAR);"),
    # cursor: click the Short in the reels rail
    ("[bt(21,3),[1300,900]],[bt(22,0)-.05", "[bt(19,3.4),[1500,980]],[bt(20,0)-.05,()=>c('rv4',.5,.5)],[bt(20,.3),[1560,1000]],\n    [bt(21,3),[1300,900]],[bt(22,0)-.05"),
    ("const segs=[[bt(8,1.5),bt(13,1.6)],[bt(21,3),bt(22,.3)]", "const segs=[[bt(8,1.5),bt(13,1.6)],[bt(19,3.4),bt(20,.3)],[bt(21,3),bt(22,.3)]"),
    ("const clicks=[bt(9,0)-.05,bt(10,2),bt(11,1.6),bt(11,2.45),bt(12,1.45),bt(13,1),bt(22,.2)", "const clicks=[bt(9,0)-.05,bt(10,2),bt(11,1.6),bt(11,2.45),bt(12,1.45),bt(13,1),bt(20,0)-.05,bt(22,.2)"),
    ("fl(bt(45),.6,1)", "fl(bt(43),.6,1)"),
    ("sh(bt(45),.6,14)", "sh(bt(43),.6,14)"),
    ("P(t,bt(48,3),DUR,E.io)", "P(t,bt(46,3),DUR,E.io)"),
]:
    rep(a, b)

BANGLA = r"""  // ── BANGLA (centred article, 2.39:1 film-frame cover, one steady camera move: no pulsing)
  if(applyScene('bangla',t)){
    const a=bt(14);
    [0,1,2].forEach(i=>{const tb=a+B*.5+i*B*.5,k=P(t,tb-.1,tb+.45,E.o6);S($('bc'+i),{o:k,y:(1-k)*120,b:(1-k)*10,r:(1-k)*(i-1)*4})});
    const chip=P(t,a+.2,a+.5,E.back);$('bnchip').style.transform=`scale(${L(.6,1,chip)})`;
    const dv=P(t,bt(14,3.2),bt(15,0),E.ie), art=t>=bt(15,0);
    S($('bngrid'),{tr:`scale(${L(1,2.8,dv)})`,o:art?0:1});$('bngrid').style.transformOrigin='410px 580px';$('bngrid').style.filter=dv>.05?`blur(${(dv*12).toFixed(1)}px)`:'none';
    S($('bnart'),{o:art?1:0});
    if(art){const a2=bt(15,0);
      if(!BNY){const root=$('bnscroll');BNY={h:[0,1,2].map(i=>offTop($('hl'+i),root)),q:offTop($('bnq'),root),c:offTop($('bncine'),root)};}
      document.querySelectorAll('.bnw').forEach((el,i)=>{const tb=a2+.05+i*B/3,k=P(t,tb,tb+.6,E.o6);S(el,{o:k,y:(1-k)*115,r:(1-k)*7,b:(1-k)*10})});
      [['bndek',a2+B*2.2],['bnauth',a2+B*2.7]].forEach(([id,tb])=>{const k=P(t,tb,tb+.5,E.o6);S($(id),{o:k,y:(1-k)*30,b:(1-k)*6})});
      const ck=P(t,bt(15,1.5),bt(15,3.2),E.io5);
      $('bncine').style.clipPath=`inset(${L(46,0,ck).toFixed(2)}% 0 ${L(46,0,ck).toFixed(2)}% 0 round 30px)`;
      S($('bncimg'),{s:L(1.2,1,P(t,bt(15,1.5),bt(16,2.5),E.o))});
      const H=[bt(16,1),bt(16,3.4),bt(17,2)], at=(y)=>520-y;
      const SY=[[bt(15,1.4),0],[bt(15,3.4),at(BNY.c+314),E.io5],[H[0]-.4,at(BNY.h[0]),E.io5],[H[1]-.4,at(BNY.h[1]),E.io5],[bt(17,.6),at(BNY.q+150),E.io5],[H[2]-.4,at(BNY.h[2]),E.io5]];
      const sy=K(t,SY);
      $('bnscroll').style.transform=`translateY(${sy.toFixed(1)}px) scale(${(1+P(t,bt(15,3.4),bt(18),E.lin)*.035).toFixed(4)})`;$('bnscroll').style.transformOrigin=`960px ${(-sy+520).toFixed(0)}px`;
      ['hl0','hl1','hl2'].forEach((id,i)=>{const k=P(t,H[i],H[i]+.6,E.io);$(id).style.backgroundSize=`${(k*100).toFixed(1)}% 75%`;$('bk'+i).style.background=`rgb(201 245 59/${(P(t,H[i],H[i]+.3)*.55).toFixed(2)})`;});
      const kk=P(t,bt(16,0),bt(16,.5),E.o6);S($('bnkeys'),{o:kk,x:(1-kk)*80});
      const qk=P(t,bt(17,.8)-.05,bt(17,.8)+.3,E.back);S($('bnq'),{s:L(1.12,1,qk),o:clamp(qk*1.5)});
      $('bnread').style.transform=`scaleX(${clamp((t-a2)/(bt(18)-a2)).toFixed(4)})`;}
  }
"""
REELS = r"""  // ── REELS (real thumbnails from the club channel; the Short plays from its real frames)
  if(applyScene('reels',t)){
    const a=bt(18);
    const tk=P(t,a,a+.5,E.o6);S($('rvt'),{o:tk,x:(1-tk)*-120,b:(1-tk)*12});
    const RX=[[a,900],[a+.5,0,E.o6],[bt(18,3),-300,E.io],[bt(19,1),-1050,E.io5],[bt(19,3.4),-2140,E.io5]];
    const rx=K(t,RX),vx=(K(t+1/240,RX)-rx)*240;
    $('rrail').style.transform=`translateX(${rx}px)`;$('rrail').style.filter=Math.abs(vx)>80?`blur(${Math.min(12,Math.abs(vx)/200).toFixed(1)}px)`:'none';
    for(let n=0;n<6;n++){const tb=bt(18,2)+n*B*.8;const h=P(t,tb,tb+.2,E.o)*(1-P(t,tb+.55,tb+.85));S($('rv'+n),{y:-h*26,s:1+h*.03,r:-h*.6})}
    const ob=P(t,bt(20,0),bt(20,.55),E.io5);
    S($('rbox'),{o:ob>0?Math.min(1,ob*1.6):0});
    const src=R($('rv4'));const tw=432,th=768,tx=744,ty=100;
    const sg=$('rstage');sg.style.left=L(src.left,tx,ob)+'px';sg.style.top=L(src.top,ty,ob)+'px';sg.style.width=L(src.width,tw,ob)+'px';sg.style.height=L(src.height,th,ob)+'px';
    const p0=bt(20,.6),fd=B*.85;
    [0,1,2,3].forEach(i=>{const st=p0+i*fd;const inn=i===0?1:P(t,st,st+.09);const out=i===3?0:P(t,st+fd+.09,st+fd+.1);S($('rf'+i),{o:t<p0?(i?0:1):inn*(1-out),s:(i?L(1.14,1.03,P(t,st,st+.28,E.o6)):1.03)+.07*P(t,st,st+fd*1.3,E.lin)})});
    S($('rplay'),{o:1-P(t,p0-.12,p0+.12),s:L(1,1.7,P(t,p0-.12,p0+.2))});
    $('rprog').style.width=(clamp((t-p0)/(BAR*.82))*100).toFixed(1)+'%';
    [0,1,2,3,4].forEach(i=>$('req'+i).style.transform=`scaleY(${t>p0?(.3+.7*Math.abs(Math.sin(t*9+i*1.7))).toFixed(3):.2})`);
    S($('rbar'),{o:P(t,bt(20,1),bt(20,1.6)),y:(1-P(t,bt(20,1),bt(20,1.6),E.o6))*20});
  }
"""
MOBILE = r"""  // ── MOBILE: all 18 routes as phones in a 9 × 2 grid (two bars, fast)
  if(applyScene('mobile',t)){
    const a=bt(41);
    const k=P(t,a,a+BAR*.5,E.io5);const s0=L(2.2,1,k),fx=L(168,960,k),fy=L(320,540,k);
    const drift=1+P(t,a+BAR*.5,bt(43),E.lin)*.03;
    $('mgrid').style.transform=`translate(960px,540px) scale(${s0*drift}) translate(${-fx}px,${-fy}px)`;
    const conv=P(t,bt(43)-.45,bt(43),E.ie);
    ROUTES.forEach((_,i)=>{const col=i%9,row=Math.floor(i/9);const tt=a+.1+col*B/10+row*B/5,pk=i===0?1:P(t,tt,tt+.4,E.back);
      const cx=168+col*198,cy=(row?590:150)+188;
      S($('mg'+i),{o:clamp(pk*2)*(1-P(t,bt(43)-.15,bt(43))),x:(960-cx)*conv,y:(540-cy)*conv,s:L(.6,1,pk)*L(1,.3,conv),r:conv*45});
      S($('mgc'+i),{y:-K(t,[[a+BAR*.45+col*.03,0],[bt(42,3),-(200+(i%3)*80),E.io]])});});
    const s1=bt(41,2.4);const step=Math.max(0,Math.floor((t-s1)/(B/4)));const idx=step%18,prv=Math.max(0,step-1)%18;const f=P(t,s1+step*B/4,s1+step*B/4+.1,E.o);
    const pos=i=>[168+(i%9)*198-85,(Math.floor(i/9)?590:150)-8];const[p0,p1]=[pos(prv),pos(idx)];
    S($('mgring'),{o:t>s1&&t<bt(42,3.2)?1:0,x:L(p0[0],p1[0],f),y:L(p0[1],p1[1],f)});
  }
"""
CAPS = r"""  // captions: kinetic type, one character at a time, keywords in serif, inside a glass pill
  const cap=CAPS.find(c=>t>=c[0]-.05&&t<c[1]+.4);
  if(cap){const ci=CAPS.indexOf(cap);
    if(lastCap!==ci){lastCap=ci;$('capK').innerHTML=`<span class="dia"></span>${cap[2]}`;$('capK').className='tag'+(cap[2].match(/[ঀ-৿]/)?' bn':'');
      let n=0;$('capT').innerHTML=cap[3].split(/(\*[^*]+\*)/).map(part=>{const kw=part.startsWith('*');const txt=kw?part.slice(1,-1):part;return [...txt].map(ch=>ch===' '?' ':`<span class="ch${kw?' kwd':''}" data-i="${n++}">${ch}</span>`).join('')}).join('');}
    const dark=darkO>.5;
    $('capT').style.color=dark?'#fff':'#0A2015';$('capT').style.setProperty('--kc',dark?'#E0FF73':'#016737');
    const pill=$('capP');pill.style.background=dark?'rgb(6 26 15/.42)':'rgb(255 255 255/.5)';pill.style.borderColor=dark?'rgb(255 255 255/.18)':'rgb(255 255 255/.85)';
    const ok=P(t,cap[1],cap[1]+.35,E.i);
    S($('capK'),{o:P(t,cap[0],cap[0]+.2)*(1-ok),y:(1-P(t,cap[0],cap[0]+.4,E.o6))*16});
    S(pill,{o:P(t,cap[0],cap[0]+.25)*(1-ok),s:L(.92,1,P(t,cap[0],cap[0]+.45,E.o6)),y:ok*14});
    document.querySelectorAll('#capT .ch').forEach(el=>{const i=+el.dataset.i,tb=cap[0]+.08+i*.016,k=P(t,tb,tb+.5,E.o6);S(el,{o:k,y:(1-k)*44,r:(1-k)*9,b:(1-k)*8,s:L(1.3,1,k)})});
    S($('cap'),{o:1});
  } else S($('cap'),{o:0});

  // HUD: scene number and name on the left, running time and progress on the right
  const order=Object.keys(SCN);const cur=order.find(k=>t>=bt(SCN[k][0])&&t<bt(SCN[k][1]))||'outro';
  S($('hud'),{o:cur==='intro'||cur==='outro'?0:Math.min(1,(t-bt(2))/.4,(bt(43)-t)/.4)});
  $('hudN').textContent=String(order.indexOf(cur)).padStart(2,'0');$('hudS').textContent=SCENE_NAMES[cur]||'';$('hudS').className=/[ঀ-৿]/.test(SCENE_NAMES[cur]||'')?'bn':'';
  $('hudT').textContent=`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;$('hudP').style.width=(t/DUR*100).toFixed(2)+'%';
  ['hudL','hudR'].forEach(id=>{const e=$(id);e.style.background=darkO>.5?'rgb(6 26 15/.4)':'';e.style.color=darkO>.5?'#fff':'';});
  // giant outline word behind each scene, letters rising in, drifting slowly
  const bw=BIGWORDS[cur];
  if(bw){const [s0,s1]=T(cur),el=$('bwt');
    if(el.dataset.w!==bw){el.dataset.w=bw;el.innerHTML=[...bw].map((c,i)=>`<span style="display:inline-block" data-i="${i}">${c===' '?'&nbsp;':c}</span>`).join('');el.className='abs '+(/[ঀ-৿]/.test(bw)?'bnd':'disp');}
    S(el,{x:L(240,-520,(t-s0)/(s1-s0)),o:Math.min(1,(t-s0)/.3,(s1-t)/.3)});el.style.webkitTextStroke=`2px ${darkO>.5?'rgb(224 255 115/.13)':'rgb(1 103 55/.10)'}`;
    el.querySelectorAll('span').forEach(sp=>{const k=P(t,s0+(+sp.dataset.i)*.045,s0+(+sp.dataset.i)*.045+.7,E.o6);sp.style.transform=`translateY(${((1-k)*140).toFixed(1)}px)`;sp.style.opacity=k.toFixed(3);});
  } else S($('bwt'),{o:0});
  {const ko=P(t,bt(43),bt(43,2),E.io5);[[390,290],[1570,320],[1500,810],[270,840],[910,920]].forEach(([cx,cy],i)=>S($('pane'+i),{x:Math.sin(t*.13+i*1.7)*60+(cx-960)*.5*ko,y:Math.cos(t*.11+i)*40+(cy-540)*.6*ko,r:Math.sin(t*.07+i)*6,o:.9*(i===4?1-ko:1)}));}

"""
block("  // ── BANGLA", "  // ── REELS", BANGLA)
block("  // ── REELS", "  // ── PROFILE", REELS)
block("  // ── MOBILE: all 18 routes", "  // ── OUTRO", MOBILE)
block("  // captions: typed, ultra fast", "  // flashes on scene cuts", CAPS)
rep("#capT .kwd{font-family:ISerif;font-weight:400;font-style:normal;letter-spacing:-.01em}", "#capT .kwd{font-family:ISerif;font-weight:400;font-style:normal;letter-spacing:-.01em;color:var(--kc);font-size:1.08em}")
open('trailer4.html', 'w').write(s)
print('ok', len(s))
