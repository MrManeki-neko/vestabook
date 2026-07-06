// Fixed daily quiet-hours window, configured via env vars to match whatever schedule is set
// in the Vestaboard app (there's no API to read it back). Deliberately ignores DST shifts
// between `start` and `now` — a few minutes of drift twice a year is an acceptable tradeoff
// for keeping this a pure function of (now, config) with no stored state.

export interface QuietHoursConfig {
  startMinute: number; // minutes since local midnight
  endMinute: number;
  timeZone: string;
}

function parseTimeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + (m || 0);
}

function getUtcOffsetMinutes(date: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return Math.round((asUtc - date.getTime()) / 60_000);
}

export function getQuietHoursConfig(): QuietHoursConfig | null {
  const start = process.env.QUIET_HOURS_START;
  const end = process.env.QUIET_HOURS_END;
  if (!start || !end) return null;
  return {
    startMinute: parseTimeToMinutes(start),
    endMinute: parseTimeToMinutes(end),
    timeZone: process.env.QUIET_HOURS_TZ || "UTC",
  };
}

function isQuietMinuteOfDay(minuteOfDay: number, cfg: QuietHoursConfig): boolean {
  const { startMinute, endMinute } = cfg;
  if (startMinute === endMinute) return false;
  return startMinute < endMinute
    ? minuteOfDay >= startMinute && minuteOfDay < endMinute
    : minuteOfDay >= startMinute || minuteOfDay < endMinute;
}

export function isQuietNow(date: Date, cfg: QuietHoursConfig): boolean {
  const offset = getUtcOffsetMinutes(date, cfg.timeZone);
  const localMinute = Math.floor(date.getTime() / 60_000) + offset;
  const minuteOfDay = ((localMinute % 1440) + 1440) % 1440;
  return isQuietMinuteOfDay(minuteOfDay, cfg);
}

// Minutes elapsed between start and now, excluding any minute that falls inside the quiet
// window on any day. This is what makes progression pause during quiet hours and resume
// with the next section afterward, instead of jumping ahead.
export function awakeMinutesElapsed(start: Date, now: Date, cfg: QuietHoursConfig): number {
  if (now.getTime() <= start.getTime()) return 0;

  const quietLength =
    cfg.startMinute === cfg.endMinute
      ? 0
      : cfg.startMinute < cfg.endMinute
        ? cfg.endMinute - cfg.startMinute
        : 1440 - cfg.startMinute + cfg.endMinute;
  const awakeLength = 1440 - quietLength;
  if (awakeLength === 1440) {
    return Math.floor((now.getTime() - start.getTime()) / 60_000);
  }

  const offset = getUtcOffsetMinutes(now, cfg.timeZone);
  const startEpochMinute = Math.floor(start.getTime() / 60_000) + offset;
  const nowEpochMinute = Math.floor(now.getTime() / 60_000) + offset;
  const totalMinutes = nowEpochMinute - startEpochMinute;

  const fullDays = Math.floor(totalMinutes / 1440);
  const remainder = totalMinutes - fullDays * 1440;

  let awake = fullDays * awakeLength;
  const startPhase = ((startEpochMinute % 1440) + 1440) % 1440;
  for (let i = 0; i < remainder; i++) {
    const phase = (startPhase + i) % 1440;
    if (!isQuietMinuteOfDay(phase, cfg)) awake++;
  }
  return awake;
}
