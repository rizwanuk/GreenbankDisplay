import React, { useMemo, useState } from "react";

export default function ReadOnlySettingsTable({ rows }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows.slice(1);
    return rows.slice(1).filter((r) => {
      const g = String(r?.[0] || "").toLowerCase();
      const k = String(r?.[1] || "").toLowerCase();
      const v = String(r?.[2] || "").toLowerCase();
      return g.includes(needle) || k.includes(needle) || v.includes(needle);
    });
  }, [rows, q]);

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
                  No matches.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
