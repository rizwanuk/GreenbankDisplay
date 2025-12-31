// src/Screens/admin/panels/IslamicCalendarPanel.jsx
import React, { useMemo } from "react";

// Map Intl Islamic month number -> your sheet label keys
const HIJRI_MONTH_KEYS = [
  "muharram",
  "safar",
  "rabiAwal",
  "rabiThani",
  "jumadaAwal",
  "jumadaThani",
  "rajab",
  "shaban",
  "ramadan",
  "shawwal",
  "dhulQadah",
  "dhulHijjah",
];

function getGroup(groups, key) {
  const g = groups?.[key];
  return g && typeof g === "object" ? g : {};
}

function parseIntSafe(v, fallback = 0) {
  const n = parseInt(String(v ?? "").trim(), 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseBool(v) {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

function toSheetBool(b) {
  return b ? "TRUE" : "FALSE";
}

function PreviewRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-sm font-medium opacity-80">{label}</div>
      <div className="text-sm font-semibold text-right">{value}</div>
    </div>
  );
}

// Format Hijri using Intl (no moment-hijri dependency)
function formatHijri({
  date,
  offsetDays = 0,
  normalizeTo30DayMonths = false,
  labels = {},
}) {
  const d = new Date(date);
  if (offsetDays) d.setDate(d.getDate() + offsetDays);

  // Use Umm al-Qura for stable month numbering across browsers
  const fmt = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });

  const parts = fmt.formatToParts(d);
  const day = Number(parts.find((p) => p.type === "day")?.value || 1);
  const monthNum = Number(parts.find((p) => p.type === "month")?.value || 1); // 1..12
  const year = Number(parts.find((p) => p.type === "year")?.value || 1);

  const monthIndex = Math.min(Math.max(monthNum - 1, 0), 11);
  const monthKey = HIJRI_MONTH_KEYS[monthIndex];

  const monthName = labels?.[monthKey] || monthKey;

  const shownDay = normalizeTo30DayMonths ? Math.min(day, 30) : day;

  return `${shownDay} ${monthName} ${year} AH`;
}

function formatGregorianLong({ date }) {
  const d = new Date(date);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export default function IslamicCalendarPanel({ groups, setValue }) {
  const ic = getGroup(groups, "islamicCalendar");
  const labels = getGroup(groups, "labels"); // your sheet keys: rajab, shaban, etc.

  const offset = useMemo(() => parseIntSafe(ic?.offset, 0), [ic?.offset]);
  const normalize = useMemo(
    () => parseBool(ic?.normalizeTo30DayMonths),
    [ic?.normalizeTo30DayMonths]
  );

  const today = useMemo(() => new Date(), []);

  // ✅ Gregorian should always show real today (no offset)
  const gregLong = useMemo(() => formatGregorianLong({ date: today }), [today]);

  // ✅ Offset only affects Hijri display
  const hijriLong = useMemo(
    () =>
      formatHijri({
        date: today,
        offsetDays: offset,
        normalizeTo30DayMonths: normalize,
        labels,
      }),
    [today, offset, normalize, labels]
  );

  function setOffset(next) {
    const n = parseIntSafe(next, 0);
    setValue("islamicCalendar", "offset", String(n));
  }

  function setNormalize(nextBool) {
    setValue("islamicCalendar", "normalizeTo30DayMonths", toSheetBool(nextBool));
  }

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 md:p-4">
        <div className="text-sm md:text-base font-semibold">Today (preview)</div>
        <div className="mt-2 grid grid-cols-1 gap-2">
          <PreviewRow label="Gregorian (today)" value={gregLong} />
          <PreviewRow label="Hijri (with offset)" value={hijriLong} />
        </div>

        <div className="mt-3 text-xs md:text-sm opacity-70 leading-relaxed">
          Offset shifts the <b>Hijri date only</b> (e.g. -1 means show Hijri one
          day earlier). “Normalize to 30-day months” is stored as a setting for
          your main date logic to optionally use.
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block rounded-2xl border border-white/10 bg-white/[0.04] p-3 md:p-4">
          <div className="text-sm font-semibold">Hijri offset (days)</div>
          <div className="mt-1 text-xs opacity-70">Typical range is -2 to +2.</div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOffset(offset - 1)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
              title="Offset -1"
            >
              −
            </button>

            <input
              type="number"
              value={offset}
              onChange={(e) => setOffset(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/25"
            />

            <button
              type="button"
              onClick={() => setOffset(offset + 1)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
              title="Offset +1"
            >
              +
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {[-2, -1, 0, 1, 2].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setOffset(n)}
                className={[
                  "rounded-xl border px-3 py-2 text-xs",
                  n === offset
                    ? "border-emerald-300/30 bg-emerald-600/25"
                    : "border-white/10 bg-white/5 hover:bg-white/10",
                ].join(" ")}
              >
                {n >= 0 ? `+${n}` : n}
              </button>
            ))}
          </div>
        </label>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 md:p-4">
          <div className="text-sm font-semibold">Normalize to 30-day months</div>
          <div className="mt-1 text-xs opacity-70">
            If enabled, the display can clamp Hijri days to 30 (storage only).
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
            <div className="text-sm font-medium">Enabled</div>

            <button
              type="button"
              onClick={() => setNormalize(!normalize)}
              className={[
                "relative inline-flex h-9 w-16 items-center rounded-full border transition",
                normalize
                  ? "bg-emerald-600/70 border-emerald-300/30"
                  : "bg-white/5 border-white/15",
              ].join(" ")}
              aria-pressed={normalize}
            >
              <span
                className={[
                  "inline-block h-7 w-7 transform rounded-full bg-white transition",
                  normalize ? "translate-x-8" : "translate-x-1",
                ].join(" ")}
              />
            </button>
          </div>

          <div className="mt-3 text-xs opacity-70">
            Stored as:{" "}
            <span className="font-mono">{normalize ? "TRUE" : "FALSE"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
