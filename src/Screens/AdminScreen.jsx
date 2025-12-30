import React, { useEffect, useMemo, useState } from "react";

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

export default function AdminScreen() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const [idToken, setIdToken] = useState(() => localStorage.getItem("gbm_admin_id_token") || "");
  const [email, setEmail] = useState(() => localStorage.getItem("gbm_admin_email") || "");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  // UI toggles (testing phase)
  const [showAll, setShowAll] = useState(false);

  const allowed = useMemo(() => ALLOWLIST.has((email || "").toLowerCase()), [email]);

  // Server-verified identity
  const [serverEmail, setServerEmail] = useState("");
  const serverAllowed = useMemo(
    () => !!serverEmail && ALLOWLIST.has(serverEmail.toLowerCase()),
    [serverEmail]
  );

  // Settings data
  const [rows, setRows] = useState([]); // includes header row
  const [baseline, setBaseline] = useState(() => new Map());
  const [draft, setDraft] = useState(() => new Map());
  const [loading, setLoading] = useState(false);

  // Derived: list of theme names from rows
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

  const dirtyCount = useMemo(() => {
    let n = 0;
    for (const [k, v] of draft.entries()) {
      if (baseline.get(k) !== v) n++;
    }
    return n;
  }, [draft, baseline]);

  // --- Google Sign-in button ---
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

            // clear previous session state
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

  // --- Server verify + load settings ---
  const fetchWhoAmI = async (token) => {
    const r = await fetch("/api/admin/whoami", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || "whoami failed");
    return j;
  };

  const fetchSettings = async (token) => {
    const r = await fetch("/api/admin/settings", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || "settings GET failed");
    return j.rows || [];
  };

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
        setError(msg);
        setStatus("");
      } finally {
        setLoading(false);
      }
    })();
  }, [idToken]);

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

  const setNumber = (group, key, raw, fallback) => {
    const cleaned = String(raw ?? "").replace(/[^\d]/g, "");
    set(group, key, cleaned || String(fallback));
  };

  const save = async () => {
    try {
      if (!idToken) return;
      if (!serverAllowed) throw new Error("Not allowlisted");

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

      // Reload after save so baseline matches server truth
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

  const card = "rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-5";
  const input =
    "mt-1 w-full rounded-xl bg-black/40 border border-white/15 px-3 py-2.5 text-base";
  const select = input;
  const label = "text-sm text-white/70";

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6 pb-28">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold mb-1">Greenbank Display Admin</h1>
            <p className="text-white/70">Testing a few settings first (mobile-friendly).</p>
          </div>

          {idToken ? (
            <button
              onClick={signOut}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10"
            >
              Sign out
            </button>
          ) : null}
        </div>

        {error && (
          <div className="mt-5 p-3 rounded-xl bg-red-900/40 border border-red-700 text-sm">
            {error}
          </div>
        )}

        {!idToken ? (
          <div className={`${card} mt-6`}>
            <div id="googleSignInBtn" />
            <div className="mt-3 text-xs text-white/60">Only allowlisted accounts can proceed.</div>
          </div>
        ) : (
          <div className={`${card} mt-6`}>
            <div className="text-sm text-white/70">Signed in as</div>
            <div className="text-lg sm:text-xl font-semibold mt-1">{email || "(email unknown)"}</div>

            <div className="mt-4 flex items-center gap-2 sm:gap-3 flex-wrap">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm border ${
                  serverAllowed
                    ? "bg-emerald-900/40 border-emerald-600 text-emerald-200"
                    : "bg-red-900/40 border-red-600 text-red-200"
                }`}
              >
                Server: {serverAllowed ? "Allowed" : "Blocked"}
              </span>

              {!serverAllowed && allowed ? (
                <span className="text-xs text-white/60">
                  (Signed in, but server blocked — check allowlist)
                </span>
              ) : null}
            </div>

            {(status || loading) && (
              <div className="mt-3 text-sm text-white/70">{status || "Working…"}</div>
            )}
          </div>
        )}

        {/* Controls */}
        {idToken && serverAllowed ? (
          <div className="mt-6 grid gap-6">
            <div className={card}>
              <h2 className="text-xl font-semibold">Quick settings</h2>
              <p className="text-sm text-white/60 mt-1">
                Keep this page simple while we test. Full settings later.
              </p>

              <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Theme */}
                <div>
                  <label className={label}>Theme</label>
                  <select
                    className={select}
                    value={get("toggles", "theme", "")}
                    onChange={(e) => set("toggles", "theme", e.target.value)}
                  >
                    <option value="">(not set)</option>
                    {themeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Upcoming count */}
                <div>
                  <label className={label}>Number of upcoming prayers</label>
                  <input
                    className={input}
                    value={get("toggles", "numberUpcomingPrayers", "6")}
                    onChange={(e) => setNumber("toggles", "numberUpcomingPrayers", e.target.value, 6)}
                    inputMode="numeric"
                  />
                </div>

                {/* Clock 24h */}
                <div>
                  <label className={label}>Clock 24 hours</label>
                  <select
                    className={select}
                    value={get("toggles", "clock24Hours", "FALSE")}
                    onChange={(e) => set("toggles", "clock24Hours", e.target.value)}
                  >
                    <option value="FALSE">FALSE</option>
                    <option value="TRUE">TRUE</option>
                  </select>
                </div>

                {/* Slideshow duration */}
                <div>
                  <label className={label}>Slideshow duration (seconds)</label>
                  <input
                    className={input}
                    value={get("slideshow", "duration", "8")}
                    onChange={(e) => setNumber("slideshow", "duration", e.target.value, 8)}
                    inputMode="numeric"
                  />
                </div>

                {/* InfoCard rotate */}
                <div>
                  <label className={label}>Info card rotate interval (seconds)</label>
                  <input
                    className={input}
                    value={get("infoCard", "rotateInterval", "15")}
                    onChange={(e) => setNumber("infoCard", "rotateInterval", e.target.value, 15)}
                    inputMode="numeric"
                  />
                </div>

                {/* InfoCard override duration */}
                <div>
                  <label className={label}>Override duration (seconds)</label>
                  <input
                    className={input}
                    value={get("infoCard", "overrideDuration", "300")}
                    onChange={(e) => setNumber("infoCard", "overrideDuration", e.target.value, 300)}
                    inputMode="numeric"
                  />
                </div>

                {/* Override message (full width) */}
                <div className="lg:col-span-2">
                  <label className={label}>Override message</label>
                  <textarea
                    className={`${input} min-h-[140px]`}
                    value={get("infoCard", "overrideMessage", "")}
                    onChange={(e) => set("infoCard", "overrideMessage", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* All settings (hidden by default while testing) */}
            <div className={card}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">All settings</h2>
                  <p className="text-sm text-white/60 mt-1">
                    Optional debug view. Hidden by default for performance.
                  </p>
                </div>
                <button
                  onClick={() => setShowAll((v) => !v)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm"
                >
                  {showAll ? "Hide" : "Show"}
                </button>
              </div>

              {showAll ? (
                <div className="mt-4 max-h-[340px] overflow-auto rounded-xl border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-black">
                      <tr className="text-white/70">
                        <th className="text-left p-2 border-b border-white/10">Group</th>
                        <th className="text-left p-2 border-b border-white/10">Key</th>
                        <th className="text-left p-2 border-b border-white/10">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(1).map((r, idx) => (
                        <tr key={idx} className="odd:bg-white/0 even:bg-white/5">
                          <td className="p-2 border-b border-white/5 align-top">{r?.[0]}</td>
                          <td className="p-2 border-b border-white/5 align-top">{r?.[1]}</td>
                          <td className="p-2 border-b border-white/5 align-top whitespace-pre-wrap break-words">
                            {r?.[2]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Sticky bottom action bar (always reachable on mobile) */}
        {idToken && serverAllowed ? (
          <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/80 backdrop-blur">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                {loading ? (
                  <div className="text-sm text-white/70 truncate">Working…</div>
                ) : dirtyCount > 0 ? (
                  <div className="text-sm text-yellow-200 truncate">● {dirtyCount} unsaved change(s)</div>
                ) : (
                  <div className="text-sm text-white/50 truncate">All changes saved</div>
                )}
                {status ? <div className="text-xs text-white/50 truncate">{status}</div> : null}
              </div>

              <button
                onClick={save}
                disabled={loading || dirtyCount === 0}
                className={`shrink-0 px-5 py-2.5 rounded-xl border text-sm font-medium ${
                  loading || dirtyCount === 0
                    ? "bg-white/10 border-white/10 opacity-60"
                    : "bg-emerald-700 border-emerald-600 hover:bg-emerald-600"
                }`}
              >
                Save
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
