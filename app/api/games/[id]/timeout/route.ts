import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

type TimeoutBody = {
  token?: string;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  let body: TimeoutBody;
  try {
    body = (await request.json()) as TimeoutBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { token } = body;
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const game = await prisma.game.findUnique({ where: { id } });

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  if (game.status !== "ACTIVE") {
    return NextResponse.json({ error: "Game is not active" }, { status: 409 });
  }

  if (token !== game.hostToken && token !== game.guestToken) {
    return NextResponse.json({ error: "Invalid player token" }, { status: 403 });
  }

  if (game.timeControlMs == null || game.clockStartedAt == null) {
    return NextResponse.json({ error: "No clock on this game" }, { status: 409 });
  }

  const now = new Date();
  const elapsed = now.getTime() - game.clockStartedAt.getTime();

  const moveCount = await prisma.gameMove.count({ where: { gameId: id } });
  const activeSide: "w" | "b" = moveCount % 2 === 0 ? "w" : "b";

  let whiteTimeMs = game.whiteTimeMs ?? 0;
  let blackTimeMs = game.blackTimeMs ?? 0;

  if (activeSide === "w") {
    whiteTimeMs = Math.max(0, whiteTimeMs - elapsed);
  } else {
    blackTimeMs = Math.max(0, blackTimeMs - elapsed);
  }

  const timedOut =
    (activeSide === "w" && whiteTimeMs <= 0) ||
    (activeSide === "b" && blackTimeMs <= 0);

  if (!timedOut) {
    return NextResponse.json({
      error: "Clock has not expired",
      whiteTimeMs,
      blackTimeMs,
    }, { status: 409 });
  }

  const updated = await prisma.game.update({
    where: { id },
    data: {
      status: "FINISHED",
      timedOutBy: activeSide,
      whiteTimeMs,
      blackTimeMs,
      clockStartedAt: null,
    },
    select: {
      id: true,
      status: true,
      timedOutBy: true,
      whiteTimeMs: true,
      blackTimeMs: true,
    },
  });

  const winner = activeSide === "w" ? "b" : "w";

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    timedOutBy: updated.timedOutBy,
    winner,
    whiteTimeMs: updated.whiteTimeMs,
    blackTimeMs: updated.blackTimeMs,
  });
}
