/* Azershal Japanese — engine. SRS (SM-2), routing, views, persistence. */
const D = window.DATA;
const STORE_KEY = "azjp_state_v1";

// ---------- STATE ----------
let state = load();

function load(){
  try{ const s = JSON.parse(localStorage.getItem(STORE_KEY)); if(s) return migrate(s); }catch(e){}
  return fresh();
}
function fresh(){
  return {
    cards:{},            // id -> {due, interval, ease, reps, lapses, last}
    studied: [],         // ISO dates studied (for streak)
    weekDone: {},        // week number -> bool
    quizScores: [],      // {date, deck, score, total}
    newPerDay: 10,
    createdAt: todayISO()
  };
}
function migrate(s){ if(!s.cards) s.cards={}; if(!s.studied) s.studied=[]; if(!s.weekDone) s.weekDone={}; if(!s.quizScores) s.quizScores=[]; if(!s.newPerDay) s.newPerDay=10; return s; }
function save(){ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

// ---------- TIME HELPERS (deterministic; no Date.now in workflows but fine here) ----------
function todayISO(){ const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function dayIndex(iso){ return Math.floor((new Date(iso+"T00:00:00")).getTime()/86400000); }
function todayIndex(){ return dayIndex(todayISO()); }

// ---------- DECKS (unified card ids) ----------
// id scheme: v:<idx> vocab, k:<idx> keigo trio, p:<bank>:<idx> phrase, g:<idx> grammar
function allCards(){
  const list=[];
  D.VOCAB.forEach((c,i)=>list.push({id:"v:"+i,type:"vocab",...c}));
  D.KEIGO_TRIO.forEach((c,i)=>list.push({id:"k:"+i,type:"keigo",...c}));
  ["email","meeting","phone","meishi"].forEach(b=>D.PHRASES[b].forEach((c,i)=>list.push({id:"p:"+b+":"+i,type:"phrase",bank:b,...c})));
  return list;
}
function cardById(id){ return allCards().find(c=>c.id===id); }

// ---------- SRS (SM-2 variant) ----------
function srsState(id){ return state.cards[id] || {due:0, interval:0, ease:2.5, reps:0, lapses:0, last:0}; }
function isDue(id){ const c=srsState(id); if(c.reps===0) return true; return c.due <= todayIndex(); }
function dueCount(){ return allCards().filter(c=>isDue(c.id)).length; }
function knownCount(){ return allCards().filter(c=>{const s=srsState(c.id); return s.reps>=2 && s.interval>=1;}).length; }
function newCountToday(){
  // count new (reps===0) cards studied today vs newPerDay limit
  const t=todayISO(); let n=0;
  for(const id in state.cards){ if(state.cards[id].last===todayIndex() && state.cards[id].reps===1 && state.cards[id].interval===0) n++; }
  return Math.max(0, state.newPerDay - n);
}

function grade(id, q){ // q: 0 again,1 hard,2 good,3 easy
  let c = {...srsState(id)};
  const easeMin=1.3;
  if(q===0){ c.lapses++; c.reps=0; c.interval=0; c.due=todayIndex()+1; }
  else {
    if(q===1){ c.ease=Math.max(easeMin,c.ease-0.15); c.interval = c.reps===0?1:Math.round(c.interval*1.2)||1; }
    else if(q===2){ c.interval = c.reps===0?1: c.reps===1?3:Math.round(c.interval*c.ease); }
    else { c.ease=c.ease+0.15; c.interval = c.reps===0?2: c.reps===1?5:Math.round(c.interval*c.ease*1.3); }
    c.reps++;
  }
  c.last=todayIndex();
  c.due = (q===0?c.due: todayIndex()+c.interval);
  state.cards[id]=c;
  // streak
  const t=todayISO();
  if(!state.studied.includes(t)) state.studied.push(t);
  save();
  return c;
}

function currentStreak(){
  if(!state.studied.length) return 0;
  const set=new Set(state.studied); let n=0; let i=todayIndex();
  if(!set.has(todayISO())) i--; // streak counts back from today or yesterday
  while(set.has(isoFromIndex(i))){ n++; i--; } return n;
}
function isoFromIndex(i){ const d=new Date(i*86400000); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }

// ---------- ROUTER ----------
const routes={};
function go(route){ document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.route===route)); render(route); }
function render(route){ const el=document.getElementById("content"); el.scrollTop=0; el.innerHTML = (routes[route]||routes.dashboard)(); hook(route); refreshBadges(); }

function refreshBadges(){
  const d=dueCount(); const b=document.getElementById("dueBadge"); b.textContent=d; b.classList.toggle("zero",d===0);
  document.getElementById("streakNum").textContent=currentStreak();
  document.getElementById("knownNum").textContent=knownCount();
  document.getElementById("totalNum").textContent=allCards().length;
}

