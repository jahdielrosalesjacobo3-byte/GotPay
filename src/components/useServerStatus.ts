"use client";

import { useEffect, useState } from "react";

export interface ServerStatus {
  /** null = aún no se sabe (cargando o sin red). */
  readonly storeReachable: boolean | null;
  readonly merchantClabeLast4: string | null;
}

const POLL_MS = 30_000;

/** Lee GET /api/health (sin secretos) para indicadores reales del dashboard. */
export function useServerStatus(enabled: boolean): ServerStatus {
  const [status, setStatus] = useState<ServerStatus>({
    storeReachable: null,
    merchantClabeLast4: null,
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        const data = (await res.json()) as {
          storeReachable?: unknown;
          merchantClabeLast4?: unknown;
        };
        if (cancelled) return;
        setStatus({
          storeReachable: res.ok && data.storeReachable === true,
          merchantClabeLast4:
            typeof data.merchantClabeLast4 === "string" &&
            /^\d{4}$/.test(data.merchantClabeLast4)
              ? data.merchantClabeLast4
              : null,
        });
      } catch {
        if (!cancelled) {
          setStatus((prev) => ({ ...prev, storeReachable: false }));
        }
      }
    };
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled]);

  return status;
}
