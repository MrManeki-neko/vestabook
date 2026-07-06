import fs from "node:fs";
import path from "node:path";
import { buildFrames } from "./paginate";

const CONTENT_DIR = path.join(process.cwd(), "content");

let cachedBookIds: string[] | null = null;
const frameCache = new Map<string, string[][]>();

export function listBookIds(): string[] {
  if (!cachedBookIds) {
    cachedBookIds = fs
      .readdirSync(CONTENT_DIR)
      .filter((f) => f.endsWith(".txt"))
      .map((f) => f.slice(0, -4))
      .sort();
  }
  return cachedBookIds;
}

export function getBookFrames(bookId: string): string[][] {
  let frames = frameCache.get(bookId);
  if (!frames) {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, `${bookId}.txt`), "utf-8");
    frames = buildFrames(raw);
    frameCache.set(bookId, frames);
  }
  return frames;
}
