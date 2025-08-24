// src/pwa/registerMobileSW.js
export async function registerMobileSW(onUpdateReady) {
  if (!("serviceWorker" in navigator)) return null;

  // Register the mobile SW with /mobile/ scope
  const reg = await navigator.serviceWorker.register("/mobile/sw.js", { scope: "/mobile/" });

  // If a new SW is already waiting (Safari can land here), notify
  maybeNotify();

  // Detect new SW versions
  reg.addEventListener("updatefound", () => {
    const sw = reg.installing;
    if (!sw) return;
    sw.addEventListener("statechange", () => {
      // 'installed' + controller means an update to existing page
      if (sw.state === "installed" && navigator.serviceWorker.controller) {
        maybeNotify();
      }
    });
  });

  // Periodically check for updates (e.g. every 30 mins)
  setInterval(() => reg.update(), 30 * 60 * 1000);

  function maybeNotify() {
    if (reg.waiting && navigator.serviceWorker.controller) {
      onUpdateReady?.(reg);
    }
  }

  return reg;
}

export function applySWUpdate(reg) {
  if (!reg?.waiting) return;
  // When the new SW takes control, reload once
  navigator.serviceWorker.addEventListener(
    "controllerchange",
    () => window.location.reload(),
    { once: true }
  );
  reg.waiting.postMessage({ type: "SKIP_WAITING" });
}
