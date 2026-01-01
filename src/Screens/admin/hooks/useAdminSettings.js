// src/Screens/admin/hooks/useAdminSettings.js
import { useCallback, useEffect, useMemo, useState } from "react";
import { rowsToGroups } from "../utils/rowsToGroups";

const TOKEN_KEY = "gbm_admin_id_token";

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
      setRows(json.rows || []);
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

  // Update a single value locally (in rows array)
  const setValue = useCallback((group, key, value) => {
    setRows((prev) => {
      const next = Array.isArray(prev) ? [...prev] : [];

      const hasHeader =
        Array.isArray(next[0]) &&
        next[0][0] === "Group" &&
        next[0][1] === "Key" &&
        next[0][2] === "Value";

      const startIdx = hasHeader ? 1 : 0;

      for (let i = startIdx; i < next.length; i++) {
        if (next[i]?.[0] === group && next[i]?.[1] === key) {
          next[i] = [group, key, String(value ?? "")];
          return next;
        }
      }

      next.push([group, key, String(value ?? "")]);
      return next;
    });
  }, []);

  const saveAll = useCallback(async () => {
    setError("");

    try {
      const t = localStorage.getItem(TOKEN_KEY);
      if (!t) throw new Error("Missing admin token. Please sign in again.");

      // Convert current rows to the API's expected format: { updates: [...] }
      const updates = [];

      const hasHeader =
        Array.isArray(rows?.[0]) &&
        rows[0][0] === "Group" &&
        rows[0][1] === "Key" &&
        rows[0][2] === "Value";

      const startIdx = hasHeader ? 1 : 0;

      for (let i = startIdx; i < (rows || []).length; i++) {
        const [group, key, value] = rows[i] || [];
        if (group && key) {
          updates.push({
            group,
            key,
            value: String(value ?? ""),
          });
        }
      }

      if (!updates.length) {
        throw new Error("No updates provided");
      }

      const r = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${t}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ updates }),
      });

      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);

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
    setValue,
    reload: load,
    saveAll,
  };
}
