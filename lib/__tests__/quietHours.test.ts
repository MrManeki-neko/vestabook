import { describe, expect, it } from "vitest";
import { awakeMinutesElapsed, isQuietNow, type QuietHoursConfig } from "../quietHours";
import { pauseMinutesBetween } from "../quietHours";

const cfg: QuietHoursConfig = { startMinute: 22 * 60, endMinute: 7 * 60, timeZone: "UTC" };

describe("awakeMinutesElapsed", () => {
  it("a full day contains 1440 - 540 = 900 awake minutes", () => {
    const start = new Date("2026-01-01T00:00:00Z");
    const now = new Date("2026-01-02T00:00:00Z");
    expect(awakeMinutesElapsed(start, now, cfg)).toBe(900);
  });

  it("stays 0 while start is inside the quiet window, until the window ends", () => {
    const start = new Date("2026-01-01T23:00:00Z");
    expect(awakeMinutesElapsed(start, new Date("2026-01-02T05:00:00Z"), cfg)).toBe(0);
    expect(awakeMinutesElapsed(start, new Date("2026-01-02T07:00:00Z"), cfg)).toBe(0);
    expect(awakeMinutesElapsed(start, new Date("2026-01-02T08:00:00Z"), cfg)).toBe(60);
  });

  it("startMinute === endMinute disables quiet hours", () => {
    const disabled: QuietHoursConfig = { startMinute: 60, endMinute: 60, timeZone: "UTC" };
    const start = new Date("2026-01-01T00:00:00Z");
    const now = new Date("2026-01-01T05:00:00Z");
    expect(awakeMinutesElapsed(start, now, disabled)).toBe(300);
  });
});

describe("isQuietNow", () => {
  it("reports quiet inside the wrapping window and awake outside it", () => {
    expect(isQuietNow(new Date("2026-01-01T23:00:00Z"), cfg)).toBe(true);
    expect(isQuietNow(new Date("2026-01-01T03:00:00Z"), cfg)).toBe(true);
    expect(isQuietNow(new Date("2026-01-01T12:00:00Z"), cfg)).toBe(false);
  });
});

describe("pauseMinutesBetween", () => {
  const originalStart = process.env.QUIET_HOURS_START;
  const originalEnd = process.env.QUIET_HOURS_END;
  const originalTz = process.env.QUIET_HOURS_TZ;

  it("excludes quiet-hour minutes from a pause spanning the quiet window", () => {
    process.env.QUIET_HOURS_START = "22:00";
    process.env.QUIET_HOURS_END = "07:00";
    process.env.QUIET_HOURS_TZ = "UTC";
    try {
      const start = new Date("2026-01-01T21:00:00Z");
      const now = new Date("2026-01-02T09:00:00Z");
      expect(pauseMinutesBetween(start, now)).toBe(180);
    } finally {
      process.env.QUIET_HOURS_START = originalStart;
      process.env.QUIET_HOURS_END = originalEnd;
      process.env.QUIET_HOURS_TZ = originalTz;
    }
  });
});
