import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      moves: {
        orderBy: { ply: "asc" },
        select: { san: true, ply: true },
      },
    },
  });

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: game.id,
    hostColor: game.hostColor,
    status: game.status,
    resignedBy: game.resignedBy,
    timedOutBy: game.timedOutBy,
    timeControlMs: game.timeControlMs,
    whiteTimeMs: game.whiteTimeMs,
    blackTimeMs: game.blackTimeMs,
    clockStartedAt: game.clockStartedAt,
    moves: game.moves.map((move) => move.san),
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
  });
}
