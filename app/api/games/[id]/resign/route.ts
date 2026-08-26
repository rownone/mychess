import { NextResponse } from "next/server";
import type { PieceColor } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

type ResignBody = {
  token?: string;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  let body: ResignBody;
  try {
    body = (await request.json()) as ResignBody;
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

  let playerColor: PieceColor | null = null;
  if (token === game.hostToken) {
    playerColor = game.hostColor;
  } else if (token === game.guestToken) {
    playerColor = game.hostColor === "w" ? "b" : "w";
  }

  if (!playerColor) {
    return NextResponse.json({ error: "Invalid player token" }, { status: 403 });
  }

  const updated = await prisma.game.update({
    where: { id },
    data: {
      status: "FINISHED",
      resignedBy: playerColor,
    },
    select: {
      id: true,
      status: true,
      resignedBy: true,
    },
  });

  const winner = playerColor === "w" ? "b" : "w";

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    resignedBy: updated.resignedBy,
    winner,
  });
}
