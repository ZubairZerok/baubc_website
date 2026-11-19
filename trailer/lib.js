// ───────────────────────── utilities ─────────────────────────
const $=id=>document.getElementById(id);
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const L=(a,b,k)=>a+(b-a)*k;
const E={
  lin:x=>x, o:x=>1-Math.pow(1-x,3), o4:x=>1-Math.pow(1-x,4), o6:x=>1-Math.pow(1-x,6),
  i:x=>x*x*x, i4:x=>x*x*x*x,
  io:x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2,
  io5:x=>x<.5?16*x**5:1-Math.pow(-2*x+2,5)/2,
  ie:x=>x===0?0:Math.pow(2,10*x-10),
  oe:x=>x===1?1:1-Math.pow(2,-10*x),
  ioe:x=>x===0?0:x===1?1:x<.5?Math.pow(2,20*x-10)/2:(2-Math.pow(2,-20*x+10))/2,
  back:x=>{const c1=1.5,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2)},
  spring:x=>x>=1?1:1-Math.cos(x*Math.PI*3.2)*Math.exp(-x*5.5),
};
const P=(t,a,b,e=E.o4)=>e(clamp((t-a)/(b-a)));
function K(t,keys){ // [[time,value,ease?],...] value number or array
  if(t<=keys[0][0])return keys[0][1];
  for(let i=1;i<keys.length;i++){const k0=keys[i-1],k1=keys[i];
    if(t<=k1[0]){const e=(k1[2]||E.io)((t-k0[0])/(k1[0]-k0[0]));
      return Array.isArray(k0[1])?k0[1].map((v,j)=>L(v,k1[1][j],e)):L(k0[1],k1[1],e);}}
  return keys[keys.length-1][1];
}
function S(el,o){const s=el.style;
  if(o.o!==undefined){s.opacity=o.o;s.visibility=o.o<=0.001?'hidden':'visible';}
  if(o.tr!==undefined)s.transform=o.tr;
  else if(o.x!==undefined||o.y!==undefined||o.s!==undefined||o.r!==undefined||o.ry!==undefined||o.rx!==undefined||o.z!==undefined){
    let tr='';
    if(o.p)tr+=`perspective(${o.p}px) `;
    tr+=`translate3d(${o.x||0}px,${o.y||0}px,${o.z||0}px) `;
    if(o.rx)tr+=`rotateX(${o.rx}deg) `; if(o.ry)tr+=`rotateY(${o.ry}deg) `; if(o.r)tr+=`rotate(${o.r}deg) `;
    if(o.s!==undefined)tr+=`scale(${o.s}) `; if(o.sx!==undefined)tr+=`scale(${o.sx},${o.sy}) `;
    s.transform=tr;}
  if(o.b!==undefined)s.filter=o.b>0.05?`blur(${o.b.toFixed(2)}px)`:(o.f||'none');
  else if(o.f!==undefined)s.filter=o.f;
}
function rise(el,t,t0,d=.9,dy=36,b=10){const k=P(t,t0,t0+d,E.o6);S(el,{o:k,y:(1-k)*dy,b:(1-k)*b});return k}
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const R=(el)=>el.getBoundingClientRect();
const fmt=n=>Math.round(n).toLocaleString('en-US');
const CUES=[];const cue=(t,type,v=1)=>CUES.push({t,type,v});
function words(text,cls=''){return text.split(/(\s+)/).map(w=>w.trim()?`<span class="w ${cls}">${w}</span>`:w).join('')}

const MARK=['M292 250 382 161 541 321 545 363H405Z','M667 271 760 364 675 450 581 357Z','M191 387H545L549 492 640 489V838H517V609L353 773 260 680 424 514H191Z','M665 488 708 486 871 648 782 737 665 620Z'];
const markSVG=(fill='#016737',w=40,id='')=>`<svg ${id?`id="${id}"`:''} width="${w}" height="${w}" viewBox="150 120 760 760">${MARK.map(d=>`<path fill="${fill}" d="${d}"/>`).join('')}</svg>`;
const AVC={A:'#016737',B:'#1D5FD1',C:'#C2371F',D:'#8A5A00',E:'#5B3FD1',F:'#0E7C86',G:'#B4307A',H:'#2B3D32'};
const av=(l,s=40,extra='')=>`<div class="av" style="width:${s}px;height:${s}px;background:${AVC[l]};font-size:${s*.44}px;${extra}">${l}</div>`;

