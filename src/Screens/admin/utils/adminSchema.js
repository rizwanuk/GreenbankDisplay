import { useEffect, useMemo, useState } from "react";

const ALLOWLIST = new Set(["rizwan.uk@gmail.com", "eid.bristol@gmail.com"]);

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();

    const existing = document.querySelector('script[data-google-identity="true"]');
    if (existing) {
      existing.addEventListener("load", resolve);
      existing.addEventListener("error", () => reject(new Error("Failed to load Google script")));
      return;
    }

    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.dataset.googleIdentity = "true";
    s.onload = resolve;
    s.onerror = () => reject(new Error("Failed to load Google script"));
    document.head.appendChild(s);
  });
}

function decodeEmailFromIdToken(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return (payload?.email || "").toLowerCase();
  } catch {
    return "";
  }
}

function rowKey(group, key) {
  return `${group}||${key}`;
}

function toMap(rows) {
  const m = new Map();
  for (let i = 1; i < rows.length; i++) {
    const [g, k, v] = rows[i] || [];
    if (!g || !k) continue;
    m.set(rowKey(String(g).trim(), String(k).trim()), String(v ?? ""));
  }
  return m;
}

async function fetchWhoAmI(token) {
  const r = await fetch("/api/admin/whoami", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || "whoami failed");
  return j;
}

async function fetchSettings(token) {
  const r = await fetch("/api/admin/settings", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || "settings GET failed");
  return j.rows || [];
}

function looksLikeExpiredTokenError(msg) {
  const s = String(msg || "").toLowerCase();
  return (
    s.includes("token used too late") ||
    s.includes("expired") ||
    s.includes("jwt expired") ||
    s.includes("invalid token") ||
    s.includes("unauthorized")
  );
}

