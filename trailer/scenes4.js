// ═══════════════════════════════════════════════════════════════════════════
// Trailer v4 additions (inserted before initTW): real YouTube thumbnails and reel frames,
// a centred cinematic article, glass HUD, giant background type, kinetic captions.
// ═══════════════════════════════════════════════════════════════════════════
const YT=[
  {id:'1v8MTs4pK9U',t:'DECODED S1E4 · Monpura (2009)',k:'DECODED · S1E4',f:['maxresdefault','maxres1','maxres2','maxres3']},
  {id:'0yzXoMivwvI',t:'DECODED S1E3 · Barbie (2023)',k:'DECODED · S1E3',f:['maxresdefault','maxres1','maxres2','maxres3']},
  {id:'lZfgPnP1C2o',t:'DECODED S1E2 · Titanic (1997)',k:'DECODED · S1E2',f:['maxresdefault','maxres1','maxres2','maxres3']},
  {id:'Yk7dTNZGt-k',t:'DECODED S1E1 · Spider-Man (2002)',k:'DECODED · S1E1',f:['maxresdefault','maxres1','maxres2','maxres3']},
  {id:'PofL5z1tcFc',t:'৪৭ দিন ধরে অপেক্ষায় একটা কার্ট… কেন? · Case Studies Ep01',k:'Short · Case Studies',f:['oar2','maxres1','maxres2','maxres3'],short:true},
];
const ytSrc=(v,f)=>`assets/yt/${v.id}_${f}.jpg`;
const ytCard=(v,{title=true}={})=>`<div style="position:absolute;inset:0;background:#000;overflow:hidden"><img src="${ytSrc(v,v.f[0])}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
  <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgb(0 0 0/.12),transparent 40%,rgb(4 20 11/.88))"></div>
  <div style="position:absolute;right:14px;top:14px;width:46px;height:46px;border-radius:99px;background:#C9F53B;display:grid;place-items:center;color:#0A2015;font-size:17px;box-shadow:0 0 0 6px rgb(201 245 59/.25)">▶</div>
  ${title?`<div style="position:absolute;left:16px;right:16px;bottom:14px;color:#fff"><span style="display:inline-block;padding:4px 11px;border-radius:99px;background:rgb(255 255 255/.16);backdrop-filter:blur(10px);border:1px solid rgb(255 255 255/.25);font:600 12px Int">${v.k}</span><div class="${/[ঀ-৿]/.test(v.t)?'bnd':'disp'}" style="font-size:${v.short?20:24}px;margin-top:8px;line-height:1.2">${v.t}</div></div>`:''}</div>`;

// real reels in the rail: four DECODED episodes, then the Short, then "more"
$('rrail').innerHTML=[0,1,2,3,4].map(i=>{const v=YT[i];return `<div id="rv${i}" style="position:relative;flex:none;width:${v.short?315:720}px;height:${v.short?560:405}px;border-radius:30px;overflow:hidden;box-shadow:0 40px 70px -30px rgb(1 50 25/.6)">${ytCard(v)}</div>`}).join('')
  +`<div id="rv5" class="glass" style="position:relative;flex:none;width:315px;height:560px;border-radius:30px;display:grid;place-items:center;text-align:center;padding:30px"><div><div style="margin:0 auto;width:64px;height:64px;border-radius:18px;background:#FF0033;color:#fff;display:grid;place-items:center;font-size:26px">▶</div><div class="disp" style="font-size:30px;margin-top:16px">More on our channel</div><div style="font-size:15px;color:var(--muted);margin-top:6px">@businessclubofbau</div></div></div>`;
// the player shows the Short's real frames
$('rstage').innerHTML=YT[4].f.map((f,i)=>`<img id="rf${i}" src="${ytSrc(YT[4],f)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:${i?0:1}">`).join('')
  +`<div class="abs" style="left:0;right:0;bottom:0;height:42%;background:linear-gradient(0deg,rgb(0 0 0/.7),transparent)"></div>
  <div class="abs" style="left:22px;bottom:30px;display:flex;align-items:flex-end;gap:5px">${[0,1,2,3,4].map(i=>`<i id="req${i}" style="width:6px;height:20px;border-radius:3px;background:#C9F53B;display:block;transform-origin:bottom"></i>`).join('')}</div>
  <div id="rplay" class="abs" style="left:50%;top:50%;width:96px;height:96px;margin:-48px 0 0 -48px;border-radius:99px;background:rgb(255 255 255/.22);backdrop-filter:blur(14px);border:1px solid rgb(255 255 255/.4);display:grid;place-items:center;color:#fff;font-size:36px">▶</div>
  <div class="abs" style="left:0;right:0;bottom:0;height:6px;background:rgb(255 255 255/.25)"><div id="rprog" style="height:100%;width:0;background:#FF0033"></div></div>`;