document.addEventListener("DOMContentLoaded",()=>{
  document.querySelectorAll(".nav-btn").forEach(b=>b.addEventListener("click",()=>go(b.dataset.route)));
  go("dashboard");
});

// ---------- VIEW: DASHBOARD ----------
routes.dashboard = ()=> {
  const due=dueCount(); const known=knownCount(); const total=allCards().length;
  const streak=currentStreak();
  const wk = currentWeek();
  const cur = D.CURRICULUM.find(c=>c.w===wk) || D.CURRICULUM[0];
  const wod = wordOfDay();
  const pct = total? Math.round(known/total*100):0;
  return `
  <h1>こんにちは 👋</h1>
  <p class="sub">6-month roadmap to <b>business Japanese fluency</b>. Do this daily: <b>SRS review → 10 new cards → 1 grammar point → 10 min shadowing</b>.</p>
  <div class="grid cols-3">
    <div class="stat"><div class="num ${due>0?'bad':'good'}">${due}</div><div class="lbl">Cards due now</div></div>
    <div class="stat"><div class="num">${streak}🔥</div><div class="lbl">Day streak</div></div>
    <div class="stat"><div class="num good">${pct}%</div><div class="lbl">Known (${known}/${total})</div></div>
  </div>
  <h2>📅 This week — Week ${cur.w}: ${cur.title}</h2>
  <div class="card">
    <div class="sub" style="margin:0 0 10px">Phase: <b>${cur.phase}</b> · Goal: ${cur.goal}</div>
    <div class="progress-bar"><div style="width:${weekProgress(cur.w)}%"></div></div>
    <ul style="margin:14px 0 0 18px;font-size:14px;line-height:1.9">
      ${cur.tasks.map(t=>`<li>${t}</li>`).join("")}
    </ul>
    <div class="btn-row">
      <button class="btn" onclick="go('review')">Review ${due} due →</button>
      <button class="btn sec" onclick="go('curriculum')">Full roadmap</button>
    </div>
  </div>
  <h2>⭐ Word of the Day</h2>
  <div class="card">
    <div style="font-size:30px;font-weight:700">${wod.jp}</div>
    <div class="flash-reading">${wod.reading}</div>
    <div style="font-size:18px;margin-top:8px">${wod.en}</div>
    <div class="hint">💡 ${wod.why}</div>
  </div>
  <h2>🎯 Daily routine (≈60–90 min)</h2>
  <div class="card">
    <table>
      <tr><th>Time</th><th>Task</th><th>Tab</th></tr>
      <tr><td>15 min</td><td>SRS review (all due cards)</td><td>🔁 Review</td></tr>
      <tr><td>15 min</td><td>Learn 10 new cards</td><td>🎴 Flashcards</td></tr>
      <tr><td>10 min</td><td>1 grammar point + examples</td><td>📐 Grammar</td></tr>
      <tr><td>10 min</td><td>Keigo drill (verb trios)</td><td>🙇 Keigo</td></tr>
      <tr><td>10 min</td><td>Shadowing (repeat audio aloud)</td><td>— (external)</td></tr>
      <tr><td>5 min</td><td>Word of day + 1 phrase</td><td>⭐ Word / Grammar</td></tr>
    </table>
  </div>`;
};

function currentWeek(){
  const start = dayIndex(state.createdAt);
  const elapsed = Math.floor((todayIndex()-start)/7)+1;
  return Math.min(26, Math.max(1, elapsed));
}
function weekProgress(w){ const done=state.weekDone[w]; return done?100:0; }

function wordOfDay(){
  const i = todayIndex() % D.WORD_POOL.length;
  return D.WORD_POOL[i];
}

// ---------- VIEW: CURRICULUM ----------
routes.curriculum = ()=> `
  <h1>📅 26-Week Roadmap</h1>
  <p class="sub">6 months · 4 phases. Check off weeks as you complete them. Goal: business conversational fluency (~N3 + keigo).</p>
  <div class="card" style="padding:14px 18px">
    <b>Phases:</b> 基礎 (W1-4) → 核心 (W5-12) → ビジネス (W13-20) → 応用 (W21-26)
  </div>
  ${D.CURRICULUM.map(c=>{
    const done=state.weekDone[c.w];
    return `<div class="week ${done?'done':''}" id="wk-${c.w}">
      <div class="wk-title"><span class="chk" onclick="toggleWeek(${c.w})">${done?'✅':'⬜'}</span> Week ${c.w}: ${c.title} <span>${c.phase}</span></div>
      <div class="wk-body"><b>Goal:</b> ${c.goal}</div>
      <div class="wk-body"><b>Tasks:</b> ${c.tasks.join(" · ")}</div>
    </div>`;
  }).join("")}
`;

