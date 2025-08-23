// src/pwa/registerMobileSW.js
async function waitForActivation(reg, ms = 8000) {
  // If we already have a controller, we're good
  if (navigator.serviceWorker.controller) return reg;

  // If installing, wait until it activates
  if (reg && reg.installing) {
    await new Promise((resolve, reject) => {
      const sw = reg.installing;
      const onState = () => {
        if (sw.state === "activated") { sw.removeEventListener("statechange", onState); resolve(); }
        else if (sw.state === "redundant") { sw.removeEventListener("statechange", onState); reject(new Error("SW redundant")); }
      };
      sw.addEventListener("statechange", onState);
    });
  }

  // Give it a little more time, then fail
  await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, r) => setTimeout(() => r(new Error("ready timeout")), ms)),
  ]);

  return reg;
}

async function ensureControlledOnce() {
  if (!navigator.serviceWorker.controller) {
    const k = "gb:sw:reloaded";
    if (!sessionStorage.getItem(k)) {
      sessionStorage.setItem(k, "1");
      location.reload();
    }
  }
}

async function tryRegister(url, scope) {
  const reg = await navigator.serviceWorker.register(url, { scope });
  // claim clients as soon as possible
  try { await reg.update(); } catch {}
  await waitForActivation(reg, 8000).catch(() => {});
  await ensureControlledOnce();
  return reg;
}

export async function registerMobileSW() {
  if (!("serviceWorker" in navigator)) return null;

  try {
    // Preferred: scoped to /mobile/
    const reg = await tryRegister("/mobile/sw.js", "/mobile/");
    if (navigator.serviceWorker.controller) return reg;

    // Fallback: root scope (controls /mobile too)
    const regRoot = await tryRegister("/sw.js", "/");
    return regRoot;
  } catch (e) {
    console.error("[sw] register failed:", e);
    // Last resort: attempt root once more
    try {
      return await tryRegister("/sw.js", "/");
    } catch (e2) {
      console.error("[sw] root register failed:", e2);
      throw e2;
    }
  }
}
