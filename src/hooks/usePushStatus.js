// src/hooks/usePushStatus.js
import { useEffect, useState } from "react";

// Get an active SW registration (prefer /mobile/, else whatever is ready)
async function getAnyRegistration() {
  if (!("serviceWorker" in navigator)) return null;
  const regMobile = await navigator.serviceWorker.getRegistration("/mobile/").catch(() => null);
  if (regMobile?.active) return regMobile;
  const ready = await navigator.serviceWorker.ready.catch(() => null);
  return ready || regMobile || null;
}

export default function usePushStatus() {
  const [state, setState] = useState({
    enabled: false,
    perm: typeof Notification !== "undefined" ? Notification.permission : "default",
    label: "Off",
    color: "text-white/60",
  });

  const refresh = async () => {
    try {
      const perm = typeof Notification !== "undefined" ? Notification.permission : "default";

      if (perm === "denied") {
        return setState({ enabled: false, perm, label: "Blocked", color: "text-red-300" });
      }

      let enabled = false;
      if ("serviceWorker" in navigator && "PushManager" in window) {
        const reg = (await getAnyRegistration()) || null;
        const sub = await reg?.pushManager?.getSubscription?.();
        enabled = !!sub;
      }

      const label =
        enabled ? "Enabled" : perm === "granted" ? "Allowed" : "Off";
      const color =
        enabled ? "text-emerald-400" : perm === "granted" ? "text-amber-300" : "text-white/60";

      setState({ enabled, perm, label, color });
    } catch {
      setState({ enabled: false, perm: "default", label: "Off", color: "text-white/60" });
    }
  };

  useEffect(() => {
    refresh();

    const onChange = () => refresh();
    window.addEventListener("gb:push:changed", onChange);
    document.addEventListener("visibilitychange", onChange);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("controllerchange", onChange);
      navigator.serviceWorker.addEventListener("message", onChange);
    }

    return () => {
      window.removeEventListener("gb:push:changed", onChange);
      document.removeEventListener("visibilitychange", onChange);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("controllerchange", onChange);
        navigator.serviceWorker.removeEventListener("message", onChange);
      }
    };
  }, []);

  return {
    enabled: state.enabled,
    permission: state.perm,
    statusLabel: state.label,
    statusColor: state.color,
    refresh,
  };
}
