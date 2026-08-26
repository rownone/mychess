import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import type { PieceColor } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const games = await prisma.game.findMany({
    where: { status: "WAITING" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      hostColor: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ games });
}

export async function POST(request: Request) {
  let hostColor: PieceColor = "w";

  try {
    const body = (await request.json()) as { hostColor?: string };
    if (body.hostColor === "w" || body.hostColor === "b") {
      hostColor = body.hostColor;
    }
  } catch {
    // default to white
  }

  const hostToken = randomBytes(24).toString("hex");

  const game = await prisma.game.create({
    data: {
      hostColor,
      hostToken,
    },
    select: {
      id: true,
      hostColor: true,
      hostToken: true,
      status: true,
    },
  });

  return NextResponse.json({
    id: game.id,
    hostColor: game.hostColor,
    token: game.hostToken,
    status: game.status,
  });
}
