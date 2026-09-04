import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import type { PieceColor } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const TIME_CONTROL_MAP: Record<string, number> = {
  "5+0": 5 * 60 * 1000,
  "10+0": 10 * 60 * 1000,
  "15+0": 15 * 60 * 1000,
};

export async function GET() {
  const games = await prisma.game.findMany({
    where: { status: "WAITING" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      hostColor: true,
      createdAt: true,
      timeControlMs: true,
    },
  });

  return NextResponse.json({ games });
}

export async function POST(request: Request) {
  let hostColor: PieceColor = "w";
  let timeControlMs: number | null = null;

  try {
    const body = (await request.json()) as {
      hostColor?: string;
      timeControl?: string;
    };
    if (body.hostColor === "w" || body.hostColor === "b") {
      hostColor = body.hostColor;
    }
    if (body.timeControl && body.timeControl !== "off") {
      const ms = TIME_CONTROL_MAP[body.timeControl];
      if (!ms) {
        return NextResponse.json(
          { error: "Invalid timeControl. Use off, 5+0, 10+0, or 15+0." },
          { status: 400 },
        );
      }
      timeControlMs = ms;
    }
  } catch {
    // default to white, no clock
  }

  const hostToken = randomBytes(24).toString("hex");

  const game = await prisma.game.create({
    data: {
      hostColor,
      hostToken,
      timeControlMs,
      whiteTimeMs: timeControlMs,
      blackTimeMs: timeControlMs,
    },
    select: {
      id: true,
      hostColor: true,
      hostToken: true,
      status: true,
      timeControlMs: true,
    },
  });

  return NextResponse.json({
    id: game.id,
    hostColor: game.hostColor,
    token: game.hostToken,
    status: game.status,
    timeControlMs: game.timeControlMs,
  });
}
