/* Azershal Japanese — engine. SRS (SM-2), routing, views, persistence, PWA, furigana, themes. */
const D = window.DATA;
const STORE_KEY = "azjp_state_v1";

// ---------- STATE ----------
let state = load();
function load(){
  try{ const s = JSON.parse(localStorage.getItem(STORE_KEY)); if(s) return migrate(s); }catch(e){}
  return fresh();
}
function fresh(){
  return { cards:{}, studied:[], weekDone:{}, quizScores:[], newPerDay:10, createdAt:todayISO(),
    theme:null, furi:true, reminders:{enabled:false,time:"09:00"} };
}
function migrate(s){
  if(!s.cards)s.cards={}; if(!s.studied)s.studied=[]; if(!s.weekDone)s.weekDone={}; if(!s.quizScores)s.quizScores=[];
  if(!s.newPerDay)s.newPerDay=10; if(s.furi===undefined)s.furi=true; if(!s.theme)s.theme=null;
  if(!s.reminders)s.reminders={enabled:false,time:"09:00"};
  return s;
}
function save(){ try{ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }catch(e){ console.warn("save failed:",e.message); } }

// ---------- TIME ----------
function todayISO(){ const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function dayIndex(iso){ return Math.floor((new Date(iso+"T00:00:00")).getTime()/86400000); }
function todayIndex(){ return dayIndex(todayISO()); }
function isoFromIndex(i){ const d=new Date(i*86400000); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }

// ---------- FURIGANA (ruby) ----------
function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
const FURI = {};
let FURI_KEYS = null;
function buildFuri(){
  const add=(k,r)=>{ if(k && r && /[一-鿿]/.test(k) && !FURI[k]) FURI[k]=r; };
  D.VOCAB.forEach(c=>add(c.jp,c.reading));
  D.KEIGO_TRIO.forEach(c=>{
    add(c.reg,c.regR);
    c.son.split("/").forEach((s,i)=>add(s, c.sonR.split("/")[i]||c.sonR.split("/")[0]));
    c.ken.split("/").forEach((s,i)=>add(s, c.kenR.split("/")[i]||c.kenR.split("/")[0]));
  });
  // common words & conjugated forms that appear in examples
  const X = {
    今日:"きょう",明日:"あした",昨日:"きのう",毎日:"まいにち",毎朝:"まいあさ",来年:"らいねん",来月:"らいげつ",来週:"らいしゅう",今朝:"けさ",今:"いま",
    私:"わたし",田中:"たなか",英語:"えいご",中国:"ちゅうごく",大阪:"おおさか",東京:"とうきょう",関東:"かんとう",地域:"ちいき",
    右:"みぎ",左:"ひだり",駅:"えき",雨:"あめ",春:"はる",桜:"さくら",時間:"じかん",時代:"じだい",言葉:"ことば",数字:"すうじ",画面:"がめん",
    録画:"ろくが",録音:"ろくおん",夕方:"ゆうがた",社外秘:"しゃがいひ",予定:"よてい",新入社員:"しんにゅうしゃいん",
    営業:"えいぎょう",前年比:"ぜんねんひ",製品:"せいひん",新製品:"しんせいひん",市場:"しじょう",発表:"はっぴょう",分析:"ぶんせき",
    意見:"いけん",議題:"ぎだい",出席:"しゅっせき",欠席:"けっせき",議事録:"ぎじろく",資料:"しりょう",会議:"かいぎ",
    準備:"じゅんび",説明:"せつめい",質問:"しつもん",解決:"かいけつ",理由:"りゆう",目的:"もくてき",締め切り:"しめきり",
    努力:"どりょく",改善:"かいぜん",効率:"こうりつ",成功:"せいこう",失敗:"しっぱい",経験:"けいけん",技術:"ぎじゅつ",
    会社:"かいしゃ",社員:"しゃいん",上司:"じょうし",部下:"ぶか",部署:"ぶしょ",課長:"かちょう",部長:"ぶちょう",社長:"しゃちょう",
    取引先:"とりひきさき",同僚:"どうりょう",仕事:"しごと",残業:"ざんぎょう",出張:"しゅっちょう",勤務:"きんむ",採用:"さいよう",
    面接:"めんせつ",研修:"けんしゅう",責任:"せきにん",担当:"たんとう",担当者:"たんとうしゃ",
    売上:"うりあげ",利益:"りえき",経費:"けいひ",予算:"よさん",契約:"けいやく",見積もり:"みつもり",請求書:"せいきゅうしょ",
    領収書:"りょうしゅうしょ",支払い:"しはらい",価格:"かかく",割引:"わりびき",納期:"のうき",在庫:"ざいこ",注文:"ちゅうもん",返品:"へんぴん",
    御社:"おんしゃ",弊社:"へいしゃ",連絡:"れんらく",案内:"あんない",返信:"へんしん",添付:"てんぷ",拝見:"はいけん",承知:"しょうち",
    失礼:"しつれい",申し訳:"もうしわけ",恐れ入る:"おそれいる",世話:"せわ",頂戴:"ちょうだい",存じる:"ぞんじる",存知:"ぞんじ",
    召し上がる:"めしあがる",ご覧:"ごらん",申し込み:"もうしこみ",身分証:"みぶんしょう",申す:"もうす",名刺:"めいし",名前:"なまえ",
    丁寧:"ていねい",今後:"こんご",本日:"ほんじつ",本件:"ほんけん",最適:"さいてき",問題:"もんだい",大切:"たいせつ",態度:"たいど",
    対する:"たいする",事実:"じじつ",判断:"はんだん",基づく:"もとづく",事項:"じこう",異論:"いろん",終了:"しゅうりょう",
    共有:"きょうゆう",用件:"ようけん",折り返し:"おりかえし",念:"ねん",番号:"ばんごう",遠い:"とおい",少々:"しょうしょう",
    再度:"さいど",案:"あん",賛成:"さんせい",懸念:"けねん",移る:"うつる",次回:"じかい",水曜:"すいよう",取り急ぎ:"とりいそぎ",
    拝啓:"はいけい",敬具:"けいぐ",以上:"いじょう",指定:"してい",方法:"ほうほう",電話:"でんわ",取次ぎ:"とりつぎ",
    戻る:"もどる",戻します:"もどし",持ち帰り:"もちかえり",詳しい:"くわしい",情報:"じょうほう",署名:"しょめい",
    終わる:"おわる",席:"せき",外す:"はずす",コスト:"こすと",進める:"すすめる",従う:"したがう",行動:"こうどう",規則:"きそく",
    甘い:"あまい",入社:"にゅうしゃ",漢字:"かんじ",一人:"ひとり",単語:"たんご",覚える:"おぼえる",遅刻:"ちこく",帰国:"きこく",
    降る:"ふる",締結:"ていけつ",際:"さい",必要:"ひつよう",社内:"しゃない",改める:"あらためる",見直す:"みなおす",開く:"ひらく",
    予約:"よやく",部屋:"へや",何度:"なんど",読む:"よむ",部屋:"へや",遅れる:"おくれる",遅延:"ちえん",電車:"でんしゃ",
    咲く:"さく",押す:"おす",歩き:"あるき",賛成:"さんせい",豊富:"ほうふ",磨く:"みがく",達する:"たっする",減る:"へる",
    削減:"さくげん",収める:"おさめる",結ぶ:"むすぶ",発行:"はっこう",挨拶:"あいさつ",働く:"はたらく",発生:"はっせい",
    詳しい:"くわしい",持つ:"もつ",帰る:"かえる",休む:"やすむ",使う:"つかう",会う:"あう",作る:"つくる",届く:"とどく",
    直す:"なおす",変わる:"かわる",残る:"のこる",集まる:"あつまる",上がる:"あがる",決まる:"きまる",貸す:"かす",借りる:"かりる",
    着く:"つく",乗る:"のる",買う:"かう",売る:"うる",出る:"でる",入る:"はいる",出す:"だす",待つ:"まつ",立つ:"たつ",
    急ぐ:"いそぐ",間に合う:"まにあう",落とす:"おとす",離す:"はなす",見せる:"みせる",続ける:"つづける",集める:"あつめる",
    // conjugated forms of frequent verbs
    行きます:"いきます",行って:"いって",行った:"いった",来ます:"きます",来て:"きて",来た:"きた",
    します:"します",して:"して",した:"した",なります:"なります",なって:"なって",なった:"なった",なる:"なる",
    あります:"あります",あって:"あって",あった:"あった",あります:"あります",います:"います",いて:"いて",いた:"いた",
    見ます:"みます",見て:"みて",見た:"みた",言います:"いいます",言って:"いって",言った:"いった",
    書きます:"かきます",書いて:"かいて",書いた:"かいた",話します:"はなします",話して:"はなして",話した:"はなした",
    聞きます:"ききます",聞いて:"きいて",聞いた:"きいた",食べます:"たべます",食べて:"たべて",食べた:"たべた",
    飲みます:"のみます",飲んで:"のんで",飲んだ:"のんだ",待ちます:"まちます",待って:"まって",待った:"まった",
    持ちます:"もちます",持って:"もって",持った:"もった",使います:"つかいます",使って:"つかって",使った:"つかった",
    会います:"あいます",会って:"あって",会った:"あった",降ります:"ふります",降って:"ふって",降った:"ふった",
    買います:"かいます",買って:"かって",買った:"かった",売ります:"うります",売って:"うって",売った:"うった",
    出します:"だします",出して:"だして",出した:"だした",作ります:"つくります",作って:"つくって",作った:"つくった",
    届きます:"とどきます",届いて:"とどいて",届いた:"とどいた",始まります:"はじまります",始まって:"はじまって",始まった:"はじまった",
    始めます:"はじめます",始めて:"はじめて",始めた:"はじめた",終わります:"おわります",終わって:"おわって",終わった:"おわった",
    変わります:"かわります",変わって:"かわって",変わった:"かわった",残ります:"のこります",残って:"のこって",残った:"のこった",
    決まります:"きまります",決まって:"きまって",決まった:"きまった",決めます:"きめます",決めて:"きめて",決めた:"きめた",
    直します:"なおします",直して:"なおして",直した:"なおした",戻ります:"もどります",戻って:"もどって",戻った:"もどった",
    落ちます:"おちます",落ちて:"おちて",落ちた:"おちた",読みます:"よみます",読んで:"よんで",読んだ:"よんだ",
    急ぎます:"いそぎます",急いで:"いそいで",急いだ:"いそいだ",集まります:"あつまります",集まって:"あつまって",集まった:"あつまった",
    参ります:"まいります",参る:"まいる",伺います:"うかがいます",伺う:"うかがう",存じます:"ぞんじます",
    なさいます:"なさいます",なさる:"なさる",おっしゃいます:"おっしゃいます",おっしゃる:"おっしゃる",
    いらっしゃいます:"いらっしゃいます",いらっしゃる:"いらっしゃる",おります:"おります",おります:"おります",
    いただきます:"いただきます",いただいて:"いただいて",いただいた:"いただいた",いただく:"いただく",
    申し上げます:"もうしあげます",申し上げる:"もうしあげる",ご案内:"ごあんない",ご連絡:"ごれんらく",ご確認:"ごかくにん",
    ご検討:"ごけんとう",ご報告:"ごほうこく",ご相談:"ごそうだん",お時間:"おじかん",お礼:"おれい",お名前:"おなまえ",
    お客様:"おきゃくさま",お見積もり:"おみつもり",お疲れ様:"おつかれさま",お電話:"おでんわ",お世話:"おせわ",
    お願います:"おねがいします",致します:"いたします",いたします:"いたします",ございます:"ございます",かしこまりました:"かしこまりました"
  };
  Object.entries(X).forEach(([k,r])=>add(k,r));
  FURI_KEYS = Object.keys(FURI).sort((a,b)=>b.length-a.length);
}
function autoFuri(text){
  if(text==null) return "";
  if(window.furiRender) return window.furiRender(text); // per-kanji engine from furigana.js
  if(!state.furi) return esc(text);
  if(!FURI_KEYS) buildFuri();
  let out="", i=0;
  while(i<text.length){
    let hit=null;
    for(const w of FURI_KEYS){ if(w.length && text.startsWith(w,i)){ hit={w,r:FURI[w]}; break; } }
    if(hit){ out+=`<ruby>${esc(hit.w)}<rt>${esc(hit.r)}</rt></ruby>`; i+=hit.w.length; }
    else { out+=esc(text[i]); i++; }
  }
  return out;
}

// ---------- THEME + FURIGANA TOGGLES ----------
function applyTheme(t){
  state.theme=t; document.documentElement.dataset.theme=t;
  const mt=document.getElementById("mt"); if(mt) mt.content = t==="light" ? "#f5f7fb" : "#10131a";
  save(); updateToggleBtns();
}
function toggleTheme(){ applyTheme(state.theme==="light" ? "dark" : "light"); }
function applyFuri(on){ state.furi=on; window.__furiOn=!!on; document.body.classList.toggle("furi-off",!on); save(); updateToggleBtns(); }
function toggleFuri(){ applyFuri(!state.furi); }
function updateToggleBtns(){
  const dark = state.theme!=="light";
  document.querySelectorAll("#themeToggleSide,#themeToggleTop").forEach(b=>b.textContent = dark ? "🌙" : "☀️");
  const side=document.getElementById("themeToggleSide"); if(side) side.textContent = dark ? "🌙 Dark" : "☀️ Light";
  document.querySelectorAll("#furiToggleTop").forEach(b=>{ b.textContent="漢"; b.style.opacity = state.furi ? "1" : ".45"; });
  const fs=document.getElementById("furiToggleSide"); if(fs) fs.textContent = state.furi ? "漢字タップ ✓" : "漢字タップ";
}

// ---------- DECKS ----------
function allCards(){
  const list=[];
  D.VOCAB.forEach((c,i)=>list.push({id:"v:"+i,type:"vocab",...c}));
  D.KEIGO_TRIO.forEach((c,i)=>list.push({id:"k:"+i,type:"keigo",...c}));
  ["email","meeting","phone","meishi"].forEach(b=>D.PHRASES[b].forEach((c,i)=>list.push({id:"p:"+b+":"+i,type:"phrase",bank:b,...c})));
  return list;
}

// ---------- SRS (SM-2) ----------
function srsState(id){ return state.cards[id] || {due:0, interval:0, ease:2.5, reps:0, lapses:0, last:0}; }
function isDue(id){ const c=srsState(id); if(c.reps===0) return true; return c.due <= todayIndex(); }
function dueCount(){ return allCards().filter(c=>isDue(c.id)).length; }
function knownCount(){ return allCards().filter(c=>{const s=srsState(c.id); return s.reps>=2 && s.interval>=1;}).length; }
function grade(id,q){
  let c={...srsState(id)}; const easeMin=1.3;
  if(q===0){ c.lapses++; c.reps=0; c.interval=0; c.due=todayIndex()+1; }
  else{
    if(q===1){ c.ease=Math.max(easeMin,c.ease-0.15); c.interval = c.reps===0?1:Math.round(c.interval*1.2)||1; }
    else if(q===2){ c.interval = c.reps===0?1: c.reps===1?3:Math.round(c.interval*c.ease); }
    else { c.ease=c.ease+0.15; c.interval = c.reps===0?2: c.reps===1?5:Math.round(c.interval*c.ease*1.3); }
    c.reps++;
  }
  c.last=todayIndex(); c.due=(q===0?c.due: todayIndex()+c.interval);
  state.cards[id]=c;
  const t=todayISO(); if(!state.studied.includes(t)) state.studied.push(t);
  save(); return c;
}
function currentStreak(){
  if(!state.studied.length) return 0;
  const set=new Set(state.studied); let n=0, i=todayIndex();
  if(!set.has(todayISO())) i--;
  while(set.has(isoFromIndex(i))){ n++; i--; } return n;
}

// ---------- ROUTER ----------
const routes={};
function go(route){ document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.route===route)); render(route); }
function render(route){ const el=document.getElementById("content"); el.scrollTop=0; el.innerHTML=(routes[route]||routes.dashboard)(); hook(route); refreshBadges(); }
function refreshBadges(){
  const d=dueCount(); const b=document.getElementById("dueBadge"); b.textContent=d; b.classList.toggle("zero",d===0);
  document.getElementById("streakNum").textContent=currentStreak();
  document.getElementById("knownNum").textContent=knownCount();
  document.getElementById("totalNum").textContent=allCards().length;
}

