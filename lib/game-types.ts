export type PlayerColor = "w" | "b";

export type GameStatus = "WAITING" | "ACTIVE" | "FINISHED";

export type GameSnapshot = {
  id: string;
  hostColor: PlayerColor;
  status: GameStatus;
  resignedBy: PlayerColor | null;
  timedOutBy: PlayerColor | null;
  timeControlMs: number | null;
  whiteTimeMs: number | null;
  blackTimeMs: number | null;
  clockStartedAt: string | null;
  moves: string[];
  createdAt: string;
  updatedAt: string;
};

export function snapshotFingerprint(snapshot: GameSnapshot): string {
  return [
    snapshot.updatedAt,
    snapshot.status,
    snapshot.resignedBy ?? "",
    snapshot.timedOutBy ?? "",
    snapshot.whiteTimeMs ?? "",
    snapshot.blackTimeMs ?? "",
    snapshot.clockStartedAt ?? "",
    snapshot.moves.length,
    snapshot.moves.at(-1) ?? "",
  ].join("|");
}
