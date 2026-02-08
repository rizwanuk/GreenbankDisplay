import React, { useMemo, useState } from "react";

export default function ReadOnlySettingsTable({ rows }) {
  const [q, setQ] = useState("");

  // ✅ Guard: rows might be undefined/null while data is loading or panel is missing data
  const safeRows = Array.isArray(rows) ? rows : [];
  const hasAnyRows = safeRows.length > 1; // 1st row is header in your sheet shape

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();

    // If no data loaded yet
    if (!hasAnyRows) return [];

    // No search: return all data rows (skip header)
    if (!needle) return safeRows.slice(1);

    // Search: filter data rows
    return safeRows.slice(1).filter((r) => {
      const g = String(r?.[0] || "").toLowerCase();
      const k = String(r?.[1] || "").toLowerCase();
      const v = String(r?.[2] || "").toLowerCase();
      return g.includes(needle) || k.includes(needle) || v.includes(needle);
    });
  }, [safeRows, q, hasAnyRows]);

  const emptyMessage = !hasAnyRows
    ? "No settings loaded yet."
    : "No matches.";

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">All settings (read-only)</h2>
          <p className="text-sm text-white/60 mt-1">
            Quick check what’s currently in the sheet.
          </p>
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search group / key / value…"
          className="w-full sm:w-[280px] rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
        />
      </div>

      <div className="mt-4 max-h-[360px] overflow-auto rounded-lg border border-white/10">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-black">
            <tr className="text-white/70">
              <th className="text-left p-2 border-b border-white/10">Group</th>
              <th className="text-left p-2 border-b border-white/10">Key</th>
              <th className="text-left p-2 border-b border-white/10">Value</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, idx) => (
              <tr key={idx} className="odd:bg-white/0 even:bg-white/5">
                <td className="p-2 border-b border-white/5 align-top">{r?.[0]}</td>
                <td className="p-2 border-b border-white/5 align-top">{r?.[1]}</td>
                <td className="p-2 border-b border-white/5 align-top whitespace-pre-wrap break-words">
                  {r?.[2]}
                </td>
              </tr>
            ))}

            {!filtered.length ? (
              <tr>
                <td colSpan={3} className="p-3 text-white/60">
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
