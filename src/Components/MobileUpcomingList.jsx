// src/Components/MobileUpcomingList.jsx

import React, { useMemo } from "react";

const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";

function fmtTimeParts(d, is24Hour) {
  if (!d) return { time: "—", suffix: "" };
  const date = d?._isAMomentObject ? d.toDate() : d;

  // For 24h, keep the normal 2-digit output and no suffix
  if (is24Hour) {
    const formatted = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: tz,
    }).format(date);
    return { time: formatted, suffix: "" };
  }

  // For 12h, build from parts and strip the leading zero on the hour
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  }).formatToParts(date);

  let hour = parts.find((p) => p.type === "hour")?.value ?? "";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "";
  const dayPeriod = parts.find((p) => p.type === "dayPeriod")?.value ?? "";

  if (hour && hour.length === 2 && hour.startsWith("0")) hour = hour.slice(1); // ← remove leading 0

  return { time: `${hour}${minute ? ":" + minute : ""}`, suffix: dayPeriod };
}

const toTitle = (s = "") => s.slice(0, 1).toUpperCase() + s.slice(1);

export default function MobileUpcomingList({
  theme = {},
  upcoming = [],
  is24Hour = false,
  todayRef,
  tomorrowRef,
  labels = {},
}) {
  const t = {
    cardBg: theme.bgColor || "bg-white/[0.06]",
    cardText: theme.textColor || "text-white",
    cardBorder: theme.border || theme.borderColor || "border-white/10",
    cardRadius: theme.radius || "rounded-2xl",

    headerBg: theme.headerBgColor || "bg-white/[0.04]",
    headerText: theme.headerTextColor || "text-white/90",
    headerBorder: theme.headerBorderColor || "border-white/10",
    headerSize: theme.headerSize || "text-[14px]",

    rowSize: theme.rowSize || "text-[23px]",       // prayer names bigger
    timeSize: theme.timeSize || "text-[18px]",     // times
    suffixSize: theme.suffixSize || "text-[12px]", // am/pm smaller
    rowPadY: theme.rowPadY || "py-2",
    gapY: theme.gapY || "divide-y divide-white/10",
    labelWeight: theme.labelWeight || "font-bold",
    timeWeight: theme.timeWeight || "font-normal",
    separatorSize: theme.separatorSize || "text-[15px] font-semibold uppercase tracking-wide",
  };

  const rows = useMemo(() => {
    let seenTomorrow = false;
    return (upcoming || []).map((p, idx) => {
      const key = p.lookupKey || p.key || p.name || `row-${idx}`;
      const label =
        labels[key] ||
        labels[(key || "").toLowerCase()] ||
        toTitle(key || "—");

      const isTomorrow =
        tomorrowRef && p.start && new Date(p.start).getDate() === tomorrowRef.getDate();

      let separator = null;
      if (isTomorrow && !seenTomorrow) {
        separator = "Tomorrow";
        seenTomorrow = true;
      }

      return {
        id: `${key}-${idx}`,
        label,
        start: p.start || null,
        jamaah: p.jamaah || p.iqamah || null,
        separator,
      };
    });
  }, [upcoming, labels, tomorrowRef]);

  return (
    <section
      className={[
        "border shadow-sm px-3 pt-3 pb-2",
        t.cardBg,
        t.cardText,
        t.cardBorder,
        t.cardRadius,
      ].join(" ")}
    >
      {/* Header */}
      <div
        className={[
          "grid grid-cols-3 items-center rounded-xl",
          "px-3 py-2 mb-2",
          t.headerBg,
          t.headerText,
          t.headerSize,
        ].join(" ")}
        style={{ lineHeight: 1.05 }}
      >
        <div className="truncate text-left">Salah</div>
        <div className="truncate text-center">Start</div>
        <div className="truncate text-center">Jama’ah</div>
      </div>

      {/* Rows */}
      <div className={t.gapY}>
        {rows.map((r) => (
          <React.Fragment key={r.id}>
            {r.separator && (
              <div className={`text-center mt-2 mb-1 ${t.separatorSize}`}>
                {r.separator}
              </div>
            )}
            <div
              className={[
                "grid grid-cols-3 items-center px-3",
                t.rowPadY,
                t.rowSize,
              ].join(" ")}
              style={{ lineHeight: 1.2 }}
            >
              {/* Prayer Name - left, bigger, bold */}
              <div
                className={[
                  "truncate text-left",
                  t.labelWeight,
                ].join(" ")}
                title={r.label}
              >
                {r.label}
              </div>

              {/* Start Time */}
              <TimeCell time={r.start} is24Hour={is24Hour} t={t} />

              {/* Jama'ah Time */}
              <TimeCell time={r.jamaah} is24Hour={is24Hour} t={t} />
            </div>
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}

function TimeCell({ time, is24Hour, t }) {
  const { time: main, suffix } = fmtTimeParts(time, is24Hour);
  return (
    <div
      className={[
        "truncate text-center tabular-nums",
        t.timeSize,
        t.timeWeight,
        "flex justify-center items-baseline gap-1",
      ].join(" ")}
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      <span>{main}</span>
      {suffix && (
        <span className={t.suffixSize} style={{ lineHeight: 1 }}>
          {suffix}
        </span>
      )}
    </div>
  );
}
