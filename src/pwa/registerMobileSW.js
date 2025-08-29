// src/pwa/registerMobileSW.js
/* global navigator, window */
import { APP_VERSION } from "../version";

// wait for a single event once
function once(target, type) {
  return new Promise((resolve) => {
    const fn = () => {
      target.removeEventListener(type, fn);
      resolve();
    };
    target.addEventListener(type, fn);
  });
}

/**
 * Registers the /mobile/ Service Worker and wires update handling:
 * - Calls onUpdateReady(reg) when a new SW is waiting
 */
export async function registerMobileSW(onUpdateReady) {
  if (!("serviceWorker" in navigator)) return null;

  // Version-bust the URL to force a fresh fetch after each deploy
  const swUrl = `/mobile/sw.js?v=${encodeURIComponent(APP_VERSION || "dev")}`;

  const reg = await navigator.serviceWorker.register(swUrl, {
    scope: "/mobile/",
    updateViaCache: "none",
  });

  // If a new SW is already waiting, notify
  if (reg.waiting && navigator.serviceWorker.controller && typeof onUpdateReady === "function") {
    onUpdateReady(reg);
  }

  // Detect new SW versions
  reg.addEventListener("updatefound", () => {
    const sw = reg.installing;
    if (!sw) return;
    sw.addEventListener("statechange", () => {
      if (sw.state === "installed" && navigator.serviceWorker.controller && typeof onUpdateReady === "function") {
        onUpdateReady(reg);
      }
    });
  });

  // Background checks every 30 mins (optional)
  setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);

  return reg;
}

/** Manual "Check for updates" from the UI. */
export async function checkForUpdates() {
  if (!("serviceWorker" in navigator)) return { ok: false, reason: "no-sw" };

  let reg = await navigator.serviceWorker.getRegistration("/mobile/");
  if (!reg) reg = await navigator.serviceWorker.ready;
  if (!reg) return { ok: false, reason: "no-registration" };

  await reg.update().catch(() => {});

  if (reg.waiting && navigator.serviceWorker.controller) {
    return { ok: true, updated: true, reg };
  }

  if (reg.installing) {
    await new Promise((resolve) => {
      reg.installing.addEventListener("statechange", (e) => {
        if (e.target.state === "installed") resolve();
      });
    });
    if (reg.waiting && navigator.serviceWorker.controller) {
      return { ok: true, updated: true, reg };
    }
  }

  return { ok: true, updated: false };
}

/** Apply the already-downloaded update immediately and reload. */
export async function applySWUpdate(reg) {
  const r =
    reg ||
    (await navigator.serviceWorker.getRegistration("/mobile/")) ||
    (await navigator.serviceWorker.ready);

  if (!r || !r.waiting) return false;

  const controllerChange = once(navigator.serviceWorker, "controllerchange");

  try { r.waiting.postMessage({ type: "SKIP_WAITING" }); } catch {}
  try { r.waiting.postMessage("SKIP_WAITING"); } catch {}

  await controllerChange;
  window.location.reload();
  return true;
}
