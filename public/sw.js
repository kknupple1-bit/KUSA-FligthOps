const CACHE_NAME="kusa-flightops-shell-v5.25.45";
const SHELL=["/","/index.html","/config.js","/manifest.webmanifest","/icons/icon-192.png","/icons/icon-512.png","/data/f900b_qrh_rev02.json","/data/f900b_operational_overlays_v52541.json","/data/f900b_n699bg_wb_v52543.json"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(SHELL)).catch(()=>null));self.skipWaiting();});
self.addEventListener("activate",event=>{event.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE_NAME)await caches.delete(k);await self.clients.claim();})());});
self.addEventListener("fetch",event=>{
 const req=event.request;if(req.method!=="GET")return;const u=new URL(req.url);if(u.origin!==self.location.origin)return;
 if(u.pathname.startsWith("/api/")){event.respondWith(fetch(req));return;}
 if(req.mode==="navigate"){event.respondWith((async()=>{try{const r=await fetch(req);const c=await caches.open(CACHE_NAME);c.put("/index.html",r.clone());return r}catch(e){return (await caches.match("/index.html"))||(await caches.match("/"))}})());return;}
 event.respondWith((async()=>{const cached=await caches.match(req);const network=fetch(req).then(async r=>{if(r&&r.ok){const c=await caches.open(CACHE_NAME);c.put(req,r.clone())}return r}).catch(()=>null);return cached||await network||new Response("Offline",{status:503})})());
});
