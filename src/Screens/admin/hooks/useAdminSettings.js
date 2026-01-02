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

export function useAdminSettings() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const t = localStorage.getItem(TOKEN_KEY);
      const r = await fetch("/api/admin/settings", {
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });

      const text = await r.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(text || `HTTP ${r.status}`);
      }

      if (!r.ok || !json?.ok) {
        throw new Error(json?.error || `HTTP ${r.status}`);
      }

      setEmail(json.email || "");
      setRows(Array.isArray(json.rows) ? json.rows : []);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => rowsToGroups(rows), [rows]);

  /**
   * Get the raw string value from the underlying rows table.
   * This is useful to avoid "0" being coerced to 0 and then treated as falsy in UI fallbacks.
   */
  const getRawValue = useCallback((group, key) => {
    const r = Array.isArray(rows) ? rows : [];
    const startIdx = hasHeaderRow(r[0]) ? 1 : 0;

    for (let i = startIdx; i < r.length; i++) {
      if (r[i]?.[0] === group && r[i]?.[1] === key) {
        return String(r[i]?.[2] ?? "");
      }
    }
    return "";
  }, [rows]);

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
      if (!t) throw new Error("Missing admin token. Please sign in again.");

      // Convert current rows to the API's expected canonical format: { updates: [{Group,Key,Value}] }
      const updates = [];

      const r = Array.isArray(rows) ? rows : [];
      const startIdx = hasHeaderRow(r[0]) ? 1 : 0;

      for (let i = startIdx; i < r.length; i++) {
        const [group, key, value] = r[i] || [];

        // Only group+key must exist; value may legitimately be "0" or ""
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
      if (!resp.ok || !j?.ok) throw new Error(j?.error || `HTTP ${resp.status}`);

      await load();
      return { ok: true };
    } catch (e) {
      setError(e?.message || String(e));
      return { ok: false };
    }
  }, [rows, load]);

  return {
    loading,
    email,
    error,
    rows,
    groups,
    getRawValue, // NEW
    setValue,
    reload: load,
    saveAll,
  };
}
