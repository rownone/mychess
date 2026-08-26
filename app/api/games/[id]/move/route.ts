import { NextResponse } from "next/server";
import type { Square } from "chess.js";
import { chessFromMoves, gameStatusText, isGameOver } from "@/lib/chess-state";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

type MoveBody = {
  token?: string;
  from?: string;
  to?: string;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  let body: MoveBody;
  try {
    body = (await request.json()) as MoveBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { token, from, to } = body;
  if (!token || !from || !to) {
    return NextResponse.json({ error: "token, from, and to are required" }, { status: 400 });
  }

  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      moves: {
        orderBy: { ply: "asc" },
        select: { san: true },
      },
    },
  });

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  if (game.status !== "ACTIVE") {
    return NextResponse.json({ error: "Game is not active" }, { status: 409 });
  }

  let playerColor: "w" | "b" | null = null;
  if (token === game.hostToken) {
    playerColor = game.hostColor;
  } else if (token === game.guestToken) {
    playerColor = game.hostColor === "w" ? "b" : "w";
  }

  if (!playerColor) {
    return NextResponse.json({ error: "Invalid player token" }, { status: 403 });
  }

  const moves = game.moves.map((move) => move.san);
  const chess = chessFromMoves(moves);

  if (isGameOver(chess)) {
    return NextResponse.json({ error: "Game is already over" }, { status: 409 });
  }

  if (chess.turn() !== playerColor) {
    return NextResponse.json({ error: "Not your turn" }, { status: 403 });
  }

  const legal = chess
    .moves({ square: from as Square, verbose: true })
    .find((move) => move.to === to);

  if (!legal) {
    return NextResponse.json({ error: "Illegal move" }, { status: 400 });
  }

  try {
    chess.move({
      from: from as Square,
      to: to as Square,
      promotion: legal.promotion ?? "q",
    });
  } catch {
    return NextResponse.json({ error: "Illegal move" }, { status: 400 });
  }

  const san = chess.history().at(-1);
  if (!san) {
    return NextResponse.json({ error: "Move failed" }, { status: 500 });
  }

  const ply = moves.length + 1;
  const finished = isGameOver(chess);

  await prisma.$transaction(async (tx) => {
    await tx.gameMove.create({
      data: {
        gameId: id,
        san,
        ply,
      },
    });

    if (finished) {
      await tx.game.update({
        where: { id },
        data: { status: "FINISHED" },
      });
    }
  });

  return NextResponse.json({
    san,
    ply,
    moves: chess.history(),
    status: finished ? "FINISHED" : "ACTIVE",
    statusText: gameStatusText(chess),
  });
}
