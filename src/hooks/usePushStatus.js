import { useEffect, useState } from "react";

// Find any active push subscription, preferring the controlling SW.
async function anySubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { reg: null, sub: null };
  }

  // 1) Prefer the controlling registration
  let controlling = null;
  try { controlling = await navigator.serviceWorker.ready; } catch {}
  if (controlling) {
    try {
      const sub = await controlling.pushManager.getSubscription();
      if (sub) return { reg: controlling, sub };
    } catch {}
  }

  // 2) Specific /mobile/ registration (may exist but not control)
  try {
    const regMobile = await navigator.serviceWorker.getRegistration("/mobile/");
    if (regMobile) {
      const sub = await regMobile.pushManager.getSubscription();
      if (sub) return { reg: regMobile, sub };
    }
  } catch {}

  // 3) Last resort: scan all registrations (root vs others)
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const r of regs) {
      try {
        const sub = await r.pushManager.getSubscription();
        if (sub) return { reg: r, sub };
      } catch {}
    }
  } catch {}

  return { reg: controlling || null, sub: null };
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
        setState({ enabled: false, perm, label: "Blocked", color: "text-red-300" });
        return;
      }

      const { sub } = await anySubscription();
      const enabled = !!sub;

      const label = enabled ? "Enabled" : perm === "granted" ? "Allowed" : "Off";
      const color = enabled ? "text-emerald-400" : perm === "granted" ? "text-amber-300" : "text-white/60";

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
