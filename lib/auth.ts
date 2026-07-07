import { timingSafeEqual } from "node:crypto";

// Constant-time comparison; also returns false when the expected secret is unconfigured,
// so an unset env var can never be matched.
export function secretMatches(
  provided: string | null,
  expected: string | undefined
): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
