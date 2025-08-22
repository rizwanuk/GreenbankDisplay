// src/Components/MobileUpcomingList.jsx
import React from "react";
import moment from "moment";

/* ---------- helpers ---------- */
function pad2(n) {
  return String(n).padStart(2, "0");
}

// Render time with am/pm as subscript (12h only)
function TimeWithSmallAmPm({ date, is24Hour }) {
  if (!date) return <>—</>;
  const d =
    date instanceof Date
      ? date
      : moment.isMoment(date)
      ? date.toDate()
      : typeof date === "number"
      ? new Date(date)
      : typeof date === "string"
      ? new Date(date)
      : null;
  if (!(d instanceof Date) || isNaN(d.getTime())) return <>—</>;

  if (is24Hour) {
    return (
      <span className="tabular-nums whitespace-nowrap">
        {pad2(d.getHours())}:{pad2(d.getMinutes())}
      </span>
    );
  }

  const h = d.getHours();
  const h12 = h % 12 || 12;
  const am = h < 12;
  return (
    <span className="tabular-nums whitespace-nowrap">
      {h12}:{pad2(d.getMinutes())}
      <span
        style={{ verticalAlign: "sub" }}
        className="text-[0.62em] ml-0.5 opacity-80 tracking-tight"
      >
        {am ? "am" : "pm"}
      </span>
    </span>
  );
}

function toDate(x) {
  if (!x) return null;
  if (x instanceof Date) return x;
  if (moment.isMoment(x)) return x.toDate();
  if (typeof x === "number") return new Date(x);
  if (typeof x === "string") {
    const d = new Date(x);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}
function sameYMD(a, b) {
  const da = toDate(a);
  const db = toDate(b);
  if (!da || !db) return false;
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
function normalizeKey(raw) {
  let k = String(raw || "").toLowerCase().normalize("NFKD");
  k = k.replace(/[’'‘]/g, "").replace(/\s+/g, "");
  if (k === "ishaa") k = "isha";
  if (k === "magrib") k = "maghrib";
  if (["shouruq", "shuruq", "shurooq", "shourouq", "ishraq"].includes(k)) k = "sunrise";
  if (k.startsWith("jum")) k = "jummah";
  return k;
}
function resolveKey(p) {
  const base = p?.lookupKey || p?.key || p?.name || "";
  return normalizeKey(base);
}
function resolveEnglishLabel(p, labels) {
  const key = resolveKey(p);
  return labels?.[key] ?? (key === "sunrise" ? "Shouruq" : cap(key || p?.name || ""));
}

/* ---------- UI pieces ---------- */

// Header: 3 equal columns (Salah / Start / Jam’ah)
const UpcomingHeaderRow = () => (
  <div className="grid grid-cols-3 items-center px-3 py-1.5 text-[11px] uppercase">
    <div className="font-sans tracking-wide opacity-70 whitespace-nowrap">Salah</div>
    <div className="text-center tabular-nums tracking-normal opacity-70 whitespace-nowrap">
      Start
    </div>
    <div className="text-right tabular-nums tracking-normal opacity-70 whitespace-nowrap">
      Jam’ah
    </div>
  </div>
);

// Rows: 3 equal columns (name / start / jam’ah), single-line, bigger fonts
const UpcomingRow = ({ name, start, jamaah, is24Hour }) => (
  <div className="grid grid-cols-3 items-center px-3 py-2 odd:bg-white/[0.03]">
    <div className="min-w-0 font-sans font-semibold text-[20px] leading-none whitespace-nowrap overflow-hidden text-ellipsis">
      {name}
    </div>
    <div className="text-[19px] leading-none text-center whitespace-nowrap">
      <TimeWithSmallAmPm date={start} is24Hour={is24Hour} />
    </div>
    <div className="text-[19px] leading-none text-right whitespace-nowrap">
      {jamaah ? <TimeWithSmallAmPm date={jamaah} is24Hour={is24Hour} /> : "—"}
    </div>
  </div>
);

/* ---------- Main component ---------- */
export default function MobileUpcomingList({
  upcoming = [],
  is24Hour = false,
  todayRef,
  tomorrowRef,
  labels = {},
}) {
  // Coerce dates and drop malformed entries
  const sanitized = (upcoming || [])
    .map((p) => {
      const start = toDate(p.start);
      const jamaah = toDate(p.jamaah);
      return start ? { ...p, start, jamaah } : null;
    })
    .filter(Boolean);

  const todayItems = sanitized.filter((p) => sameYMD(p.start, toDate(todayRef)));
  const tomorrowItems = sanitized.filter((p) => sameYMD(p.start, toDate(tomorrowRef)));

  return (
    <section className="mt-2">
      <div className="rounded-2xl border border-white/10 bg-white/[0.05]">
        <UpcomingHeaderRow />
        <div className="divide-y divide-white/10">
          {todayItems.length > 0 &&
            todayItems.map((p, i) => (
              <UpcomingRow
                key={`t-${p.key || p.lookupKey || p.name || i}-${i}`}
                name={resolveEnglishLabel(p, labels)}
                start={p.start}
                jamaah={p.jamaah}
                is24Hour={is24Hour}
              />
            ))}

          {tomorrowItems.length > 0 && (
            <>
              <div className="flex items-center gap-3 px-3 my-1.5">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <span className="px-2 py-[3px] text-[11px] rounded-full bg-white/10 border border-white/15 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
                  Tomorrow
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
              {tomorrowItems.map((p, i) => (
                <UpcomingRow
                  key={`tm-${p.key || p.lookupKey || p.name || i}-${i}`}
                  name={resolveEnglishLabel(p, labels)}
                  start={p.start}
                  jamaah={p.jamaah}
                  is24Hour={is24Hour}
                />
              ))}
            </>
          )}

          {!todayItems.length && !tomorrowItems.length && (
            <div className="px-3 py-4 text-sm opacity-70">No upcoming times.</div>
          )}
        </div>
        <div className="h-2" />
      </div>
    </section>
  );
}
