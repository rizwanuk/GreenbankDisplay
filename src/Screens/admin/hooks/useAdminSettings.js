// src/Screens/admin/hooks/useAdminSettings.js
import { useCallback, useEffect, useMemo, useState } from "react";
import { rowsToGroups } from "../utils/rowsToGroups";

const TOKEN_KEY = "gbm_admin_id_token";

function hasHeaderRow(r0) {
  return (
    Array.isArray(r0) &&
    r0[0] === "Group" &&
    r0[1] === "Key" &&
    r0[2] === "Value"
  );
}

function looksLikeAuthError(status, msg) {
  const s = String(msg || "").toLowerCase();
  return (
    status === 401 ||
    status === 403 ||
    s.includes("unauthorized") ||
    s.includes("invalid token") ||
    s.includes("jwt expired") ||
    s.includes("expired") ||
    s.includes("token used too late") ||
    s.includes("permission") ||
    s.includes("forbidden")
  );
}

export function useAdminSettings() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [hasToken, setHasToken] = useState(() => !!localStorage.getItem(TOKEN_KEY));

  const clearSession = useCallback((message = "Session expired — please sign in again.") => {
    localStorage.removeItem(TOKEN_KEY);
    setHasToken(false);
    setEmail("");
    setRows([]);
    setError(message);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const t = localStorage.getItem(TOKEN_KEY);
      setHasToken(!!t);

      const r = await fetch("/api/admin/settings", {
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });

      const text = await r.text();
      let json = null;

      try {
        json = JSON.parse(text);
      } catch {
        // Non-JSON response (still treat auth codes as session-expired)
        if (looksLikeAuthError(r.status, text)) {
          clearSession();
          return;
        }
        throw new Error(text || `HTTP ${r.status}`);
      }

      // Handle token expiry / auth failures cleanly
      if (!r.ok || !json?.ok) {
        const msg = json?.error || `HTTP ${r.status}`;
        if (looksLikeAuthError(r.status, msg)) {
          clearSession();
          return;
        }
        throw new Error(msg);
      }

      setEmail(json.email || "");
      setRows(Array.isArray(json.rows) ? json.rows : []);
    } catch (e) {
      const msg = e?.message || String(e);
      // In case an auth-ish error gets thrown without status info
      if (looksLikeAuthError(0, msg)) {
        clearSession();
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => rowsToGroups(rows), [rows]);

  /**
   * Get the raw string value from the underlying rows table.
   * This is useful to avoid "0" being coerced to 0 and then treated as falsy in UI fallbacks.
   */
  const getRawValue = useCallback(
    (group, key) => {
      const r = Array.isArray(rows) ? rows : [];
      const startIdx = hasHeaderRow(r[0]) ? 1 : 0;

      for (let i = startIdx; i < r.length; i++) {
        if (r[i]?.[0] === group && r[i]?.[1] === key) {
          return String(r[i]?.[2] ?? "");
        }
      }
      return "";
    },
    [rows]
  );

  // Update a single value locally (in rows array) — ALWAYS stored as a string
  const setValue = useCallback((group, key, value) => {
    setRows((prev) => {
      const next = Array.isArray(prev) ? [...prev] : [];
      const startIdx = hasHeaderRow(next[0]) ? 1 : 0;

      const v = String(value ?? ""); // IMPORTANT: keep "0" as "0"

      for (let i = startIdx; i < next.length; i++) {
        if (next[i]?.[0] === group && next[i]?.[1] === key) {
          next[i] = [group, key, v];
          return next;
        }
      }

      next.push([group, key, v]);
      return next;
    });
  }, []);

  const saveAll = useCallback(async () => {
    setError("");

    try {
      const t = localStorage.getItem(TOKEN_KEY);
      setHasToken(!!t);

      if (!t) {
        clearSession("Missing admin token — please sign in again.");
        return { ok: false };
      }

      // Convert current rows to the API's expected canonical format: { updates: [{Group,Key,Value}] }
      const updates = [];

      const r = Array.isArray(rows) ? rows : [];
      const startIdx = hasHeaderRow(r[0]) ? 1 : 0;

      for (let i = startIdx; i < r.length; i++) {
        const [group, key, value] = r[i] || [];
        if (group && key) {
          updates.push({
            Group: String(group),
            Key: String(key),
            Value: String(value ?? ""), // keep exact string form
          });
        }
      }

      if (!updates.length) {
        throw new Error("No updates provided");
      }

      const resp = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${t}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ updates }),
      });

      const j = await resp.json().catch(() => null);

      if (!resp.ok || !j?.ok) {
        const msg = j?.error || `HTTP ${resp.status}`;
        if (looksLikeAuthError(resp.status, msg)) {
          clearSession();
          return { ok: false };
        }
        throw new Error(msg);
      }

      await load();
      return { ok: true };
    } catch (e) {
      const msg = e?.message || String(e);
      if (looksLikeAuthError(0, msg)) {
        clearSession();
        return { ok: false };
      }
      setError(msg);
      return { ok: false };
    }
  }, [rows, load, clearSession]);

  return {
    loading,
    email,
    error,
    hasToken, // NEW: useful for UI (disable Save / show sign-in prompt)
    rows,
    groups,
    getRawValue,
    setValue,
    reload: load,
    saveAll,
  };
}
