// src/pwa/registerMobileSW.js
export async function registerMobileSW(onWaiting) {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/mobile/sw.js', { scope: '/mobile/' });
    reg.addEventListener('updatefound', () => {
      const sw = reg.installing;
      if (!sw) return;
      sw.addEventListener('statechange', () => {
        if (sw.state === 'installed' && navigator.serviceWorker.controller) {
          if (typeof onWaiting === 'function') onWaiting(reg);
        }
      });
    });
    return reg;
  } catch (e) {
    console.warn('[SW] mobile register failed:', e);
    return null;
  }
}
export async function getMobileRegistration() {
  if (!('serviceWorker' in navigator)) return null;
  return navigator.serviceWorker.getRegistration('/mobile');
}
export async function checkForUpdates() {
  const reg = await getMobileRegistration();
  if (!reg) return { ok: false, reason: 'no-registration' };
  try { await reg.update(); return { ok: true }; }
  catch (e) { return { ok: false, reason: e?.message || 'update-failed' }; }
}
export async function applySWUpdate(reg) {
  try {
    const r = reg || (await getMobileRegistration());
    const sw = r && (r.waiting || r.installing);
    if (!sw) return { ok: false, reason: 'no-waiting-sw' };
    sw.postMessage({ type: 'SKIP_WAITING' });
    await new Promise((resolve) => {
      let done = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (done) return; done = true; resolve(); location.reload();
      });
      setTimeout(() => { if (!done) resolve(); }, 4000);
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e?.message || 'apply-failed' };
  }
}
