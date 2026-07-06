import { listBookIds, getBookFrames } from "./library";
import { getState } from "./state";
import { getGlobalTick } from "./time";

export interface CurrentFrame {
  bookId: string;
  frameIndex: number;
  frame: string[];
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

// Deterministic 32-bit hash so every instance picks the same "random" book for a given slot
// with no shared state — real Math.random() would disagree across requests/instances.
function hashSlot(slot: number): number {
  let x = (slot + 0x9e3779b9) | 0;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
  x = x ^ (x >>> 15);
  return x >>> 0;
}

interface Resolved {
  bookId: string;
  frameIndex: number;
}

function resolveSingle(bookId: string, globalTick: number): Resolved {
  const frameCount = getBookFrames(bookId).length;
  return { bookId, frameIndex: mod(globalTick, frameCount) };
}

function resolveCycle(bookIds: string[], globalTick: number): Resolved {
  const counts = bookIds.map((id) => getBookFrames(id).length);
  const total = counts.reduce((a, b) => a + b, 0);
  let position = mod(globalTick, total);
  for (let i = 0; i < bookIds.length; i++) {
    if (position < counts[i]) return { bookId: bookIds[i], frameIndex: position };
    position -= counts[i];
  }
  return { bookId: bookIds[0], frameIndex: 0 };
}

function resolveRandom(bookIds: string[], globalTick: number): Resolved {
  let consumed = 0;
  let slot = 0;
  for (;;) {
    const candidate = bookIds[hashSlot(slot) % bookIds.length];
    const frameCount = getBookFrames(candidate).length;
    if (globalTick < consumed + frameCount) {
      return { bookId: candidate, frameIndex: globalTick - consumed };
    }
    consumed += frameCount;
    slot += 1;
  }
}

export function getCurrentFrame(): CurrentFrame {
  const bookIds = listBookIds();
  const state = getState();
  const globalTick = getGlobalTick();

  let resolved: Resolved;
  if (state.mode.type === "single" && bookIds.includes(state.mode.book)) {
    resolved = resolveSingle(state.mode.book, globalTick);
  } else if (state.mode.type === "random") {
    resolved = resolveRandom(bookIds, globalTick);
  } else {
    resolved = resolveCycle(bookIds, globalTick);
  }

  const frames = getBookFrames(resolved.bookId);
  return { ...resolved, frame: frames[resolved.frameIndex] };
}
