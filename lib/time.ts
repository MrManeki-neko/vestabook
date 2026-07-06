import { awakeMinutesElapsed, getQuietHoursConfig } from "./quietHours";
import { getPauseAdjustmentMinutes } from "./state";

// A single integer clock, shared by every mode in lib/sequencer.ts: how many
// INTERVAL_MINUTES-sized ticks have elapsed since START_TIME, excluding quiet-hours minutes
// and manually-paused minutes. This is the only place "now" enters the pagination logic.
export function getGlobalTick(): number {
  const startTime = new Date(process.env.START_TIME || process.env.BUILD_TIME || 0);
  const intervalMinutes = Number(process.env.INTERVAL_MINUTES ?? 5);
  const now = new Date();

  const quietCfg = getQuietHoursConfig();
  let elapsedMinutes = quietCfg
    ? awakeMinutesElapsed(startTime, now, quietCfg)
    : Math.floor((now.getTime() - startTime.getTime()) / 60_000);

  elapsedMinutes -= getPauseAdjustmentMinutes(now);
  if (elapsedMinutes < 0) elapsedMinutes = 0;

  return Math.floor(elapsedMinutes / intervalMinutes);
}
