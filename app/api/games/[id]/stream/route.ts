import { findGameSnapshot } from "@/lib/game-snapshot";
import { snapshotFingerprint } from "@/lib/game-types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

const TICK_MS = 800;
const HEARTBEAT_MS = 15000;

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const timeoutId = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timeoutId);
      resolve();
    };
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, payload: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`),
        );
      };
      const ping = () => {
        controller.enqueue(encoder.encode(": ping\n\n"));
      };

      let lastFingerprint = "";
      let lastPing = Date.now();

      try {
        while (!request.signal.aborted) {
          const snapshot = await findGameSnapshot(id);

          if (!snapshot) {
            send("end", { reason: "not_found" });
            break;
          }

          const fingerprint = snapshotFingerprint(snapshot);
          if (fingerprint !== lastFingerprint) {
            lastFingerprint = fingerprint;
            send("snapshot", snapshot);
          }

          if (snapshot.status === "FINISHED") {
            send("end", { reason: "finished" });
            break;
          }

          if (Date.now() - lastPing >= HEARTBEAT_MS) {
            ping();
            lastPing = Date.now();
          }

          await sleep(TICK_MS, request.signal);
        }
      } catch (error) {
        if (!request.signal.aborted) {
          console.error("Game SSE stream failed", error);
        }
      } finally {
        try {
          controller.close();
        } catch {
          // already closed by the client
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
