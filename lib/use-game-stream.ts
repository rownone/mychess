import { useEffect, useRef } from "react";
import type { GameSnapshot } from "@/lib/game-types";

type StreamEndReason = "not_found" | "finished";

type UseGameStreamOptions = {
  onSnapshot: (snapshot: GameSnapshot) => void;
  onEnd?: (reason: StreamEndReason) => void;
  enabled: boolean;
};

/**
 * One EventSource connection instead of interval GETs.
 * DevTools shows a single pending /stream request (EventStream), not a poll every few seconds.
 */
export function useGameStream(
  gameId: string,
  { onSnapshot, onEnd, enabled }: UseGameStreamOptions,
) {
  const onSnapshotRef = useRef(onSnapshot);
  const onEndRef = useRef(onEnd);
  onSnapshotRef.current = onSnapshot;
  onEndRef.current = onEnd;

  useEffect(() => {
    if (!enabled) return;

    let source: EventSource | null = null;
    let cancelled = false;

    const disconnect = () => {
      source?.close();
      source = null;
    };

    const connect = () => {
      if (cancelled || document.hidden) return;
      disconnect();

      const next = new EventSource(`/api/games/${gameId}/stream`);
      source = next;

      next.addEventListener("snapshot", (event) => {
        try {
          const snapshot = JSON.parse((event as MessageEvent).data) as GameSnapshot;
          onSnapshotRef.current(snapshot);
        } catch {
          // ignore malformed payloads
        }
      });

      next.addEventListener("end", (event) => {
        let reason: StreamEndReason = "finished";
        try {
          const payload = JSON.parse((event as MessageEvent).data) as { reason?: StreamEndReason };
          if (payload.reason) reason = payload.reason;
        } catch {
          // keep default
        }
        onEndRef.current?.(reason);
        disconnect();
      });
    };

    const onVisibility = () => {
      if (document.hidden) {
        disconnect();
        return;
      }
      connect();
    };

    connect();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [gameId, enabled]);
}
