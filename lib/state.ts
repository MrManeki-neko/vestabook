import fs from "node:fs";
import path from "node:path";

export type BookMode = { type: "cycle" } | { type: "single"; book: string } | { type: "random" };

export interface ControlState {
  mode: BookMode;
  pausedAt: string | null;
  accumulatedPauseMinutes: number;
}

export const DEFAULT_STATE: ControlState = {
  mode: { type: "cycle" },
  pausedAt: null,
  accumulatedPauseMinutes: 0,
};

const STATE_PATH = path.join(process.cwd(), "config", "state.json");

let cached: ControlState | null = null;

export function getState(): ControlState {
  if (!cached) {
    try {
      cached = JSON.parse(fs.readFileSync(STATE_PATH, "utf-8")) as ControlState;
    } catch {
      cached = DEFAULT_STATE;
    }
  }
  return cached;
}

export function isPausedNow(): boolean {
  return getState().pausedAt !== null;
}

// Minutes to subtract from raw elapsed time: everything accumulated from past pause/resume
// cycles, plus (if currently paused) the still-ongoing gap since `pausedAt`.
export function getPauseAdjustmentMinutes(now: Date): number {
  const state = getState();
  let minutes = state.accumulatedPauseMinutes;
  if (state.pausedAt) {
    minutes += (now.getTime() - new Date(state.pausedAt).getTime()) / 60_000;
  }
  return minutes;
}
