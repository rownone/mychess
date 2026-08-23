"use client";

import { useEffect, useRef } from "react";

type MoveSidebarProps = {
  moves: string[];
  status: string;
  onNewGame: () => void;
};

export function MoveSidebar({ moves, status, onNewGame }: MoveSidebarProps) {
  const rows = pairMoves(moves);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }, [moves.length]);

  return (
    <aside className="flex h-full min-h-[28rem] w-full flex-col rounded-xl border border-amber-900/30 bg-[#2a211c] text-[#f3e6d0] shadow-[0_16px_40px_rgba(0,0,0,0.35)] lg:w-80 lg:shrink-0">
      <header className="border-b border-amber-900/40 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-wide uppercase">Moves</h2>
        <p className="mt-1 text-sm text-amber-100/80">{status}</p>
      </header>

      <div className="grid grid-cols-[2.25rem_1fr_1fr] border-b border-amber-900/30 px-4 py-2 text-[11px] font-semibold tracking-wider text-amber-200/50 uppercase">
        <span>#</span>
        <span>White</span>
        <span>Black</span>
      </div>

      <ol ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {rows.length === 0 ? (
          <li className="px-2 py-6 text-center text-sm text-amber-100/45">
            No moves yet. White to play.
          </li>
        ) : (
          rows.map((row) => (
            <li
              key={row.number}
              className="grid grid-cols-[2.25rem_1fr_1fr] items-center rounded-md px-2 py-1.5 text-sm even:bg-white/5"
            >
              <span className="text-amber-200/40">{row.number}.</span>
              <span className="font-medium">{row.white}</span>
              <span className="font-medium">{row.black ?? ""}</span>
            </li>
          ))
        )}
      </ol>

      <div className="border-t border-amber-900/40 p-3">
        <button
          type="button"
          onClick={onNewGame}
          className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-amber-500"
        >
          New Game
        </button>
      </div>
    </aside>
  );
}

function pairMoves(moves: string[]) {
  const rows: { number: number; white: string; black?: string }[] = [];

  for (let i = 0; i < moves.length; i += 2) {
    rows.push({
      number: i / 2 + 1,
      white: moves[i],
      black: moves[i + 1],
    });
  }

  return rows;
}
