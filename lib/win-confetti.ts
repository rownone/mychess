import confetti from "canvas-confetti";

const CONFETTI_COLORS = ["#fbbf24", "#f59e0b", "#fde68a", "#fef3c7", "#d97706"];

export function fireWinConfetti() {
  const end = Date.now() + 2500;

  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.65 },
    colors: CONFETTI_COLORS,
  });

  const burst = () => {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.65 },
      colors: CONFETTI_COLORS,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.65 },
      colors: CONFETTI_COLORS,
    });

    if (Date.now() < end) {
      requestAnimationFrame(burst);
    }
  };

  requestAnimationFrame(burst);
}