document.addEventListener("DOMContentLoaded",()=>{
  // theme default = system
  const sysDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(state.theme || (sysDark ? "dark" : "light"));
  applyFuri(state.furi!==false);
  ["themeToggleSide","themeToggleTop"].forEach(id=>{ const e=document.getElementById(id); if(e) e.addEventListener("click",toggleTheme); });
  ["furiToggleSide","furiToggleTop"].forEach(id=>{ const e=document.getElementById(id); if(e) e.addEventListener("click",toggleFuri); });
  document.querySelectorAll(".nav-btn").forEach(b=>b.addEventListener("click",()=>go(b.dataset.route)));
  initPWA();
  const h=location.hash.replace("#",""); if(h&&routes[h]) go(h); else go("dashboard");
  window.addEventListener("hashchange",()=>{ const h=location.hash.replace("#",""); if(h&&routes[h]) go(h); });
});

// ---------- PWA ----------
let deferredPrompt=null;
function initPWA(){
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("./sw.js").then(reg=>{
      window.__sw=reg;
      if(state.reminders && state.reminders.enabled) registerPeriodic();
      reg.addEventListener("updatefound",()=>{
        const nw=reg.installing; if(!nw) return;
        nw.addEventListener("statechange",()=>{ if(nw.state==="installed" && navigator.serviceWorker.controller) showUpdateBanner(); });
      });
      let reloaded=false;
      navigator.serviceWorker.addEventListener("controllerchange",()=>{ if(!reloaded){ reloaded=true; location.reload(); } });
      reg.update().catch(()=>{});
    }).catch(()=>{});
    navigator.serviceWorker.addEventListener("message",e=>{ if(e.data && e.data.route && routes[e.data.route]) go(e.data.route); });
  }
  window.addEventListener("beforeinstallprompt",e=>{ e.preventDefault(); deferredPrompt=e; updateInstallState(); });
  window.addEventListener("appinstalled",()=>{ deferredPrompt=null; updateInstallState(); });
}
function showUpdateBanner(){
  if(document.getElementById("updateBanner")) return;
  const b=document.createElement("div"); b.id="updateBanner";
  b.innerHTML='<span>🔄 New version ready.</span><button class="btn sm" style="background:#fff;color:var(--accent)">Reload</button>';
  b.querySelector("button").onclick=()=>location.reload();
  document.body.appendChild(b);
}
async function checkForUpdates(){ try{ const reg=await navigator.serviceWorker.ready; await reg.update(); }catch(e){} }
async function installApp(){
  if(!deferredPrompt){ alert("Install via your browser menu: 'Add to Home screen' / 'Install app'."); return; }
  deferredPrompt.prompt(); const ch=await deferredPrompt.userChoice; deferredPrompt=null; updateInstallState();
}
function updateInstallState(){
  const el=document.getElementById("installState"); if(!el) return;
  const installed = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone;
  el.innerHTML = installed ? "✅ Installed — running as an app." :
    deferredPrompt ? "⬇️ Ready to install." : "⚙️ Open in browser menu → 'Install app' / 'Add to Home screen'.";
}
function reminderState(){ return state.reminders = state.reminders || {enabled:false, time:"09:00"}; }
async function enableReminders(){
  if(!("Notification" in window)){ alert("Notifications not supported on this device."); return; }
  let perm=Notification.permission;
  if(perm==="default") perm=await Notification.requestPermission();
  if(perm!=="granted"){ alert("Notifications blocked. Enable in browser settings to get daily reminders."); return; }
  reminderState().enabled=true; save(); await registerPeriodic(); scheduleLocalNudge(); render("app");
}
function disableReminders(){ reminderState().enabled=false; save(); unregisterPeriodic(); render("app"); }
async function registerPeriodic(){
  try{ const reg=await navigator.serviceWorker.ready;
    if("periodicSync" in reg){
      const status=await navigator.permissions.query({name:"periodic-background-sync"}).catch(()=>({state:"denied"}));
      if(status.state==="granted"){ await reg.periodicSync.register("daily-reminder",{minInterval:24*60*60*1000}); return true; }
    }
  }catch(e){}
  return false;
}
async function unregisterPeriodic(){ try{ const reg=await navigator.serviceWorker.ready; if("periodicSync" in reg) await reg.periodicSync.unregister("daily-reminder"); }catch(e){} }
let nudgeTimer=null;
function scheduleLocalNudge(){
  if(nudgeTimer) clearTimeout(nudgeTimer);
  if(!reminderState().enabled) return;
  const [hh,mm]=reminderState().time.split(":").map(Number);
  const now=new Date(); const t=new Date(); t.setHours(hh,mm,0,0);
  if(t<=now) t.setDate(t.getDate()+1);
  nudgeTimer=setTimeout(()=>{ showLocalNudge(); scheduleLocalNudge(); }, t-now);
}
function showLocalNudge(){
  try{ navigator.serviceWorker.ready.then(reg=>reg.showNotification("Azershal JP 🔥",{
    body:"Daily study reminder — review due cards & today's word.", tag:"azjp-daily",
    icon:"icons/icon-192.png", badge:"icons/icon-192.png", vibrate:[80,40,80], data:{url:"./index.html"} })); }catch(e){}
}
async function testNotification(){
  if(!("Notification" in window)){ alert("Not supported."); return; }
  if(Notification.permission!=="granted"){ const p=await Notification.requestPermission(); if(p!=="granted"){alert("Permission denied.");return;} }
  showLocalNudge();
}
function setReminderTime(v){ reminderState().time=v; save(); if(reminderState().enabled) scheduleLocalNudge(); }

