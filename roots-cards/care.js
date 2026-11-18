(function(){
  var KIT = '1.0.0';
  if (window.RC && window.RC.kit === KIT) return;
  function pad(n){ return (n < 10 ? '0' : '') + n; }
  function now(){ var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function same(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
  var RC = { kit: KIT, contract: 1 };

  RC.esc = function(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  RC.cardId = function(D, card){
    if (!D.cardId) D.cardId = card + '-' + Math.random().toString(36).slice(2, 7);
    return D.cardId;
  };

  RC.st = function(ref, type, value, o){
    o = o || {};
    var s = { ref: ref, type: type };
    if (o.label) s.label = o.label;
    var changed = ('drawn' in o) ? !same(value, o.drawn) : undefined;
    if (!(type === 'text' && changed === false)) s.value = value;
    if (changed !== undefined) s.changed = changed;
    if (o.note) s.note = o.note;
    if (o.live !== undefined) s.live = !!o.live;
    return s;
  };

  RC.held = function(D, ref){
    var h = D && D.held;
    if (!h || !h.length) return undefined;
    for (var i = 0; i < h.length; i++) if (h[i].ref === ref) return h[i];
    return undefined;
  };

  RC.receipt = function(line, r){
    var j = { card: r.card, v: 1, id: r.id, action: r.action };
    if (r.replaces) j.replaces = r.replaces;
    if (r.test) j.test = true;
    j.at = now();
    if (r.meta) j.meta = r.meta;
    if (r.target) j.target = r.target;
    if (r.question) j.question = r.question;
    j.state = r.state || [];
    return line + '\n<<<CARD ' + JSON.stringify(j) + ' CARD>>>';
  };

  RC.send = function(line, r){
    var t = RC.receipt(line, r);
    if (typeof window.sendPrompt === 'function') window.sendPrompt(t);
    else if (typeof sendPrompt === 'function') sendPrompt(t);
    RC.last = t;
    return t;
  };

  RC.base = function(D, card, meta){
    return { card: card, id: RC.cardId(D, card), replaces: D.replaces || undefined, test: !!D.test, meta: meta };
  };

  RC.footer = function(mount, o){
    if (typeof mount === 'string') mount = document.getElementById(mount);
    var f = document.createElement('div');
    f.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:14px 0 0;padding:10px 0 0;border-top:0.5px solid var(--border)';
    var q = document.createElement('input');
    q.type = 'text';
    q.placeholder = o.placeholder || 'Ask about this card';
    q.setAttribute('aria-label', 'Your question about this card');
    q.style.cssText = 'flex:1 1 220px;min-height:36px;font-size:13px';
    var ask = document.createElement('button');
    ask.textContent = 'Ask about this ↗';
    ask.style.cssText = 'min-height:36px;font-size:13px;padding:0 12px';
    var hold = document.createElement('button');
    hold.textContent = 'Save for later ↗';
    hold.style.cssText = 'min-height:36px;font-size:13px;padding:0 12px';
    var err = document.createElement('p');
    err.style.cssText = 'flex-basis:100%;margin:0;font-size:13px;color:var(--text-danger);min-height:0';
    ask.onclick = function(){
      var v = q.value.trim();
      if (!v) { err.textContent = 'Type your question first.'; q.focus(); return; }
      var r = o.base(); r.action = 'ask'; r.question = v; r.state = o.state();
      RC.send(o.askLine + ': ' + v, r);
    };
    q.oninput = function(){ err.textContent = ''; };
    q.onkeydown = function(e){ if (e.key === 'Enter') ask.onclick(); };
    hold.onclick = function(){
      var r = o.base(); r.action = 'hold'; r.state = o.state();
      RC.send(o.holdLine, r);
    };
    f.append(q, ask, hold, err);
    mount.appendChild(f);
    return f;
  };

  window.RC = RC;
})();

(function(){
  var CSS = ".rc-draft .dc{border-radius:16px;padding:1rem;margin:0}\n.rc-draft .dh{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 10px}\n.rc-draft .pill{font-size:12px;font-weight:500;padding:4px 12px;border-radius:999px;color:#fff}\n.rc-draft .who{font-size:16px;font-weight:500}\n.rc-draft .meta{font-size:13px;color:var(--text-secondary)}\n.rc-draft .card{background:var(--surface-2);border:0.5px solid var(--border);border-radius:12px;padding:1rem 1.1rem}\n.rc-draft .ask{font-size:14px;line-height:1.55;margin:0}\n.rc-draft .links{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 0}\n.rc-draft .links a{display:inline-flex;align-items:center;gap:4px;font-size:13px;padding:6px 10px;border:0.5px solid var(--border-strong);border-radius:999px;text-decoration:none;color:var(--text-primary);min-height:32px}\n.rc-draft details.about{margin:12px 0 0;border-top:0.5px solid var(--border);padding-top:10px}\n.rc-draft details.about summary{cursor:pointer;font-size:13px;color:var(--text-secondary);min-height:28px;display:flex;align-items:center;gap:6px}\n.rc-draft details.about ul{margin:8px 0 0;padding-left:1.2rem;font-size:13px;line-height:1.6;color:var(--text-secondary)}\n.rc-draft .lab{font-size:12px;color:var(--text-muted);margin:14px 0 4px}\n.rc-draft .read{font-size:14px;line-height:1.6;white-space:pre-wrap;margin:0;padding:12px 14px;background:var(--surface-1);border-radius:8px}\n.rc-draft .checks{margin:12px 0 0;padding:10px 12px;border-radius:8px;background:var(--bg-warning)}\n.rc-draft .checks p{margin:0 0 4px;font-size:12px;font-weight:500;color:var(--text-warning)}\n.rc-draft .checks ul{margin:0;padding-left:1.2rem;font-size:13px;line-height:1.55;color:var(--text-warning)}\n.rc-draft .dc textarea{display:block;width:100%;box-sizing:border-box;font-size:14px;line-height:1.55;resize:vertical}\n.rc-draft #ed{min-height:320px}\n.rc-draft #why{min-height:56px}\n.rc-draft .hint{font-size:12px;color:var(--text-muted);margin:4px 0 0}\n.rc-draft .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:14px 0 0}\n.rc-draft .row button{min-height:44px;font-size:14px;padding:0 16px}\n.rc-draft .err{font-size:13px;color:var(--text-danger);margin:6px 0 0;min-height:1em}\n.rc-draft .callouts{margin:12px 0 0;padding:10px 12px;border-radius:8px;background:var(--surface-1);border:0.5px solid var(--border)}\n.rc-draft .callouts>p{margin:0 0 6px;font-size:12px;font-weight:500;color:var(--text-secondary)}\n.rc-draft .co{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:6px 0;border-top:0.5px solid var(--border)}\n.rc-draft .co:first-of-type{border-top:0}\n.rc-draft .co span{flex:1 1 220px;font-size:13px;line-height:1.5}\n.rc-draft .co button{min-height:36px;font-size:13px;padding:0 12px}\n.rc-draft .co button[aria-pressed=\"true\"]{border-color:var(--text-primary);font-weight:500}\n.rc-draft .kinds{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 0}\n.rc-draft .kinds button{min-height:36px;font-size:13px;padding:0 12px;border-radius:999px}\n.rc-draft .kinds button[aria-pressed=\"true\"]{border-color:var(--text-primary);font-weight:500}\n.rc-draft .ex{display:inline-flex;align-items:center;gap:6px;font-size:13px;min-height:44px}\n.rc-draft .stamp{font-size:11px;color:var(--text-muted);margin:10px 0 0}\n.rc-tune .tc{border-radius:16px;padding:1rem;margin:0}\n.rc-tune .th{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 4px}\n.rc-tune .pill{font-size:12px;font-weight:500;padding:4px 12px;border-radius:999px;color:#fff}\n.rc-tune .meta{font-size:13px;color:var(--text-secondary)}\n.rc-tune .lead{font-size:14px;line-height:1.5;margin:6px 0 0}\n.rc-tune .card{background:var(--surface-2);border:0.5px solid var(--border);border-radius:12px;padding:1rem 1.1rem;margin:12px 0 0}\n.rc-tune .card h3{font-size:16px;font-weight:500;margin:0 0 2px}\n.rc-tune .tag{font-size:12px;color:var(--text-muted);margin:0 0 6px}\n.rc-tune .why{font-size:13px;line-height:1.5;color:var(--text-secondary);margin:0 0 10px}\n.rc-tune .tw{overflow-x:auto}\n.rc-tune table{border-collapse:collapse;width:100%;font-size:13px;line-height:1.5}\n.rc-tune th,.rc-tune td{border-top:0.5px solid var(--border);padding:8px;vertical-align:top;text-align:left}\n.rc-tune th{font-weight:500;color:var(--text-muted)}\n.rc-tune td.w{background:var(--surface-1)}\n.rc-tune .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:12px 0 0}\n.rc-tune .row button{min-height:44px;font-size:14px;padding:0 16px}\n.rc-tune .row button[aria-pressed=\"true\"]{border-color:var(--text-primary);font-weight:500}\n.rc-tune .tc textarea[hidden]{display:none!important}\n.rc-tune .tc textarea{display:block;width:100%;box-sizing:border-box;font-size:14px;line-height:1.5;min-height:56px;margin:8px 0 0;resize:vertical}\n.rc-tune .send{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:14px 0 0}\n.rc-tune .send button{min-height:44px;font-size:14px;padding:0 16px}\n.rc-tune .left{font-size:13px;color:var(--text-secondary)}\n.rc-tune .foot{font-size:12px;color:var(--text-muted);margin:10px 0 0}";
  if (!document.getElementById('rc-style-care')) { var st = document.createElement('style'); st.id = 'rc-style-care'; st.textContent = CSS; document.head.appendChild(st); }
  function draft(D, mount){
    if (typeof mount === 'string') mount = document.getElementById(mount);
    mount.className = 'rc-draft';
    mount.innerHTML = "<div class=\"dc\" id=\"dc\">\n  <div class=\"dh\">\n    <span class=\"pill\" id=\"pill\">Your draft</span>\n    <span class=\"who\" id=\"who\"></span>\n    <span class=\"meta\" id=\"meta\"></span>\n  </div>\n  <div class=\"card\">\n    <p class=\"ask\" id=\"ask\"></p>\n    <div class=\"links\" id=\"links\"></div>\n    <details class=\"about\" id=\"aboutbox\"><summary><i class=\"ti ti-user\" aria-hidden=\"true\"></i><span id=\"aboutsum\">About the customer</span></summary><ul id=\"about\"></ul></details>\n    <div id=\"view\">\n      <p class=\"lab\" id=\"readlab\">The draft</p>\n      <p class=\"read\" id=\"read\"></p>\n      <div class=\"callouts\" id=\"cobox\"><p>Callouts: your call</p><div id=\"cos\"></div></div>\n      <div class=\"checks\" id=\"checksbox\"><p>Check before sending</p><ul id=\"checks\"></ul></div>\n      <div class=\"row\">\n        <button id=\"edit\"><i class=\"ti ti-edit\" aria-hidden=\"true\"></i> Make it editable</button>\n        <button id=\"ok\">Accept as is \u2197</button>\n        <label class=\"ex\"><input type=\"checkbox\" id=\"asex\"> Use as an example</label>\n        <button id=\"none\">No reply needed \u2197</button>\n      </div>\n    </div>\n    <div id=\"editbox\" hidden>\n      <p class=\"lab\"><label for=\"ed\">Your version</label></p>\n      <textarea id=\"ed\"></textarea>\n      <p class=\"hint\">Keep the {{\u2026}} parts as they are: Care fills them in.</p>\n      <p class=\"lab\">What kind of edit? (optional, one tap)</p>\n      <div class=\"kinds\" id=\"kinds\"></div>\n      <p class=\"lab\"><label for=\"why\">Why (optional, one line helps us learn)</label></p>\n      <textarea id=\"why\" placeholder=\"Too formal, we always ask for the lot number first, \u2026\"></textarea>\n      <div class=\"row\">\n        <button id=\"accept\">Accept my edits \u2197</button>\n        <button id=\"cancel\">Cancel</button>\n      </div>\n    </div>\n    <p class=\"err\" id=\"err\"></p>\n    <div id=\"dc-foot\"></div>\n    <p class=\"stamp\" id=\"stamp\"></p>\n  </div>\n</div>";

const C='#1D9E75',T='rgba(29,158,117,0.10)';
function imp(e,p,v){e.style.setProperty(p,v,'important')}
function $(i){return document.getElementById(i)}
const W=$('dc');imp(W,'background',T);imp(W,'border','1.5px solid '+C);
$('pill').style.background=C;
$('who').textContent=D.first+(D.order?' · '+D.order:'');
$('meta').textContent=[D.kind,D.test?'test run':''].filter(Boolean).join(' · ');
$('ask').textContent=D.ask||'';
(D.links||[]).forEach(([l,h])=>{const a=document.createElement('a');a.href=h;a.target='_blank';a.rel='noopener';a.innerHTML='<i class="ti ti-external-link" aria-hidden="true"></i>';a.append(' '+l);$('links').appendChild(a)});
if(!(D.links||[]).length)$('links').remove();
if((D.about||[]).length){$('aboutsum').textContent='About '+D.first;D.about.forEach(t=>{const li=document.createElement('li');li.textContent=t;$('about').appendChild(li)})}else $('aboutbox').remove();
const CO={},COB={};
const tail=' (care '+D.care+')'+(D.test?' Test run, do not act.':'');
const meta={care:D.care,draft:D.draft||'',kind:D.kind,voice:D.voice,skill:D.skill};
const base=()=>RC.base(D,'care.draft',meta);
function coState(){return (D.callouts||[]).map((t,i)=>RC.st('callout.'+(i+1),'choice',CO[i],{label:t}))}
function exState(){return RC.st('use_as_example','toggle',$('asex').checked)}
function editState(){return [RC.st('text','text',ed.value.trim(),{drawn:D.text.trim()}),RC.st('kind_of_edit','choice',kind),RC.st('why','text',why.value.trim())]}
function setCo(i,v){CO[i]=v;const b=COB[i];if(!b)return;b[0].setAttribute('aria-pressed',v==='put in'?'true':'false');b[1].setAttribute('aria-pressed',v==='put in'?'false':'true')}
if((D.callouts||[]).length){D.callouts.forEach((t,i)=>{CO[i]='left out';const r=document.createElement('div');r.className='co';const sp=document.createElement('span');sp.textContent=t;const pin=document.createElement('button');pin.textContent='Put it in ↗';const lo=document.createElement('button');lo.textContent='Leave it out';lo.setAttribute('aria-pressed','true');COB[i]=[pin,lo];
pin.onclick=()=>{if(!$('editbox').hidden){setCo(i,'put in');return}const s=coState();s[i]=RC.st('callout.'+(i+1),'choice','put in',{label:t});const r=base();r.action='callout_in';r.target='callout.'+(i+1);r.state=s;RC.send('Put this callout in the care draft'+tail,r)};
lo.onclick=()=>setCo(i,'left out');r.append(sp,pin,lo);$('cos').appendChild(r)})}else $('cobox').remove();
if((D.checks||[]).length){D.checks.forEach(t=>{const li=document.createElement('li');li.textContent=t;$('checks').appendChild(li)})}else $('checksbox').remove();
$('readlab').textContent=D.draft?'The draft, saved in Gmail (not sent)':'The draft (not saved yet: Accept saves it to Gmail)';
$('read').textContent=D.text;
const ed=$('ed'),why=$('why'),err=$('err');
const st=D.stamp||{};$('stamp').textContent=['rules '+(st.rules||'?'),'prime '+(st.prime||'?'),'prep '+(st.prep||'?'),'writer '+(st.writer||'?'),'skill '+D.skill].join(' · ');
const cob=$('cobox'),coHome=cob&&cob.nextSibling;
function openEdit(v){ed.value=v;if(cob)$('editbox').insertBefore(cob,$('kinds').previousElementSibling);$('view').hidden=true;$('editbox').hidden=false}
$('edit').onclick=()=>{openEdit(D.text);ed.focus()};
$('cancel').onclick=()=>{if(cob)$('view').insertBefore(cob,coHome);$('editbox').hidden=true;$('view').hidden=false;err.textContent=''};
const KINDS=['Wrong or missing facts','Missed something they asked',"Not how I'd say it",'Too long'];let kind='';
function setKind(k){kind=k;[...$('kinds').children].forEach(x=>x.setAttribute('aria-pressed',x.textContent===kind?'true':'false'))}
KINDS.forEach(k=>{const b=document.createElement('button');b.textContent=k;b.setAttribute('aria-pressed','false');b.onclick=()=>setKind(kind===k?'':k);$('kinds').appendChild(b)});
$('ok').onclick=()=>{const r=base();r.action='accept';r.state=[RC.st('text','text',D.text.trim(),{drawn:D.text.trim()})].concat(coState(),[exState()]);RC.send('Accept the care draft as is'+tail,r)};
$('none').onclick=()=>{const r=base();r.action='no_reply';r.state=coState();RC.send('No reply needed for this care email'+tail,r)};
$('accept').onclick=()=>{
  const v=ed.value.trim();
  if(!v){err.textContent='The reply is empty. Cancel to keep the draft as it is.';return}
  const r=base();
  if(v===D.text.trim()){r.action='accept';r.state=[RC.st('text','text',v,{drawn:D.text.trim()})].concat(coState(),[exState()]);RC.send('Accept the care draft as is'+tail,r);return}
  r.action='accept_edits';r.state=editState().concat(coState());RC.send('Accept the care draft with my edits'+tail,r);
};
ed.oninput=()=>{err.textContent=''};
const H=k=>RC.held(D,k);
(D.callouts||[]).forEach((t,i)=>{const h=H('callout.'+(i+1));if(h&&h.value)setCo(i,h.value)});
if(H('use_as_example'))$('asex').checked=!!H('use_as_example').value;
if(H('text')&&H('text').changed){openEdit(H('text').value);if(H('kind_of_edit'))setKind(H('kind_of_edit').value||'');if(H('why'))why.value=H('why').value||''}
RC.footer('dc-foot',{base:base,holdLine:'Save the care draft for later'+tail,askLine:'Question about the care draft (care '+D.care+(D.test?', test run':'')+')',
  state:()=>($('editbox').hidden?[]:editState()).concat(coState(),[exState()])});

  }
  function tune(D, mount){
    if (typeof mount === 'string') mount = document.getElementById(mount);
    mount.className = 'rc-tune';
    mount.innerHTML = "<div class=\"tc\" id=\"tc\">\n  <div class=\"th\"><span class=\"pill\" id=\"pill\">Tune</span><span class=\"meta\" id=\"meta\"></span></div>\n  <p class=\"lead\" id=\"lead\"></p>\n  <div id=\"props\"></div>\n  <div class=\"send\"><button id=\"go\">Send my choices \u2197</button><span class=\"left\" id=\"left\"></span></div>\n  <p class=\"foot\" id=\"foot\"></p>\n  <div id=\"tc-foot\"></div>\n</div>";

const C='#1D9E75',T='rgba(29,158,117,0.10)';
function $(i){return document.getElementById(i)}
const W=$('tc');W.style.setProperty('background',T,'important');W.style.setProperty('border','1.5px solid '+C,'important');
$('pill').style.background=C;
const P=D.proposals||[];
$('meta').textContent=[P.length+' to look at',D.test?'test run':''].filter(Boolean).join(' · ');
$('lead').textContent=D.edits+' edits'+(D.since?' since '+D.since:'')+'. '+(P.length===1?"One thing you keep changing the same way.":P.length+" things you keep changing the same way.")+' Keep what sounds like you; your next drafts use it.';
const CH=P.map(()=>'');const box=[],BTN=[];
const kindName=k=>({all:'every kind of email',shipping:'shipping',damaged:'damaged',order_changes:'order changes',usage:'usage',guidance_safety:'guidance and safety',discontent_refunds:'discontent and refunds',marketing_reply:'marketing replies',trade:'trade',other:'other'}[k]||k);
const typeName=t=>({opening:'An opening',habit:'A habit',stop:'A line to stop writing',example:'An example'}[t]||t);
function cell(tr,txt,cls){const td=document.createElement('td');if(cls)td.className=cls;td.textContent=txt||'';tr.appendChild(td)}
P.forEach((p,i)=>{
  const c=document.createElement('div');c.className='card';
  const h=document.createElement('h3');h.textContent=(i+1)+'. '+p.title;
  const tg=document.createElement('p');tg.className='tag';tg.textContent=typeName(p.type)+', for '+kindName(p.kind);
  const why=document.createElement('p');why.className='why';why.textContent=p.why||'';
  c.append(h,tg,why);
  if((p.rows||[]).length){
    const tw=document.createElement('div');tw.className='tw';const tb=document.createElement('table');
    const hr=document.createElement('tr');['Email','The draft','With the change','What you sent'].forEach(x=>{const th=document.createElement('th');th.textContent=x;hr.appendChild(th)});tb.appendChild(hr);
    p.rows.forEach(r=>{const tr=document.createElement('tr');cell(tr,r.who);cell(tr,r.draft);cell(tr,r.change,'w');cell(tr,r.sent);tb.appendChild(tr)});
    tw.appendChild(tb);c.appendChild(tw);
  }
  const row=document.createElement('div');row.className='row';
  const ta=document.createElement('textarea');ta.placeholder='Say it your way';ta.hidden=true;ta.setAttribute('aria-label','Your wording for '+p.title);
  const bs=[['keep','Keep'],['drop','Drop'],['change','Change it']].map(([v,l])=>{const b=document.createElement('button');b.textContent=l;b.dataset.v=v;b.setAttribute('aria-pressed','false');b.onclick=()=>{CH[i]=v;bs.forEach(x=>x.setAttribute('aria-pressed',x===b?'true':'false'));ta.hidden=v!=='change';if(v==='change')ta.focus();upd()};row.appendChild(b);return b});
  ta.oninput=upd;box[i]=ta;BTN[i]=bs;
  c.append(row,ta);$('props').appendChild(c);
});
function upd(){const n=CH.filter((v,i)=>v&&(v!=='change'||box[i].value.trim())).length;$('left').textContent=n===P.length?'':(P.length-n)+' still to choose';}
upd();
$('foot').textContent=D.routed?D.routed+' other things you changed were about offers or health and legal wording; they went to Brandon and Haley, not here.':'';
const tail=D.test?' (test run, do not act)':'';
const base=()=>RC.base(D,'care.tune',{edits:D.edits,since:D.since||''});
function state(){return P.map((p,i)=>RC.st('proposal.'+(i+1),'choice',CH[i]||'',{label:p.title,note:CH[i]==='change'?box[i].value.trim():''}))}
const today=new Date().toLocaleDateString('en-CA');
$('go').onclick=()=>{
  if(!CH.some((v,i)=>v&&(v!=='change'||box[i].value.trim()))){$('left').textContent='Pick Keep, Drop or Change it first.';return}
  const r=base();r.action='choices';r.state=state();RC.send('Tune choices ('+today+')'+tail,r);
};
P.forEach((p,i)=>{const h=RC.held(D,'proposal.'+(i+1));if(!h||!h.value)return;CH[i]=h.value;const bt=BTN[i].find(b=>b.dataset.v===h.value);BTN[i].forEach(b=>b.setAttribute('aria-pressed',b===bt?'true':'false'));if(h.value==='change'){box[i].hidden=false;box[i].value=h.note||''}});
upd();
RC.footer('tc-foot',{base:base,holdLine:'Save my Tune choices for later'+tail,askLine:'Question about Tune'+(D.test?' (test run)':''),state:state});

  }
  window.RootsCards = Object.assign(window.RootsCards || {}, { kit: '1.0.0', draft: draft, tune: tune });
})();
