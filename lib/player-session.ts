export const PLAYER_SESSION_KEY = "mychess_player";

export type PlayerColor = "w" | "b";

export type PlayerSession = {
  gameId: string;
  token: string;
  color: PlayerColor;
};

export function savePlayerSession(session: PlayerSession): void {
  localStorage.setItem(PLAYER_SESSION_KEY, JSON.stringify(session));
}

export function loadPlayerSession(gameId: string): PlayerSession | null {
  const raw = localStorage.getItem(PLAYER_SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PlayerSession;
    if (parsed.gameId !== gameId) return null;
    if (parsed.color !== "w" && parsed.color !== "b") return null;
    if (typeof parsed.token !== "string" || !parsed.token) return null;
    return parsed;
  } catch {
    return null;
  }
}
