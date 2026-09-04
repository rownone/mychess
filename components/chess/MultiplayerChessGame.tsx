"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Chess, type Square } from "chess.js";
import {
  chessFromMoves,
  didPlayerWin,
  gameStatusText,
  resignationStatusText,
  timeoutStatusText,
  winCelebrationMessage,
} from "@/lib/chess-state";
import { fireWinConfetti } from "@/lib/win-confetti";
import {
  loadPlayerSession,
  savePlayerSession,
  type PlayerColor,
  type PlayerSession,
} from "@/lib/player-session";
import { useVisibilityPolling } from "@/lib/use-visibility-polling";
import { ChessBoard } from "./ChessBoard";
import { ChessClock } from "./ChessClock";
import { MoveSidebar } from "./MoveSidebar";
import { WinCelebrationModal } from "./WinCelebrationModal";

const joinInflight = new Map<string, Promise<PlayerSession | null>>();

const POLL_MY_TURN_MS = 2000;
const POLL_OPPONENT_TURN_MS = 5000;
const POLL_WAITING_MS = 5000;
const CLOCK_TICK_MS = 100;

type GameSnapshot = {
  id: string;
  hostColor: PlayerColor;
  status: "WAITING" | "ACTIVE" | "FINISHED";
  resignedBy: PlayerColor | null;
  timedOutBy: PlayerColor | null;
  timeControlMs: number | null;
  whiteTimeMs: number | null;
  blackTimeMs: number | null;
  clockStartedAt: string | null;
  moves: string[];
};

type MultiplayerChessGameProps = {
  gameId: string;
  title: string;
};

