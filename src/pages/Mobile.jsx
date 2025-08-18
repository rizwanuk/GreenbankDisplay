import React, { useMemo } from "react";

/**
 * Mobile screen (at /mobile)
 * - Header (condensed)
 * - Date pill (one line)
 * - Current prayer (one line)
 * - Next prayer (one line)
 * - Upcoming (each remaining prayer today on one line)
 *
 * Data source:
 *  - Reuses whatever you already have. Pass in via `prayers` prop, or
 *  - If you already put it in settings, it will try settings["prayers.today"].
 *  - As a last resort it will check window.__PRAYERS__.
 *
 * Expected shape for prayers:
 * {
 *   fajr: "04:52", sunrise: "06:17", dhuhr: "13:22",
 *   asr: "17:10", maghrib: "20:29", isha: "22:01"
 * }
 */
export default function Mobile({ settings = {}, prayers: propPrayers }) {
  const prayers = useMemo(() => {
    return (
      propPrayers ||
      settings["prayers.today"] ||
      (typeof window !== "undefined" ? window.__PRAYERS__ : null) ||
      null
    );
  }, [propPrayers, settings]);

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";

  const order = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
  const labels = {
    fajr: "Fajr",
    sunrise: "Sunrise",
    dhuhr: "Dhuhr",
    asr: "Asr",
    maghrib: "Maghrib",
    isha: "Isha",
  };

  function toToday(dateLike) {
    // Accepts "HH:mm" or ISO; returns a Date today in local TZ
    if (!dateLike) return null;
    const now = new Date();
    if (/^\d{1,2}:\d{2}$/.test(dateLike)) {
      const [h, m] = dateLike.split(":").map(Number);
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
      return d;
    }
    const d = new Date(dateLike);
    if (isNaN(d)) return null;
    // If the given ISO is a time today already, use it as is.
    return d;
  }

  const itemsToday = useMemo(() => {
    if (!prayers) return [];
    return order
      .map((k) => ({ key: k, label: labels[k], raw: prayers[k] }))
      .filter((x) => !!x.raw)
      .map((x) => ({ ...x, at: toToday(x.raw) }))
      .filter((x) => x.at instanceof Date && !isNaN(x.at));
  }, [prayers]);

  const now = new Date();

  // Current = the latest prayer whose time <= now (ignoring Sunrise as "current")
  const current = useMemo(() => {
    const onlySalah = itemsToday.filter((p) => p.key !== "sunrise");
    const past = onlySalah.filter((p) => p.at <= now);
    if (!past.length) return null;
    return past[past.length - 1];
  }, [itemsToday, now]);

  // Next = the first item in the future; if none left today, Fajr tomorrow (using today's time string)
  const next = useMemo(() => {
    const future = itemsToday.filter((p) => p.at > now);
    if (future.length) return future[0];
    // wrap to tomorrow's Fajr if available
    const fajr = itemsToday.find((p) => p.key === "fajr");
    if (!fajr) return null;
    const t = new Date(fajr.at.getTime() + 24 * 60 * 60 * 1000);
    return { ...fajr, at: t, isTomorrow: true };
  }, [itemsToday, now]);

  // Upcoming = all remaining today (exclude Sunrise unless you want it)
  const upcoming = useMemo(() => {
    return itemsToday
      .filter((p) => p.at > now && p.key !== "sunrise")
      .sort((a, b) => a.at - b.at);
  }, [itemsToday, now]);

  // Formatters
  const fmtTime = (d) =>
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: tz,
    }).format(d);

  const todayLong = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: tz,
  }).format(now);

  // UI bits (all single-line where required)
  const Pill = ({ left, right, className = "" }) => (
    <div
      className={[
        "flex items-center justify-between",
        "rounded-xl border border-white/15 bg-white/8",
        "px-3 py-2 text-[15px] leading-none",
        className,
      ].join(" ")}
    >
      <span className="font-semibold truncate">{left}</span>
      <span className="opacity-90 ml-3">{right}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white font-poppins">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0b0f1a]/90 backdrop-blur px-4 py-3 border-b border-white/10">
        <div className="text-lg font-semibold truncate">Greenbank Display</div>
        <div className="text-xs opacity-75">Mobile view</div>
      </header>

      <main className="px-4 py-4 space-y-3">
        {/* Date pill (one line) */}
        <Pill left={todayLong} right={new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz }).format(now)} />

        {/* Current prayer (one line). If none yet, show "–" gracefully */}
        <Pill
          left={`Now: ${current ? current.label : "—"}`}
          right={current ? fmtTime(current.at) : "—"}
        />

        {/* Next prayer (one line) */}
        <Pill
          left={`Next: ${next ? next.label : "—"}`}
          right={
            next
              ? `${fmtTime(next.at)}${next.isTomorrow ? " (tomorrow)" : ""}`
              : "—"
          }
        />

        {/* Upcoming: one line per remaining prayer today */}
        <section className="mt-2">
          <div className="text-xs uppercase tracking-wide opacity-70 mb-2">
            Upcoming today
          </div>
          <div className="space-y-2">
            {upcoming.length ? (
              upcoming.map((p) => (
                <Pill key={p.key} left={p.label} right={fmtTime(p.at)} />
              ))
            ) : (
              <div className="text-sm opacity-70">No more prayers today.</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
