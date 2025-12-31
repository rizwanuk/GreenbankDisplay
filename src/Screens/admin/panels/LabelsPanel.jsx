// src/Screens/admin/panels/LabelsPanel.jsx
import React, { useMemo, useState } from "react";

function getGroup(groups, groupKey) {
  const g = groups?.[groupKey];
  return g && typeof g === "object" ? g : {};
}

export default function LabelsPanel({ groups, setValue }) {
  const labels = getGroup(groups, "labels");
  const arabic = getGroup(groups, "labels.arabic");

  const [q, setQ] = useState("");

  const keys = useMemo(() => {
    const all = new Set([
      ...Object.keys(labels || {}),
      ...Object.keys(arabic || {}),
    ]);
    const arr = Array.from(all);
    arr.sort((a, b) => a.localeCompare(b));
    return arr;
  }, [labels, arabic]);

  const filteredKeys = useMemo(() => {
    const query = (q || "").trim().toLowerCase();
    if (!query) return keys;

    return keys.filter((k) => {
      const en = String(labels?.[k] ?? "").toLowerCase();
      const ar = String(arabic?.[k] ?? "").toLowerCase();
      return (
        k.toLowerCase().includes(query) ||
        en.includes(query) ||
        ar.includes(query)
      );
    });
  }, [q, keys, labels, arabic]);

  function onChangeEn(k, v) {
    setValue("labels", k, v);
  }
  function onChangeAr(k, v) {
    setValue("labels.arabic", k, v);
  }

  return (
    <div className="space-y-3">
      {/* Search bar (sticky inside panel) */}
      <div className="sticky top-[72px] md:top-[84px] z-10 -mx-4 md:-mx-5 px-4 md:px-5 py-3 bg-black/20 backdrop-blur border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="relative w-full">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search labels… (key, English, Arabic)"
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/25"
            />
            {q ? (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs border border-white/10 bg-white/5 hover:bg-white/10"
              >
                Clear
              </button>
            ) : null}
          </div>

          <div className="hidden sm:block text-xs opacity-70 shrink-0">
            {filteredKeys.length}/{keys.length}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filteredKeys.map((k) => (
          <div
            key={k}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 md:p-4"
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs opacity-70">Key</div>
                <div className="font-mono text-sm md:text-base truncate">
                  {k}
                </div>
              </div>

              <div className="shrink-0 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onChangeEn(k, "");
                    onChangeAr(k, "");
                  }}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
                  title="Clear both fields"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Inputs */}
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="block">
                <div className="text-xs opacity-70 mb-1">English</div>
                <input
                  value={labels?.[k] ?? ""}
                  onChange={(e) => onChangeEn(k, e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/25"
                  placeholder="English label"
                />
              </label>

              <label className="block">
                <div className="text-xs opacity-70 mb-1">Arabic</div>
                <input
                  value={arabic?.[k] ?? ""}
                  onChange={(e) => onChangeAr(k, e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/25"
                  placeholder="Arabic label"
                  dir="rtl"
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      {!filteredKeys.length ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm opacity-80">
          No matches.
        </div>
      ) : null}
    </div>
  );
}
