import { subscribeRealtime } from "@/lib/events/bus";
import { getStoreMode } from "@/lib/db/store";
import {
  pgDatabaseNow,
  pgListChargeChangesSince,
} from "@/lib/db/store-postgres";
import type { GotPayCharge, GotPayRealtimeEvent } from "@/types/gotpay";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HEARTBEAT_MS = 15_000;
/** Polling al store en modo supabase (serverless sin bus compartido). */
const POLL_MS = 1_000;
/** Solape para no perder filas confirmadas con updated_at ligeramente anterior. */
const POLL_OVERLAP_MS = 3_000;
/** Cerramos antes del límite de la función; EventSource reconecta solo. */
const STREAM_MAX_MS = 50_000;

function formatSse(event: GotPayRealtimeEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function eventForCharge(charge: GotPayCharge): GotPayRealtimeEvent | null {
  switch (charge.status) {
    case "CREATED":
    case "PENDING":
      return { type: "charge.created", charge };
    case "PAID":
      return { type: "charge.paid", charge };
    case "PAID_LATE":
      return { type: "charge.paid_late", charge };
    case "EXPIRED":
      return { type: "charge.expired", chargeId: charge.id };
    case "CANCELLED":
      return null;
    default: {
      const exhaustive: never = charge.status;
      void exhaustive;
      return null;
    }
  }
}

export async function GET(req: Request): Promise<Response> {
  const encoder = new TextEncoder();
  const usePolling = getStoreMode() === "supabase";
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let pollTimer: ReturnType<typeof setTimeout> | undefined;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  let unsubscribe: (() => void) | undefined;
  let closed = false;

  const cleanup = () => {
    closed = true;
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (pollTimer) clearTimeout(pollTimer);
    if (closeTimer) clearTimeout(closeTimer);
    unsubscribe?.();
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const push = (event: GotPayRealtimeEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(formatSse(event)));
        } catch {
          cleanup();
        }
      };

      controller.enqueue(encoder.encode("retry: 1000\n\n"));
      push({ type: "heartbeat", ts: Date.now() });
      heartbeatTimer = setInterval(() => {
        push({ type: "heartbeat", ts: Date.now() });
      }, HEARTBEAT_MS);

      if (!usePolling) {
        unsubscribe = subscribeRealtime(push);
        return;
      }

      closeTimer = setTimeout(() => {
        cleanup();
        try {
          controller.close();
        } catch {
          // ya cerrado
        }
      }, STREAM_MAX_MS);

      const seen = new Map<string, string>();
      let cursor: Date;
      try {
        cursor = await pgDatabaseNow();
      } catch {
        cursor = new Date();
      }

      const poll = async () => {
        if (closed) return;
        try {
          const since = new Date(cursor.getTime() - POLL_OVERLAP_MS);
          const changes = await pgListChargeChangesSince(since);
          for (const { charge, updatedAt } of changes) {
            if (updatedAt > cursor) cursor = updatedAt;
            const key = `${charge.status}|${charge.paidAt ?? ""}`;
            if (seen.get(charge.id) === key) continue;
            seen.set(charge.id, key);
            const event = eventForCharge(charge);
            if (event) push(event);
          }
        } catch {
          // Error transitorio de BD: reintenta en el siguiente tick.
        }
        if (!closed) {
          pollTimer = setTimeout(() => {
            void poll();
          }, POLL_MS);
        }
      };
      void poll();
    },
    cancel() {
      cleanup();
    },
  });

  req.signal.addEventListener("abort", cleanup);

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