$('rbar').innerHTML=`<span style="min-width:0"><b class="bnd" style="font-size:22px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:520px">${YT[4].t}</b><span style="font-size:14px;opacity:.7">Short · playing on baubc / reels</span></span><span class="btn bl">Open on YouTube</span>`;
$('rbar').style.left='560px';$('rbar').style.right='560px';

// real thumbnails everywhere a reel appears (route cards, phones)
document.querySelectorAll('#sc-routes [style*="radial-gradient(120% 90% at 80% 0%"], #sc-mobile [style*="radial-gradient(120% 90% at 80% 0%"]').forEach((el,i)=>{el.outerHTML=ytCard(YT[i%5],{title:false});});

// ── article: centred, with a 2.39:1 film-frame cover ─────────────────────────
$('bnart').innerHTML=`<div id="bnread" class="abs" style="left:0;top:0;width:1920px;height:6px;background:linear-gradient(90deg,#016737,#C9F53B);transform-origin:0 50%;z-index:6"></div>
 <div id="bnscroll" class="abs" style="left:0;top:0;width:1920px">
  <div style="position:relative;height:640px;text-align:center;overflow:hidden">
    <div class="layer" style="background:radial-gradient(60% 80% at 20% 10%,#E7FF8F,transparent 62%),radial-gradient(50% 70% at 85% 20%,#D7F87A,transparent 60%),linear-gradient(180deg,#EEFBC2,#F5F8EC)"></div>
    <div class="layer" style="background-image:var(--pat);opacity:.45"></div>
    <div style="position:relative;padding-top:120px;display:grid;justify-items:center;gap:22px">
      <div style="display:flex;gap:10px"><span class="tag glass"><span class="bn">← গভীর পাঠ</span></span><span class="tag" style="background:#0A2015;color:#E0FF73"><span class="bn">বাংলা</span></span></div>
      <div id="bntitle" class="bnd" data-notw style="font-size:104px;max-width:1500px;line-height:1.18">${'কৃষির সমস্যাই হতে পারে পরের বড় ব্যবসা'.split(' ').map(w=>`<span class="bkw" style="display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.12em;margin-bottom:-.12em"><span class="bnw" style="display:inline-block">${w}</span></span>`).join(' ')}</div>
      <div id="bndek" class="bn" style="font-size:28px;color:var(--ink-2);max-width:1000px">মাঠে যে কষ্ট রোজ চোখে পড়ে, সেখানেই লুকিয়ে থাকে একজন উদ্যোক্তার প্রথম সুযোগ।</div>
      <div id="bnauth" style="display:flex;align-items:center;gap:18px"><span class="glass" style="display:inline-flex;align-items:center;gap:12px;padding:6px 18px 6px 6px;border-radius:18px">${av('B',50,'border-radius:14px')}<span style="text-align:left"><span class="bn" style="font-size:13px;color:var(--muted);display:block">লিখেছেন</span><b style="font:700 18px Int">Member B</b></span></span><span class="bn" style="font-size:18px;color:var(--ink-2)">১৩ নভেম্বর ২০২৬ · ৬ মিনিটের পাঠ</span></div>
    </div>
  </div>
  <div id="bncinewrap" style="position:relative;margin:-10px auto 0;width:1540px;padding:20px">
    <i style="position:absolute;left:0;top:0;width:44px;height:44px;border-left:3px solid #016737;border-top:3px solid #016737;border-top-left-radius:12px;opacity:.6"></i>
    <i style="position:absolute;right:0;bottom:0;width:44px;height:44px;border-right:3px solid #016737;border-bottom:3px solid #016737;border-bottom-right-radius:12px;opacity:.6"></i>
    <div id="bncine" style="position:relative;width:1500px;height:628px;border-radius:30px;overflow:hidden;box-shadow:0 70px 120px -50px rgb(1 50 25/.65)">
      <img id="bncimg" src="assets/cover1.jpg" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
      <div class="layer" style="background:linear-gradient(180deg,rgb(0 0 0/.32),transparent 18%,transparent 78%,rgb(0 0 0/.4)),radial-gradient(120% 120% at 50% 50%,transparent 58%,rgb(0 0 0/.3))"></div>
      <span class="tag" style="position:absolute;left:24px;bottom:22px;background:rgb(255 255 255/.85)"><span class="bn">উদ্যোগ</span></span>
      <span class="mono" style="position:absolute;right:24px;top:20px;color:#fff;font-size:14px;letter-spacing:.2em;opacity:.85">2.39 : 1</span>
    </div>
  </div>
  <div id="bnbody" class="bn" style="width:1000px;margin:70px auto 0;font-size:30px;line-height:1.9;color:var(--ink-2);display:grid;gap:36px;padding-bottom:600px">
    <p style="font-size:34px;color:var(--ink);line-height:1.75">বাংলাদেশের কৃষক প্রতিদিন এমন অনেক সমস্যার মুখোমুখি হন, যেগুলো আমরা শহর থেকে প্রায় দেখতেই পাই না। সঠিক সময়ে ভালো বীজ না পাওয়া, ফসল তোলার পর দ্রুত নষ্ট হয়ে যাওয়া, কিংবা ন্যায্য দাম না পাওয়া।</p>
    <p><span id="hl0" class="hlx">প্রতিটি অপূর্ণ চাহিদাই আসলে একটি ব্যবসার সম্ভাবনা।</span></p>
    <div class="bnd" style="font-size:48px;color:var(--ink)"><span style="display:inline-block;width:20px;height:20px;background:#C9F53B;transform:rotate(45deg);margin-right:16px"></span>ছোট করে শুরু করুন</div>
    <p>একটি গ্রাম, একটি ফসল, দশজন কৃষক: এটুকু দিয়েই জানা যায় ধারণাটি কাজ করে কি না। <span id="hl1" class="hlx">ছোট পরীক্ষা দ্রুত শেখায়, আর ভুলের দামও কম রাখে।</span></p>
    <div id="bnq" style="position:relative;padding:48px 56px;border-radius:30px;background:linear-gradient(135deg,#0A2015,#016737);color:#fff;overflow:hidden;text-align:center"><div class="layer" style="background-image:var(--rays-l)"></div><div class="serif abs" style="left:30px;top:-46px;font-size:220px;color:#C9F53B;opacity:.35">“</div><div class="bnd" style="position:relative;font-size:50px;line-height:1.45">যে সমস্যা আপনি নিজের চোখে দেখেননি, তার সমাধান বিক্রি করা সবচেয়ে কঠিন।</div></div>
    <p>বাউবিসি-তে আমরা মাঠের বাস্তবতা থেকে শুরু করে টেকসই ব্যবসার মডেল পর্যন্ত কাজ করি। <span id="hl2" class="hlx">কৃষি আর ব্যবসা আলাদা কিছু নয়; দুটো মিলেই তৈরি হয় আগামীর অর্থনীতি।</span></p>
  </div>
 </div>
 <div id="bnkeys" class="glass" style="position:absolute;right:70px;top:250px;width:330px;border-radius:26px;padding:24px;z-index:5"><div class="lbl bn" style="color:var(--leaf);font-size:15px">◆ মূল কথা</div>
  ${['প্রতিটি অপূর্ণ চাহিদাই আসলে একটি ব্যবসার সম্ভাবনা।','ছোট পরীক্ষা দ্রুত শেখায়, আর ভুলের দামও কম রাখে।','কৃষি আর ব্যবসা আলাদা কিছু নয়।'].map((k,i)=>`<div id="bk${i}" class="bn" style="display:flex;gap:12px;margin-top:14px;font-size:18px;line-height:1.5;border-radius:14px;padding:8px"><span style="flex:none;width:28px;height:28px;display:grid;place-items:center;background:#C9F53B;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);font:700 13px HindBn">${'১২৩'[i]}</span>${k}</div>`).join('')}
 </div>`;
