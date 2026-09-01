"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  savePlayerSession,
  type PlayerColor,
} from "@/lib/player-session";
import { useVisibilityPolling } from "@/lib/use-visibility-polling";

type WaitingGame = {
  id: string;
  hostColor: PlayerColor;
  createdAt: string;
};

export function PlayLobby({ title }: { title: string }) {
  const router = useRouter();
  const [games, setGames] = useState<WaitingGame[]>([]);
  const [hostColor, setHostColor] = useState<PlayerColor>("w");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshGames = useCallback(async () => {
    const response = await fetch("/api/games", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Could not load games");
    }
    const data = (await response.json()) as { games: WaitingGame[] };
    setGames(data.games);
  }, []);

  useEffect(() => {
    refreshGames()
      .catch(() => setError("Could not load waiting games."))
      .finally(() => setLoading(false));
  }, [refreshGames]);

  useVisibilityPolling(refreshGames, 5000, !loading);

  async function handleCreate() {
    setCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostColor }),
      });

      const data = (await response.json()) as {
        id?: string;
        token?: string;
        hostColor?: PlayerColor;
        error?: string;
      };

      if (!response.ok || !data.id || !data.token || !data.hostColor) {
        throw new Error(data.error ?? "Could not create game");
      }

      savePlayerSession({
        gameId: data.id,
        token: data.token,
        color: data.hostColor,
      });

      router.push(`/play/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create game");
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin(gameId: string) {
    setJoiningId(gameId);
    setError(null);

    try {
      const response = await fetch(`/api/games/${gameId}/join`, {
        method: "POST",
      });

      const data = (await response.json()) as {
        id?: string;
        token?: string;
        color?: PlayerColor;
        error?: string;
      };

      if (!response.ok || !data.id || !data.token || !data.color) {
        throw new Error(data.error ?? "Could not join game");
      }

      savePlayerSession({
        gameId: data.id,
        token: data.token,
        color: data.color,
      });

      router.push(`/play/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join game");
      await refreshGames();
    } finally {
      setJoiningId(null);
    }
  }

  return (
    <div className="relative flex min-h-full flex-1 flex-col text-[#f6ead7]">
      <Image
        src="/dgt-chessboard-bg.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-[#161210]/70" aria-hidden />
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-amber-900/30 bg-[#161210]/40 px-5 py-4 backdrop-blur-sm">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="text-xs text-amber-100/55">
            Create a game, pick your color, and wait for an opponent to join from this list.
          </p>
        </div>
        <a
          href="/local"
          className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-amber-100/80 transition hover:bg-white/15"
        >
          Local solo game
        </a>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-4 lg:p-8">
        <section className="rounded-xl border border-amber-900/30 bg-[#2a211c]/90 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-md">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-amber-200/80">
            New game
          </h2>
          <p className="mt-1 text-sm text-amber-100/60">
            You will play as the color you choose. The joiner gets the opposite side.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="hostColor"
                value="w"
                checked={hostColor === "w"}
                onChange={() => setHostColor("w")}
              />
              White
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="hostColor"
                value="b"
                checked={hostColor === "b"}
                onChange={() => setHostColor("b")}
              />
              Black
            </label>
          </div>

          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating}
            className="mt-4 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-amber-500 disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create game"}
          </button>
        </section>

        <section className="rounded-xl border border-amber-900/30 bg-[#2a211c]/90 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-md">
          <header className="border-b border-amber-900/40 px-5 py-3">
            <h2 className="text-sm font-semibold tracking-wide uppercase text-amber-200/80">
              Waiting for opponent
            </h2>
          </header>

          {error ? (
            <p className="px-5 py-4 text-sm text-red-200" role="alert">{error}</p>
          ) : null}

          {loading ? (
            <p className="px-5 py-6 text-sm text-amber-100/50">Loading…</p>
          ) : games.length === 0 ? (
            <p className="px-5 py-6 text-sm text-amber-100/50">No open games right now.</p>
          ) : (
            <ul className="divide-y divide-amber-900/30">
              {games.map((game) => (
                <li
                  key={game.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                >
                  <div>
                    <p className="font-mono text-sm text-amber-100">{game.id}</p>
                    <p className="text-xs text-amber-100/55">
                      Host plays {game.hostColor === "w" ? "White" : "Black"} ·{" "}
                      {new Date(game.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleJoin(game.id)}
                    disabled={joiningId === game.id}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                  >
                    {joiningId === game.id ? "Joining…" : "Join"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
