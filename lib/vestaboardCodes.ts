// Official Vestaboard character-code table (blank + A-Z + digits + punctuation).
// https://docs.vestaboard.com/characters
const CHAR_CODES: Record<string, number> = {
  " ": 0,
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9, J: 10,
  K: 11, L: 12, M: 13, N: 14, O: 15, P: 16, Q: 17, R: 18, S: 19, T: 20,
  U: 21, V: 22, W: 23, X: 24, Y: 25, Z: 26,
  "1": 27, "2": 28, "3": 29, "4": 30, "5": 31, "6": 32, "7": 33, "8": 34, "9": 35, "0": 36,
  "!": 37, "@": 38, "#": 39, "$": 40, "(": 41, ")": 42,
  "-": 44, "+": 46, "&": 47, "=": 48, ";": 49, ":": 50,
  "'": 52, '"': 53, "%": 54, ",": 55, ".": 56, "/": 59, "?": 60,
};

export const BOARD_COLS = 22;
export const BOARD_ROWS = 6;

export function encodeLine(line: string): number[] {
  const padded = line.slice(0, BOARD_COLS).padEnd(BOARD_COLS, " ");
  return Array.from(padded).map((ch) => CHAR_CODES[ch] ?? 0);
}
