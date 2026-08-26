import { useEffect, useRef } from "react";

/**
 * Polls on an adaptive interval while the tab is visible.
 * When hidden, polling pauses until the tab is shown again (then polls immediately).
 */
export function useVisibilityPolling(
  poll: () => void | Promise<void>,
  intervalMs: number,
  enabled: boolean,
) {
  const pollRef = useRef(poll);
  pollRef.current = poll;

  useEffect(() => {
    if (!enabled) return;

    let timeoutId: number;
    let cancelled = false;

    const runPoll = async () => {
      if (cancelled || document.hidden) return;
      try {
        await pollRef.current();
      } catch {
        // transient network errors are fine
      }
    };

    const schedule = () => {
      if (cancelled) return;

      if (document.hidden) {
        timeoutId = window.setTimeout(schedule, intervalMs);
        return;
      }

      timeoutId = window.setTimeout(async () => {
        await runPoll();
        schedule();
      }, intervalMs);
    };

    schedule();

    const onVisibility = () => {
      if (!document.hidden) {
        void runPoll();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs, enabled]);
}
