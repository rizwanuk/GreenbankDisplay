// src/pwa/registerMobileSW.js
async function waitForController(ms = 8000) {
  if (navigator.serviceWorker.controller) return true;
  return await new Promise((resolve) => {
    const t = setTimeout(() => resolve(false), ms);
    const onCtrl = () => {
      clearTimeout(t);
      navigator.serviceWorker.removeEventListener("controllerchange", onCtrl);
      resolve(true);
    };
    navigator.serviceWorker.addEventListener("controllerchange", onCtrl, { once: true });
  });
}

async function tryRegister(url, scope) {
  const reg = await navigator.serviceWorker.register(url, { scope });
  try { await reg.update(); } catch {}
  // give it time to activate + claim
  try { await navigator.serviceWorker.ready; } catch {}
  return reg;
}

export async function registerMobileSW() {
  if (!("serviceWorker" in navigator)) return null;

  // 1) Prefer /mobile/ scope
  try {
    const reg = await tryRegister("/mobile/sw.js", "/mobile/");
    if (navigator.serviceWorker.controller || (await waitForController(4000))) return reg;
  } catch (e) {
    console.warn("[sw] /mobile/ register failed:", e);
  }

  // 2) Fallback to root (controls /mobile too)
  try {
    const regRoot = await tryRegister("/sw.js", "/");
    if (!navigator.serviceWorker.controller) {
      const onceKey = "gb:sw:forced-reload";
      if (!sessionStorage.getItem(onceKey)) {
        sessionStorage.setItem(onceKey, "1");
        location.reload(); // one-time reload to ensure control
      }
    }
    await waitForController(6000);
    return regRoot;
  } catch (e) {
    console.error("[sw] root register failed:", e);
    throw e;
  }
}
