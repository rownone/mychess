"use client";

import { useRef, useState, type DragEvent } from "react";
import type { Color, PieceSymbol, Square } from "chess.js";
import { PieceIcon } from "./PieceIcon";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const RANKS_WHITE = [8, 7, 6, 5, 4, 3, 2, 1] as const;
const RANKS_BLACK = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const FILES_BLACK = ["h", "g", "f", "e", "d", "c", "b", "a"] as const;

export type BoardSquare = {
  square: Square;
  type: PieceSymbol;
  color: Color;
} | null;

export type LegalTarget = {
  to: Square;
  capture: boolean;
};

type ChessBoardProps = {
  position: BoardSquare[][];
  turn: Color;
  lastMove: { from: Square; to: Square } | null;
  checkedKing: Square | null;
  disabled?: boolean;
  orientation?: Color;
  getLegalTargets: (from: Square) => LegalTarget[];
  onAttemptMove: (from: Square, to: Square) => boolean;
  onWrongTurn: () => void;
};

export function ChessBoard({
  position,
  turn,
  lastMove,
  checkedKing,
  disabled = false,
  orientation = "w",
  getLegalTargets,
  onAttemptMove,
  onWrongTurn,
}: ChessBoardProps) {
  const [activeFrom, setActiveFrom] = useState<Square | null>(null);
  const [dragFrom, setDragFrom] = useState<Square | null>(null);
  const [hoverSquare, setHoverSquare] = useState<Square | null>(null);
  const skipClickRef = useRef(false);

  const viewRanks = orientation === "w" ? RANKS_WHITE : RANKS_BLACK;
  const viewFiles = orientation === "w" ? FILES : FILES_BLACK;

  const legalTargets = activeFrom ? getLegalTargets(activeFrom) : [];
  const legalBySquare = new Map(legalTargets.map((target) => [target.to, target]));

  function selectPiece(square: Square) {
    setActiveFrom(square);
  }

  function clearHover() {
    setHoverSquare(null);
    setDragFrom(null);
  }

  function handleSquareClick(square: Square, piece: BoardSquare) {
    if (disabled || skipClickRef.current) {
      skipClickRef.current = false;
      return;
    }

    if (activeFrom && legalBySquare.has(square) && activeFrom !== square) {
      if (onAttemptMove(activeFrom, square)) {
        setActiveFrom(null);
      }
      return;
    }

    if (activeFrom === square) {
      setActiveFrom(null);
      return;
    }

    if (piece && piece.color === turn) {
      selectPiece(square);
      return;
    }

    if (piece && piece.color !== turn) {
      onWrongTurn();
    }

    setActiveFrom(null);
  }

  function handleDragStart(square: Square, event: DragEvent<HTMLDivElement>) {
    if (disabled) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.setData("text/plain", square);
    event.dataTransfer.effectAllowed = "move";
    setDragFrom(square);
    selectPiece(square);
  }

  function handleDrop(square: Square, event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const from = (event.dataTransfer.getData("text/plain") || dragFrom || activeFrom) as
      | Square
      | null;
    clearHover();

    if (!from || from === square || disabled) return;

    if (onAttemptMove(from, square)) {
      setActiveFrom(null);
    }
  }

  return (
    <div className="relative aspect-square w-full max-w-[min(100%,72vh)] select-none overflow-hidden rounded-xl shadow-[0_16px_50px_rgba(0,0,0,0.45)] ring-1 ring-black/20">
      <div className="grid h-full w-full grid-cols-8 grid-rows-8">
        {viewRanks.map((rank, rankIndex) =>
          viewFiles.map((file, fileIndex) => {
            const square = `${file}${rank}` as Square;
            const boardRankIndex = 8 - rank;
            const boardFileIndex = FILES.indexOf(file as typeof FILES[number]);
            const piece = position[boardRankIndex][boardFileIndex];
            const isDark = (fileIndex + rank) % 2 === 1;
            const isLast = lastMove?.from === square || lastMove?.to === square;
            const isHover = hoverSquare === square && dragFrom !== null;
            const isOrigin = activeFrom === square;
            const inCheck = checkedKing === square;
            const legal = legalBySquare.get(square);
            const canMove = Boolean(piece && piece.color === turn && !disabled);

            return (
              <div
                key={square}
                onClick={() => handleSquareClick(square, piece)}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setHoverSquare(square);
                }}
                onDragLeave={() => {
                  setHoverSquare((current) => (current === square ? null : current));
                }}
                onDrop={(event) => handleDrop(square, event)}
                className={`relative flex items-center justify-center ${
                  isDark ? "bg-[#b58863]" : "bg-[#f0d9b5]"
                }`}
              >
                {isLast && !isOrigin ? (
                  <span className="pointer-events-none absolute inset-0 bg-yellow-300/35" />
                ) : null}
                {isOrigin ? (
                  <span className="pointer-events-none absolute inset-0 bg-amber-300/50" />
                ) : null}
                {inCheck ? (
                  <span className="pointer-events-none absolute inset-0 bg-red-500/45" />
                ) : null}
                {isHover ? (
                  <span className="pointer-events-none absolute inset-0 bg-emerald-400/40" />
                ) : null}

                {legal && !legal.capture ? (
                  <span className="pointer-events-none absolute z-[5] h-[30%] w-[30%] rounded-full bg-[#1f7a28]/55" />
                ) : null}
                {legal?.capture ? (
                  <span className="pointer-events-none absolute inset-[7%] z-[5] rounded-full border-[6px] border-[#1f7a28]/55" />
                ) : null}

                {fileIndex === 0 ? (
                  <span
                    className={`pointer-events-none absolute top-0.5 left-1 z-[6] text-[10px] font-semibold ${
                      isDark ? "text-[#f0d9b5]" : "text-[#b58863]"
                    }`}
                  >
                    {rank}
                  </span>
                ) : null}
                {rankIndex === 7 ? (
                  <span
                    className={`pointer-events-none absolute right-1 bottom-0.5 z-[6] text-[10px] font-semibold ${
                      isDark ? "text-[#f0d9b5]" : "text-[#b58863]"
                    }`}
                  >
                    {file}
                  </span>
                ) : null}

                {piece ? (
                  <div
                    role="img"
                    draggable={!disabled}
                    onDragStart={(event) => handleDragStart(square, event)}
                    onDragEnd={() => {
                      skipClickRef.current = true;
                      window.setTimeout(() => {
                        skipClickRef.current = false;
                      }, 0);
                      clearHover();
                    }}
                    aria-label={`${piece.color === "w" ? "White" : "Black"} ${pieceName(piece.type)} on ${square}`}
                    className={`relative z-10 flex h-full w-full items-center justify-center ${
                      canMove ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                    } ${dragFrom === square ? "opacity-35" : ""} ${
                      dragFrom && dragFrom !== square ? "pointer-events-none" : ""
                    }`}
                  >
                    <PieceIcon color={piece.color} type={piece.type} />
                  </div>
                ) : null}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}

function pieceName(type: PieceSymbol): string {
  const names: Record<PieceSymbol, string> = {
    k: "king",
    q: "queen",
    r: "rook",
    b: "bishop",
    n: "knight",
    p: "pawn",
  };
  return names[type];
}