// ---------- VIEW: APP ----------
routes.app = ()=>{
  const r=reminderState();
  const installed = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone;
  return `
  <h1>📱 App & Alerts</h1>
  <p class="sub">Install as a phone app (offline, home-screen icon) + daily study reminders.</p>
  <h2>Install</h2>
  <div class="card">
    <div id="installState"></div>
    <div class="btn-row">
      <button class="btn" onclick="installApp()">${installed?'✅ Installed':'⬇️ Install app'}</button>
      <button class="btn sec sm" onclick="updateInstallState()">Refresh</button>
    </div>
    <div class="hint">Android (Chrome/Edge): ⋮ menu → <b>Install app</b>. iOS (Safari): Share → <b>Add to Home Screen</b>.</div>
  </div>
  <h2>Daily study reminders</h2>
  <div class="card">
    <div style="margin-bottom:12px"><b>Status:</b> ${r.enabled?'✅ On — '+r.time:'⬛ Off'}</div>
    <div class="btn-row">
      ${r.enabled?`<button class="btn sec" onclick="disableReminders()">Turn off</button>`:`<button class="btn" onclick="enableReminders()">Enable daily reminders</button>`}
      <button class="btn sec" onclick="testNotification()">🔔 Test</button>
      <button class="btn sec" onclick="checkForUpdates()">🔄 Check updates</button>
    </div>
    <div style="margin-top:14px"><label>Reminder time: <input type="time" value="${r.time}" onchange="setReminderTime(this.value)"></label></div>
    <div class="hint">Android Chrome uses <b>Periodic Background Sync</b> for background reminders ~daily. If unsupported, reminders fire while the app is open.</div>
    <div class="hint" id="pSyncInfo"></div>
  </div>
  <h2>What you get</h2>
  <div class="card"><ul style="margin:0 0 0 18px;line-height:1.9;font-size:14px">
    <li>📲 Home-screen icon, fullscreen, launches like a native app</li>
    <li>✈️ Fully offline — review cards with no signal</li>
    <li>🔔 Daily reminders to keep your streak</li>
    <li>💾 Progress saved on-device</li>
  </ul></div>`;
};
function hook_app(){ updateInstallState(); checkPeriodicSupport(); }
async function checkPeriodicSupport(){
  try{
    const reg=await navigator.serviceWorker.ready; const ok="periodicSync" in reg;
    const perm=ok? await navigator.permissions.query({name:"periodic-background-sync"}).catch(()=>({state:"n/a"})) : {state:"n/a"};
    const el=document.getElementById("pSyncInfo");
    if(el) el.textContent="Periodic Background Sync: "+(ok?"supported (permission: "+perm.state+")":"not supported on this browser — reminders fire while app is open");
  }catch(e){}
}

