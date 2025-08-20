// src/hooks/useRemoteDeviceConfig.js
import { useEffect, useRef, useState } from "react";

/** JSONP helper (production fallback for Apps Script) */
function jsonp(url, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const cb = "cb_" + Math.random().toString(36).slice(2);
    const sep = url.includes("?") ? "&" : "?";
    const src = `${url}${sep}callback=${cb}`;
    let done = false;

    function cleanup(scriptEl, timer) {
      try { delete window[cb]; } catch {}
      if (scriptEl && scriptEl.parentNode) scriptEl.parentNode.removeChild(scriptEl);
      if (timer) clearTimeout(timer);
    }

    // GAS will call window[cb](...)
    window[cb] = (data) => {
      if (done) return;
      done = true;
      cleanup(s, t);
      resolve(data);
    };

    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onerror = () => {
      if (done) return;
      done = true;
      cleanup(s, t);
      reject(new Error("JSONP network error"));
    };

    const t = setTimeout(() => {
      if (done) return;
      done = true;
      cleanup(s, t);
      reject(new Error("JSONP timeout"));
    }, timeoutMs);

    document.head.appendChild(s);
  });
}

export default function useRemoteDeviceConfig(deviceCode, apiUrl, pollMs = 15000) {
  const [cfg, setCfg] = useState(null);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!deviceCode || !apiUrl) return;

    let cancelled = false;

    const DEV = !!import.meta.env.DEV;
    const isGAS = /script\.google\.com/.test(apiUrl);

    // 🔒 FORCE proxy in dev so we never hit JSONP or CORS locally
    const base = DEV && isGAS ? "/device-api" : apiUrl;
    const useJsonp = !DEV && isGAS; // only use JSONP in production

    const fetchOnce = async () => {
      try {
        const url = `${base}?code=${encodeURIComponent(deviceCode)}&ts=${Date.now()}`;

        let data;
        if (useJsonp) {
          // Prod: JSONP to GAS
          data = await jsonp(url);
        } else {
          // Dev (proxy) or non-GAS backends: plain fetch
          const resp = await fetch(url, {
            cache: "no-store",
            headers: { accept: "application/json,text/plain,*/*" },
          });

          // read text to gracefully handle weird tokens; try JSON parse
          const text = await resp.text();
          try {
            data = JSON.parse(text);
          } catch {
            // very basic salvage: trim common anti-XSSI fragments
            const trimmed = text.trim().replace(/^(\)\]\}'\s*|&[A-Za-z0-9]+;?)/, "").trim();
            data = trimmed.startsWith("{") ? JSON.parse(trimmed) : null;
          }
          if (!data) throw new Error(`proxy parse error (${resp.status}) body="${text.slice(0,60)}"`);
        }

        if (cancelled) return;

        if (data && data.ok) {
          setCfg(data.data || null);
          setError(null);
        } else {
          setCfg(null);
          setError((data && data.error) || "Remote config error");
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    };

    fetchOnce(); // immediate
    timerRef.current = setInterval(fetchOnce, pollMs); // poll

    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [deviceCode, apiUrl, pollMs]);

  return { cfg, error };
}