function toggleWeek(w){ state.weekDone[w]=!state.weekDone[w]; save(); go("curriculum"); }

// ---------- VIEW: REVIEW (SRS) ----------
let reviewQueue=[];
let reviewIdx=0;
routes.review = ()=>{
  reviewQueue = allCards().filter(c=>isDue(c.id));
  reviewIdx=0;
  if(!reviewQueue.length) return `<h1>🔁 Review</h1><div class="empty">✅ All caught up! No cards due.<br><br><button class="btn" onclick="go('flashcards')">Learn new cards →</button></div>`;
  return `<h1>🔁 Review</h1><p class="sub">${reviewQueue.length} cards due. Grade honestly: how hard was it to recall?</p>
  <div class="flashcard-counter" id="rc">1 / ${reviewQueue.length}</div>
  <div id="rCard"></div>`;
};
function hook_review(){ showReviewCard(); }
function showReviewCard(){
  if(reviewIdx>=reviewQueue.length){ render("review"); return; }
  const c=reviewQueue[reviewIdx];
  document.getElementById("rc").textContent=(reviewIdx+1)+" / "+reviewQueue.length;
  document.getElementById("rCard").innerHTML = cardHTML(c,true);
}
function flip(cardEl){ const a=cardEl.querySelector(".flash-a"); const q=cardEl.querySelector(".flash-q"); a.classList.add("show"); if(q) q.style.opacity="0.5"; document.querySelectorAll(".grade-btn").forEach(b=>b.disabled=false); }
function answer(id,q){ grade(id,q); reviewIdx++; showReviewCard(); refreshBadges(); }

// ---------- VIEW: FLASHCARDS (browse + learn new) ----------
let fcFilter="all";
let fcQueue=[];
let fcIdx=0;
routes.flashcards = ()=>{
  const cats=["all","meeting","office","finance","email","general","keigo","phrase"];
  return `
  <h1>🎴 Flashcards</h1>
  <p class="sub">Browse & learn. ${allCards().length} cards total. Use Review tab for SRS due cards.</p>
  <div class="filter-row" id="fcFilters">
    ${cats.map(c=>`<div class="chip ${fcFilter===c?'active':''}" data-cat="${c}">${c}</div>`).join("")}
  </div>
  <div id="fcBox"></div>`;
};
function hook_flashcards(){
  document.querySelectorAll("#fcFilters .chip").forEach(ch=>ch.addEventListener("click",()=>{
    fcFilter=ch.dataset.cat; document.querySelectorAll("#fcFilters .chip").forEach(x=>x.classList.toggle("active",x===ch)); buildFcQueue();
  }));
  buildFcQueue();
}
function buildFcQueue(){
  let list=allCards();
  if(fcFilter!=="all") list=list.filter(c=> c.type===fcFilter || c.cat===fcFilter);
  // new (unseen) cards first, then due, then the rest
  list=list.sort((a,b)=>{ const sa=srsState(a.id),sb=srsState(b.id); const na=sa.reps===0?0:1, nb=sb.reps===0?0:1; return na-nb; });
  fcQueue=list; fcIdx=0; showFc();
}
function showFc(){
  const box=document.getElementById("fcBox");
  if(!fcQueue.length){ box.innerHTML=`<div class="empty">No cards in this filter.</div>`; return; }
  const c=fcQueue[fcIdx];
  box.innerHTML=`<div class="flashcard-counter">${fcIdx+1} / ${fcQueue.length}</div>${cardHTML(c,false)}
    <div class="btn-row" style="max-width:620px;margin:14px auto 0">
      <button class="btn sec sm" onclick="fcPrev()">← Prev</button>
      <button class="btn sm" onclick="fcNext()">Next →</button>
    </div>`;
}
function fcNext(){ fcIdx=(fcIdx+1)%fcQueue.length; showFc(); }
function fcPrev(){ fcIdx=(fcIdx-1+fcQueue.length)%fcQueue.length; showFc(); }

