// src/hooks/usePushStatus.js
import { useEffect, useMemo, useState } from "react";

export default function usePushStatus() {
  const [enabled, setEnabled] = useState(false);
  const [perm, setPerm] = useState(typeof Notification !== "undefined" ? Notification.permission : "default");
  const [supported, setSupported] = useState(false);

  // platform checks
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPad|iPhone|iPod/i.test(ua);
  const isStandalone =
    (typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)")?.matches) ||
    (typeof navigator !== "undefined" && (navigator.standalone === true || navigator.standalone === 1));
  const hasNotification = typeof window !== "undefined" && "Notification" in window;
  const hasSW = typeof navigator !== "undefined" && "serviceWorker" in navigator;
  const hasPush = typeof window !== "undefined" && "PushManager" in window;

  const computeSupported = () => {
    // On iOS, push only works when launched from Home Screen
    if (isIOS) return hasNotification && hasSW && hasPush && isStandalone;
    return hasNotification && hasSW && hasPush;
  };

  const refresh = async () => {
    try {
      setPerm(typeof Notification !== "undefined" ? Notification.permission : "default");
      const reg = await navigator.serviceWorker?.ready;
      const sub = await reg?.pushManager?.getSubscription?.();
      setEnabled(!!sub);
    } catch {
      setEnabled(false);
    } finally {
      setSupported(computeSupported());
    }
  };

  useEffect(() => {
    refresh();
    const onVis = () => refresh();
    const onChanged = () => refresh();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("gb:push:changed", onChanged);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("gb:push:changed", onChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { statusLabel, statusColor } = useMemo(() => {
    if (!supported) return { statusLabel: "Unsupported", statusColor: "text-white/60" };
    if (perm === "denied") return { statusLabel: "Blocked", statusColor: "text-red-300" };
    if (enabled) return { statusLabel: "On", statusColor: "text-emerald-300" };
    if (perm === "granted") return { statusLabel: "Allowed (off)", statusColor: "text-amber-300" };
    return { statusLabel: "Off", statusColor: "text-white/70" };
  }, [supported, perm, enabled]);

  return { enabled, perm, supported, statusLabel, statusColor, refresh };
}
