// src/helpers/applyFajrShouruqRule.js
import moment from "moment";

/**
 * Apply the special Fajr/Shouruq rule to an already-built upcoming list.
 *
 * Rule:
 *  - From *today's Fajr start* until *today's Shouruq start*:
 *      • Hide today's Shouruq from upcoming
 *      • Ensure tomorrow's Fajr is present (no duplicate)
 *
 * Inputs:
 *  - now: moment()
 *  - upcoming: Array<{ key, start: moment, jamaah?: moment, ... }>
 *  - fullTimeline: full array (today+tomorrow) from your timeline builder, each item: { key, start, jamaah, ... }
 *  - max: optional number to clamp length (kept if provided)
 *
 * Returns:
 *  - new upcoming array (sorted, clamped)
 */
export default function applyFajrShouruqRule({ now, upcoming, fullTimeline, max }) {
  if (!moment.isMoment(now)) return upcoming || [];

  const fajrToday = (fullTimeline || []).find(
    (p) => p?.key === "fajr" && p?.start?.isSame?.(now, "day")
  );
  const shouruqToday = (fullTimeline || []).find(
    (p) => p?.key === "sunrise" && p?.start?.isSame?.(now, "day")
  );
  const fajrTomorrow = (fullTimeline || []).find(
    (p) => p?.key === "fajr" && p?.start?.isAfter?.(now.clone().endOf("day"))
  );

  let next = Array.isArray(upcoming) ? [...upcoming] : [];

  // Between Fajr start and Shouruq start (today)
  if (
    fajrToday &&
    shouruqToday &&
    now.isSameOrAfter(fajrToday.start) &&
    now.isBefore(shouruqToday.start)
  ) {
    // 1) Hide today's Shouruq from list
    next = next.filter(
      (p) => !(p?.key === "sunrise" && p?.start?.isSame?.(now, "day"))
    );

    // 2) Ensure tomorrow's Fajr is present
    if (
      fajrTomorrow &&
      !next.some((p) => p?.key === "fajr" && p?.start?.isSame?.(fajrTomorrow.start, "minute"))
    ) {
      next.push(fajrTomorrow);
    }
  }

  // Sort + clamp
  next.sort((a, b) => a.start.valueOf() - b.start.valueOf());
  if (Number.isFinite(max) && max > 0) next = next.slice(0, max);

  return next;
}
