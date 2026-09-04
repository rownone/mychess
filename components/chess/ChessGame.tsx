"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Chess, type Color, type Square } from "chess.js";
import {
  clearMovesCookie,
  saveClockToCookie,
  saveMovesToCookie,
  type ClockCookieData,
} from "@/lib/game-cookie";
import { localCheckmateMessage } from "@/lib/chess-state";
import { fireWinConfetti } from "@/lib/win-confetti";
import { ChessBoard } from "./ChessBoard";
import { ChessClock } from "./ChessClock";
import { MoveSidebar } from "./MoveSidebar";
import { TimeControlPicker, type TimeControlOption } from "./TimeControlPicker";
import { WinCelebrationModal } from "./WinCelebrationModal";

const TIME_CONTROL_MS: Record<string, number> = {
  "5+0": 5 * 60 * 1000,
  "10+0": 10 * 60 * 1000,
  "15+0": 15 * 60 * 1000,
};

const CLOCK_TICK_MS = 100;

type ChessGameProps = {
  initialMoves: string[];
  initialClock: ClockCookieData | null;
  title: string;
};

export function ChessGame({ initialMoves, initialClock, title }: ChessGameProps) {
  const chessRef = useRef<Chess | null>(null);
  if (!chessRef.current) {
    chessRef.current = createChess(initialMoves);
  }

  const chess = chessRef.current;
  const [fen, setFen] = useState(() => chess.fen());
  const [moves, setMoves] = useState(initialMoves);
  const [notice, setNotice] = useState<string | null>(null);
  const [winModalOpen, setWinModalOpen] = useState(false);
  const [winMessage, setWinMessage] = useState("");
  const [orientation, setOrientation] = useState<Color>("w");
  const celebratedWinRef = useRef(false);

  const hasExistingGame = initialMoves.length > 0;
  const [showPicker, setShowPicker] = useState(!hasExistingGame && !initialClock);
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControlOption>(
    initialClock
      ? initialClock.timeControlMs
        ? (`${initialClock.timeControlMs / 60000}+0` as TimeControlOption)
        : "off"
      : "off",
  );

  const [timeControlMs, setTimeControlMs] = useState<number | null>(
    initialClock?.timeControlMs ?? null,
  );
  const [whiteTimeMs, setWhiteTimeMs] = useState(initialClock?.whiteTimeMs ?? 0);
  const [blackTimeMs, setBlackTimeMs] = useState(initialClock?.blackTimeMs ?? 0);
  const [clockRunning, setClockRunning] = useState(
    hasExistingGame && initialClock?.timeControlMs != null && !initialClock?.timedOutBy,
  );
  const [timedOutBy, setTimedOutBy] = useState<Color | null>(initialClock?.timedOutBy ?? null);
  const [initTick] = useState(() => Date.now());
  const lastTickRef = useRef(initialClock?.lastTickAt ?? initTick);

  const hasClock = timeControlMs != null;
  const gameOver = chess.isGameOver() || timedOutBy != null;

  useEffect(() => {
    if (initialClock?.timedOutBy && !celebratedWinRef.current) {
      celebratedWinRef.current = true;
    }
  }, [initialClock?.timedOutBy]);

  useEffect(() => {
    if (chess.isCheckmate() && !timedOutBy) {
      celebratedWinRef.current = true;
    }
  }, [chess, timedOutBy]);

  useEffect(() => {
    if (!hasClock || !clockRunning || gameOver) return;

    const intervalId = window.setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastTickRef.current;
      lastTickRef.current = now;

      const turn = chess.turn();
      if (turn === "w") {
        setWhiteTimeMs((prev) => {
          const next = Math.max(0, prev - elapsed);
          if (next <= 0) {
            setTimedOutBy("w");
            setClockRunning(false);
            return 0;
          }
          return next;
        });
      } else {
        setBlackTimeMs((prev) => {
          const next = Math.max(0, prev - elapsed);
          if (next <= 0) {
            setTimedOutBy("b");
            setClockRunning(false);
            return 0;
          }
          return next;
        });
      }
    }, CLOCK_TICK_MS);

    return () => window.clearInterval(intervalId);
  }, [hasClock, clockRunning, gameOver, chess]);

  useEffect(() => {
    if (timedOutBy && !celebratedWinRef.current) {
      celebratedWinRef.current = true;
      const winner = timedOutBy === "w" ? "Black" : "White";
      setWinMessage(`Time expired! ${winner} wins.`);
      setWinModalOpen(true);
      fireWinConfetti();

      saveClockToCookie({
        timeControlMs,
        whiteTimeMs: timedOutBy === "w" ? 0 : whiteTimeMs,
        blackTimeMs: timedOutBy === "b" ? 0 : blackTimeMs,
        activeColor: chess.turn(),
        lastTickAt: Date.now(),
        timedOutBy,
      });
    }
  }, [timedOutBy, timeControlMs, whiteTimeMs, blackTimeMs, chess]);

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

  function syncBoard() {
    setFen(chess.fen());
    setMoves(chess.history());
  }

  function getLegalTargets(from: Square) {
    return chess.moves({ square: from, verbose: true }).map((move) => ({
      to: move.to,
      capture: move.isCapture(),
    }));
  }

  function rejectWrongTurn() {
    const side = chess.turn() === "w" ? "White" : "Black";
    const message = `It's ${side}'s turn to move.`;
    setNotice(message);
    window.alert(message);
  }

  function handleAttemptMove(from: Square, to: Square) {
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
    const nextMoves = chess.history();
    setFen(chess.fen());
    setMoves(nextMoves);
    saveMovesToCookie(nextMoves);

    if (hasClock) {
      lastTickRef.current = Date.now();
      saveClockToCookie({
        timeControlMs,
        whiteTimeMs,
        blackTimeMs,
        activeColor: chess.turn(),
        lastTickAt: Date.now(),
        timedOutBy: null,
      });
    }

    if (chess.isCheckmate() && !celebratedWinRef.current) {
      celebratedWinRef.current = true;
      setWinMessage(localCheckmateMessage(chess));
      setWinModalOpen(true);
      fireWinConfetti();
      if (hasClock) setClockRunning(false);
    }

    if (chess.isGameOver() && hasClock) {
      setClockRunning(false);
    }

    return true;
  }

  function handleNewGame() {
    chess.reset();
    setNotice(null);
    celebratedWinRef.current = false;
    setWinModalOpen(false);
    setWinMessage("");
    setTimedOutBy(null);
    setClockRunning(false);
    syncBoard();
    clearMovesCookie();
    setShowPicker(true);
  }

  function handleStartGame(tc: TimeControlOption) {
    setSelectedTimeControl(tc);
    const ms = tc === "off" ? null : TIME_CONTROL_MS[tc];
    setTimeControlMs(ms);
    if (ms != null) {
      setWhiteTimeMs(ms);
      setBlackTimeMs(ms);
      setClockRunning(true);
      lastTickRef.current = Date.now();
      saveClockToCookie({
        timeControlMs: ms,
        whiteTimeMs: ms,
        blackTimeMs: ms,
        activeColor: "w",
        lastTickAt: Date.now(),
        timedOutBy: null,
      });
    }
    setShowPicker(false);
  }

  if (showPicker) {
    return (
      <div className="flex flex-1 flex-col bg-[#161210] text-[#f6ead7]">
        <header className="flex items-center justify-between border-b border-amber-900/30 px-5 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            <p className="text-xs text-amber-100/55">Local game — choose a time control</p>
          </div>
          <Link
            href="/"
            className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-amber-100/80 transition hover:bg-white/15"
          >
            Play online
          </Link>
        </header>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 p-8">
          <h2 className="text-lg font-semibold text-amber-200">Time control</h2>
          <TimeControlPicker value={selectedTimeControl} onChange={setSelectedTimeControl} />
          <button
            type="button"
            onClick={() => handleStartGame(selectedTimeControl)}
            className="mt-2 rounded-lg bg-amber-600 px-6 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-500"
          >
            Start game
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-[#161210] text-[#f6ead7]">
      <WinCelebrationModal
        open={winModalOpen}
        message={winMessage}
        onClose={() => setWinModalOpen(false)}
      />
      <header className="flex items-center justify-between border-b border-amber-900/30 px-5 py-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="text-xs text-amber-100/55">
            White moves first. Click or drag a piece — legal squares light up.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/"
            className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-amber-100/80 transition hover:bg-white/15"
          >
            Play online
          </a>
          <p className="rounded-full bg-amber-600/15 px-3 py-1 text-xs font-medium text-amber-200">
            {statusText(chess, timedOutBy)}
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 lg:flex-row lg:items-start lg:p-8">
        <section className="flex flex-1 flex-col items-center gap-3">
          {notice ? (
            <p
              role="alert"
              className="w-full max-w-[min(100%,72vh)] rounded-lg border border-red-400/40 bg-red-500/15 px-3 py-2 text-sm text-red-100"
            >
              {notice}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => setOrientation((current) => (current === "w" ? "b" : "w"))}
            className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-amber-100/80 transition hover:bg-white/15"
          >
            {orientation === "w" ? "Flip board (black on bottom)" : "Flip board (white on bottom)"}
          </button>

          {hasClock ? (
            <ChessClock
              whiteTimeMs={whiteTimeMs}
              blackTimeMs={blackTimeMs}
              activeColor={!gameOver ? chess.turn() : null}
              orientation={orientation}
            />
          ) : null}

          <ChessBoard
            position={chess.board()}
            turn={chess.turn()}
            lastMove={lastMove}
            checkedKing={checkedKing}
            disabled={gameOver}
            orientation={orientation}
            getLegalTargets={getLegalTargets}
            onAttemptMove={handleAttemptMove}
            onWrongTurn={rejectWrongTurn}
          />
        </section>

        <MoveSidebar
          moves={moves}
          status={statusText(chess, timedOutBy)}
          onNewGame={handleNewGame}
        />
      </main>
    </div>
  );
}

function createChess(moves: string[]): Chess {
  const chess = new Chess();
  for (const san of moves) {
    try {
      chess.move(san);
    } catch {
      break;
    }
  }
  return chess;
}

function statusText(chess: Chess, timedOutBy: Color | null): string {
  if (timedOutBy) {
    const winner = timedOutBy === "w" ? "Black" : "White";
    return `Time expired — ${winner} wins`;
  }
  if (chess.isCheckmate()) {
    return chess.turn() === "w" ? "Checkmate — Black wins" : "Checkmate — White wins";
  }
  if (chess.isStalemate()) return "Stalemate";
  if (chess.isDraw()) return "Draw";
  if (chess.isCheck()) {
    return chess.turn() === "w" ? "White is in check" : "Black is in check";
  }
  return chess.turn() === "w" ? "White to move" : "Black to move";
}
