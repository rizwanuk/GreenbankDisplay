import React, { useEffect, useMemo, useState } from "react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function pad2(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return String(n ?? "");
  return String(x).padStart(2, "0");
}

function toInt(v) {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : null;
}

function norm(s) {
  return String(s ?? "").trim().toLowerCase();
}

function isValidTimeHHMM(v) {
  const s = String(v ?? "").trim();
  if (s === "") return true; // allow clearing
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return false;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}

function normalizeTime(v) {
  const s = String(v ?? "").trim();
  if (s === "") return "";
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return s;
  const hh = pad2(m[1]);
  return `${hh}:${m[2]}`;
}

export default function PrayerTimesPanel() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  // Month filter: 0 = All, 1..12 = Jan..Dec
  const [monthFilter, setMonthFilter] = useState(0);

  // Column visibility toggles
  const [showStart, setShowStart] = useState(true);   // Adhan
  const [showJamaah, setShowJamaah] = useState(true); // Iqamah
  const [showSunrise, setShowSunrise] = useState(true);

  // Editing
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  // Dirty map: key = `${absRowIndex}:${colKey}` -> { from, to, absRowIndex, colIndex, colKey }
  const [dirty, setDirty] = useState(() => new Map());

  async function load() {
    setLoading(true);
    setErr("");
    setSavedMsg("");

    try {
      const token = localStorage.getItem("gbm_admin_id_token");
      const r = await fetch("/api/admin/prayertimes", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.error || `Request failed (${r.status})`);

      setData(j);
      setDirty(new Map());
    } catch (e) {
      setErr(e?.message || String(e));
      setData(null);
      setDirty(new Map());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // ✅ Support BOTH response shapes:
  // 1) { headers: [...], rows: [...] }
  // 2) { rows: [ headersRow, ...bodyRows ] }
  const view = useMemo(() => {
    const sheetName = data?.sheet || "PrayerTimes";

    const hasHeadersArray = Array.isArray(data?.headers) && data.headers.length > 0;
    const rowsArray = Array.isArray(data?.rows) ? data.rows : [];

    const headersRow = hasHeadersArray ? data.headers : (rowsArray[0] || []);
    const bodyRows = hasHeadersArray ? rowsArray : rowsArray.slice(1);

    // Header -> index map
    const idx = {};
    headersRow.forEach((h, i) => {
      const key = norm(h);
      if (key) idx[key] = i;
    });

    const dayIdx = idx["day"];
    const monthIdx = idx["month"];

    const formatDayLabel = (row) => {
      const d = dayIdx != null ? row?.[dayIdx] : "";
      const m = monthIdx != null ? row?.[monthIdx] : "";
      const di = toInt(d);
      const mi = toInt(m);
      if (!di || !mi || mi < 1 || mi > 12) return `${d ?? ""} ${m ?? ""}`.trim();
      return `${pad2(di)} ${MONTHS[mi - 1]}`;
    };

    const getMonthNumber = (row) => {
      const m = monthIdx != null ? row?.[monthIdx] : null;
      const mi = toInt(m);
      return mi && mi >= 1 && mi <= 12 ? mi : null;
    };

    // Stable absRowIndex = index within bodyRows
    const allWithAbs = bodyRows.map((row, absRowIndex) => ({ row, absRowIndex }));

    const filteredWithAbs =
      monthFilter === 0 ? allWithAbs : allWithAbs.filter(({ row }) => getMonthNumber(row) === monthFilter);

    const cols = [];

    cols.push({
      key: "dayLabel",
      header: "Day",
      readOnly: true,
      cell: ({ row }) => formatDayLabel(row),
      className: "font-semibold",
    });

    // Sunrise
    const shouruqIdx = idx["shouruq"];
    const shouruqHeader = shouruqIdx != null ? headersRow[shouruqIdx] : null;
    if (showSunrise && shouruqIdx != null && shouruqHeader) {
      cols.push({
        key: "shouruq",
        header: "Shouruq",
        colIndex: shouruqIdx,
        colKey: shouruqHeader,
        kind: "time",
      });
    }

    const prayerDefs = [
      { key: "fajr", adhan: "fajr adhan", iqamah: "fajr iqamah" },
      { key: "dhuhr", adhan: "dhuhr adhan", iqamah: "dhuhr iqamah" },
      { key: "asr", adhan: "asr adhan", iqamah: "asr iqamah" },
      { key: "maghrib", adhan: "maghrib adhan", iqamah: "maghrib iqamah" },
      { key: "isha", adhan: "isha adhan", iqamah: "isha iqamah" },
    ];

    prayerDefs.forEach((p) => {
      const aIdx = idx[p.adhan];
      const iIdx = idx[p.iqamah];

      const labelBase = p.key[0].toUpperCase() + p.key.slice(1);

      const aHeader = aIdx != null ? headersRow[aIdx] : null;
      const iHeader = iIdx != null ? headersRow[iIdx] : null;

      if (showStart && aIdx != null && aHeader) {
        cols.push({
          key: `${p.key}_adhan`,
          header: `${labelBase} Adhan`,
          colIndex: aIdx,
          colKey: aHeader,
          kind: "time",
        });
      }
      if (showJamaah && iIdx != null && iHeader) {
        cols.push({
          key: `${p.key}_iqamah`,
          header: `${labelBase} Iqamah`,
          colIndex: iIdx,
          colKey: iHeader,
          kind: "time",
        });
      }
    });

    return {
      sheetName,
      headersRow,
      bodyRows,
      rows: filteredWithAbs,
      cols,
      totalRows: bodyRows.length,
      filteredCount: filteredWithAbs.length,
    };
  }, [data, monthFilter, showStart, showJamaah, showSunrise]);

  function getCellDisplayValue(absRowIndex, colIndex, colKey) {
    const baseRow = view.bodyRows?.[absRowIndex] || [];
    const base = baseRow?.[colIndex] ?? "";
    const key = `${absRowIndex}:${colKey}`;
    const patch = dirty.get(key);
    return patch ? patch.to : base;
  }

  function setCellValue(absRowIndex, colIndex, colKey, nextRaw) {
    const baseRow = view.bodyRows?.[absRowIndex] || [];
    const from = String(baseRow?.[colIndex] ?? "");
    const to = String(nextRaw ?? "");
    const key = `${absRowIndex}:${colKey}`;

    if (to === from) {
      if (dirty.has(key)) {
        const m = new Map(dirty);
        m.delete(key);
        setDirty(m);
      }
      return;
    }

    const m = new Map(dirty);
    m.set(key, { from, to, absRowIndex, colIndex, colKey });
    setDirty(m);
  }

  function discardChanges() {
    setDirty(new Map());
    setSavedMsg("");
    setErr("");
  }

  async function onSave() {
    setErr("");
    setSavedMsg("");

    if (!editMode) return;

    if (dirty.size === 0) {
      setSavedMsg("No changes to save.");
      setTimeout(() => setSavedMsg(""), 1200);
      return;
    }

    // Validate
    for (const [, v] of dirty.entries()) {
      const normalized = normalizeTime(v.to);
      if (!isValidTimeHHMM(normalized)) {
        setErr(
          `Invalid time "${v.to}" at sheet row ${v.absRowIndex + 2} (${v.colKey}). Use HH:MM (e.g. 07:15).`
        );
        return;
      }
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("gbm_admin_id_token");

      // ✅ Format expected by API: { sheet, patches: [{ r, c, value }] }
      // r = 1-based sheet row number (header is row 1, first data row is 2)
      // c = 1-based sheet column number (A=1)
      const patches = Array.from(dirty.values()).map((v) => ({
        r: 2 + v.absRowIndex,
        c: 1 + v.colIndex,
        value: normalizeTime(v.to),
      }));

      const r = await fetch("/api/admin/prayertimes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sheet: "PrayerTimes",
          patches,
        }),
      });

      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.error || `Save failed (${r.status})`);

      setSavedMsg("Saved");
      setTimeout(() => setSavedMsg(""), 1200);

      await load();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  const dirtyCount = dirty.size;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold">Prayer Times</div>
          <div className="text-sm opacity-70 flex flex-wrap gap-x-3 gap-y-1">
            <span>
              Sheet: <span className="font-mono">{view.sheetName}</span>
            </span>
            <span>
              Rows: <span className="font-mono">{view.totalRows}</span>
            </span>
            {monthFilter ? (
              <span>
                Showing: <span className="font-mono">{view.filteredCount}</span>
              </span>
            ) : null}
            {dirtyCount ? (
              <span>
                Changes: <span className="font-mono">{dirtyCount}</span>
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={load}
            className="px-3 py-2 rounded-md bg-white/10 hover:bg-white/15 border border-white/10 text-sm"
            disabled={saving}
          >
            Refresh
          </button>

          <button
            onClick={() => setEditMode((v) => !v)}
            className="px-3 py-2 rounded-md bg-white/10 hover:bg-white/15 border border-white/10 text-sm"
            disabled={saving}
          >
            {editMode ? "View mode" : "Edit mode"}
          </button>

          <button
            onClick={onSave}
            disabled={saving || !editMode || dirtyCount === 0}
            className="px-3 py-2 rounded-md bg-emerald-600/80 hover:bg-emerald-600 border border-emerald-400/20 text-sm disabled:opacity-60"
            title={!editMode ? "Enable Edit mode first" : dirtyCount === 0 ? "No changes" : "Save changes"}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {savedMsg ? (
        <div className="rounded-lg border border-emerald-400/20 bg-emerald-600/15 p-3 text-sm">
          ✅ {savedMsg}
        </div>
      ) : null}

      {err ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm">
          <div className="font-semibold">Error</div>
          <div className="opacity-90 mt-1">{err}</div>
        </div>
      ) : null}

      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="text-sm font-semibold mb-2">Month</div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setMonthFilter(0)}
            className={`px-3 py-1.5 rounded-md text-sm border ${
              monthFilter === 0
                ? "bg-emerald-600/30 border-emerald-400/30"
                : "bg-white/5 border-white/10 hover:bg-white/10"
            }`}
            disabled={saving}
          >
            All
          </button>

          {MONTHS.map((m, i) => {
            const val = i + 1;
            const active = monthFilter === val;
            return (
              <button
                key={m}
                onClick={() => setMonthFilter(val)}
                className={`px-3 py-1.5 rounded-md text-sm border ${
                  active
                    ? "bg-emerald-600/30 border-emerald-400/30"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
                disabled={saving}
              >
                {m}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2 select-none">
            <input
              type="checkbox"
              checked={showStart}
              onChange={(e) => setShowStart(e.target.checked)}
              disabled={saving}
            />
            <span>Show Start (Adhan)</span>
          </label>

          <label className="flex items-center gap-2 select-none">
            <input
              type="checkbox"
              checked={showJamaah}
              onChange={(e) => setShowJamaah(e.target.checked)}
              disabled={saving}
            />
            <span>Show Jama&apos;ah (Iqamah)</span>
          </label>

          <label className="flex items-center gap-2 select-none">
            <input
              type="checkbox"
              checked={showSunrise}
              onChange={(e) => setShowSunrise(e.target.checked)}
              disabled={saving}
            />
            <span>Show Shouruq</span>
          </label>

          {dirtyCount > 0 && (
            <button
              onClick={discardChanges}
              className="px-3 py-1.5 rounded-md text-sm border border-white/10 bg-white/5 hover:bg-white/10"
              disabled={saving}
            >
              Discard changes
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">Loading…</div>
      ) : !data ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm opacity-80">
          No data loaded.
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
          <div className="overflow-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="sticky top-0 bg-black/40 backdrop-blur border-b border-white/10">
                <tr>
                  {view.cols.map((c) => (
                    <th key={c.key} className="text-left font-semibold px-3 py-2 whitespace-nowrap">
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {view.rows.map(({ row, absRowIndex }) => (
                  <tr key={absRowIndex} className="border-b border-white/5 hover:bg-white/5">
                    {view.cols.map((c) => {
                      if (c.readOnly) {
                        return (
                          <td key={c.key} className={`px-3 py-2 whitespace-nowrap ${c.className || ""}`}>
                            {c.cell({ row, absRowIndex })}
                          </td>
                        );
                      }

                      const current = getCellDisplayValue(absRowIndex, c.colIndex, c.colKey);
                      const dKey = `${absRowIndex}:${c.colKey}`;
                      const isDirty = dirty.has(dKey);
                      const invalid = editMode && isDirty && !isValidTimeHHMM(normalizeTime(current));

                      return (
                        <td key={c.key} className="px-3 py-2 whitespace-nowrap">
                          {editMode ? (
                            <input
                              value={current}
                              onChange={(e) => setCellValue(absRowIndex, c.colIndex, c.colKey, e.target.value)}
                              onBlur={(e) => setCellValue(absRowIndex, c.colIndex, c.colKey, normalizeTime(e.target.value))}
                              placeholder="HH:MM"
                              className={[
                                "w-[72px] rounded-md border px-2 py-1 bg-black/20 outline-none",
                                invalid ? "border-red-500/60" : isDirty ? "border-emerald-400/40" : "border-white/10",
                              ].join(" ")}
                            />
                          ) : (
                            <span className={isDirty ? "text-emerald-200" : ""}>{current}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-3 py-2 text-xs opacity-70 border-t border-white/10">
            {editMode
              ? "Edit times (HH:MM). Changes are highlighted. Click Save to write back to Google Sheets."
              : "Read-only view. Enable Edit mode to make changes."}
          </div>
        </div>
      )}
    </div>
  );
}