export function useAdminSettings(clientId) {
  const [idToken, setIdToken] = useState(() => localStorage.getItem("gbm_admin_id_token") || "");
  const [email, setEmail] = useState(() => localStorage.getItem("gbm_admin_email") || "");
  const [serverEmail, setServerEmail] = useState("");

  const [rows, setRows] = useState([]); // includes header row
  const [baseline, setBaseline] = useState(() => new Map());
  const [draft, setDraft] = useState(() => new Map());

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const allowedClient = useMemo(() => ALLOWLIST.has((email || "").toLowerCase()), [email]);
  const allowedServer = useMemo(
    () => !!serverEmail && ALLOWLIST.has(serverEmail.toLowerCase()),
    [serverEmail]
  );

  const dirtyCount = useMemo(() => {
    let n = 0;
    for (const [k, v] of draft.entries()) {
      if (baseline.get(k) !== v) n++;
    }
    return n;
  }, [draft, baseline]);

  const themeOptions = useMemo(() => {
    const names = new Set();
    for (const r of rows.slice(1)) {
      const g = String(r?.[0] || "");
      if (g.startsWith("theme.")) {
        const parts = g.split(".");
        if (parts[1]) names.add(parts[1]);
      }
    }
    return Array.from(names);
  }, [rows]);

  // --- init Google Sign-in button ---
  useEffect(() => {
    if (!clientId) {
      setError("Missing VITE_GOOGLE_CLIENT_ID (set it in Vercel + .env.local)");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await loadGoogleScript();
        if (cancelled) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp) => {
            const token = resp?.credential || "";
            setIdToken(token);
            localStorage.setItem("gbm_admin_id_token", token);

            const em = decodeEmailFromIdToken(token);
            setEmail(em);
            if (em) localStorage.setItem("gbm_admin_email", em);
            else localStorage.removeItem("gbm_admin_email");

            // reset session state
            setServerEmail("");
            setRows([]);
            setBaseline(new Map());
            setDraft(new Map());
            setStatus("");
            setError("");
          },
        });

        const el = document.getElementById("googleSignInBtn");
        if (el) {
          el.innerHTML = "";
          window.google.accounts.id.renderButton(el, {
            theme: "outline",
            size: "large",
            type: "standard",
            shape: "pill",
            text: "signin_with",
            logo_alignment: "left",
          });
        }
      } catch (e) {
        setError(e?.message || String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  // --- server verify + load settings ---
  useEffect(() => {
    if (!idToken) return;

    (async () => {
      try {
        setLoading(true);
        setError("");
        setStatus("Verifying…");

        const me = await fetchWhoAmI(idToken);
        setServerEmail(me.email || "");

        setStatus("Loading settings…");
        const sRows = await fetchSettings(idToken);
        setRows(sRows);

        const base = toMap(sRows);
        setBaseline(base);
        setDraft(new Map(base));

        setStatus("");
      } catch (e) {
        const msg = e?.message || String(e);

        // If token looks expired, auto sign out so user can sign-in again cleanly
        if (looksLikeExpiredTokenError(msg)) {
          localStorage.removeItem("gbm_admin_id_token");
          localStorage.removeItem("gbm_admin_email");
          setIdToken("");
          setEmail("");
          setServerEmail("");
          setRows([]);
          setBaseline(new Map());
          setDraft(new Map());
          setStatus("");
          setError("Session expired — please sign in again.");
          return;
        }

        setError(msg);
        setStatus("");
      } finally {
        setLoading(false);
      }
    })();
  }, [idToken]);

  const signOut = () => {
    setIdToken("");
    setEmail("");
    setServerEmail("");
    setRows([]);
    setBaseline(new Map());
    setDraft(new Map());
    setError("");
    setStatus("");
    localStorage.removeItem("gbm_admin_id_token");
    localStorage.removeItem("gbm_admin_email");
  };

  const refresh = async () => {
    try {
      if (!idToken) return;
      if (!allowedServer) throw new Error("Not allowlisted");

      setLoading(true);
      setError("");
      setStatus("Refreshing…");

      const sRows = await fetchSettings(idToken);
      setRows(sRows);

      const base = toMap(sRows);
      setBaseline(base);
      setDraft(new Map(base));

      setStatus("");
    } catch (e) {
      setError(e?.message || String(e));
      setStatus("");
    } finally {
      setLoading(false);
    }
  };

  const get = (group, key, fallback = "") => {
    const k = rowKey(group, key);
    return draft.get(k) ?? fallback;
  };

  const set = (group, key, value) => {
    const k = rowKey(group, key);
    setDraft((prev) => {
      const next = new Map(prev);
      next.set(k, value);
      return next;
    });
  };

  const resetDraft = () => {
    setDraft(new Map(baseline));
  };

  const save = async () => {
    try {
      if (!idToken) return;
      if (!allowedServer) throw new Error("Not allowlisted");

      setLoading(true);
      setError("");
      setStatus("Saving…");

      const updates = [];
      for (const [k, v] of draft.entries()) {
        const prev = baseline.get(k);
        if (prev !== v) {
          const [Group, Key] = k.split("||");
          updates.push({ Group, Key, Value: v });
        }
      }

      if (!updates.length) {
        setStatus("No changes to save");
        setTimeout(() => setStatus(""), 1200);
        return;
      }

      const r = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ updates }),
      });

      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Save failed");

      // reload after save
      const sRows = await fetchSettings(idToken);
      setRows(sRows);

      const base = toMap(sRows);
      setBaseline(base);
      setDraft(new Map(base));

      setStatus("Saved ✅");
      setTimeout(() => setStatus(""), 1500);
    } catch (e) {
      setError(e?.message || String(e));
      setStatus("");
    } finally {
      setLoading(false);
    }
  };

  return {
    // auth
    idToken,
    email,
    serverEmail,
    allowedClient,
    allowedServer,
    signOut,

    // data
    rows,
    baseline,
    draft,
    get,
    set,
    dirtyCount,
    themeOptions,

    // actions
    save,
    refresh,
    resetDraft,

    // ui state
    loading,
    status,
    error,
    setError,
    setStatus,
  };
}
