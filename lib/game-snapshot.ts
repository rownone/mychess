import { prisma } from "@/lib/prisma";
import type { GameSnapshot } from "@/lib/game-types";

export async function findGameSnapshot(id: string): Promise<GameSnapshot | null> {
  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      moves: {
        orderBy: { ply: "asc" },
        select: { san: true },
      },
    },
  });

  if (!game) return null;

  return {
    id: game.id,
    hostColor: game.hostColor,
    status: game.status,
    resignedBy: game.resignedBy,
    timedOutBy: game.timedOutBy,
    timeControlMs: game.timeControlMs,
    whiteTimeMs: game.whiteTimeMs,
    blackTimeMs: game.blackTimeMs,
    clockStartedAt: game.clockStartedAt?.toISOString() ?? null,
    moves: game.moves.map((move) => move.san),
    createdAt: game.createdAt.toISOString(),
    updatedAt: game.updatedAt.toISOString(),
  };
}
