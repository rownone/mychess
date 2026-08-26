import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const game = await prisma.game.findUnique({ where: { id } });

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  if (game.status !== "WAITING") {
    return NextResponse.json({ error: "Game is not open" }, { status: 409 });
  }

  if (game.guestToken) {
    return NextResponse.json({ error: "Game already has an opponent" }, { status: 409 });
  }

  const guestToken = randomBytes(24).toString("hex");
  const guestColor = game.hostColor === "w" ? "b" : "w";

  const updated = await prisma.game.update({
    where: { id },
    data: {
      guestToken,
      status: "ACTIVE",
    },
    select: {
      id: true,
      status: true,
    },
  });

  return NextResponse.json({
    id: updated.id,
    token: guestToken,
    color: guestColor,
    status: updated.status,
  });
}
