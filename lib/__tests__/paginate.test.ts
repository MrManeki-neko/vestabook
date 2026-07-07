import { describe, expect, it } from "vitest";
import { buildFrames } from "../paginate";

describe("buildFrames", () => {
  it("strips footnote markers, underscores, and asterisks", () => {
    const frames = buildFrames("This is a test[12] with _emphasis_ and *asterisks* here.");
    const text = frames.flat().join("");
    expect(text).not.toMatch(/\[12\]/);
    expect(text).not.toContain("_");
    expect(text).not.toContain("*");
  });

  it("transliterates accented capitals", () => {
    const frames = buildFrames("SIÈGE AND ÆTHER.");
    const text = frames.flat().join("");
    expect(text).toContain("E");
    expect(text).toContain("AE");
    expect(text).not.toMatch(/[ÈÆ]/);
  });

  it("splits a word longer than the board width across lines without losing characters", () => {
    const longWord = "A".repeat(15) + "B".repeat(15); // 30 chars, all letters preserved
    const frames = buildFrames(longWord + ".");
    const text = frames.flat().join("");
    for (const ch of longWord) {
      expect(text).toContain(ch);
    }
    expect(text.replace(/ /g, "")).toContain(longWord);
  });

  it("vertically centers a frame with fewer than 6 lines", () => {
    const frames = buildFrames("Short sentence.");
    expect(frames[0]).toHaveLength(6);
    const nonBlank = frames[0].filter((line) => line.trim() !== "");
    expect(nonBlank).toHaveLength(1);
    const firstNonBlankIndex = frames[0].findIndex((line) => line.trim() !== "");
    const lastNonBlankIndex = frames[0].length - 1 - [...frames[0]].reverse().findIndex((line) => line.trim() !== "");
    expect(firstNonBlankIndex).toBeGreaterThan(0);
    expect(lastNonBlankIndex).toBeLessThan(frames[0].length - 1);
  });

  it("cuts frames at the last line ending in ., ,, or ; within the 6-line window", () => {
    const text = Array.from({ length: 10 }, (_, i) => `word${i}`).join(" ") + ", more text here.";
    const frames = buildFrames(text);
    expect(frames.length).toBeGreaterThan(0);
    for (const frame of frames.slice(0, -1)) {
      const lastLine = [...frame].reverse().find((line) => line.trim() !== "");
      expect(lastLine?.trim()).toMatch(/[.,;]$/);
    }
  });
});