let BNY=null;
const offTop=(el,root)=>{let y=0;for(let e=el;e&&e!==root;e=e.offsetParent)y+=e.offsetTop;return y;};

// ── glass panes floating behind everything, cinematic vignette, HUD, giant type ──
$('bokeh').insertAdjacentHTML('afterend',`<div id="panes" class="layer" style="pointer-events:none">${[[180,140,420,300,-8],[1380,90,380,460,12],[1240,640,520,340,-14],[90,700,360,280,9],[760,820,300,200,4]].map(([x,y,w,h,r],i)=>`<div id="pane${i}" class="abs" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:44px;background:linear-gradient(135deg,rgb(255 255 255/.26),rgb(255 255 255/.06));backdrop-filter:blur(18px) saturate(1.4);border:1px solid rgb(255 255 255/.45);box-shadow:inset 0 1px 0 rgb(255 255 255/.5),0 30px 60px -30px rgb(0 0 0/.25)"></div>`).join('')}</div>
<div id="bigword" class="layer" style="pointer-events:none;overflow:hidden"><div id="bwt" class="disp abs" style="left:0;top:330px;white-space:nowrap;font-size:420px;letter-spacing:-.04em;color:transparent;-webkit-text-stroke:2px rgb(1 103 55/.10)"></div></div>`);
$('vig').style.background='radial-gradient(ellipse at center,transparent 50%,rgb(0 0 0/.30) 100%),linear-gradient(180deg,rgb(0 0 0/.14),transparent 13%,transparent 87%,rgb(0 0 0/.16))';
$('stage').insertAdjacentHTML('beforeend',`<div id="hud" class="abs" style="left:40px;right:40px;top:30px;display:flex;justify-content:space-between;align-items:center;z-index:45;pointer-events:none">
  <div id="hudL" class="glass" data-notw style="display:flex;align-items:center;gap:12px;padding:10px 18px 10px 12px;border-radius:999px;font:600 14px Int;letter-spacing:.06em">${markSVG('#016737',24)}<span id="hudN" class="mono" style="color:#016737">01</span><span style="width:1px;height:16px;background:rgb(10 32 21/.2)"></span><span id="hudS" style="text-transform:uppercase"></span></div>
  <div id="hudR" class="glass" style="display:flex;align-items:center;gap:12px;padding:12px 18px;border-radius:999px;font:600 13px Mono"><span id="hudT" class="mono">00:00</span><span style="width:180px;height:4px;border-radius:9px;background:rgb(10 32 21/.12);overflow:hidden"><i id="hudP" style="display:block;height:100%;width:0;background:linear-gradient(90deg,#016737,#C9F53B)"></i></span></div></div>`);
// caption becomes a glass pill
$('cap').style.bottom='40px';
$('capT').outerHTML=`<div id="capP" style="display:inline-block;margin-top:12px;padding:16px 34px 20px;border-radius:30px;background:rgb(255 255 255/.5);backdrop-filter:blur(24px) saturate(1.6);border:1px solid rgb(255 255 255/.85);box-shadow:0 30px 60px -30px rgb(1 50 25/.45)"><div id="capT" class="disp" style="font-size:54px;letter-spacing:-.025em;line-height:1.05"></div></div>`;
const SCENE_NAMES={intro:'',hero:'Home',routes:'Every route',events:'Events',bangla:'বাংলা লেখা',reels:'Reels',profile:'Profiles',teacher:'Advisors',dash:'Members',bkash:'Monthly fees',mom:'Recognition',perks:'Perks',contact:'Contact desk',mobile:'Every screen',outro:''};
const BIGWORDS={hero:'PLANT IDEAS',routes:'EVERY PAGE',events:'LIVE',bangla:'বাংলা',reels:'REELS',profile:'PEOPLE',teacher:'ADVISORS',dash:'MEMBERS',bkash:'bKash',mom:'PROUD',perks:'PERKS',contact:'TALK',mobile:'MOBILE'};
// glassier UI cards everywhere in the film
document.head.insertAdjacentHTML('beforeend',`<style>#world .card{background:rgb(255 255 255/.62);backdrop-filter:blur(22px) saturate(1.5);border:1px solid rgb(255 255 255/.9)}#capT .ch{display:inline-block;will-change:transform}#capT .kwd{font-family:ISerif;font-weight:400;font-style:normal;letter-spacing:-.01em}</style>`);
