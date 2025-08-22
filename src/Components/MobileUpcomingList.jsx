// src/Components/MobileUpcomingList.jsx
import React from "react";
import moment from "moment";

// helpers
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";
const fmt = (d, hour12 = false) =>
  d
    ? new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12,
        timeZone: tz,
      }).format(d)
    : "—";

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// --- robust date coercion ---
function toDate(x) {
  if (!x) return null;
  if (x instanceof Date) return x;
  if (moment.isMoment(x)) return x.toDate();
  if (typeof x === "number") return new Date(x);
  // optionally handle ISO strings
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

// Label resolvers (prefer your Sheets labels; fall back to defaults)
function resolveKey(p) {
  // prefer explicit lookupKey, then builder key, then normalized name
  const n = (p?.name || "").toString().trim().toLowerCase();
  return (p?.lookupKey || p?.key || n || "").toLowerCase();
}

function resolveEnglishLabel(p, labels) {
  const key0 = resolveKey(p);
  const sunriseAliases = new Set(["shouruq", "ishraq", "shuruq", "shurooq", "shourouq"]);
  const key = sunriseAliases.has(key0) ? "sunrise" : key0;

  // try exact, then fallback to capitalized key/name
  return (
    labels?.[key] ??
    labels?.[key0] ??
    (key === "sunrise" ? "Shouruq" : cap(key || p?.name || ""))
  );
}

function resolveArabicLabel(p, arabicLabels, labels) {
  const key0 = resolveKey(p);
  const sunriseAliases = new Set(["shouruq", "ishraq", "shuruq", "shurooq", "shourouq"]);
  const key = sunriseAliases.has(key0) ? "sunrise" : key0;

  // prefer explicit Arabic map; allow ar_* fallback in labels if you store it there
  return (
    arabicLabels?.[key] ??
    arabicLabels?.[key0] ??
    labels?.[`ar_${key}`] ??
    labels?.[`ar_${key0}`] ??
    ""
  );
}

const GRID = "grid font-mono grid-cols-[1fr,10ch,10ch] gap-2";

const UpcomingHeaderRow = () => (
  <div className={`${GRID} text-[11px] uppercase px-3 py-1.5`}>
    <div className="font-sans tracking-wide opacity-70">Salah</div>
    <div className="justify-self-center tabular-nums tracking-normal opacity-70">Start</div>
    <div className="justify-self-end tabular-nums tracking-normal opacity-70">Jam’ah</div>
  </div>
);

const DayDivider = ({ children }) => (
  <div className="flex items-center gap-3 px-3 my-1.5">
    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    <span className="px-2 py-[3px] text-[11px] rounded-full bg-white/10 border border-white/15 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      {children}
    </span>
    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
  </div>
);

const UpcomingRow = ({ name, start, jamaah, arabic }) => (
  <div className={`${GRID} items-center px-3 py-2 odd:bg-white/[0.03]`}>
    <div className="font-sans font-semibold truncate text-[17px] leading-none">
      <span className="align-middle">{name}</span>
      {arabic ? (
        <span className="ml-2 text-[13px] opacity-75 font-arabic align-middle" lang="ar" dir="rtl">
          {arabic}
        </span>
      ) : null}
    </div>
    <div className="justify-self-center tabular-nums text-[17px] leading-none whitespace-nowrap">
      {start}
    </div>
    <div className="justify-self-end tabular-nums text-[17px] leading-none whitespace-nowrap">
      {jamaah ?? "—"}
    </div>
  </div>
);

export default function MobileUpcomingList({
  upcoming = [],
  is24Hour = false,
  todayRef,
  tomorrowRef,
  labels = {},
  arabicLabels = {},
}) {
  // Coerce dates up-front and drop any malformed entries
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
                key={`t-${p.key || p.name || i}-${i}`}
                name={resolveEnglishLabel(p, labels)}
                arabic={resolveArabicLabel(p, arabicLabels, labels)}
                start={fmt(p.start, !is24Hour)}
                jamaah={p.jamaah ? fmt(p.jamaah, !is24Hour) : null}
              />
            ))}

          {tomorrowItems.length > 0 && (
            <>
              <DayDivider>Tomorrow</DayDivider>
              {tomorrowItems.map((p, i) => (
                <UpcomingRow
                  key={`tm-${p.key || p.name || i}-${i}`}
                  name={resolveEnglishLabel(p, labels)}
                  arabic={resolveArabicLabel(p, arabicLabels, labels)}
                  start={fmt(p.start, !is24Hour)}
                  jamaah={p.jamaah ? fmt(p.jamaah, !is24Hour) : null}
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