// ---------- CARD HTML (shared) ----------
function cardHTML(c, isReview){
  const s=srsState(c.id);
  const meta = `SRS: reps ${s.reps} · interval ${s.interval}d · ease ${s.ease.toFixed(2)}${s.due?` · due ${isoFromIndex(s.due)}`:""}`;
  if(c.type==="vocab"){
    return `<div class="flash" id="card-${c.id.replace(/[^a-z0-9]/gi,'-')}">
      <div class="flash-q" onclick="flip(this.parentElement)"><div class="flash-jp">${c.jp}</div></div>
      <div class="flash-a"><div class="flash-meaning">${c.en}</div><div class="flash-reading">${c.reading}</div><div class="flash-example"><b>${c.ex}</b><br>${c.ex_en}</div></div>
      <div class="flash-meta">${meta}</div>
    </div>${gradeRow(c.id,isReview)}`;
  }
  if(c.type==="keigo"){
    return `<div class="flash">
      <div class="flash-q" onclick="flip(this.parentElement)"><div class="flash-jp" style="font-size:32px">${c.reg}</div><div class="flash-reading">regular — 「${c.en}」</div></div>
      <div class="flash-a">
        <div style="margin-bottom:10px"><span class="tag tag-sonk">尊敬 sonkeigo</span> <b style="font-size:20px">${c.son}</b> <span class="flash-reading">${c.sonR}</span></div>
        <div style="margin-bottom:10px"><span class="tag tag-kenj">謙譲 kenjougo</span> <b style="font-size:20px">${c.ken}</b> <span class="flash-reading">${c.kenR}</span></div>
        <div class="hint">💡 ${c.note}</div>
      </div>
      <div class="flash-meta">${meta}</div>
    </div>${gradeRow(c.id,isReview)}`;
  }
  if(c.type==="phrase"){
    return `<div class="flash">
      <div class="flash-q" onclick="flip(this.parentElement)"><div class="flash-jp" style="font-size:26px">${c.jp}</div><div class="flash-reading">${c.bank} phrase</div></div>
      <div class="flash-a"><div class="flash-meaning">${c.en}</div></div>
      <div class="flash-meta">${meta}</div>
    </div>${gradeRow(c.id,isReview)}`;
  }
  return "";
}
function gradeRow(id,isReview){
  if(!isReview) return "";
  return `<div class="grade-row">
    <button class="grade-btn g-again" onclick="answer('${id}',0)" disabled>Again<small>< 1d</small></button>
    <button class="grade-btn g-hard" onclick="answer('${id}',1)" disabled>Hard<small>1.2x</small></button>
    <button class="grade-btn g-good" onclick="answer('${id}',2)" disabled>Good<small>ease</small></button>
    <button class="grade-btn g-easy" onclick="answer('${id}',3)" disabled>Easy<small>1.3x</small></button>
  </div>`;
}

// ---------- VIEW: WORD OF DAY ----------
routes.word = ()=>{
  const wod=wordOfDay();
  const i=todayIndex()%D.WORD_POOL.length;
  return `<h1>⭐ Word of the Day</h1><p class="sub">One high-leverage business word daily. Rotates through ${D.WORD_POOL.length} words.</p>
  <div class="card" style="text-align:center">
    <div style="font-size:48px;font-weight:700">${wod.jp}</div>
    <div class="flash-reading" style="font-size:20px">${wod.reading}</div>
    <div style="font-size:22px;margin:14px 0">${wod.en}</div>
    <div class="hint" style="font-size:15px">💡 ${wod.why}</div>
  </div>
  <h2>Past words</h2>
  <div class="card" style="padding:0;overflow:hidden">
    <table><tr><th>Word</th><th>Reading</th><th>Meaning</th><th>Why it matters</th></tr>
    ${D.WORD_POOL.map((w,idx)=>`<tr><td class="jp">${idx===i?'<b>'+w.jp+'</b>':w.jp}</td><td>${w.reading}</td><td>${w.en}</td><td style="color:var(--muted);font-size:12px">${w.why}</td></tr>`).join("")}
    </table>
  </div>`;
};

