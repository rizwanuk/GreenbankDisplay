import React, { useMemo } from "react";

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

const UpcomingRow = ({ name, start, jamaah }) => (
  <div className={`${GRID} items-center px-3 py-2 odd:bg-white/[0.03]`}>
    <div className="font-sans font-semibold truncate text-[17px] leading-none">{name}</div>
    <div className="justify-self-center tabular-nums text-[17px] leading-none whitespace-nowrap">
      {start}
    </div>
    <div className="justify-self-end tabular-nums text-[17px] leading-none whitespace-nowrap">
      {jamaah ?? "—"}
    </div>
  </div>
);

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

export default function MobileUpcomingList({
  upcoming = [],
  is24Hour = false,
  todayRef,
  tomorrowRef,
}) {
  const normalize = (p) => ({
    ...p,
    start: p?.start?.toDate?.() ? p.start.toDate() : p.start,
    jamaah: p?.jamaah?.toDate?.() ? p.jamaah.toDate() : p.jamaah ?? null,
  });

  const normalized = useMemo(() => (upcoming || []).map(normalize), [upcoming]);

  const isSameDay = (a, b) =>
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const upcomingToday = normalized.filter((p) => isSameDay(p.start, todayRef));
  const upcomingTomorrow = normalized.filter((p) => isSameDay(p.start, tomorrowRef));

  return (
    <section className="mt-2">
      <div className="rounded-2xl border border-white/10 bg-white/[0.05]">
        <UpcomingHeaderRow />

        <div className="divide-y divide-white/10">
          {upcomingToday.length > 0 &&
            upcomingToday.map((p, i) => (
              <UpcomingRow
                key={`t-${p.key || p.name}-${i}`}
                name={p.name}
                start={fmt(p.start, !is24Hour)}
                jamaah={p.jamaah ? fmt(p.jamaah, !is24Hour) : null}
              />
            ))}

          {upcomingTomorrow.length > 0 && (
            <>
              <DayDivider>Tomorrow</DayDivider>
              {upcomingTomorrow.map((p, i) => (
                <UpcomingRow
                  key={`tm-${p.key || p.name}-${i}`}
                  name={p.name}
                  start={fmt(p.start, !is24Hour)}
                  jamaah={p.jamaah ? fmt(p.jamaah, !is24Hour) : null}
                />
              ))}
            </>
          )}

          {!upcomingToday.length && !upcomingTomorrow.length && (
            <div className="px-3 py-4 text-sm opacity-70">No upcoming times.</div>
          )}
        </div>

        <div className="h-2" />
      </div>
    </section>
  );
}
