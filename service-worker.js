// Netzwerk zuerst, damit Updates an Anmeldung und Konfiguration am Handy ankommen.
const CACHE="urlaubsplaner-v5";
const ASSETS=["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png","./auth-config.js","./auth.js"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))])));
self.addEventListener("fetch",e=>{
 if(e.request.method!=="GET"||new URL(e.request.url).origin!==self.location.origin)return;
 if(e.request.mode==="navigate"){e.respondWith(fetch(new Request(e.request,{cache:"no-store"})).catch(()=>caches.match("./index.html")));return;}
 e.respondWith(fetch(e.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(e.request,copy))}return response}).catch(()=>caches.match(e.request)));
});