// ---------- VIEW: KANA ----------
let kanaMode="hiragana";
routes.kana = ()=>`
  <h1>あ Kana</h1>
  <p class="sub">Hiragana & Katakana — the alphabet. Goal: read both without romanji by Week 2. Click a chart, then drill.</p>
  <div class="filter-row">
    <div class="chip ${kanaMode==='hiragana'?'active':''}" data-k="hiragana">ひらがな Hiragana</div>
    <div class="chip ${kanaMode==='katakana'?'active':''}" data-k="katakana">カタカナ Katakana</div>
  </div>
  <div id="kanaChart"></div>
  <div class="btn-row"><button class="btn" onclick="startKanaQuiz()">Kana quiz (20) →</button></div>
  <div id="kanaQuiz"></div>
`;
function hook_kana(){
  document.querySelectorAll("[data-k]").forEach(c=>c.addEventListener("click",()=>{kanaMode=c.dataset.k; render("kana");}));
  drawKanaChart();
}
function drawKanaChart(){
  const T = kanaMode==="hiragana"?D.HIRAGANA:D.KATAKANA;
  const labels={vowels:"vowels",k:"k",s:"s",t:"t",n:"n",h:"h",m:"m",y:"y",r:"r",w:"w/n",d:"d (dakuten)",z:"z (dakuten)",p:"d (dakuten)",b:"b (dakuten)",x:"p (handakuten)"};
  document.getElementById("kanaChart").innerHTML=Object.entries(T).map(([grp,chars])=>`
    <div class="card" style="padding:14px"><h3 style="margin:0 0 8px">${labels[grp]||grp}</h3>
      <div class="kana-row">${chars.map(c=>{const [g,r]=c.split(":");return `<div class="kana"><div class="g">${g}</div><div class="r">${r}</div></div>`;}).join("")}</div>
    </div>`).join("");
}
let kanaQ=[],kanaI=0,kanaScore=0;
function startKanaQuiz(){
  const T = kanaMode==="hiragana"?D.HIRAGANA:D.KATAKANA;
  const all=Object.values(T).flat().map(c=>{const [g,r]=c.split(":");return {g,r};});
  kanaQ=shuffle(all).slice(0,20).map(p=>{const opts=shuffle([p.r,...shuffle(all.filter(x=>x.r!==p.r)).slice(0,3).map(x=>x.r)]);return{...p,opts};});
  kanaI=0;kanaScore=0;showKanaQ();
}
function showKanaQ(){
  const p=kanaQ[kanaI]; if(!p){ const pct=Math.round(kanaScore/kanaQ.length*100); document.getElementById("kanaQuiz").innerHTML=`<div class="card" style="text-align:center"><div class="flash-jp" style="font-size:42px" class="${pct>=80?'good':'bad'}">${kanaScore}/${kanaQ.length}</div><div class="hint">${pct>=80?'🌟 Fluent — move on':'📖 Keep drilling this chart'}</div><div class="btn-row" style="justify-content:center"><button class="btn" onclick="startKanaQuiz()">Retry</button></div></div>`; return; }
  document.getElementById("kanaQuiz").innerHTML=`
    <div class="flashcard-counter">Q ${kanaI+1}/${kanaQ.length} · Score ${kanaScore}</div>
    <div class="card" style="text-align:center">
      <div class="flash-jp" style="font-size:54px">${p.g}</div>
      <div class="grid cols-2" style="margin-top:20px;max-width:420px;margin-left:auto;margin-right:auto">
        ${p.opts.map(o=>`<button class="btn sec" onclick="answerKana('${o}')">${o}</button>`).join("")}
      </div>
    </div>`;
}
function answerKana(o){ if(o===kanaQ[kanaI].r)kanaScore++; kanaI++; showKanaQ(); }

// ---------- VIEW: GRAMMAR ----------
routes.grammar = ()=>{
  const levels=["N5","N4","N3"];
  return `<h1>📐 Grammar</h1><p class="sub">${D.GRAMMAR.length} points, N5→N3, business-relevant. Concise — pattern, meaning, example.</p>
  <div class="card" style="padding:0;overflow:hidden">
    <table><tr><th>Lvl</th><th>Pattern</th><th>Meaning</th><th>Example</th><th>English</th></tr>
    ${D.GRAMMAR.map(g=>`<tr><td><span class="tag tag-${g.l.toLowerCase()}">${g.l}</span></td><td class="jp">${g.t}</td><td style="font-size:13px">${g.en}</td><td class="jp" style="font-size:14px">${g.ex}</td><td style="color:var(--muted);font-size:12px">${g.ex_en}</td></tr>`).join("")}
    </table>
  </div>`;
};

