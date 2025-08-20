import { useEffect, useState } from "react";

// Derive a 6-digit code from a UUID
function shortCodeFromUuid(u) {
  let h = 0;
  for (let i = 0; i < u.length; i++) h = (h * 31 + u.charCodeAt(i)) >>> 0;
  return String(h % 1000000).padStart(6, "0");
}

function newUuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function useDeviceId() {
  const [uuid, setUuid] = useState(() => {
    try { return localStorage.getItem("device.uuid") || ""; } catch { return ""; }
  });
  const [code, setCode] = useState(() => {
    try { return localStorage.getItem("device.code") || ""; } catch { return ""; }
  });

  useEffect(() => {
    if (!uuid) {
      const u = newUuid();
      const c = shortCodeFromUuid(u);
      setUuid(u);
      setCode(c);
      try {
        localStorage.setItem("device.uuid", u);
        localStorage.setItem("device.code", c);
      } catch {}
    } else if (!code) {
      const c = shortCodeFromUuid(uuid);
      setCode(c);
      try { localStorage.setItem("device.code", c); } catch {}
    }
  }, [uuid, code]);

  return { uuid, code };
}
