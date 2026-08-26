import { Chess } from "chess.js";

export function chessFromMoves(moves: string[]): Chess {
  const chess = new Chess();
  for (const san of moves) {
    chess.move(san);
  }
  return chess;
}

export function gameStatusText(chess: Chess): string {
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

export function resignationStatusText(
  resignedBy: "w" | "b",
  playerColor: "w" | "b" | null,
): string {
  const resigner = resignedBy === "w" ? "White" : "Black";
  const winner = resignedBy === "w" ? "Black" : "White";

  if (playerColor === resignedBy) {
    return `You resigned — ${winner} wins`;
  }
  if (playerColor) {
    return `Opponent resigned — you win`;
  }
  return `${resigner} resigned — ${winner} wins`;
}

export function isGameOver(chess: Chess): boolean {
  return chess.isGameOver();
}
