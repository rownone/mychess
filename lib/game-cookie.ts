export const COOKIE_NAME = "mychess_moves";
export const COOKIE_MAX_AGE = 60 * 60 * 24; // 1 day

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

export function saveMovesToCookie(moves: string[]): void {
  const value = encodeURIComponent(JSON.stringify(moves));
  document.cookie = `${COOKIE_NAME}=${value}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
}

export function clearMovesCookie(): void {
  document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
}

function safeDecode(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
