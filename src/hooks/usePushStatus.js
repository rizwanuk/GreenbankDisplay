import { useEffect, useState } from "react";

// Prefer controlling SW; fall back to /mobile/; finally scan all.
async function findAnySubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { sub: null };
  }

  // 1) Controlling
  try {
    const controlling = await navigator.serviceWorker.ready;
    const sub = await controlling?.pushManager?.getSubscription?.();
    if (sub) return { sub };
  } catch {}

  // 2) Scoped /mobile/
  try {
    const regMobile = await navigator.serviceWorker.getRegistration("/mobile/");
    const sub = await regMobile?.pushManager?.getSubscription?.();
    if (sub) return { sub };
  } catch {}

  // 3) Any other
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const r of regs) {
      try {
        const sub = await r.pushManager.getSubscription();
        if (sub) return { sub };
      } catch {}
    }
  } catch {}

  return { sub: null };
}

export default function usePushStatus() {
  const [state, setState] = useState({
    enabled: false,
    perm: typeof Notification !== "undefined" ? Notification.permission : "default",
    label: "Off",
    color: "text-white/60",
  });

  const computeFrom = (enabled, perm) => {
    if (perm === "denied") return { enabled: false, perm, label: "Blocked", color: "text-red-300" };
    if (enabled) return { enabled: true, perm, label: "Enabled", color: "text-emerald-400" };
    if (perm === "granted") return { enabled: false, perm, label: "Allowed", color: "text-amber-300" };
    return { enabled: false, perm, label: "Off", color: "text-white/60" };
  };

  const refresh = async () => {
    try {
      const perm = typeof Notification !== "undefined" ? Notification.permission : "default";

      // quick hint from localStorage to make UI feel snappy
      let enabledHint = false;
      try { enabledHint = localStorage.getItem("gb:push:enabled") === "1"; } catch {}

      // compute provisional UI immediately
      setState((s) => ({ ...s, ...computeFrom(enabledHint, perm) }));

      // then confirm by querying the SWs
      const { sub } = await findAnySubscription();
      const enabled = !!sub;

      setState(computeFrom(enabled, perm));
    } catch {
      setState(computeFrom(false, "default"));
    }
  };

  useEffect(() => {
    refresh();

    // Listen for explicit broadcasts and common lifecycle changes
    const onChange = () => refresh();
    window.addEventListener("gb:push:changed", onChange);
    document.addEventListener("visibilitychange", onChange);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("controllerchange", onChange);
      navigator.serviceWorker.addEventListener("message", onChange);
    }

    // Light polling for 30s (covers iOS timing quirks)
    const pollId = setInterval(onChange, 5000);
    const stopPoll = setTimeout(() => clearInterval(pollId), 30000);

    return () => {
      window.removeEventListener("gb:push:changed", onChange);
      document.removeEventListener("visibilitychange", onChange);
      if ("serviceWorker" in navigator) {
        try {
          navigator.serviceWorker.removeEventListener("controllerchange", onChange);
          navigator.serviceWorker.removeEventListener("message", onChange);
        } catch {}
      }
      clearInterval(pollId);
      clearTimeout(stopPoll);
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