// ---------- VIEW: DASHBOARD ----------
routes.dashboard = ()=>{
  const due=dueCount(), known=knownCount(), total=allCards().length, streak=currentStreak();
  const wk=currentWeek(); const cur=D.CURRICULUM.find(c=>c.w===wk)||D.CURRICULUM[0];
  const wod=wordOfDay(); const pct=total?Math.round(known/total*100):0;
  return `
  <h1>${autoFuri("こんにちは")} 👋</h1>
  <p class="sub">6-month roadmap to <b>business Japanese fluency</b>. Daily: <b>SRS review → 10 new cards → 1 grammar → 10 min shadowing</b>.</p>
  <div class="grid cols-3">
    <div class="stat"><div class="num ${due>0?'bad':'good'}">${due}</div><div class="lbl">Cards due now</div></div>
    <div class="stat"><div class="num">${streak}🔥</div><div class="lbl">Day streak</div></div>
    <div class="stat"><div class="num good">${pct}%</div><div class="lbl">Known (${known}/${total})</div></div>
  </div>
  <h2>This week — Week ${cur.w}: ${cur.title}</h2>
  <div class="card">
    <div class="sub" style="margin:0 0 10px">Phase: <b>${autoFuri(cur.phase)}</b> · Goal: ${autoFuri(cur.goal)}</div>
    <div class="progress-bar"><div style="width:${weekProgress(cur.w)}%"></div></div>
    <ul style="margin:14px 0 0 18px;font-size:14px;line-height:1.9">
      ${cur.tasks.map(t=>`<li>${autoFuri(t)}</li>`).join("")}
    </ul>
    <div class="btn-row">
      <button class="btn" onclick="go('review')">Review ${due} due →</button>
      <button class="btn sec" onclick="go('curriculum')">Full roadmap</button>
    </div>
  </div>
  <h2>⭐ Word of the Day</h2>
  <div class="card" style="text-align:center">
    <div style="font-size:34px;font-weight:800;line-height:1.3">${autoFuri(wod.jp)}</div>
    <div style="font-size:16px;color:var(--muted);margin-top:6px">${state.furi?"":wod.reading}</div>
    <div style="font-size:19px;margin-top:14px;font-weight:600">${wod.en}</div>
    <div class="hint" style="font-size:14px">💡 ${autoFuri(wod.why)}</div>
  </div>
  <h2>🎯 Daily routine (≈60–90 min)</h2>
  <div class="card" style="padding:0;overflow:hidden">
    <table><tr><th>Time</th><th>Task</th><th>Tab</th></tr>
      <tr><td>15 min</td><td>SRS review (all due cards)</td><td>🔁 Review</td></tr>
      <tr><td>15 min</td><td>Learn 10 new cards</td><td>🎴 Cards</td></tr>
      <tr><td>10 min</td><td>1 grammar point + examples</td><td>📐 Grammar</td></tr>
      <tr><td>10 min</td><td>Keigo drill (verb trios)</td><td>🙇 Keigo</td></tr>
      <tr><td>10 min</td><td>Shadowing (repeat audio aloud)</td><td>— (external)</td></tr>
      <tr><td>5 min</td><td>Word of day + 1 phrase</td><td>⭐ Word</td></tr>
    </table>
  </div>`;
};
function currentWeek(){ const start=dayIndex(state.createdAt); const elapsed=Math.floor((todayIndex()-start)/7)+1; return Math.min(26,Math.max(1,elapsed)); }
function weekProgress(w){ return state.weekDone[w]?100:0; }
function wordOfDay(){ return D.WORD_POOL[todayIndex()%D.WORD_POOL.length]; }

