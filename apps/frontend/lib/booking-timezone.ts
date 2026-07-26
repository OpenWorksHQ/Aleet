/**
 * Aleet booking times are US Eastern wall-clock times.
 *
 * The late-night window (12:00 AM–9:00 AM), membership prepaid hours, and
 * Maryland operating rules all evaluate in America/New_York. If the browser
 * encodes "7:00 AM" in the user's local timezone instead, two members can
 * pick the same trip and get different prices (e.g. full guest-looking
 * late-night rates vs prepaid daytime rates).
 */

export const BOOKING_TIMEZONE = "America/New_York";

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getZonedParts(date: Date, timeZone = BOOKING_TIMEZONE): ZonedParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = dtf.formatToParts(date);
  const out: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") out[part.type] = part.value;
  }

  // Intl may return hour "24" for midnight in some engines
  let hour = Number(out.hour);
  if (hour === 24) hour = 0;

  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour,
    minute: Number(out.minute),
    second: Number(out.second),
  };
}

function getTimeZoneOffsetMinutes(date: Date, timeZone = BOOKING_TIMEZONE): number {
  const zoned = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(
    zoned.year,
    zoned.month - 1,
    zoned.day,
    zoned.hour,
    zoned.minute,
    zoned.second,
  );
  return (asUtc - date.getTime()) / 60000;
}

/** Convert an Eastern (or other zone) civil datetime to a UTC epoch ms. */
export function zonedDateTimeToUtcMs(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0,
  timeZone = BOOKING_TIMEZONE,
): number {
  const approxUtcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  const offsetMinutes = getTimeZoneOffsetMinutes(new Date(approxUtcMs), timeZone);
  return approxUtcMs - offsetMinutes * 60 * 1000;
}

/** Calendar Y/M/D + wall-clock time as America/New_York → UTC ISO string. */
export function easternWallClockToIso(
  year: number,
  monthIndex: number,
  day: number,
  hour: number,
  minute: number,
): string {
  const ms = zonedDateTimeToUtcMs(
    year,
    monthIndex + 1,
    day,
    hour,
    minute,
    0,
    BOOKING_TIMEZONE,
  );
  return new Date(ms).toISOString();
}

/** Current civil date/time parts in America/New_York. */
export function getEasternNowParts(now = new Date()): ZonedParts {
  return getZonedParts(now, BOOKING_TIMEZONE);
}

/** True when `date`'s local Y/M/D matches today's Eastern calendar date. */
export function isSameEasternCalendarDay(date: Date, now = new Date()): boolean {
  const eastern = getEasternNowParts(now);
  return (
    date.getFullYear() === eastern.year &&
    date.getMonth() + 1 === eastern.month &&
    date.getDate() === eastern.day
  );
}