export function MultiplayerChessGame({ gameId, title }: MultiplayerChessGameProps) {
  const router = useRouter();
  const chessRef = useRef<Chess | null>(null);

  const [session, setSession] = useState<PlayerSession | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [fen, setFen] = useState(() => new Chess().fen());
  const [moves, setMoves] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resigning, setResigning] = useState(false);
  const [winModalOpen, setWinModalOpen] = useState(false);
  const [winMessage, setWinMessage] = useState("");
  const [displayWhiteMs, setDisplayWhiteMs] = useState<number | null>(null);
  const [displayBlackMs, setDisplayBlackMs] = useState<number | null>(null);
  const movesRef = useRef<string[]>([]);
  const celebratedWinRef = useRef(false);
  const claimingTimeoutRef = useRef(false);

  const syncMoves = useCallback((nextMoves: string[]) => {
    chessRef.current = chessFromMoves(nextMoves);
    movesRef.current = nextMoves;
    setMoves(nextMoves);
    setFen(chessRef.current.fen());
  }, []);

  const applyServerMoves = useCallback(
    (serverMoves: string[]) => {
      const localMoves = movesRef.current;

      if (serverMoves.length < localMoves.length) {
        return;
      }

      const differs =
        serverMoves.length !== localMoves.length ||
        serverMoves.some((move, index) => move !== localMoves[index]);

      if (differs) {
        syncMoves(serverMoves);
      }
    },
    [syncMoves],
  );

  const refreshGame = useCallback(async () => {
    const response = await fetch(`/api/games/${gameId}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Game not found");
    }

    const data = (await response.json()) as GameSnapshot;
    setSnapshot(data);
    applyServerMoves(data.moves);
    return data;
  }, [gameId, applyServerMoves]);

  useEffect(() => {
    const stored = loadPlayerSession(gameId);
    setSession(stored);

    if (stored) {
      refreshGame()
        .catch(() => setNotice("This game could not be loaded."))
        .finally(() => setLoading(false));
      return;
    }

    let cancelled = false;

    function startJoin(gId: string): Promise<PlayerSession | null> {
      const promise = (async (): Promise<PlayerSession | null> => {
        try {
          const res = await fetch(`/api/games/${gId}/join`, { method: "POST" });
          const body = (await res.json()) as {
            id?: string;
            token?: string;
            color?: PlayerColor;
            status?: string;
            error?: string;
          };

          if (!res.ok || !body.id || !body.token || !body.color) {
            return null;
          }

          const s: PlayerSession = { gameId: body.id, token: body.token, color: body.color };
          savePlayerSession(s);
          return s;
        } catch {
          return null;
        } finally {
          joinInflight.delete(gId);
        }
      })();

      joinInflight.set(gId, promise);
      return promise;
    }

    async function fetchAndMaybeJoin() {
      let data: GameSnapshot;
      try {
        data = await refreshGame();
      } catch {
        setNotice("This game could not be loaded.");
        setLoading(false);
        return;
      }

      if (cancelled) return;

      if (data.status !== "WAITING") {
        setLoading(false);
        return;
      }

      setJoining(true);

      const existing = joinInflight.get(gameId);
      const result = await (existing ?? startJoin(gameId));

      if (cancelled) {
        const fromStorage = loadPlayerSession(gameId);
        if (fromStorage) setSession(fromStorage);
        return;
      }

      if (result) {
        setSession(result);
        try {
          await refreshGame();
        } catch { /* poll will recover */ }
      } else {
        const fromStorage = loadPlayerSession(gameId);
        if (fromStorage) {
          setSession(fromStorage);
          try {
            await refreshGame();
          } catch { /* poll will recover */ }
        }
      }

      setJoining(false);
      setLoading(false);
    }

    void fetchAndMaybeJoin();

    return () => {
      cancelled = true;
    };
  }, [gameId, refreshGame]);

  const chess = chessRef.current ?? chessFromMoves(moves);

  const playerColor = session?.color;
  const isWaiting = snapshot?.status === "WAITING";
  const isActive = snapshot?.status === "ACTIVE";
  const isFinished = snapshot?.status === "FINISHED";
  const resignedBy = snapshot?.resignedBy ?? null;
  const timedOutBy = snapshot?.timedOutBy ?? null;
  const isMyTurn = Boolean(
    playerColor && isActive && chess.turn() === playerColor && !chess.isGameOver(),
  );

  const pollIntervalMs = isWaiting
    ? POLL_WAITING_MS
    : isMyTurn
      ? POLL_MY_TURN_MS
      : POLL_OPPONENT_TURN_MS;

  useVisibilityPolling(
    () => {
      void refreshGame();
    },
    pollIntervalMs,
    !loading && !submitting && !resigning && !isFinished,
  );

  const hasClock = snapshot?.timeControlMs != null;

  useEffect(() => {
    if (!hasClock || !isActive || !snapshot?.clockStartedAt) {
      if (snapshot?.whiteTimeMs != null) setDisplayWhiteMs(snapshot.whiteTimeMs);
      if (snapshot?.blackTimeMs != null) setDisplayBlackMs(snapshot.blackTimeMs);
      return;
    }

    const serverWhite = snapshot.whiteTimeMs ?? 0;
    const serverBlack = snapshot.blackTimeMs ?? 0;
    const clockStart = new Date(snapshot.clockStartedAt).getTime();
    const activeSide = chess.turn();

    const tick = () => {
      const elapsed = Date.now() - clockStart;
      if (activeSide === "w") {
        setDisplayWhiteMs(Math.max(0, serverWhite - elapsed));
        setDisplayBlackMs(serverBlack);
      } else {
        setDisplayWhiteMs(serverWhite);
        setDisplayBlackMs(Math.max(0, serverBlack - elapsed));
      }
    };

    tick();
    const intervalId = window.setInterval(tick, CLOCK_TICK_MS);
    return () => window.clearInterval(intervalId);
  }, [hasClock, isActive, snapshot?.clockStartedAt, snapshot?.whiteTimeMs, snapshot?.blackTimeMs, chess]);

  useEffect(() => {
    if (!hasClock || !isActive || !session || claimingTimeoutRef.current) return;

    const activeSide = chess.turn();
    const activeTime = activeSide === "w" ? displayWhiteMs : displayBlackMs;

    if (activeTime != null && activeTime <= 0) {
      claimingTimeoutRef.current = true;
      void (async () => {
        try {
          const res = await fetch(`/api/games/${gameId}/timeout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: session.token }),
          });
          if (res.ok) {
            await refreshGame();
          }
        } finally {
          claimingTimeoutRef.current = false;
        }
      })();
    }
  }, [hasClock, isActive, session, displayWhiteMs, displayBlackMs, chess, gameId, refreshGame]);

  const lastMove = useMemo(() => {
    const history = chess.history({ verbose: true });
    const latest = history.at(-1);
    return latest ? { from: latest.from, to: latest.to } : null;
  }, [fen, chess]);

  const checkedKing = useMemo(() => {
    if (!chess.isCheck()) return null;
    const turn = chess.turn();
    for (const row of chess.board()) {
      for (const square of row) {
        if (square?.type === "k" && square.color === turn) {
          return square.square;
        }
      }
    }
    return null;
  }, [fen, chess]);

  const boardDisabled =
    !isActive || !playerColor || !isMyTurn || chess.isGameOver() || submitting || resigning;

  const playerWon = Boolean(
    playerColor && didPlayerWin(chess, playerColor, resignedBy, timedOutBy),
  );

  useEffect(() => {
    celebratedWinRef.current = false;
    setWinModalOpen(false);
    setWinMessage("");
  }, [gameId]);

  useEffect(() => {
    if (!playerWon || celebratedWinRef.current) return;

    celebratedWinRef.current = true;
    const currentChess = chessRef.current ?? chessFromMoves(movesRef.current);
    setWinMessage(winCelebrationMessage(currentChess, resignedBy, timedOutBy));
    setWinModalOpen(true);
    fireWinConfetti();
  }, [playerWon, resignedBy, timedOutBy]);

  function getLegalTargets(from: Square) {
    if (!isMyTurn) return [];
    return chess.moves({ square: from, verbose: true }).map((move) => ({
      to: move.to,
      capture: move.isCapture(),
    }));
  }

  function rejectWrongTurn() {
    if (!playerColor) return;
    const side = chess.turn() === "w" ? "White" : "Black";
    const message =
      chess.turn() === playerColor
        ? "Wait for the server to confirm your move."
        : `It's ${side}'s turn to move.`;
    setNotice(message);
  }

  function handleAttemptMove(from: Square, to: Square): boolean {
    if (!session || !isMyTurn || submitting || resigning) {
      rejectWrongTurn();
      return false;
    }

    const piece = chess.get(from);
    if (piece && piece.color !== chess.turn()) {
      rejectWrongTurn();
      return false;
    }

    const legal = chess
      .moves({ square: from, verbose: true })
      .find((move) => move.to === to);

    if (!legal) {
      setNotice("Illegal move. The piece was returned to its original square.");
      window.alert("Illegal move");
      return false;
    }

    const movesBefore = chess.history();

    try {
      chess.move({
        from,
        to,
        promotion: legal.promotion ?? "q",
      });
    } catch {
      setNotice("Illegal move. The piece was returned to its original square.");
      window.alert("Illegal move");
      return false;
    }

    setNotice(null);
    syncMoves(chess.history());
    setSubmitting(true);

    void submitMove(session.token, from, to, movesBefore);

    return true;
  }

  async function submitMove(
    token: string,
    from: Square,
    to: Square,
    movesBefore: string[],
  ) {
    try {
      const response = await fetch(`/api/games/${gameId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, from, to }),
      });

      const payload = (await response.json()) as {
        error?: string;
        moves?: string[];
        status?: GameSnapshot["status"];
        timedOutBy?: PlayerColor;
        whiteTimeMs?: number;
        blackTimeMs?: number;
        clockStartedAt?: string | null;
      };

      if (!response.ok) {
        syncMoves(movesBefore);
        const message = payload.error ?? "Move was rejected.";
        setNotice(message);
        if (payload.timedOutBy) {
          setSnapshot((current) =>
            current
              ? { ...current, status: "FINISHED", timedOutBy: payload.timedOutBy! }
              : current,
          );
        } else if (response.status === 400) {
          window.alert("Illegal move");
        }
        return;
      }

      if (payload.moves) {
        applyServerMoves(payload.moves);
      }

      if (payload.status) {
        setSnapshot((current) =>
          current
            ? {
                ...current,
                status: payload.status!,
                moves: payload.moves ?? movesRef.current,
                whiteTimeMs: payload.whiteTimeMs ?? current.whiteTimeMs,
                blackTimeMs: payload.blackTimeMs ?? current.blackTimeMs,
                clockStartedAt: payload.clockStartedAt ?? current.clockStartedAt,
              }
            : current,
        );
      }
    } catch {
      syncMoves(movesBefore);
      setNotice("Network error — your move may not have been saved.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResign() {
    if (!session || !isActive || resigning) return;

    const confirmed = window.confirm("Resign this game? Your opponent will win.");
    if (!confirmed) return;

    setResigning(true);
    setNotice(null);

    try {
      const response = await fetch(`/api/games/${gameId}/resign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: session.token }),
      });

      const payload = (await response.json()) as {
        error?: string;
        status?: GameSnapshot["status"];
        resignedBy?: PlayerColor;
      };

      if (!response.ok) {
        setNotice(payload.error ?? "Could not resign.");
        return;
      }

      setSnapshot((current) =>
        current
          ? {
              ...current,
              status: payload.status ?? "FINISHED",
              resignedBy: payload.resignedBy ?? current.resignedBy,
            }
          : current,
      );

      await refreshGame();
    } catch {
      setNotice("Network error — resignation may not have been saved.");
    } finally {
      setResigning(false);
    }
  }

  const status = timedOutBy
    ? timeoutStatusText(timedOutBy, playerColor ?? null)
    : resignedBy
      ? resignationStatusText(resignedBy, playerColor ?? null)
      : gameStatusText(chess);
  const youAre = playerColor === "w" ? "White" : playerColor === "b" ? "Black" : "Spectator";

  return (
    <div className="flex flex-1 flex-col bg-[#161210] text-[#f6ead7]">
      <WinCelebrationModal
        open={winModalOpen}
        message={winMessage}
        onClose={() => setWinModalOpen(false)}
      />
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-900/30 px-5 py-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="text-xs text-amber-100/55">
            Online game · share this URL so an opponent can join.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="rounded-full bg-amber-600/15 px-3 py-1 text-xs font-medium text-amber-200">
            {status}
          </p>
          {playerColor ? (
            <p className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-amber-100/80">
              You: {youAre}
            </p>
          ) : null}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 lg:flex-row lg:items-start lg:p-8">
        <section className="flex flex-1 flex-col items-center gap-3">
          {loading ? (
            <p className="text-sm text-amber-100/60">Loading game…</p>
          ) : null}

          {isWaiting && session ? (
            <div className="w-full max-w-[min(100%,72vh)] rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Waiting for an opponent. Share this page URL so they can join as{" "}
              <span className="font-medium text-amber-200">
                {snapshot?.hostColor === "w" ? "Black" : "White"}
              </span>.
            </div>
          ) : null}

          {joining ? (
            <div className="w-full max-w-[min(100%,72vh)] rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Joining game…
            </div>
          ) : null}

          {!session && !loading && !joining ? (
            <div className="w-full max-w-[min(100%,72vh)] rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              You do not have a seat in this game. It may already have two players or is no longer open.
            </div>
          ) : null}

          {notice ? (
            <p
              role="alert"
              className="w-full max-w-[min(100%,72vh)] rounded-lg border border-red-400/40 bg-red-500/15 px-3 py-2 text-sm text-red-100"
            >
              {notice}
            </p>
          ) : null}

          {hasClock && displayWhiteMs != null && displayBlackMs != null ? (
            <ChessClock
              whiteTimeMs={displayWhiteMs}
              blackTimeMs={displayBlackMs}
              activeColor={isActive && !chess.isGameOver() ? chess.turn() : null}
              orientation={playerColor ?? "w"}
            />
          ) : null}

          <ChessBoard
            position={chess.board()}
            turn={chess.turn()}
            lastMove={lastMove}
            checkedKing={checkedKing}
            orientation={playerColor ?? "w"}
            disabled={boardDisabled || loading}
            getLegalTargets={getLegalTargets}
            onAttemptMove={handleAttemptMove}
            onWrongTurn={rejectWrongTurn}
          />

          {isActive && playerColor && !isMyTurn && !chess.isGameOver() ? (
            <p className="text-sm text-amber-100/60">Opponent&apos;s turn…</p>
          ) : null}

          {isFinished ? (
            <p className="text-sm font-medium text-amber-200">{status}</p>
          ) : null}
        </section>

        <MoveSidebar
          moves={moves}
          status={status}
          onResign={isActive && playerColor ? () => void handleResign() : undefined}
          resignDisabled={resigning || submitting}
          onNewGame={() => router.push("/")}
          actionLabel="Back to lobby"
        />
      </main>
    </div>
  );
}