// ---------- VIEW: KEIGO ----------
routes.keigo = ()=>`
  <h1>🙇 Keigo (敬語)</h1>
  <p class="sub">The #1 differentiator in <b>business</b> Japanese. Three layers: 尊敬 (raise client) · 謙譲 (lower yourself) · 丁寧 (polite). Master the 8 core verb trios first.</p>

  <h2>3 Layers + Rules</h2>
  <div class="card" style="padding:0;overflow:hidden">
    <table><tr><th>Type</th><th>Use</th><th>How</th><th>Example</th><th>English</th></tr>
    ${D.KEIGO_RULES.map(r=>`<tr><td><b>${r.t}</b></td><td style="font-size:13px">${r.use}</td><td style="font-size:12px;color:var(--muted)">${r.how}</td><td class="jp" style="font-size:14px">${r.ex}</td><td style="font-size:12px;color:var(--muted)">${r.ex_en}</td></tr>`).join("")}
    </table>
  </div>

  <h2>8 Core Verb Trios (+4 bonus) — highest leverage</h2>
  <p class="sub">Memorize these 12. They cover ~80% of workplace honorific moments.</p>
  <div class="card" style="padding:0;overflow:hidden">
    <table>
      <tr><th>Regular</th><th>尊敬 (respect)</th><th>謙譲 (humble)</th><th>Meaning</th><th>Note</th></tr>
      ${D.KEIGO_TRIO.map(k=>`<tr>
        <td class="jp">${k.reg}<br><span class="flash-reading" style="font-size:11px">${k.regR}</span></td>
        <td class="jp" style="color:#c89fd1">${k.son}<br><span class="flash-reading" style="font-size:11px">${k.sonR}</span></td>
        <td class="jp" style="color:#9fc8d1">${k.ken}<br><span class="flash-reading" style="font-size:11px">${k.kenR}</span></td>
        <td>${k.en}</td><td style="font-size:12px;color:var(--muted)">${k.note}</td>
      </tr>`).join("")}
    </table>
  </div>

  <h2>⚠️ Common Keigo Mistakes (FIX THESE)</h2>
  <div class="card" style="padding:0;overflow:hidden">
    <table><tr><th>❌ Wrong</th><th>✅ Correct</th><th>Why</th></tr>
    ${D.KEIGO_MISTAKES.map(m=>`<tr><td class="jp" style="color:var(--bad)">${m.bad}</td><td class="jp" style="color:var(--good)">${m.good}</td><td style="font-size:12px">${m.why}</td></tr>`).join("")}
    </table>
  </div>

  <h2>📚 Phrase Banks</h2>
  <div class="grid cols-2">
    ${["email","meeting","phone","meishi"].map(b=>`
      <div class="card"><h3>${b.toUpperCase()} (${D.PHRASES[b].length})</h3>
        <table><tr><th>Japanese</th><th>English</th></tr>
        ${D.PHRASES[b].map(p=>`<tr><td class="jp" style="font-size:14px">${p.jp}</td><td style="font-size:12px">${p.en}</td></tr>`).join("")}
        </table>
      </div>`).join("")}
  </div>
  <div class="btn-row"><button class="btn" onclick="go('review')">Drill keigo in Review →</button></div>
`;

