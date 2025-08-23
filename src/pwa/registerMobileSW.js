// src/pwa/registerMobileSW.js
export async function registerMobileSW() {
  if (!("serviceWorker" in navigator)) return null;

  try {
    const reg = await navigator.serviceWorker.register("/mobile/sw.js", { scope: "/mobile/" });

    // If this page isn’t controlled yet, do a one-time reload so the SW takes control.
    if (!navigator.serviceWorker.controller) {
      const onceKey = "gb:sw:reloaded";
      if (!sessionStorage.getItem(onceKey)) {
        sessionStorage.setItem(onceKey, "1");
        location.reload(); // after reload, the page will be controlled
        return reg;
      }
    }

    // Wait until the SW is ready/active
    await navigator.serviceWorker.ready;
    return reg;
  } catch (e) {
    console.error("[sw] register failed:", e);
    throw e;
  }
}