// ---------- VIEW: CURRICULUM ----------
routes.curriculum = ()=>`
  <h1>📅 26-Week Roadmap</h1>
  <p class="sub">6 months · 4 phases. Check off weeks as you complete them. Goal: business conversational fluency (~N3 + keigo).</p>
  <div class="card" style="padding:14px 18px"><b>Phases:</b> ${autoFuri("基礎")} (W1-4) → ${autoFuri("核心")} (W5-12) → ビジネス (W13-20) → ${autoFuri("応用")} (W21-26)</div>
  ${D.CURRICULUM.map(c=>{
    const done=state.weekDone[c.w];
    return `<div class="week ${done?'done':''}" id="wk-${c.w}">
      <div class="wk-title"><span class="chk" onclick="toggleWeek(${c.w})">${done?'✅':'⬜'}</span> Week ${c.w}: ${c.title} <span class="ph">${autoFuri(c.phase)}</span></div>
      <div class="wk-body"><b>Goal:</b> ${autoFuri(c.goal)}</div>
      <div class="wk-body"><b>Tasks:</b> ${autoFuri(c.tasks.join(" · "))}</div>
    </div>`;
  }).join("")}
`;
function toggleWeek(w){ state.weekDone[w]=!state.weekDone[w]; save(); go("curriculum"); }

// ---------- VIEW: REVIEW ----------
let reviewQueue=[], reviewIdx=0;
routes.review = ()=>{
  reviewQueue=allCards().filter(c=>isDue(c.id)); reviewIdx=0;
  if(!reviewQueue.length) return `<h1>🔁 Review</h1><div class="empty">✅ All caught up! No cards due.<br><br><button class="btn" onclick="go('flashcards')">Learn new cards →</button></div>`;
  return `<h1>🔁 Review</h1><p class="sub">${reviewQueue.length} cards due. Tap the card to reveal, then grade how hard it was to recall.</p>
  <div class="flashcard-counter" id="rc">1 / ${reviewQueue.length}</div>
  <div id="rCard"></div>`;
};
function hook_review(){ showReviewCard(); }
function showReviewCard(){
  if(reviewIdx>=reviewQueue.length){ render("review"); return; }
  const c=reviewQueue[reviewIdx];
  document.getElementById("rc").textContent=(reviewIdx+1)+" / "+reviewQueue.length;
  document.getElementById("rCard").innerHTML=cardHTML(c,true);
}
function flip(cardEl){ const a=cardEl.querySelector(".flash-a"); const q=cardEl.querySelector(".flash-q"); a.classList.add("show"); if(q) q.style.opacity="0.5"; document.querySelectorAll(".grade-btn").forEach(b=>b.disabled=false); }
function answer(id,q){ grade(id,q); reviewIdx++; showReviewCard(); refreshBadges(); }