// ---------- VIEW: QUIZ ----------
let quiz=[];
let qi=0;
let quizScore=0;
let quizBank="vocab";
routes.quiz = ()=>`
  <h1>✏️ Quiz</h1>
  <p class="sub">Quick self-test. Choose a deck — 10 random questions, JP→English.</p>
  <div class="filter-row">
    ${[["vocab","Vocab"],["keigo","Keigo"],["email","Email"],["meeting","Meeting"],["phone","Phone"],["meishi","Meishi"]].map(([k,l])=>`<div class="chip ${quizBank===k?'active':''}" data-q="${k}">${l}</div>`).join("")}
  </div>
  <div id="qBox"><button class="btn" onclick="startQuiz()">Start 10-question quiz →</button></div>
`;
function hook_quiz(){ document.querySelectorAll("[data-q]").forEach(c=>c.addEventListener("click",()=>{quizBank=c.dataset.q; render("quiz");})); }
function startQuiz(){
  const pool=[];
  if(quizBank==="vocab") D.VOCAB.forEach((c,i)=>pool.push({q:c.jp,a:c.en,opt:c.en,prompt:c.reading?`${c.reading} — ${c.jp}`:c.jp}));
  else if(quizBank==="keigo") D.KEIGO_TRIO.forEach(c=>pool.push({q:`謙譲 (humble) of 「${c.reg}」(${c.en})?`,a:c.ken.split("/")[0]}));
  else D.PHRASES[quizBank].forEach(p=>pool.push({q:p.jp,a:p.en}));
  // build 10
  const shuffled=shuffle(pool).slice(0,Math.min(10,pool.length));
  // make 4 options
  const allAns=pool.map(p=>p.a);
  quiz=shuffled.map(p=>{ const opts=shuffle([p.a,...shuffle(allAns.filter(a=>a!==p.a)).slice(0,3)]); return {...p,opts}; });
  qi=0; quizScore=0; showQ();
}
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function showQ(){
  const p=quiz[qi]; if(!p){ finishQuiz(); return; }
  document.getElementById("qBox").innerHTML=`
    <div class="flashcard-counter">Q ${qi+1} / ${quiz.length} · Score ${quizScore}</div>
    <div class="card" style="text-align:center">
      <div class="flash-jp" style="font-size:30px">${p.q}</div>
      <div class="grid cols-2" style="margin-top:20px;max-width:520px;margin-left:auto;margin-right:auto">
        ${p.opts.map(o=>`<button class="btn sec" style="text-align:left" onclick="answerQ('${o.replace(/'/g,"\\'")}')">${o}</button>`).join("")}
      </div>
    </div>`;
}
function answerQ(o){
  const p=quiz[qi]; if(o===p.a) quizScore++;
  qi++; showQ();
}
function finishQuiz(){
  const total=quiz.length;
  state.quizScores.push({date:todayISO(),deck:quizBank,score:quizScore,total});
  save();
  const pct=Math.round(quizScore/total*100);
  const verdict = pct>=80?"🌟 Excellent":pct>=60?"👍 Good — keep drilling":"📖 Study this deck more";
  document.getElementById("qBox").innerHTML=`
    <div class="card" style="text-align:center">
      <div style="font-size:48px;font-weight:700" class="${pct>=60?'good':'bad'}">${quizScore}/${total}</div>
      <div style="font-size:20px;margin:8px 0">${pct}%</div>
      <div class="hint">${verdict}</div>
      <div class="btn-row" style="justify-content:center">
        <button class="btn" onclick="startQuiz()">Retry</button>
        <button class="btn sec" onclick="render('quiz')">Change deck</button>
        <button class="btn sec" onclick="go('progress')">See progress</button>
      </div>
    </div>`;
}

// ---------- VIEW: ANKI EXPORT ----------
routes.export = ()=>`
  <h1>📦 Anki Export</h1>
  <p class="sub">Download tab-separated decks. In Anki: <b>File → Import → choose .txt</b>. Set field separator = Tab. Map: Front=col1, Back=col2+3.</p>
  <div class="btn-row">
    <button class="btn" onclick="exportDeck('vocab')">Export Vocab (${D.VOCAB.length})</button>
    <button class="btn" onclick="exportDeck('keigo')">Export Keigo (${D.KEIGO_TRIO.length})</button>
    <button class="btn" onclick="exportDeck('phrases')">Export All Phrases (${["email","meeting","phone","meishi"].reduce((n,b)=>n+D.PHRASES[b].length,0)})</button>
    <button class="btn sec" onclick="exportDeck('all')">Export Everything</button>
  </div>
  <h2>Import notes</h2>
  <div class="card">
    <ul style="margin:0 0 0 18px;line-height:1.9;font-size:14px">
      <li>Format: <code>Front [Tab] Back [Tab] Example</code></li>
      <li>Vocab front = kanji, back = reading + meaning + example</li>
      <li>Keigo front = regular verb, back = respect/humble forms + note</li>
      <li>Save as UTF-8 .txt. In Anki import, enable "Allow HTML" if you want line breaks.</li>
      <li>Recommended Anki settings: 20 new/day, max reviews 200, mix order, learn ahead 20 min.</li>
    </ul>
  </div>
  <h2>Recommended free resources</h2>
  <div class="card">
    <ul style="margin:0 0 0 18px;line-height:1.9;font-size:14px">
      <li><b>SRS:</b> Anki (this export) / WaniKani (kanji)</li>
      <li><b>Grammar:</b> Bunpro (SRS grammar) · Tae Kim (free) · Genki I&II</li>
      <li><b>Listening:</b> NHK Web Easy · JapanesePod101 · Nihongo con Teppei</li>
      <li><b>Shadowing:</b> "Shadowing Let's Speak Japanese" (business ed.)</li>
      <li><b>Speaking:</b> iTalki (tutors) · HelloTalk (exchange)</li>
      <li><b>Business:</b> BJT official practice tests · 敬語の教科書 (keigo textbook)</li>
    </ul>
  </div>
