// src/pwa/registerMobileSW.js
/* global navigator, window */

/**
 * Registers the /mobile/ Service Worker and wires update handling:
 * - Prompts (or auto-applies) when a new SW is ready
 * - Exposes checkForUpdates() to manually trigger an update from UI
 */
export async function registerMobileSW(onUpdateReady) {
  if (!('serviceWorker' in navigator)) return null;

  // Register the mobile SW with /mobile/ scope
  const reg = await navigator.serviceWorker.register('/mobile/sw.js', { scope: '/mobile/' });

  // If a new SW is already waiting, notify
  maybeNotify(reg, onUpdateReady);

  // Detect new SW versions
  reg.addEventListener('updatefound', () => {
    const sw = reg.installing;
    if (!sw) return;
    sw.addEventListener('statechange', () => {
      // 'installed' + controller means: update available for existing page
      if (sw.state === 'installed' && navigator.serviceWorker.controller) {
        maybeNotify(reg, onUpdateReady);
      }
    });
  });

  // Periodically check for updates in the background (optional)
  setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);

  return reg;
}

function maybeNotify(reg, onUpdateReady) {
  if (reg.waiting && navigator.serviceWorker.controller) {
    if (typeof onUpdateReady === 'function') {
      onUpdateReady(reg);
    }
  }
}

/**
 * Applies an already-downloaded update immediately:
 * - Tells the waiting SW to SKIP_WAITING
 * - Reloads once the new controller takes over
 */
export async function applySWUpdate(reg) {
  const registration = reg || (await navigator.serviceWorker.getRegistration('/mobile/'));
  if (!registration) return false;

  if (registration.waiting) {
    // When the new SW takes control, reload
    const onCtrlChange = () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onCtrlChange);
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onCtrlChange);

    // Be tolerant of either {type:'SKIP_WAITING'} or bare string
    try {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } catch {}
    try {
      registration.waiting.postMessage('SKIP_WAITING');
    } catch {}
    return true;
  }

  return false;
}

/**
 * Manual "Check for updates" you can call from a button.
 * Forces a network check; if a new SW is found, it’s applied and the page reloads.
 */
export async function checkForUpdates() {
  if (!('serviceWorker' in navigator)) return { ok: false, reason: 'no-sw' };

  const reg =
    (await navigator.serviceWorker.getRegistration('/mobile/')) ||
    (await navigator.serviceWorker.getRegistration());

  if (!reg) return { ok: false, reason: 'no-registration' };

  // Ask the browser to check for an updated SW
  await reg.update().catch(() => {});

  // If a new worker is waiting, apply immediately
  if (reg.waiting) {
    await applySWUpdate(reg);
    return { ok: true, updated: true };
  }

  // If installing, wait for "installed", then apply
  if (reg.installing) {
    await new Promise((resolve) => {
      reg.installing.addEventListener('statechange', (e) => {
        if (e.target.state === 'installed') resolve();
      });
    });
    if (reg.waiting) {
      await applySWUpdate(reg);
      return { ok: true, updated: true };
    }
  }

  return { ok: true, updated: false };
}
