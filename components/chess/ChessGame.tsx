"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Color, type Square } from "chess.js";
import { clearMovesCookie, saveMovesToCookie } from "@/lib/game-cookie";
import { localCheckmateMessage } from "@/lib/chess-state";
import { fireWinConfetti } from "@/lib/win-confetti";
import { ChessBoard } from "./ChessBoard";
import { MoveSidebar } from "./MoveSidebar";
import { WinCelebrationModal } from "./WinCelebrationModal";

type ChessGameProps = {
  initialMoves: string[];
  title: string;
};

export function ChessGame({ initialMoves, title }: ChessGameProps) {
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

  useEffect(() => {
    if (chess.isCheckmate()) {
      celebratedWinRef.current = true;
    }
  }, [chess]);

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

    if (chess.isCheckmate() && !celebratedWinRef.current) {
      celebratedWinRef.current = true;
      setWinMessage(localCheckmateMessage(chess));
      setWinModalOpen(true);
      fireWinConfetti();
    }

    return true;
  }

  function handleNewGame() {
    chess.reset();
    setNotice(null);
    celebratedWinRef.current = false;
    setWinModalOpen(false);
    setWinMessage("");
    syncBoard();
    clearMovesCookie();
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
            {statusText(chess)}
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
          <ChessBoard
            position={chess.board()}
            turn={chess.turn()}
            lastMove={lastMove}
            checkedKing={checkedKing}
            disabled={chess.isGameOver()}
            orientation={orientation}
            getLegalTargets={getLegalTargets}
            onAttemptMove={handleAttemptMove}
            onWrongTurn={rejectWrongTurn}
          />
        </section>

        <MoveSidebar
          moves={moves}
          status={statusText(chess)}
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

function statusText(chess: Chess): string {
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
