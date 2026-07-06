import fs from "node:fs";
import path from "node:path";
import { BOARD_COLS, BOARD_ROWS } from "./vestaboardCodes";

const BOOK_PATH = path.join(process.cwd(), "content", "book.txt");

function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function wrapWords(text: string, maxWidth: number): string[] {
  const words = text.split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word.length <= maxWidth ? word : word.slice(0, maxWidth);
  }
  if (current) lines.push(current);
  return lines;
}

function centerLine(line: string, width: number): string {
  const pad = width - line.length;
  const left = Math.floor(pad / 2);
  const right = pad - left;
  return " ".repeat(left) + line + " ".repeat(right);
}

function buildFrames(text: string): string[][] {
  const lines = wrapWords(text, BOARD_COLS);
  const frames: string[][] = [];

  for (let i = 0; i < lines.length; i += BOARD_ROWS) {
    const chunk = lines.slice(i, i + BOARD_ROWS);
    while (chunk.length < BOARD_ROWS) chunk.push("");
    frames.push(chunk.map((line) => centerLine(line, BOARD_COLS)));
  }
  return frames;
}

let cachedFrames: string[][] | null = null;

export function getFrames(): string[][] {
  if (!cachedFrames) {
    const raw = fs.readFileSync(BOOK_PATH, "utf-8");
    cachedFrames = buildFrames(normalizeText(raw));
  }
  return cachedFrames;
}

export function getCurrentFrameIndex(frameCount: number): number {
  const startTime = new Date(process.env.START_TIME || process.env.BUILD_TIME || 0).getTime();
  const intervalMinutes = Number(process.env.INTERVAL_MINUTES ?? 5);
  const elapsedFrames = Math.floor((Date.now() - startTime) / (intervalMinutes * 60_000));
  return ((elapsedFrames % frameCount) + frameCount) % frameCount;
}
