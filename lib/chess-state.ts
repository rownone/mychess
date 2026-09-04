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

export function didPlayerWin(
  chess: Chess,
  playerColor: "w" | "b" | null,
  resignedBy: "w" | "b" | null,
  timedOutBy?: "w" | "b" | null,
): boolean {
  if (!playerColor) return false;

  if (resignedBy) {
    return resignedBy !== playerColor;
  }

  if (timedOutBy) {
    return timedOutBy !== playerColor;
  }

  if (chess.isCheckmate()) {
    return chess.turn() !== playerColor;
  }

  return false;
}

export function winCelebrationMessage(
  chess: Chess,
  resignedBy: "w" | "b" | null,
  timedOutBy?: "w" | "b" | null,
): string {
  if (resignedBy) {
    return "Your opponent resigned. Great game!";
  }
  if (timedOutBy) {
    return "Your opponent ran out of time. Victory is yours!";
  }
  if (chess.isCheckmate()) {
    return "Checkmate! You played brilliantly.";
  }
  return "You won the game!";
}

export function timeoutStatusText(
  timedOutBy: "w" | "b",
  playerColor: "w" | "b" | null,
): string {
  const loser = timedOutBy === "w" ? "White" : "Black";
  const winner = timedOutBy === "w" ? "Black" : "White";

  if (playerColor === timedOutBy) {
    return `Time expired — you lose`;
  }
  if (playerColor) {
    return `Opponent's time expired — you win`;
  }
  return `${loser} ran out of time — ${winner} wins`;
}

export function localCheckmateMessage(chess: Chess): string {
  const winner = chess.turn() === "w" ? "Black" : "White";
  return `Checkmate! ${winner} wins.`;
}
