import { BOARD_COLS, BOARD_ROWS } from "./vestaboardCodes";

// A line "ends cleanly" if it ends in one of these — used to prefer cutting a frame here
// over an arbitrary 6-line hard cut, so a 5-minute refresh doesn't land mid-clause.
const BOUNDARY_PUNCTUATION = /[.,;]$/;

function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\[\d+\]/g, "")          // Gutenberg footnote markers like [1] — strip entirely
    .replace(/[_*\[\]]/g, "")         // emphasis markup (_word_, *word*) and stray brackets
    .replace(/Æ/g, "AE")
    .replace(/æ/g, "ae")
    .replace(/Œ/g, "OE")
    .replace(/œ/g, "oe")
    .replace(/£/g, "")
    .normalize("NFD")                 // È → E + combining grave ...
    .replace(/[̀-ͯ]/g, "")  // ... then drop the combining marks
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
    if (current) {
      lines.push(current);
      current = "";
    }
    // A word longer than the board is split across lines rather than truncated.
    let rest = word;
    while (rest.length > maxWidth) {
      lines.push(rest.slice(0, maxWidth));
      rest = rest.slice(maxWidth);
    }
    current = rest;
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

// Groups wrapped lines into frames of up to BOARD_ROWS lines each, preferring to cut at the
// last line (within the window) that ends in qualifying punctuation. Falls back to a hard
// BOARD_ROWS-line cut when no punctuation boundary is found in the window at all.
function groupIntoFrames(lines: string[]): string[][] {
  const frames: string[][] = [];
  let cursor = 0;

  while (cursor < lines.length) {
    const window = lines.slice(cursor, cursor + BOARD_ROWS);

    let cut = window.length;
    for (let j = window.length; j >= 1; j--) {
      if (BOUNDARY_PUNCTUATION.test(window[j - 1])) {
        cut = j;
        break;
      }
    }

    const chunk = window.slice(0, cut);
    const topPad = Math.floor((BOARD_ROWS - chunk.length) / 2);
    const bottomPad = BOARD_ROWS - chunk.length - topPad;
    const padded = [...Array(topPad).fill(""), ...chunk, ...Array(bottomPad).fill("")];
    frames.push(padded.map((line) => centerLine(line, BOARD_COLS)));
    cursor += cut;
  }

  return frames;
}

export function buildFrames(raw: string): string[][] {
  return groupIntoFrames(wrapWords(normalizeText(raw), BOARD_COLS));
}
