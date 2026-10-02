const CACHE_NAME="kusa-flightops-public-v5.26.8";
const PUBLIC_ASSETS=[
  "/account.html",
  "/invite.html",
  "/reset-password.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

self.addEventListener("install",event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    for(const url of PUBLIC_ASSETS){
      try{await cache.add(url)}catch(e){}
    }
  })());
  self.skipWaiting();
});

self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    for(const key of await caches.keys()){
      if(key!==CACHE_NAME)await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET")return;
  const u=new URL(req.url);
  if(u.origin!==self.location.origin)return;

  // APIs and protected operational resources are always network-only.
  if(u.pathname.startsWith("/api/") || u.pathname.startsWith("/data/")){
    event.respondWith(fetch(req).catch(()=>new Response(
      JSON.stringify({ok:false,offline:true,error:"NETWORK_REQUIRED"}),
      {status:503,headers:{"Content-Type":"application/json"}}
    )));
    return;
  }

  // Navigations are network-only so an old cached FlightOps shell can never bypass
  // the server-side authentication gate. Offline authenticated operations will be
  // reintroduced only with an explicit device/offline authorization design.
  if(req.mode==="navigate"){
    event.respondWith(fetch(req).catch(()=>new Response(
      `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KUSA FlightOps Offline</title></head><body style="font-family:Arial;background:#071b33;color:#e8f1fb;padding:32px"><h1>KUSA FlightOps</h1><p>Network connection is required for secure sign-in and operational access in v5.26.8.</p></body></html>`,
      {status:503,headers:{"Content-Type":"text/html; charset=utf-8"}}
    )));
    return;
  }

  // Only public non-operational assets may use cache fallback.
  event.respondWith((async()=>{
    const cached=await caches.match(req);
    try{
      const r=await fetch(req);
      if(r&&r.ok&&PUBLIC_ASSETS.some(x=>u.pathname===x||u.pathname.startsWith("/icons/"))){
        const c=await caches.open(CACHE_NAME);
        c.put(req,r.clone());
      }
      return r;
    }catch(e){
      return cached||new Response("Offline",{status:503});
    }
  })());
});