// ---------- VIEW: FLASHCARDS ----------
let fcFilter="all", fcQueue=[], fcIdx=0;
routes.flashcards = ()=>{
  const cats=["all","meeting","office","finance","email","general","keigo","phrase"];
  return `<h1>🎴 Flashcards</h1>
  <p class="sub">Browse & learn. ${allCards().length} cards total. Use Review tab for SRS-due cards.</p>
  <div class="filter-row" id="fcFilters">${cats.map(c=>`<div class="chip ${fcFilter===c?'active':''}" data-cat="${c}">${c}</div>`).join("")}</div>
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
  list=list.sort((a,b)=>{ const sa=srsState(a.id),sb=srsState(b.id); return (sa.reps===0?0:1)-(sb.reps===0?0:1); });
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

// ---------- CARD HTML ----------
function cardHTML(c, isReview){
  const s=srsState(c.id);
  const meta=`reps ${s.reps} · ${s.interval}d · ease ${s.ease.toFixed(2)}${s.due?` · due ${isoFromIndex(s.due)}`:""}`;
  if(c.type==="vocab"){
    return `<div class="flash" id="card-${c.id.replace(/[^a-z0-9]/gi,'-')}">
      <div class="flash-q" onclick="flip(this.parentElement)"><div class="flash-jp">${autoFuri(c.jp)}</div></div>
      <div class="flash-a"><div class="flash-meaning">${c.en}</div><div class="flash-reading">${c.reading}</div><div class="flash-example"><b>${autoFuri(c.ex)}</b><br>${c.ex_en}</div></div>
      <div class="flash-meta">${meta}</div>
    </div>${gradeRow(c.id,isReview)}`;
  }
  if(c.type==="keigo"){
    return `<div class="flash">
      <div class="flash-q" onclick="flip(this.parentElement)"><div class="flash-jp" style="font-size:34px">${autoFuri(c.reg)}</div><div class="flash-reading">regular — 「${c.en}」</div></div>
      <div class="flash-a">
        <div style="margin-bottom:12px"><span class="tag tag-sonk">尊敬</span> <b style="font-size:20px">${autoFuri(c.son)}</b> <span class="flash-reading">${c.sonR}</span></div>
        <div style="margin-bottom:12px"><span class="tag tag-kenj">謙譲</span> <b style="font-size:20px">${autoFuri(c.ken)}</b> <span class="flash-reading">${c.kenR}</span></div>
        <div class="hint">💡 ${c.note}</div>
      </div>
      <div class="flash-meta">${meta}</div>
    </div>${gradeRow(c.id,isReview)}`;
  }
  if(c.type==="phrase"){
    return `<div class="flash">
      <div class="flash-q" onclick="flip(this.parentElement)"><div class="flash-jp" style="font-size:24px;line-height:1.5">${autoFuri(c.jp)}</div><div class="flash-reading">${c.bank} phrase</div></div>
      <div class="flash-a"><div class="flash-meaning">${c.en}</div></div>
      <div class="flash-meta">${meta}</div>
    </div>${gradeRow(c.id,isReview)}`;
  }
  return "";
}
function gradeRow(id,isReview){
  if(!isReview) return "";
  return `<div class="grade-row">
    <button class="grade-btn g-again" onclick="answer('${id}',0)" disabled>Again<small>&lt;1d</small></button>
    <button class="grade-btn g-hard" onclick="answer('${id}',1)" disabled>Hard<small>1.2×</small></button>
    <button class="grade-btn g-good" onclick="answer('${id}',2)" disabled>Good<small>ease</small></button>
    <button class="grade-btn g-easy" onclick="answer('${id}',3)" disabled>Easy<small>1.3×</small></button>
  </div>`;
}

// ---------- VIEW: WORD OF DAY ----------
routes.word = ()=>{
  const wod=wordOfDay(); const i=todayIndex()%D.WORD_POOL.length;
  return `<h1>⭐ Word of the Day</h1><p class="sub">One high-leverage business word daily. Rotates through ${D.WORD_POOL.length} words.</p>
  <div class="card" style="text-align:center">
    <div style="font-size:46px;font-weight:800;line-height:1.3">${autoFuri(wod.jp)}</div>
    <div class="flash-reading" style="font-size:18px">${wod.reading}</div>
    <div style="font-size:20px;margin:14px 0;font-weight:600">${wod.en}</div>
    <div class="hint" style="font-size:14px">💡 ${autoFuri(wod.why)}</div>
  </div>
  <h2>Past words</h2>
  <div class="card" style="padding:0;overflow:hidden">
    <table><tr><th>Word</th><th>Reading</th><th>Meaning</th><th>Why it matters</th></tr>
    ${D.WORD_POOL.map((w,idx)=>`<tr><td class="jp">${idx===i?'<b>'+autoFuri(w.jp)+'</b>':autoFuri(w.jp)}</td><td>${w.reading}</td><td>${w.en}</td><td style="color:var(--muted);font-size:12px">${autoFuri(w.why)}</td></tr>`).join("")}
    </table>
  </div>`;
};

// ---------- VIEW: KANA ----------
let kanaMode="hiragana";
routes.kana = ()=>`
  <h1>あ Kana</h1>
  <p class="sub">Hiragana & Katakana — the alphabet. Goal: read both without romanji by Week 2. Pick a chart, then drill.</p>
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
  const T=kanaMode==="hiragana"?D.HIRAGANA:D.KATAKANA;
  const labels={vowels:"vowels",k:"k",s:"s",t:"t",n:"n",h:"h",m:"m",y:"y",r:"r",w:"w/n",d:"d (dakuten)",z:"z (dakuten)",p:"d (dakuten)",b:"b (dakuten)",x:"p (handakuten)"};
  document.getElementById("kanaChart").innerHTML=Object.entries(T).map(([grp,chars])=>`
    <div class="card" style="padding:14px"><h3 style="margin:0 0 10px">${labels[grp]||grp}</h3>
      <div class="kana-row">${chars.map(c=>{const [g,r]=c.split(":");return `<div class="kana"><div class="g">${g}</div><div class="r">${r}</div></div>`;}).join("")}</div>
    </div>`).join("");
}
let kanaQ=[],kanaI=0,kanaScore=0;
function startKanaQuiz(){
  const T=kanaMode==="hiragana"?D.HIRAGANA:D.KATAKANA;
  const all=Object.values(T).flat().map(c=>{const [g,r]=c.split(":");return {g,r};});
  kanaQ=shuffle(all).slice(0,20).map(p=>{const opts=shuffle([p.r,...shuffle(all.filter(x=>x.r!==p.r)).slice(0,3).map(x=>x.r)]);return{...p,opts};});
  kanaI=0;kanaScore=0;showKanaQ();
}
function showKanaQ(){
  const p=kanaQ[kanaI]; if(!p){ const pct=Math.round(kanaScore/kanaQ.length*100);
    document.getElementById("kanaQuiz").innerHTML=`<div class="card" style="text-align:center"><div class="flash-jp" style="font-size:42px;color:${pct>=80?'var(--good)':'var(--bad)'}">${kanaScore}/${kanaQ.length}</div><div class="hint">${pct>=80?'🌟 Fluent — move on':'📖 Keep drilling this chart'}</div><div class="btn-row center"><button class="btn" onclick="startKanaQuiz()">Retry</button></div></div>`; return; }
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

// ---------- VIEW: GRAMMAR (expandable) ----------
let grammarFilter="all";
routes.grammar = ()=>{
  const lv=["all","N5","N4","N3"];
  const list = D.GRAMMAR.filter(g=> grammarFilter==="all"||g.l===grammarFilter);
  return `<h1>📐 Grammar</h1>
  <p class="sub">${D.GRAMMAR.length} points, N5→N3. <b>Tap any point to expand</b> — plain-English breakdown + extra examples.</p>
  <div class="filter-row">${lv.map(l=>`<div class="chip ${grammarFilter===l?'active':''}" data-gl="${l}">${l}</div>`).join("")}</div>
  <div>${list.map((g,i)=>grammarItem(g, D.GRAMMAR.indexOf(g))).join("")}</div>
  <div class="hint">Total ${list.length} point${list.length!==1?"s":""} shown.</div>`;
};
function hook_grammar(){ document.querySelectorAll("[data-gl]").forEach(c=>c.addEventListener("click",()=>{grammarFilter=c.dataset.gl; render("grammar");})); }
function grammarItem(g,i){
  const more = (g.more||[]).map(m=>`<div class="g-ex-label">More example</div><div class="g-ex"><span class="jp">${autoFuri(m.jp)}</span><span class="en">${m.en}</span></div>`).join("");
  return `<div class="g-item" id="g-${i}">
    <div class="g-head" onclick="toggleGrammar(${i})">
      <span class="tag tag-${g.l.toLowerCase()}">${g.l}</span>
      <span class="g-pat">${autoFuri(g.t)}</span>
      <span class="g-en">${autoFuri(g.en)}</span>
      <span class="g-chev">▾</span>
    </div>
    <div class="g-body">
      <div class="g-breakdown">💡 ${autoFuri(g.breakdown||"")}</div>
      <div class="g-ex-label">Main example</div>
      <div class="g-ex"><span class="jp">${autoFuri(g.ex)}</span><span class="en">${g.ex_en}</span></div>
      ${more}
    </div>
  </div>`;
}
function toggleGrammar(i){ const el=document.getElementById("g-"+i); if(el) el.classList.toggle("open"); }

// ---------- VIEW: KEIGO ----------
routes.keigo = ()=>`
  <h1>🙇 ${autoFuri("敬語")} (Keigo)</h1>
  <p class="sub">The #1 differentiator in <b>business</b> Japanese. Three layers: ${autoFuri("尊敬")} (raise client) · ${autoFuri("謙譲")} (lower yourself) · ${autoFuri("丁寧")} (polite). Master the 8 core verb trios first.</p>
  <h2>3 Layers + Rules</h2>
  <div class="card" style="padding:0;overflow:hidden">
    <table><tr><th>Type</th><th>Use</th><th>How</th><th>Example</th><th>English</th></tr>
    ${D.KEIGO_RULES.map(r=>`<tr><td><b>${autoFuri(r.t)}</b></td><td style="font-size:13px">${autoFuri(r.use)}</td><td style="font-size:12px;color:var(--muted)">${autoFuri(r.how)}</td><td class="jp" style="font-size:14px">${autoFuri(r.ex)}</td><td style="font-size:12px;color:var(--muted)">${r.ex_en}</td></tr>`).join("")}
    </table>
  </div>
  <h2>8 Core Verb Trios (+4 bonus)</h2>
  <p class="sub">Memorize these 12. They cover ~80% of workplace honorific moments.</p>
  <div class="card" style="padding:0;overflow:hidden">
    <table><tr><th>Regular</th><th>${autoFuri("尊敬")} (respect)</th><th>${autoFuri("謙譲")} (humble)</th><th>Meaning</th><th>Note</th></tr>
    ${D.KEIGO_TRIO.map(k=>`<tr>
      <td class="jp">${autoFuri(k.reg)}<br><span class="flash-reading" style="font-size:11px">${k.regR}</span></td>
      <td class="jp" style="color:var(--accent2)">${autoFuri(k.son)}<br><span class="flash-reading" style="font-size:11px">${k.sonR}</span></td>
      <td class="jp" style="color:var(--easy)">${autoFuri(k.ken)}<br><span class="flash-reading" style="font-size:11px">${k.kenR}</span></td>
      <td>${k.en}</td><td style="font-size:12px;color:var(--muted)">${autoFuri(k.note)}</td>
    </tr>`).join("")}
    </table>
  </div>
  <h2>⚠️ Common Keigo Mistakes</h2>
  <div class="card" style="padding:0;overflow:hidden">
    <table><tr><th>❌ Wrong</th><th>✅ Correct</th><th>Why</th></tr>
    ${D.KEIGO_MISTAKES.map(m=>`<tr><td class="jp" style="color:var(--bad)">${autoFuri(m.bad)}</td><td class="jp" style="color:var(--good)">${autoFuri(m.good)}</td><td style="font-size:12px">${autoFuri(m.why)}</td></tr>`).join("")}
    </table>
  </div>
  <h2>📚 Phrase Banks</h2>
  <div class="grid cols-2">
    ${["email","meeting","phone","meishi"].map(b=>`<div class="card"><h3>${b.toUpperCase()} (${D.PHRASES[b].length})</h3>
      <table><tr><th>Japanese</th><th>English</th></tr>
      ${D.PHRASES[b].map(p=>`<tr><td class="jp" style="font-size:14px">${autoFuri(p.jp)}</td><td style="font-size:12px">${p.en}</td></tr>`).join("")}
      </table></div>`).join("")}
  </div>
  <div class="btn-row"><button class="btn" onclick="go('review')">Drill keigo in Review →</button></div>
`;

// ---------- VIEW: QUIZ ----------
let quiz=[], qi=0, quizScore=0, quizBank="vocab";
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
  if(quizBank==="vocab") D.VOCAB.forEach(c=>pool.push({q:c.jp,a:c.en}));
  else if(quizBank==="keigo") D.KEIGO_TRIO.forEach(c=>pool.push({q:"謙譲 (humble) of 「"+c.reg+"」 ("+c.en+")?",a:c.ken.split("/")[0]}));
  else D.PHRASES[quizBank].forEach(p=>pool.push({q:p.jp,a:p.en}));
  const shuffled=shuffle(pool).slice(0,Math.min(10,pool.length));
  const allAns=[...new Set(pool.map(p=>p.a))];
  quiz=shuffled.map(p=>{ const distractors=shuffle(allAns.filter(a=>a!==p.a)).slice(0,3); return {...p,opts:shuffle([p.a,...distractors])}; });
  qi=0; quizScore=0; showQ();
}
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function showQ(){
  const p=quiz[qi]; if(!p){ finishQuiz(); return; }
  document.getElementById("qBox").innerHTML=`
    <div class="flashcard-counter">Q ${qi+1} / ${quiz.length} · Score ${quizScore}</div>
    <div class="card" style="text-align:center">
      <div class="flash-jp" style="font-size:26px;line-height:1.5">${autoFuri(p.q)}</div>
      <div class="grid cols-2" style="margin-top:20px;max-width:520px;margin-left:auto;margin-right:auto">
        ${p.opts.map(o=>`<button class="btn sec" style="text-align:left" onclick="answerQ('${o.replace(/'/g,"\\'")}')">${o}</button>`).join("")}
      </div>
    </div>`;
}
function answerQ(o){ const p=quiz[qi]; if(o===p.a) quizScore++; qi++; showQ(); }
function finishQuiz(){
  const total=quiz.length;
  state.quizScores.push({date:todayISO(),deck:quizBank,score:quizScore,total}); save();
  const pct=Math.round(quizScore/total*100);
  const verdict = pct>=80?"🌟 Excellent":pct>=60?"👍 Good — keep drilling":"📖 Study this deck more";
  document.getElementById("qBox").innerHTML=`
    <div class="card" style="text-align:center">
      <div style="font-size:48px;font-weight:800;color:${pct>=60?'var(--good)':'var(--bad)'}">${quizScore}/${total}</div>
      <div style="font-size:20px;margin:8px 0">${pct}%</div>
      <div class="hint">${verdict}</div>
      <div class="btn-row center">
        <button class="btn" onclick="startQuiz()">Retry</button>
        <button class="btn sec" onclick="render('quiz')">Change deck</button>
        <button class="btn sec" onclick="go('progress')">See progress</button>
      </div>
    </div>`;
}

// ---------- VIEW: EXPORT ----------
routes.export = ()=>`
  <h1>📦 Anki Export</h1>
  <p class="sub">Download tab-separated decks. In Anki: <b>File → Import → choose .txt</b>. Separator = Tab. Map: Front=col1, Back=col2+3.</p>
  <div class="btn-row">
    <button class="btn" onclick="exportDeck('vocab')">Export Vocab (${D.VOCAB.length})</button>
    <button class="btn" onclick="exportDeck('keigo')">Export Keigo (${D.KEIGO_TRIO.length})</button>
    <button class="btn" onclick="exportDeck('phrases')">Export All Phrases (${["email","meeting","phone","meishi"].reduce((n,b)=>n+D.PHRASES[b].length,0)})</button>
    <button class="btn sec" onclick="exportDeck('all')">Export Everything</button>
  </div>
  <h2>Import notes</h2>
  <div class="card"><ul style="margin:0 0 0 18px;line-height:1.9;font-size:14px">
    <li>Format: <code>Front [Tab] Back [Tab] Example</code></li>
    <li>Vocab front = kanji, back = reading + meaning + example</li>
    <li>Keigo front = regular verb, back = respect/humble forms + note</li>
    <li>Save as UTF-8 .txt. Enable "Allow HTML" if you want line breaks.</li>
    <li>Recommended: 20 new/day, max reviews 200, random order.</li>
  </ul></div>
  <h2>Recommended free resources</h2>
  <div class="card"><ul style="margin:0 0 0 18px;line-height:1.9;font-size:14px">
    <li><b>SRS:</b> Anki (this export) / WaniKani (kanji)</li>
    <li><b>Grammar:</b> Bunpro (SRS grammar) · Tae Kim (free) · Genki I&II</li>
    <li><b>Listening:</b> NHK Web Easy · JapanesePod101 · Nihongo con Teppei</li>
    <li><b>Shadowing:</b> "Shadowing Let's Speak Japanese" (business ed.)</li>
    <li><b>Speaking:</b> iTalki (tutors) · HelloTalk (exchange)</li>
    <li><b>Business:</b> BJT official practice tests · ${autoFuri("敬語の教科書")} (keigo textbook)</li>
  </ul></div>
