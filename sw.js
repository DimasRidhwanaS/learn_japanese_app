/* Azershal Japanese — service worker: offline cache + notifications + auto-update. */
const CACHE = "azjp-v17";
const ASSETS = ["./","./index.html","./app.js","./data.js","./furigana.js","./kanji_meanings.js","./styles.css","./manifest.webmanifest",
  "icons/icon-192.png","icons/icon-512.png","icons/icon-mask-512.png","icons/apple-180.png","icons/favicon-32.png"];

self.addEventListener("install", e=>{
  self.skipWaiting();                       // new SW activates immediately, no tab-restart needed
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).catch(()=>{}));
});

self.addEventListener("activate", e=>{
  e.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));  // drop old cache versions
    await self.clients.claim();
  })());
});

// Network-first: when online you ALWAYS get the newest content (auto-update).
// Falls back to cache when offline. Re-caches successful responses.
self.addEventListener("fetch", e=>{
  const req = e.request;
  if(req.method!=="GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async()=>{
    try{
      const net = await fetch(req);
      const c = net.clone();
      const cc = await caches.open(CACHE);
      cc.put(req.url, c);                    // refresh cache with latest
      return net;
    }catch(_){
      // offline (or navigations): fall back to cache, app-shell for navigations
      const cached = await caches.match(req, {ignoreSearch:true});
      if(cached) return cached;
      if(req.mode === "navigate"){ const shell = await caches.match("./index.html"); if(shell) return shell; }
      return Response.error();
    }
  })());
});

// ---------- Notifications ----------
self.addEventListener("periodicsync", e=>{ if(e.tag==="daily-reminder") e.waitUntil(showDailyReminder()); });
self.addEventListener("push", e=>{
  let data={}; try{ data = e.data ? e.data.json() : {}; }catch(_){}
  e.waitUntil(self.registration.showNotification(data.title||"Azershal JP", {
    body: data.body||"Time to study Japanese", icon:"icons/icon-192.png", badge:"icons/icon-192.png",
    tag:data.tag||"azjp", renotify:true, data:{url:data.url||"./index.html"}
  }));
});
async function showDailyReminder(){
  const titles=["🎴 Review due — keep your streak","⭐ New word of the day is waiting","🔥 Don't break your streak — 10-min review","🙇 Keigo drill: master today's verb trio"];
  const bodies=["Open the app and clear your due cards. ~15 min.","Today's high-leverage business word + why it matters.","Consistency beats intensity. Just review your due deck.","One verb trio a day keeps the keigo mistakes away."];
  const i=Math.floor(Date.now()/86400000)%titles.length;
  await self.registration.showNotification(titles[i], {body:bodies[i], icon:"icons/icon-192.png", badge:"icons/icon-192.png", tag:"azjp-daily", renotify:true, vibrate:[80,40,80], data:{url:"./index.html"}});
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