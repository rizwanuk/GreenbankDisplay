// Simple SW update helpers for the /mobile scope (no push required)

export async function getMobileReg() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    // If your SW registers at a non-scoped path, you can call getRegistration() with no path.
    // For mobile, we assume: public/mobile/sw.js
    return await navigator.serviceWorker.getRegistration('/mobile');
  } catch {
    return await navigator.serviceWorker.getRegistration(); // fallback
  }
}

export async function checkForUpdate() {
  const reg = await getMobileReg();
  if (!reg) return { ok: false, reason: 'no-registration' };
  try {
    await reg.update();
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e?.message || 'update-failed' };
  }
}

export async function applyUpdate({ reload = true } = {}) {
  const reg = await getMobileReg();
  if (!reg) return { ok: false, reason: 'no-registration' };

  const sw = reg.waiting || reg.installing;
  if (!sw) return { ok: false, reason: 'no-waiting-sw' };

  // Ask the waiting SW to become active
  sw.postMessage({ type: 'SKIP_WAITING' });

  // When controller changes, the new SW has taken control
  return new Promise((resolve) => {
    let done = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (done) return;
      done = true;
      if (reload) location.reload();
      resolve({ ok: true });
    });
    // Safety timeout resolve (no reload)
    setTimeout(() => {
      if (!done) resolve({ ok: true, reason: 'timeout-controllerchange' });
    }, 4000);
  });
}
