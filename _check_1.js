
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const regs=await navigator.serviceWorker.getRegistrations();
      for(const r of regs) await r.unregister();
      const keys=await caches.keys();
      for(const k of keys) await caches.delete(k);
    } catch(e) {}
  });
}