// ───────────────────── art: banners / covers ─────────────────────
function banner(n,big=false){
  const pal={1:['linear-gradient(135deg,#EEFF9E,#C9F53B 55%,#8FDD55)','#0A2015','rgb(1 103 55/.16)','Pitch Night','DEC 04'],
             2:['radial-gradient(120% 140% at 85% 10%,#1FA85B 0%,#016737 38%,#012615 100%)','#E0FF73','rgb(224 255 115/.14)','Innovation Summit','DEC 12'],
             3:['linear-gradient(135deg,#FFD27A,#F5B63A 45%,#F07F3C)','#3A1A00','rgb(255 255 255/.22)','Founders Workshop','DEC 20']}[n];
  const fs=big?260:150;
  return `<div style="position:absolute;inset:0;background:${pal[0]};overflow:hidden">
    <div style="position:absolute;inset:0;background-image:${n==2?'var(--pat-l)':'var(--pat)'};opacity:.9"></div>
    <div style="position:absolute;right:-6%;top:-30%;width:62%;aspect-ratio:1;transform:rotate(45deg);border:2px solid ${pal[2]};border-radius:18px"></div>
    <div style="position:absolute;right:6%;top:-8%;width:38%;aspect-ratio:1;transform:rotate(45deg);background:${pal[2]};border-radius:14px"></div>
    <div style="position:absolute;right:${big?10:7}%;top:${big?14:16}%;opacity:${n==2?.95:.85}">${markSVG(pal[1],big?230:110)}</div>
    <div class="disp" style="position:absolute;left:5%;bottom:-.12em;font-size:${fs}px;color:transparent;-webkit-text-stroke:2px ${pal[1]};opacity:.35">0${n}</div>
    <div style="position:absolute;left:5%;top:${big?12:11}%;display:flex;gap:8px"><span class="tag" style="background:${n==2?'rgb(224 255 115/.16)':'rgb(255 255 255/.5)'};color:${pal[1]};font-size:${big?14:11}px"><span class="dia"></span>${pal[4]}</span></div>
    <div style="position:absolute;left:5%;top:${big?32:36}%;color:${pal[1]}"><div class="disp" style="font-size:${big?96:44}px">Event ${n}</div><div class="serif" style="font-size:${big?50:24}px;opacity:.9;margin-top:${big?8:4}px">${pal[3]}</div></div>
  </div>`;
}
function cover(n){
  const pal={1:['#C5F4D4','#016737','#7BE08B'],2:['#DCE8FB','#1D5FD1','#9DBDF5'],3:['#FFF1CC','#8A5A00','#F5B63A']}[n];
  return `<div style="position:absolute;inset:0;background:${pal[0]};overflow:hidden">
   <div style="position:absolute;inset:0;background-image:var(--rays)"></div>
   <div style="position:absolute;left:${[0,12,52,30][n]}%;top:22%;width:120px;height:120px;transform:rotate(45deg);background:${pal[2]};border-radius:14px"></div>
   <div style="position:absolute;left:${[0,48,14,62][n]}%;top:${[0,40,46,20][n]}%;width:80px;height:80px;border-radius:99px;background:${pal[1]};opacity:.85"></div>
   <div style="position:absolute;left:${[0,64,70,10][n]}%;top:${[0,12,10,52][n]}%;width:150px;height:22px;border-radius:99px;background:${pal[1]};opacity:.25;transform:rotate(-20deg)"></div>
  </div>`;
}
function claudeLogo(s=56){const r=rng(7);let g='';const n=12;
  for(let i=0;i<n;i++){const a=(i/n)*Math.PI*2+(r()-.5)*.22,len=30+r()*16,x=50+Math.cos(a)*len,y=50+Math.sin(a)*len;
    g+=`<line x1="50" y1="50" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#D97757" stroke-width="${(8+r()*3).toFixed(1)}" stroke-linecap="round"/>`;}
  return `<svg width="${s}" height="${s}" viewBox="0 0 100 100">${g}</svg>`;}
const ICON={
  book:`<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#1D5FD1" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/><path d="M9 8h7M9 11h5"/></svg>`,
  ticket:`<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#8A5A00" stroke-width="1.8" stroke-linejoin="round"><path d="M3 8a2 2 0 0 0 0 4v0a2 2 0 0 0 0 4v2h18v-2a2 2 0 0 1 0-4 2 2 0 0 1 0-4V6H3z"/><path d="M14 6v12" stroke-dasharray="2 2.4"/></svg>`,
  chat:`<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#016737" stroke-width="1.8" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5" stroke-linecap="round"/></svg>`,
  fb:`<svg viewBox="0 0 24 24"><path fill="#fff" d="M13.6 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.5-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.9v3h2.6V21z"/></svg>`,
  li:`<svg viewBox="0 0 24 24"><path fill="#fff" d="M5.3 8.6h3V19h-3zM6.8 4a1.7 1.7 0 1 1 0 3.5 1.7 1.7 0 0 1 0-3.5zM10.3 8.6h2.9V10c.4-.8 1.4-1.7 3-1.7 3.1 0 3.7 2 3.7 4.7V19h-3v-5.3c0-1.3 0-2.9-1.8-2.9s-2 1.4-2 2.8V19h-2.8z"/></svg>`,
  android:`<svg viewBox="0 0 24 24" fill="#fff"><path d="M6 10.2a6 6 0 0 1 12 0z"/><path d="M8.2 5.2 7 3.4M15.8 5.2 17 3.4" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/><circle cx="9.4" cy="8" r=".8" fill="#04140b"/><circle cx="14.6" cy="8" r=".8" fill="#04140b"/><path d="M6 11h12v6.5a1.5 1.5 0 0 1-1.5 1.5H15v2.3a1.2 1.2 0 0 1-2.4 0V19h-1.2v2.3a1.2 1.2 0 0 1-2.4 0V19H7.5A1.5 1.5 0 0 1 6 17.5z"/><rect x="2.6" y="11" width="2.4" height="6.4" rx="1.2"/><rect x="19" y="11" width="2.4" height="6.4" rx="1.2"/></svg>`,
  apple:`<svg viewBox="0 0 24 24" fill="#fff"><path d="M15.6 3.2c.1 1.1-.3 2.1-1 2.9-.7.8-1.7 1.3-2.7 1.2-.1-1 .4-2.1 1-2.8.7-.8 1.8-1.3 2.7-1.3zM19.4 16.6c-.5 1.1-.7 1.6-1.4 2.6-.9 1.4-2.2 3.1-3.8 3.1-1.4 0-1.8-.9-3.7-.9-1.9 0-2.3.9-3.7.9-1.6 0-2.8-1.6-3.7-3-2.5-3.9-2.8-8.4-1.2-10.8 1.1-1.7 2.9-2.7 4.6-2.7 1.7 0 2.8.9 4.2.9 1.4 0 2.2-.9 4.2-.9 1.5 0 3.1.8 4.2 2.3-3.7 2-3.1 7.3.3 8.5z"/></svg>`,
  web:`<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z"/></svg>`,
};

