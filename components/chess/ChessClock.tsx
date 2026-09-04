"use client";

type ChessClockProps = {
  whiteTimeMs: number;
  blackTimeMs: number;
  activeColor: "w" | "b" | null;
  orientation?: "w" | "b";
  layout?: "stacked" | "sidebar";
};

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function ChessClock({
  whiteTimeMs,
  blackTimeMs,
  activeColor,
  orientation = "w",
  layout = "sidebar",
}: ChessClockProps) {
  const top = orientation === "w" ? "b" : "w";
  const bottom = orientation === "w" ? "w" : "b";
  const topTime = top === "w" ? whiteTimeMs : blackTimeMs;
  const bottomTime = bottom === "w" ? whiteTimeMs : blackTimeMs;

  const isSidebar = layout === "sidebar";

  return (
    <div
      className={
        isSidebar
          ? "flex w-24 shrink-0 flex-col justify-between self-stretch"
          : "flex w-full max-w-[min(100%,72vh)] flex-col gap-1"
      }
    >
      <ClockFace
        label={top === "w" ? "White" : "Black"}
        timeMs={topTime}
        active={activeColor === top}
        urgent={topTime < 30_000}
        compact={isSidebar}
      />
      <ClockFace
        label={bottom === "w" ? "White" : "Black"}
        timeMs={bottomTime}
        active={activeColor === bottom}
        urgent={bottomTime < 30_000}
        compact={isSidebar}
      />
    </div>
  );
}

function ClockFace({
  label,
  timeMs,
  active,
  urgent,
  compact = false,
}: {
  label: string;
  timeMs: number;
  active: boolean;
  urgent: boolean;
  compact?: boolean;
}) {
  const activeClasses = active
    ? urgent
      ? "bg-red-600/30 text-red-200 ring-1 ring-red-500/50"
      : "bg-amber-600/25 text-amber-100 ring-1 ring-amber-500/40"
    : "bg-white/5 text-amber-100/50";

  if (compact) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-lg px-2 py-3 font-mono text-base transition-colors ${activeClasses}`}
      >
        <span className="text-[10px] font-sans font-medium tracking-wide uppercase">{label}</span>
        <span className="tabular-nums">{formatTime(timeMs)}</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between rounded-lg px-4 py-2 font-mono text-lg transition-colors ${activeClasses}`}
    >
      <span className="text-xs font-sans font-medium tracking-wide uppercase">{label}</span>
      <span className="tabular-nums">{formatTime(timeMs)}</span>
    </div>
  );
}
