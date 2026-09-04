export const COOKIE_NAME = "mychess_moves";
export const CLOCK_COOKIE_NAME = "mychess_clock";
export const COOKIE_MAX_AGE = 60 * 60 * 24; // 1 day

export type ClockCookieData = {
  timeControlMs: number | null;
  whiteTimeMs: number;
  blackTimeMs: number;
  activeColor: "w" | "b";
  lastTickAt: number;
  timedOutBy: "w" | "b" | null;
};

export function parseGameCookie(value: string | undefined): string[] {
  if (!value) return [];

  const candidates = [value, safeDecode(value)];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (
        Array.isArray(parsed) &&
        parsed.every((move) => typeof move === "string")
      ) {
        return parsed;
      }
    } catch {
      // try next encoding
    }
  }

  return [];
}

export function parseClockCookie(value: string | undefined): ClockCookieData | null {
  if (!value) return null;

  const candidates = [value, safeDecode(value)];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate) as ClockCookieData;
      if (typeof parsed.whiteTimeMs === "number" && typeof parsed.blackTimeMs === "number") {
        return parsed;
      }
    } catch {
      // try next encoding
    }
  }
  return null;
}

export function saveMovesToCookie(moves: string[]): void {
  const value = encodeURIComponent(JSON.stringify(moves));
  document.cookie = `${COOKIE_NAME}=${value}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
}

export function saveClockToCookie(data: ClockCookieData): void {
  const value = encodeURIComponent(JSON.stringify(data));
  document.cookie = `${CLOCK_COOKIE_NAME}=${value}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
}

export function clearMovesCookie(): void {
  document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
  document.cookie = `${CLOCK_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
}

function safeDecode(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
