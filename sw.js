/* Azershal Japanese — service worker: offline cache + notifications. */
const CACHE = "azjp-v1";
const ASSETS = ["./","./index.html","./app.js","./data.js","./styles.css","./manifest.webmanifest",
  "icons/icon-192.png","icons/icon-512.png","icons/icon-mask-512.png"];

self.addEventListener("install", e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).catch(()=>{}));
});

self.addEventListener("activate", e=>{
  e.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

// App-shell: navigations → index.html (offline-first); other GET → cache-first w/ runtime caching.
self.addEventListener("fetch", e=>{
  const req = e.request;
  if(req.method!=="GET") return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;
  if(req.mode === "navigate"){
    e.respondWith((async()=>{
      const cached = await caches.match("./index.html");
      const net = fetch(req).then(r=>{ const c=r.clone(); caches.open(CACHE).then(cc=>cc.put("./index.html",c)); return r;}).catch(()=>cached);
      return cached || net;
    })());
    return;
  }
  e.respondWith((async()=>{
    const cached = await caches.match(req);
    if(cached) return cached;
    try{ const r = await fetch(req); const c=r.clone(); const cc=await caches.open(CACHE); cc.put(req,c); return r; }
    catch(err){ return cached || Response.error(); }
  })());
});

// ---------- Notifications ----------
self.addEventListener("periodicsync", e=>{
  if(e.tag==="daily-reminder") e.waitUntil(showDailyReminder());
});
self.addEventListener("push", e=>{
  let data={};
  try{ data = e.data ? e.data.json() : {}; }catch(_){}
  e.waitUntil(self.registration.showNotification(data.title||"Azershal JP", {
    body: data.body||"Time to study Japanese", icon:"icons/icon-192.png", badge:"icons/icon-192.png",
    tag:data.tag||"azjp", renotify:true, data:{url:data.url||"./index.html"}
  }));
});

async function showDailyReminder(){
  // pull word-of-day + counts from clients (or compute defaults)
  let due=0, word="", reading="", en="";
  try{
    const all = await self.clients.matchAll({includeUncontrolled:true,type:"window"});
    // best-effort: read from cache cannot run JS, so use a simple message; fallback to static text
  }catch(_){}
  const titles=[
    "🎴 Review due — keep your streak",
    "⭐ New word of the day is waiting",
    "🔥 Don't break your streak — 10-min review",
    "🙇 Keigo drill: master today's verb trio"
  ];
  const bodies=[
    "Open the app and clear your due cards. ~15 min.",
    "Today's high-leverage business word + why it matters.",
    "Consistency beats intensity. Just review your due deck.",
    "One verb trio a day keeps the keigo mistakes away."
  ];
  const i = Math.floor(Date.now()/86400000) % titles.length;
  await self.registration.showNotification(titles[i], {
    body: bodies[i], icon:"icons/icon-192.png", badge:"icons/icon-192.png",
    tag:"azjp-daily", renotify:true, vibrate:[80,40,80],
    data:{url:"./index.html"}
  });
}

self.addEventListener("notificationclick", e=>{
  e.notification.close();
  e.waitUntil((async()=>{
    const all = await self.clients.matchAll({type:"window",includeUncontrolled:true});
    const url = (e.notification.data && e.notification.data.url) || "./index.html";
    for(const c of all){ if("focus" in c){ c.focus(); c.postMessage({route:hashToRoute(url)}); return; } }
    if(self.clients.openWindow) await self.clients.openWindow(url);
  })());
});
function hashToRoute(u){ try{ const h=new URL(u,self.location.origin).hash; return h.replace("#","")||"dashboard"; }catch(_){ return "dashboard"; } }