`;
function exportDeck(kind){
  let rows=[];
  if(kind==="vocab"||kind==="all") D.VOCAB.forEach(c=>rows.push(`${c.jp}\t${c.reading}  ${c.en}\t${c.ex}（${c.ex_en}）`));
  if(kind==="keigo"||kind==="all") D.KEIGO_TRIO.forEach(c=>rows.push(`${c.reg}（${c.en}）\t尊敬: ${c.son} ｜ 謙譲: ${c.ken}\t${c.note}`));
  if(kind==="phrases"||kind==="all") ["email","meeting","phone","meishi"].forEach(b=>D.PHRASES[b].forEach(p=>rows.push(`${p.jp}\t${p.en}\t${b}`)));
  const tsv=rows.join("\n");
  const dl=(href,filename)=>{
    const a=document.createElement("a"); a.href=href; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
  };
  if(typeof URL!=="undefined" && URL.createObjectURL){
    const blob=new Blob([tsv],{type:"text/plain;charset=utf-8"});
    dl(URL.createObjectURL(blob), `azjp_${kind}.txt`);
  } else {
    // fallback: data URI (works in file:// and restricted envs)
    dl("data:text/plain;charset=utf-8,"+encodeURIComponent(tsv), `azjp_${kind}.txt`);
  }
}

// ---------- VIEW: PROGRESS ----------
routes.progress = ()=>{
  const total=allCards().length; const known=knownCount(); const due=dueCount();
  const newCard=reps0=>allCards().filter(c=>{const s=srsState(c.id);return reps0? s.reps===0 : s.reps>0;}).length;
  const learned=newCard(false); const unseen=newCard(true);
  const streak=currentStreak();
  const last30=state.studied.filter(d=>dayIndex(d)>todayIndex()-30).length;
  // breakdown by type
  const byType={}; allCards().forEach(c=>{ byType[c.type]=byType[c.type]||{known:0,total:0}; byType[c.type].total++; if(srsState(c.id).reps>=2&&srsState(c.id).interval>=1) byType[c.type].known++; });
  const recent=state.quizScores.slice(-8).reverse();
  return `
  <h1>📈 Progress</h1>
  <p class="sub">Objective self-measurement. Targets: ${known}/${total} known, 90%+ quiz accuracy, 26-week streak.</p>
  <div class="grid cols-3">
    <div class="stat"><div class="num good">${known}</div><div class="lbl">Known (mature) cards</div></div>
    <div class="stat"><div class="num">${unseen}</div><div class="lbl">Unseen cards</div></div>
    <div class="stat"><div class="num warn">${due}</div><div class="lbl">Due now</div></div>
  </div>
  <div class="grid cols-3" style="margin-top:16px">
    <div class="stat"><div class="num">${streak}🔥</div><div class="lbl">Current streak (days)</div></div>
    <div class="stat"><div class="num">${last30}/30</div><div class="lbl">Days studied (last 30)</div></div>
    <div class="stat"><div class="num">${Math.round(known/total*100)}%</div><div class="lbl">Overall mastery</div></div>
  </div>

  <h2>By deck</h2>
  <div class="card" style="padding:0;overflow:hidden">
    <table><tr><th>Deck</th><th>Known</th><th>Total</th><th>%</th></tr>
    ${Object.entries(byType).map(([t,v])=>`<tr><td>${t}</td><td>${v.known}</td><td>${v.total}</td><td><div class="progress-bar" style="width:120px;display:inline-block"><div style="width:${Math.round(v.known/v.total*100)}%"></div></div> ${Math.round(v.known/v.total*100)}%</td></tr>`).join("")}
    </table>
  </div>

  <h2>Recent quiz scores</h2>
  <div class="card" style="padding:0;overflow:hidden">
    ${recent.length?`<table><tr><th>Date</th><th>Deck</th><th>Score</th><th>%</th></tr>${recent.map(s=>`<tr><td>${s.date}</td><td>${s.deck}</td><td>${s.score}/${s.total}</td><td>${Math.round(s.score/s.total*100)}%</td></tr>`).join("")}</table>`:`<div class="empty">No quizzes yet — take one in the Quiz tab.</div>`}
  </div>

  <h2>Self-assessment checkpoints</h2>
  <div class="card">
    <table>
      <tr><th>When</th><th>Test</th><th>Pass bar</th></tr>
      <tr><td>End of Week 4</td><td>Kana quiz (no romanji) + 40 vocab</td><td>90% kana, 80% vocab</td></tr>
      <tr><td>End of Week 12</td><td>N5+N4 grammar quiz + 150 vocab</td><td>85%</td></tr>
      <tr><td>End of Week 20</td><td>Keigo trio quiz + 30 phrase roleplay</td><td>80% + fluent roleplay</td></tr>
      <tr><td>End of Week 26</td><td>BJT-style mock (or JLPT N3 listening)</td><td>J2-ish / N3 pass</td></tr>
    </table>
  </div>

  <h2>Data</h2>
  <div class="btn-row">
    <button class="btn sec sm" onclick="resetAll()">Reset all progress</button>
    <button class="btn sec sm" onclick="exportProgress()">Export state (JSON)</button>
    <label class="hint" style="display:block;margin-top:8px">New cards/day: <input type="number" id="npd" value="${state.newPerDay}" min="1" max="50" style="width:70px"></label>
  </div>`;
};
function hook_progress(){
  const npd=document.getElementById("npd"); if(npd) npd.addEventListener("change",()=>{ state.newPerDay=Math.max(1,Math.min(50,+npd.value||10)); save(); });
}
function resetAll(){ if(confirm("Reset ALL progress? This deletes your SRS state, streak, and quiz scores.")){ state=fresh(); save(); render("progress"); refreshBadges(); } }
function exportProgress(){ const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="azjp_progress.json"; a.click(); }

// ---------- HOOK DISPATCH ----------
function hook(route){ const h=window["hook_"+route]; if(h) h(); }