`;
function exportDeck(kind){
  let rows=[];
  if(kind==="vocab"||kind==="all") D.VOCAB.forEach(c=>rows.push(`${c.jp}\t${c.reading}  ${c.en}\t${c.ex}（${c.ex_en}）`));
  if(kind==="keigo"||kind==="all") D.KEIGO_TRIO.forEach(c=>rows.push(`${c.reg}（${c.en}）\t尊敬: ${c.son} ｜ 謙譲: ${c.ken}\t${c.note}`));
  if(kind==="phrases"||kind==="all") ["email","meeting","phone","meishi"].forEach(b=>D.PHRASES[b].forEach(p=>rows.push(`${p.jp}\t${p.en}\t${b}`)));
  const tsv=rows.join("\n");
  const dl=(href,filename)=>{ const a=document.createElement("a"); a.href=href; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); };
  if(typeof URL!=="undefined" && URL.createObjectURL){
    const blob=new Blob([tsv],{type:"text/plain;charset=utf-8"});
    dl(URL.createObjectURL(blob), `azjp_${kind}.txt`);
  } else {
    dl("data:text/plain;charset=utf-8,"+encodeURIComponent(tsv), `azjp_${kind}.txt`);
  }
}

// ---------- VIEW: PROGRESS ----------
routes.progress = ()=>{
  const total=allCards().length, known=knownCount(), due=dueCount(), streak=currentStreak();
  const unseen=allCards().filter(c=>srsState(c.id).reps===0).length;
  const last30=state.studied.filter(d=>dayIndex(d)>todayIndex()-30).length;
  const byType={}; allCards().forEach(c=>{ byType[c.type]=byType[c.type]||{known:0,total:0}; byType[c.type].total++; if(srsState(c.id).reps>=2&&srsState(c.id).interval>=1) byType[c.type].known++; });
  const recent=state.quizScores.slice(-8).reverse();
  return `
  <h1>📈 Progress</h1>
  <p class="sub">Objective self-measurement. Targets: ${known}/${total} known, 90%+ quiz accuracy, 26-week streak.</p>
  <div class="grid cols-3">
    <div class="stat"><div class="num good">${known}</div><div class="lbl">Known (mature)</div></div>
    <div class="stat"><div class="num">${unseen}</div><div class="lbl">Unseen cards</div></div>
    <div class="stat"><div class="num warn">${due}</div><div class="lbl">Due now</div></div>
  </div>
  <div class="grid cols-3" style="margin-top:14px">
    <div class="stat"><div class="num">${streak}🔥</div><div class="lbl">Current streak</div></div>
    <div class="stat"><div class="num">${last30}/30</div><div class="lbl">Days studied (30d)</div></div>
    <div class="stat"><div class="num good">${Math.round(known/total*100)}%</div><div class="lbl">Overall mastery</div></div>
  </div>
  <h2>By deck</h2>
  <div class="card" style="padding:0;overflow:hidden">
    <table><tr><th>Deck</th><th>Known</th><th>Total</th><th>%</th></tr>
    ${Object.entries(byType).map(([t,v])=>`<tr><td>${t}</td><td>${v.known}</td><td>${v.total}</td><td><div class="progress-bar" style="width:120px;display:inline-block;vertical-align:middle"><div style="width:${Math.round(v.known/v.total*100)}%"></div></div> ${Math.round(v.known/v.total*100)}%</td></tr>`).join("")}
    </table>
  </div>
  <h2>Recent quiz scores</h2>
  <div class="card" style="padding:0;overflow:hidden">
    ${recent.length?`<table><tr><th>Date</th><th>Deck</th><th>Score</th><th>%</th></tr>${recent.map(s=>`<tr><td>${s.date}</td><td>${s.deck}</td><td>${s.score}/${s.total}</td><td>${Math.round(s.score/s.total*100)}%</td></tr>`).join("")}</table>`:`<div class="empty">No quizzes yet — take one in the Quiz tab.</div>`}
  </div>
  <h2>Self-assessment checkpoints</h2>
  <div class="card" style="padding:0;overflow:hidden">
    <table><tr><th>When</th><th>Test</th><th>Pass bar</th></tr>
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
function hook_progress(){ const npd=document.getElementById("npd"); if(npd) npd.addEventListener("change",()=>{ state.newPerDay=Math.max(1,Math.min(50,+npd.value||10)); save(); }); }
function resetAll(){ if(confirm("Reset ALL progress? This deletes your SRS state, streak, and quiz scores.")){ state=fresh(); save(); render("progress"); refreshBadges(); } }
function exportProgress(){ const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="azjp_progress.json"; a.click(); }

// ---------- HOOK DISPATCH ----------
function hook(route){ const h=window["hook_"+route]; if(h) h(); }