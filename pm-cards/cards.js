/* Roots and Leaves roots-pm cards, format 1. Built from roots-pm's assets/ templates; one file for the answers, plan and done cards.
   Use: <div id="rc"></div> then RootsCards.answers(DATA, 'rc') (or .plan, .done). Styling and layout only: no data lives here. */
(function(){
  var CSS = ".rc-answers .wrap{border-radius:16px;padding:1rem;margin:0}\n.rc-answers .wh{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 12px}\n.rc-answers .c{background:var(--surface-2);border:0.5px solid var(--border);border-radius:12px;margin:0 0 12px;overflow:hidden}\n.rc-answers .band{padding:.75rem 1.1rem;display:flex;gap:10px;align-items:flex-start}\n.rc-answers .n{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:500;flex:none;color:#fff}\n.rc-answers .meta{font-size:13px;margin:2px 0 0;color:var(--text-secondary)}\n.rc-answers .body{padding:.25rem 1.1rem 1rem 3.4rem}\n.rc-answers .lab{font-size:12px;color:var(--text-muted);margin:10px 0 2px}\n.rc-answers .txt{font-size:14px;margin:0;line-height:1.55}\n.rc-answers .lk{display:inline-flex;align-items:center;gap:4px;font-size:13px;margin:2px 10px 2px 0}\n.rc-answers .o{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 0}\n.rc-answers .c textarea{display:block;width:100%;margin:10px 0 0;min-height:44px;font-size:14px;box-sizing:border-box;resize:vertical}\n.rc-plan .wrap{border-radius:16px;padding:1rem;margin:0}\n.rc-plan .wh{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 12px}\n.rc-plan .c{background:var(--surface-2);border:0.5px solid var(--border);border-radius:12px;margin:0 0 12px;overflow:hidden}\n.rc-plan .band{padding:.75rem 1.1rem;display:flex;gap:10px;align-items:center}\n.rc-plan .n{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:500;flex:none;color:#fff}\n.rc-plan .body{padding:.25rem 1.1rem 1rem 3.4rem}\n.rc-plan .lab{font-size:12px;color:var(--text-muted);margin:10px 0 4px}\n.rc-plan ul.a{margin:0;padding-left:1.1rem;font-size:14px;line-height:1.6}\n.rc-plan .draft{font-size:13px;line-height:1.55;background:var(--surface-1);border-radius:var(--radius);padding:.6rem .8rem;margin:6px 0 0;white-space:pre-wrap;font-family:var(--font-voice)}\n.rc-plan .live{border-radius:var(--radius);padding:.6rem .8rem;margin:10px 0 0;display:flex;gap:10px;align-items:flex-start}\n.rc-plan .c textarea{display:block;width:100%;margin:10px 0 0;min-height:40px;font-size:14px;box-sizing:border-box;resize:vertical}";
  if (!document.getElementById('rc-style')) { var st = document.createElement('style'); st.id = 'rc-style'; st.textContent = CSS; document.head.appendChild(st); }
  function answers(DATA, mount){
    if (typeof mount === 'string') mount = document.getElementById(mount);
    mount.className = 'rc-answers';
    mount.innerHTML = "<div class=\"wrap\" id=\"wrap\">\n<div class=\"wh\">\n<span id=\"pill\" style=\"font-size:12px;font-weight:500;padding:4px 12px;border-radius:999px;color:#fff\">Your answers</span>\n<span id=\"scope\" style=\"font-size:15px;font-weight:500\"></span>\n<span id=\"from\" style=\"font-size:13px;color:var(--text-secondary)\"></span>\n</div>\n<div id=\"cards\"></div>\n<div style=\"display:flex;align-items:center;gap:12px;flex-wrap:wrap\">\n<span id=\"tally\" style=\"font-size:13px;color:var(--text-secondary);flex:1\"></span>\n<button id=\"clearall\">Clear all</button>\n<button id=\"send\">Send my responses \u2197</button>\n</div>\n<p id=\"err\" style=\"font-size:13px;color:var(--text-danger);margin:6px 0 0;min-height:1em\"></p>\n</div>";

const P='#7F77DD',PT='rgba(127,119,221,0.10)',BLUE='#378ADD',TINT='rgba(55,138,221,0.14)';
const HUE={research:['#378ADD','rgba(55,138,221,0.12)','Needs research'],choice:['#BA7517','rgba(186,117,23,0.13)','Your choice'],close:['#639922','rgba(99,153,34,0.13)','Close it'],reply:['#1D9E75','rgba(29,158,117,0.12)','Reply with'],ask:['#D4537E','rgba(212,83,126,0.12)','Ask a teammate'],park:['#888780','rgba(136,135,128,0.13)','Hand on or park']};
function imp(el,p,v){el.style.setProperty(p,v,'important')}
function el(t,c,h){const e=document.createElement(t);if(c)e.className=c;if(h!==undefined)e.innerHTML=h;return e}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')}
const W=document.getElementById('wrap');imp(W,'background',PT);imp(W,'border','1.5px solid '+P);
document.getElementById('pill').style.background=P;
document.getElementById('scope').textContent=DATA.scope;
document.getElementById('from').textContent=DATA.from+(DATA.test?' · test run':'');
const items=DATA.items,N=items.length;
const st={},nt={};items.forEach(i=>{st[i.n]=new Set(i.pre||[]);nt[i.n]=''});
const box=document.getElementById('cards');
function tally(){const m=items.filter(i=>st[i.n].size||nt[i.n].trim()).length;document.getElementById('tally').textContent=m+' of '+N+' answered, '+(N-m)+' left to talk about'}
function styleTa(ta){if(ta.value.trim()){imp(ta,'border',BLUE+' 2px solid')}else{ta.style.removeProperty('border')}}
function render(){box.innerHTML='';
items.forEach(it=>{const s=st[it.n];const [hc,tint,lbl]=HUE[it.k]||HUE.choice;
const d=el('div','c');
const band=el('div','band');band.style.background=tint;imp(band,'border-left','4px solid '+hc);
const num=el('span','n',String(it.n));num.style.background=hc;band.appendChild(num);
const hd=el('div');hd.style.flex='1';
const ttl=el('p','','<span style="font-size:16px;font-weight:500">'+esc(it.t)+'</span>');ttl.style.margin='0';hd.appendChild(ttl);
hd.appendChild(el('p','meta','<span style="color:'+hc+';font-weight:500">'+lbl+'</span> · '+esc([it.id,'Waiting: '+it.w,it.late,it.due].filter(Boolean).join(' · '))));
band.appendChild(hd);
const cb=el('button');cb.textContent='Clear';cb.style.fontSize='12px';cb.style.visibility=(s.size||nt[it.n])?'visible':'hidden';cb.onclick=()=>{s.clear();nt[it.n]='';render()};band.appendChild(cb);
d.appendChild(band);
const b=el('div','body');
b.appendChild(el('p','lab','Where it stands'));b.appendChild(el('p','txt',esc(it.st)));
if(it.up&&it.up.length){b.appendChild(el('p','lab','What turned up'));const u=el('div');it.up.forEach(([l,h])=>{const a=el('a','lk','<i class="ti ti-external-link" aria-hidden="true"></i>'+esc(l));a.href=h;a.target='_blank';u.appendChild(a)});b.appendChild(u)}
b.appendChild(el('p','lab','Recommendation · '+esc(it.sure)));const r=el('p','txt',esc(it.rec));r.style.fontWeight='500';b.appendChild(r);
b.appendChild(el('p','lab','Need from you'));b.appendChild(el('p','txt',esc(it.need)));
if(it.o&&it.o.length){b.appendChild(el('p','lab',it.m?'Your answer · pick any':'Your answer · pick one'));
const o=el('div','o');
it.o.forEach(opt=>{const bt=el('button');const on=s.has(opt);
const ic=it.m?(on?'ti-square-check':'ti-square'):(on?'ti-circle-check':'ti-circle');
bt.innerHTML='<i class="ti '+ic+'" aria-hidden="true"></i>'+esc(opt);bt.setAttribute('aria-pressed',on);
bt.style.fontSize='13px';bt.style.display='inline-flex';bt.style.alignItems='center';bt.style.gap='6px';
if(on){imp(bt,'border',BLUE+' 2px solid');imp(bt,'background',TINT);imp(bt,'color',BLUE)}else{imp(bt,'border','2px solid transparent');imp(bt,'outline','0.5px solid var(--border-strong)');imp(bt,'outline-offset','-2px')}
bt.onclick=()=>{if(s.has(opt)){s.delete(opt)}else{if(!it.m)s.clear();s.add(opt)}document.getElementById('err').textContent='';render()};o.appendChild(bt)});
b.appendChild(o)}
const ta=el('textarea');ta.placeholder='Type, paste or dictate anything for '+it.n;ta.value=nt[it.n];ta.setAttribute('aria-label','Notes for item '+it.n);styleTa(ta);
ta.oninput=()=>{nt[it.n]=ta.value;styleTa(ta);cb.style.visibility=(s.size||ta.value)?'visible':'hidden';document.getElementById('err').textContent='';tally()};
b.appendChild(ta);d.appendChild(b);box.appendChild(d)});
tally()}
render();
document.getElementById('clearall').onclick=()=>{items.forEach(i=>{st[i.n].clear();nt[i.n]=''});document.getElementById('err').textContent='';render()};
document.getElementById('send').onclick=()=>{const ans=items.filter(i=>st[i.n].size||nt[i.n].trim());
if(!ans.length){document.getElementById('err').textContent='Pick an option or add a note first.';return}
const parts=ans.map(i=>{let x=i.n+': '+[...st[i.n]].join(', ').toLowerCase();const t=nt[i.n].trim();if(t)x+=(st[i.n].size?'. Note: ':'note: ')+t;return x});
const open=items.filter(i=>!st[i.n].size&&!nt[i.n].trim()).map(i=>i.n);
sendPrompt('My responses'+(DATA.test?' (test run, do not act)':'')+'. '+parts.join('. ')+'.'+(open.length?' Still open to talk about: '+open.join(', ')+'.':''))};

  }
  function plan(DATA, mount){
    if (typeof mount === 'string') mount = document.getElementById(mount);
    mount.className = 'rc-plan';
    mount.innerHTML = "<div class=\"wrap\" id=\"wrap\">\n<div class=\"wh\">\n<span id=\"pill\" style=\"font-size:12px;font-weight:500;padding:4px 12px;border-radius:999px;color:#fff\">The plan</span>\n<span id=\"scope\" style=\"font-size:15px;font-weight:500\"></span>\n<span id=\"from\" style=\"font-size:13px;color:var(--text-secondary)\"></span>\n</div>\n<div id=\"cards\"></div>\n<p id=\"foot\" style=\"font-size:13px;color:var(--text-secondary);margin:0 0 10px\"></p>\n<div style=\"display:flex;align-items:center;gap:12px;flex-wrap:wrap\">\n<span id=\"tally\" style=\"font-size:13px;color:var(--text-secondary);flex:1\"></span>\n<button id=\"send\">Confirm my choices \u2197</button>\n</div>\n</div>";

const T='#1D9E75',TT='rgba(29,158,117,0.10)',AM='#BA7517',AT='rgba(186,117,23,0.12)';
const HUE={research:'#378ADD',choice:'#BA7517',close:'#639922',reply:'#1D9E75',ask:'#D4537E',park:'#888780'};
function imp(el,p,v){el.style.setProperty(p,v,'important')}
function el(t,c,h){const e=document.createElement(t);if(c)e.className=c;if(h!==undefined)e.innerHTML=h;return e}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')}
function tint(h){const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return 'rgba('+r+','+g+','+b+',0.13)'}
const W=document.getElementById('wrap');imp(W,'background',TT);imp(W,'border','1.5px solid '+T);
document.getElementById('pill').style.background=T;
document.getElementById('scope').textContent=DATA.scope;
document.getElementById('from').textContent=DATA.test?'Test run · nothing will be done':'Nothing runs until you confirm';
const f=[];if(DATA.notInPlan&&DATA.notInPlan.length)f.push('Not in this plan: '+DATA.notInPlan.join(', ')+'.');if(DATA.receipt)f.push('Also on go: today\'s receipt in My Drive › PM › '+DATA.receipt+'.');
document.getElementById('foot').textContent=f.join(' ');
const items=DATA.items,N=items.length;
const ok={},lv={},nt={};items.forEach(i=>{ok[i.n]=true;lv[i.n]=false;nt[i.n]=''});
const box=document.getElementById('cards');
function tog(on,label,c,bg){const b=el('button');b.innerHTML='<i class="ti '+(on?'ti-circle-check':'ti-circle')+'" aria-hidden="true"></i>'+label;b.setAttribute('aria-pressed',on);b.style.fontSize='13px';b.style.display='inline-flex';b.style.alignItems='center';b.style.gap='6px';
if(on){imp(b,'border',c+' 2px solid');imp(b,'background',bg);imp(b,'color',c)}else{imp(b,'border','2px solid transparent');imp(b,'outline','0.5px solid var(--border-strong)');imp(b,'outline-offset','-2px')}return b}
function tally(){const k=items.filter(i=>ok[i.n]).length;const lt=items.filter(i=>i.live).length;const l=items.filter(i=>i.live&&ok[i.n]&&lv[i.n]).length;
document.getElementById('tally').textContent=k+' of '+N+' OK'+(lt?' · '+l+' of '+lt+' live changes approved':'')}
function render(){box.innerHTML='';
items.forEach(it=>{const hc=HUE[it.k]||HUE.choice;const d=el('div','c');if(!ok[it.n])d.style.opacity='0.55';
const band=el('div','band');imp(band,'border-left','4px solid '+hc);band.style.background=tint(hc);
const num=el('span','n',String(it.n));num.style.background=hc;band.appendChild(num);
const hd=el('div');hd.style.flex='1';hd.innerHTML='<p style="margin:0;font-size:16px;font-weight:500">'+esc(it.t)+'</p><p style="margin:2px 0 0;font-size:13px;color:var(--text-secondary)">'+esc(it.sum)+'</p>';band.appendChild(hd);
const b1=tog(ok[it.n],ok[it.n]?'OK':'Hold',T,'rgba(29,158,117,0.16)');b1.onclick=()=>{ok[it.n]=!ok[it.n];render()};band.appendChild(b1);
d.appendChild(band);
const b=el('div','body');
b.appendChild(el('p','lab','Doing now, on go'));const ul=el('ul','a');(it.a||[]).forEach(x=>ul.appendChild(el('li','',esc(x))));b.appendChild(ul);
if(it.draft){b.appendChild(el('p','lab','Draft, in your words'));b.appendChild(el('p','draft',esc(it.draft)))}
if(it.live){const L=el('div','live');L.style.background=AT;imp(L,'border','1px solid '+AM);
L.innerHTML='<div style="flex:1"><p style="margin:0;font-size:12px;font-weight:500;color:'+AM+'">Needs your OK · live change</p><p style="margin:2px 0 0;font-size:14px">'+esc(it.live)+'</p></div>';
const b2=tog(lv[it.n],lv[it.n]?'Approved':'Approve',AM,'rgba(186,117,23,0.18)');b2.onclick=()=>{lv[it.n]=!lv[it.n];render()};L.appendChild(b2);b.appendChild(L)}
const ta=el('textarea');ta.placeholder='Change anything for '+it.n+': type, paste or dictate';ta.value=nt[it.n];ta.setAttribute('aria-label','Notes for item '+it.n);
if(nt[it.n].trim())imp(ta,'border',T+' 2px solid');
ta.oninput=()=>{nt[it.n]=ta.value;if(ta.value.trim()){imp(ta,'border',T+' 2px solid')}else{ta.style.removeProperty('border')}};
b.appendChild(ta);d.appendChild(b);box.appendChild(d)});
tally()}
render();
document.getElementById('send').onclick=()=>{
const parts=items.map(i=>{let x=i.n+': '+(ok[i.n]?'OK':'hold');if(i.live&&ok[i.n])x+=lv[i.n]?', live change approved':', live change not approved';const t=nt[i.n].trim();if(t)x+='. Note: '+t;return x});
sendPrompt('Confirm my choices'+(DATA.test?' (test run, do not act)':'')+'. '+parts.join('. ')+'.')};

  }
  function done(DATA, mount){
    if (typeof mount === 'string') mount = document.getElementById(mount);
    mount.className = 'rc-done';
    mount.innerHTML = "<div id=\"wrap\" style=\"border-radius:16px;padding:1rem\">\n<div style=\"display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 12px\">\n<span id=\"pill\" style=\"font-size:12px;font-weight:500;padding:4px 12px;border-radius:999px;color:#fff\">Done</span>\n<span id=\"scope\" style=\"font-size:15px;font-weight:500\"></span>\n<span id=\"from\" style=\"font-size:13px;color:var(--text-secondary)\"></span>\n</div>\n<div id=\"rows\"></div>\n<p id=\"foot\" style=\"font-size:13px;color:var(--text-secondary);margin:10px 0 0\"></p>\n</div>";

const G='#888780';
const HUE={research:'#378ADD',choice:'#BA7517',close:'#639922',reply:'#1D9E75',ask:'#D4537E',park:'#888780'};
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')}
const W=document.getElementById('wrap');W.style.setProperty('background','rgba(136,135,128,0.10)','important');W.style.setProperty('border','1.5px solid '+G,'important');
document.getElementById('pill').style.background=G;
document.getElementById('scope').textContent=DATA.scope;
document.getElementById('from').textContent=DATA.test?'Simulated · test run, nothing changed':'';
document.getElementById('foot').textContent=(DATA.receipt?'Receipt: My Drive › PM › '+DATA.receipt+'. ':'')+'Your Home drops what closed on its next refresh.';
const box=document.getElementById('rows');
DATA.rows.forEach(x=>{const hc=HUE[x.k]||G;const r=document.createElement('div');
r.style.cssText='display:flex;gap:12px;align-items:flex-start;background:var(--surface-2);border:0.5px solid var(--border);border-radius:12px;padding:.7rem 1rem;margin:0 0 8px';
r.innerHTML='<span style="width:26px;height:26px;border-radius:50%;background:'+hc+';color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:500;flex:none">'+x.n+'</span><div style="flex:1"><p style="margin:0;font-size:15px;font-weight:500"><i class="ti '+(x.ic||'ti-check')+'" aria-hidden="true" style="color:'+hc+';margin-right:6px"></i>'+esc(x.s)+'</p><p style="margin:2px 0 0;font-size:13px;color:var(--text-secondary)">'+esc(x.d)+(x.link?' <a href="'+x.link+'" target="_blank">Open</a>':'')+'</p></div>';
box.appendChild(r)});

  }
  window.RootsCards = { version: '1.0.0', answers: answers, plan: plan, done: done };
})();
